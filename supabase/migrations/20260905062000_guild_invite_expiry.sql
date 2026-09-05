-- Expire an old pending invite before issuing a fresh one so the partial
-- uniqueness rule does not strand a player after seven days.

create or replace function public.create_guild_invite(p_guild_id uuid, p_invitee_id uuid)
returns public.guild_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_guild public.guilds;
  v_invite public.guild_invites;
  v_member_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not public.can_manage_guild(p_guild_id) then
    raise exception using errcode = '42501', message = 'Only Guild managers can invite members';
  end if;
  if p_invitee_id is null or p_invitee_id = v_user_id or not exists (
    select 1 from public.profiles where id = p_invitee_id
  ) then
    raise exception using errcode = '22023', message = 'Invite target is invalid';
  end if;
  select g.* into v_guild from public.guilds as g where g.id = p_guild_id for update;
  if not found or v_guild.status <> 'active' then
    raise exception using errcode = 'P0002', message = 'Guild not found';
  end if;
  if exists (
    select 1 from public.guild_members
    where user_id = p_invitee_id and membership_status = 'active'
  ) then
    raise exception using errcode = '22023', message = 'This player already belongs to an active Guild';
  end if;
  select count(*)::integer into v_member_count
  from public.guild_members
  where guild_id = p_guild_id and membership_status = 'active';
  if v_member_count >= v_guild.max_members then
    raise exception using errcode = '22023', message = 'Guild member capacity is full';
  end if;

  update public.guild_invites
  set status = 'expired'
  where guild_id = p_guild_id
    and invitee_id = p_invitee_id
    and status = 'pending'
    and expires_at <= timezone('utc', now());

  select i.* into v_invite
  from public.guild_invites as i
  where i.guild_id = p_guild_id
    and i.invitee_id = p_invitee_id
    and i.status = 'pending'
    and i.expires_at > timezone('utc', now())
  order by i.created_at desc
  limit 1
  for update;
  if found then
    return v_invite;
  end if;

  insert into public.guild_invites (guild_id, inviter_id, invitee_id, invite_token)
  values (p_guild_id, v_user_id, p_invitee_id, replace(substr(gen_random_uuid()::text, 1, 24), '-', ''))
  returning * into v_invite;
  insert into public.notifications (user_id, notification_type, title, body, href)
  values (
    p_invitee_id,
    'guild_invite',
    'คุณได้รับคำเชิญเข้า Guild',
    'มีคำเชิญใหม่จาก Guild ของคุณ',
    '/guilds/invite?token=' || v_invite.invite_token
  );
  return v_invite;
end;
$$;

revoke all on function public.create_guild_invite(uuid, uuid) from public, anon;
grant execute on function public.create_guild_invite(uuid, uuid) to authenticated;
