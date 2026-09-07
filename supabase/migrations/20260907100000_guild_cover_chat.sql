-- Arena-Badminton Guild presentation, ranking support, and member chat.
-- This migration is intentionally idempotent so it can be applied safely to
-- the existing Guild + direct messaging installation.

alter table public.guilds
  add column if not exists cover_url text;

-- Existing DM keys are 73 characters. Guild rooms use the explicit
-- guild:<uuid> namespace, so retain the old DM shape and allow the new one.
alter table public.direct_conversations
  drop constraint if exists direct_conversations_key_length;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.direct_conversations'::regclass
      and conname = 'direct_conversations_key_format'
  ) then
    alter table public.direct_conversations
      add constraint direct_conversations_key_format check (
        char_length(direct_key) = 73
        or direct_key ~* '^guild:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      );
  end if;
end;
$$;

create or replace function public.ensure_guild_chat_conversation(p_guild_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation_id uuid;
begin
  if p_guild_id is null or not exists (
    select 1 from public.guilds where id = p_guild_id and status = 'active'
  ) then
    raise exception using errcode = 'P0002', message = 'Guild not found';
  end if;

  insert into public.direct_conversations (direct_key)
  values ('guild:' || p_guild_id::text)
  on conflict (direct_key) do update
    set updated_at = public.direct_conversations.updated_at
  returning id into v_conversation_id;

  insert into public.direct_conversation_members (conversation_id, user_id)
  select v_conversation_id, gm.user_id
  from public.guild_members as gm
  where gm.guild_id = p_guild_id
    and gm.membership_status = 'active'
  on conflict do nothing;

  delete from public.direct_conversation_members as dcm
  where dcm.conversation_id = v_conversation_id
    and not exists (
      select 1
      from public.guild_members as gm
      where gm.guild_id = p_guild_id
        and gm.user_id = dcm.user_id
        and gm.membership_status = 'active'
    );

  return v_conversation_id;
end;
$$;

create or replace function public.sync_guild_chat_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guild_id uuid;
  v_user_id uuid;
  v_conversation_id uuid;
begin
  if tg_op = 'DELETE' then
    v_guild_id := old.guild_id;
    v_user_id := old.user_id;
  else
    v_guild_id := new.guild_id;
    v_user_id := new.user_id;
  end if;

  if tg_op = 'DELETE'
     or (tg_op = 'UPDATE' and old.membership_status = 'active' and new.membership_status <> 'active') then
    select dc.id into v_conversation_id
    from public.direct_conversations as dc
    where dc.direct_key = 'guild:' || v_guild_id::text;
    if v_conversation_id is not null then
      delete from public.direct_conversation_members
      where conversation_id = v_conversation_id and user_id = v_user_id;
    end if;
  elsif new.membership_status = 'active'
     and (tg_op = 'INSERT' or old.membership_status <> 'active') then
    v_conversation_id := public.ensure_guild_chat_conversation(v_guild_id);
    insert into public.direct_conversation_members (conversation_id, user_id)
    values (v_conversation_id, v_user_id)
    on conflict do nothing;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists guild_members_sync_chat on public.guild_members;
create trigger guild_members_sync_chat
after insert or update of membership_status or delete on public.guild_members
for each row execute function public.sync_guild_chat_membership();

-- Backfill rooms and memberships for Guilds that already existed before this
-- feature was installed.
insert into public.direct_conversations (direct_key)
select distinct 'guild:' || gm.guild_id::text
from public.guild_members as gm
join public.guilds as g on g.id = gm.guild_id and g.status = 'active'
where gm.membership_status = 'active'
on conflict (direct_key) do nothing;

insert into public.direct_conversation_members (conversation_id, user_id)
select dc.id, gm.user_id
from public.guild_members as gm
join public.direct_conversations as dc on dc.direct_key = 'guild:' || gm.guild_id::text
join public.guilds as g on g.id = gm.guild_id and g.status = 'active'
where gm.membership_status = 'active'
on conflict do nothing;

create or replace function public.get_or_create_guild_conversation(p_guild_id uuid)
returns public.direct_conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_conversation public.direct_conversations;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not exists (
    select 1
    from public.guild_members
    where guild_id = p_guild_id and user_id = v_user_id and membership_status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Only active Guild members can open Guild chat';
  end if;

  perform public.ensure_guild_chat_conversation(p_guild_id);
  select * into v_conversation
  from public.direct_conversations
  where direct_key = 'guild:' || p_guild_id::text;
  return v_conversation;
end;
$$;

revoke all on function public.ensure_guild_chat_conversation(uuid), public.sync_guild_chat_membership() from public, anon, authenticated;
revoke all on function public.get_or_create_guild_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_guild_conversation(uuid) to authenticated;

-- Replace the old overload so the cover URL is updated through the same
-- manager-only RPC boundary as the Guild logo and identity fields.
drop function if exists public.update_guild(uuid, text, text, text, text, text, text, text, text);

create function public.update_guild(
  p_guild_id uuid,
  p_name text,
  p_description text,
  p_logo_url text,
  p_cover_url text,
  p_province text,
  p_district text,
  p_subdistrict text,
  p_visibility text,
  p_join_policy text
)
returns public.guilds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_guild public.guilds;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not public.can_manage_guild(p_guild_id) then
    raise exception using errcode = '42501', message = 'Only Guild managers can update this Guild';
  end if;
  if p_name is null
     or char_length(btrim(p_name)) not between 2 and 100
     or char_length(coalesce(p_description, '')) > 1000
     or p_visibility not in ('public', 'private')
     or p_join_policy not in ('open', 'request', 'invite_only') then
    raise exception using errcode = '22023', message = 'Invalid Guild data';
  end if;

  update public.guilds
  set name = btrim(p_name),
      description = btrim(coalesce(p_description, '')),
      logo_url = nullif(btrim(coalesce(p_logo_url, '')), ''),
      cover_url = nullif(btrim(coalesce(p_cover_url, '')), ''),
      province = nullif(btrim(coalesce(p_province, '')), ''),
      district = nullif(btrim(coalesce(p_district, '')), ''),
      subdistrict = nullif(btrim(coalesce(p_subdistrict, '')), ''),
      visibility = p_visibility,
      join_policy = p_join_policy
  where id = p_guild_id and status = 'active'
  returning * into v_guild;

  if not found then
    raise exception using errcode = 'P0002', message = 'Guild not found';
  end if;

  insert into public.guild_audit_logs (guild_id, actor_id, action)
  values (p_guild_id, v_user_id, 'guild_updated');
  return v_guild;
end;
$$;

revoke all on function public.update_guild(uuid, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.update_guild(uuid, text, text, text, text, text, text, text, text, text) to authenticated;
