-- Guild hardening: invite UX support, capacity invariants, and FK indexes.

create index if not exists guild_settings_updated_by_idx
  on public.guild_settings (updated_by);
create index if not exists guild_announcements_author_idx
  on public.guild_announcements (author_id);
create index if not exists guild_audit_logs_actor_idx
  on public.guild_audit_logs (actor_id);
create index if not exists guild_audit_logs_target_user_idx
  on public.guild_audit_logs (target_user_id);
create index if not exists guild_bans_user_idx
  on public.guild_bans (user_id);
create index if not exists guild_bans_banned_by_idx
  on public.guild_bans (banned_by);
create index if not exists guild_exp_ledger_match_idx
  on public.guild_exp_ledger (match_id);
create index if not exists guild_invites_inviter_idx
  on public.guild_invites (inviter_id);
create index if not exists guild_join_requests_reviewer_idx
  on public.guild_join_requests (reviewed_by);
create unique index if not exists guild_invites_pending_target_uidx
  on public.guild_invites (guild_id, invitee_id)
  where status = 'pending';

-- A full Guild cannot accumulate requests that can never be approved. The
-- Guild row is locked before counting, so concurrent joins are serialized.
create or replace function public.join_guild(p_guild_id uuid)
returns table (guild_id uuid, membership_status text, member_count integer, max_members smallint, guild_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.profiles;
  v_guild public.guilds;
  v_existing_status text;
  v_member_count integer;
  v_result_status text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select p.* into v_profile
  from public.profiles as p
  where p.id = v_user_id;
  if not found or v_profile.profile_completed_at is null then
    raise exception using errcode = '42501', message = 'Profile completion required';
  end if;

  select g.* into v_guild
  from public.guilds as g
  where g.id = p_guild_id
  for update;
  if not found or v_guild.status <> 'active' then
    raise exception using errcode = 'P0002', message = 'Guild not found';
  end if;
  if exists (
    select 1 from public.guild_bans
    where guild_id = p_guild_id and user_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'You are banned from this Guild';
  end if;

  select gm.membership_status into v_existing_status
  from public.guild_members as gm
  where gm.guild_id = p_guild_id and gm.user_id = v_user_id;
  if v_existing_status = 'active' then
    select count(*)::integer into v_member_count
    from public.guild_members
    where guild_id = p_guild_id and membership_status = 'active';
    return query select p_guild_id, 'active'::text, v_member_count, v_guild.max_members, v_guild.status;
    return;
  end if;
  if exists (
    select 1 from public.guild_members
    where user_id = v_user_id and membership_status = 'active'
  ) then
    raise exception using errcode = '22023', message = 'You already belong to an active Guild';
  end if;

  select count(*)::integer into v_member_count
  from public.guild_members
  where guild_id = p_guild_id and membership_status = 'active';
  if v_member_count >= v_guild.max_members then
    raise exception using errcode = '22023', message = 'Guild member capacity is full';
  end if;

  if v_guild.join_policy = 'invite_only' then
    raise exception using errcode = '22023', message = 'This Guild accepts invitations only';
  elsif v_guild.join_policy = 'request' then
    insert into public.guild_join_requests (guild_id, user_id, status)
    values (p_guild_id, v_user_id, 'pending')
    on conflict (guild_id, user_id) where status = 'pending' do nothing;
    insert into public.notifications (user_id, notification_type, title, body, href)
    select gm.user_id, 'guild_join_request', 'มีคำขอเข้าร่วม Guild ใหม่', v_profile.display_name || ' ขอเข้าร่วม ' || v_guild.name, '/guilds/' || p_guild_id::text
    from public.guild_members as gm
    where gm.guild_id = p_guild_id
      and gm.membership_status = 'active'
      and gm.role in ('guild_master', 'officer');
    v_result_status := 'pending';
  else
    insert into public.guild_members (guild_id, user_id, role, membership_status)
    values (p_guild_id, v_user_id, 'member', 'active')
    on conflict (guild_id, user_id) do update
      set membership_status = 'active', role = 'member', joined_at = timezone('utc', now());
    v_member_count := v_member_count + 1;
    v_result_status := 'active';
    insert into public.guild_audit_logs (guild_id, actor_id, action)
    values (p_guild_id, v_user_id, 'member_joined');
  end if;

  return query select p_guild_id, v_result_status, v_member_count, v_guild.max_members, v_guild.status;
end;
$$;

-- Invite creation is idempotent for the same Guild/player while a previous
-- invite is pending. It also emits a deep link that the invitee can accept.
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

revoke all on function public.join_guild(uuid), public.create_guild_invite(uuid, uuid)
from public, anon;
grant execute on function public.join_guild(uuid), public.create_guild_invite(uuid, uuid)
to authenticated;
