-- Arena-Badminton Guild system.
--
-- Guilds are a separate social/RPG layer from groups. A user can create one
-- Guild at a time, subject to the Admin-controlled founding mode. Group
-- creation may reference a Guild, but a Match always derives its Guild from
-- its Group so rewards and audit data cannot disagree.

create extension if not exists pgcrypto;

create table if not exists public.guild_settings (
  id text primary key default 'default',
  creation_mode text not null default 'item',
  free_until timestamptz,
  founder_item_slug text not null default 'guild-founding-contract',
  max_members_cap smallint not null default 256,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint guild_settings_singleton check (id = 'default'),
  constraint guild_settings_creation_mode_allowed check (creation_mode in ('free', 'item')),
  constraint guild_settings_founder_item_slug_length check (char_length(founder_item_slug) between 3 and 80),
  constraint guild_settings_max_members_cap_range check (max_members_cap between 32 and 256)
);

insert into public.guild_settings (id, creation_mode, founder_item_slug, max_members_cap)
values ('default', 'item', 'guild-founding-contract', 256)
on conflict (id) do nothing;

create table if not exists public.guilds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text not null default '',
  logo_url text,
  province text,
  district text,
  subdistrict text,
  visibility text not null default 'public',
  join_policy text not null default 'open',
  status text not null default 'active',
  level smallint not null default 1,
  exp_total bigint not null default 0,
  max_members smallint not null default 32,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint guilds_name_length check (char_length(btrim(name)) between 2 and 100),
  constraint guilds_slug_length check (char_length(slug) between 8 and 60),
  constraint guilds_description_length check (char_length(description) <= 1000),
  constraint guilds_area_length check (
    (province is null or char_length(btrim(province)) between 1 and 80)
    and (district is null or char_length(btrim(district)) between 1 and 80)
    and (subdistrict is null or char_length(btrim(subdistrict)) between 1 and 80)
  ),
  constraint guilds_visibility_allowed check (visibility in ('public', 'private')),
  constraint guilds_join_policy_allowed check (join_policy in ('open', 'request', 'invite_only')),
  constraint guilds_status_allowed check (status in ('active', 'suspended', 'archived')),
  constraint guilds_level_range check (level between 1 and 99),
  constraint guilds_exp_nonnegative check (exp_total >= 0),
  constraint guilds_max_members_range check (max_members between 32 and 256)
);

create unique index if not exists guilds_owner_active_uidx
  on public.guilds (owner_id)
  where status = 'active';
create index if not exists guilds_discovery_idx
  on public.guilds (status, visibility, province, district, subdistrict, created_at desc, id);
create index if not exists guilds_level_idx
  on public.guilds (level desc, exp_total desc, id);

create table if not exists public.guild_members (
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  membership_status text not null default 'active',
  contribution_exp bigint not null default 0,
  joined_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (guild_id, user_id),
  constraint guild_members_role_allowed check (role in ('guild_master', 'officer', 'recruiter', 'member')),
  constraint guild_members_status_allowed check (membership_status in ('active', 'left', 'kicked', 'banned')),
  constraint guild_members_contribution_nonnegative check (contribution_exp >= 0)
);

create unique index if not exists guild_members_one_active_per_user_uidx
  on public.guild_members (user_id)
  where membership_status = 'active';
create index if not exists guild_members_guild_status_role_idx
  on public.guild_members (guild_id, membership_status, role, joined_at, user_id);
create index if not exists guild_members_user_status_idx
  on public.guild_members (user_id, membership_status, guild_id);

create table if not exists public.guild_join_requests (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint guild_join_requests_status_allowed check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  unique (guild_id, user_id, status)
);

create unique index if not exists guild_join_requests_pending_uidx
  on public.guild_join_requests (guild_id, user_id)
  where status = 'pending';
create index if not exists guild_join_requests_guild_status_created_idx
  on public.guild_join_requests (guild_id, status, created_at, id);
create index if not exists guild_join_requests_user_status_created_idx
  on public.guild_join_requests (user_id, status, created_at desc, id);

create table if not exists public.guild_invites (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  invite_token text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  created_at timestamptz not null default timezone('utc', now()),
  constraint guild_invites_status_allowed check (status in ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  constraint guild_invites_not_self check (inviter_id <> invitee_id)
);

create index if not exists guild_invites_invitee_status_idx
  on public.guild_invites (invitee_id, status, expires_at desc, created_at desc);
create index if not exists guild_invites_guild_status_idx
  on public.guild_invites (guild_id, status, created_at desc);

create table if not exists public.guild_bans (
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  banned_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (guild_id, user_id),
  constraint guild_bans_reason_length check (char_length(reason) <= 500)
);

create table if not exists public.guild_announcements (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint guild_announcements_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint guild_announcements_body_length check (char_length(btrim(body)) between 1 and 3000)
);

create index if not exists guild_announcements_feed_idx
  on public.guild_announcements (guild_id, is_pinned desc, created_at desc, id);

create table if not exists public.guild_exp_ledger (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  source_type text not null,
  amount bigint not null,
  match_id uuid references public.matches(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint guild_exp_ledger_source_allowed check (source_type in ('match', 'quest', 'admin', 'event')),
  constraint guild_exp_ledger_amount_positive check (amount > 0),
  unique (guild_id, user_id, match_id, source_type)
);

create index if not exists guild_exp_ledger_guild_created_idx
  on public.guild_exp_ledger (guild_id, created_at desc, id);
create index if not exists guild_exp_ledger_user_created_idx
  on public.guild_exp_ledger (user_id, created_at desc, id)
  where user_id is not null;

create table if not exists public.guild_audit_logs (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint guild_audit_logs_action_length check (char_length(action) between 1 and 80)
);

create index if not exists guild_audit_logs_guild_created_idx
  on public.guild_audit_logs (guild_id, created_at desc, id);

alter table public.groups
  add column if not exists guild_id uuid references public.guilds(id) on delete set null;

create index if not exists groups_guild_status_starts_idx
  on public.groups (guild_id, status, starts_at, id)
  where guild_id is not null;

insert into public.shop_items (
  slug, name, description, item_type, rarity_tier, icon, effect_type, effect_value, price_gems, sort_order
)
values
  ('guild-founding-contract', 'Guild Founding Contract', 'Item สำหรับก่อตั้ง Guild ของคุณเอง', 'cosmetic', 'gold', '🛡️', 'none', 0, 499, 100),
  ('guild-expansion-8', 'Guild Expansion +8', 'เพิ่มสมาชิกสูงสุดของ Guild อีก 8 คน', 'cosmetic', 'green', '➕', 'none', 0, 149, 110),
  ('guild-expansion-16', 'Guild Expansion +16', 'เพิ่มสมาชิกสูงสุดของ Guild อีก 16 คน', 'cosmetic', 'blue', '🏰', 'none', 0, 249, 120),
  ('guild-expansion-32', 'Guild Expansion +32', 'เพิ่มสมาชิกสูงสุดของ Guild อีก 32 คน', 'cosmetic', 'purple', '🌈', 'none', 0, 399, 130)
on conflict (slug) do nothing;

create table if not exists public.guild_creation_requests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_key text not null,
  guild_id uuid not null references public.guilds(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, request_key),
  unique (guild_id),
  constraint guild_creation_requests_key_length check (char_length(request_key) between 16 and 128)
);

drop trigger if exists guild_settings_set_updated_at on public.guild_settings;
create trigger guild_settings_set_updated_at
before update on public.guild_settings
for each row execute function public.set_updated_at();

drop trigger if exists guilds_set_updated_at on public.guilds;
create trigger guilds_set_updated_at
before update on public.guilds
for each row execute function public.set_updated_at();

drop trigger if exists guild_members_set_updated_at on public.guild_members;
create trigger guild_members_set_updated_at
before update on public.guild_members
for each row execute function public.set_updated_at();

drop trigger if exists guild_announcements_set_updated_at on public.guild_announcements;
create trigger guild_announcements_set_updated_at
before update on public.guild_announcements
for each row execute function public.set_updated_at();

-- These helpers are used by RLS and Guild RPCs. They return no table rows and
-- are not anonymous API endpoints.
create or replace function public.is_guild_member(p_guild_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.guild_members as gm
    where gm.guild_id = p_guild_id
      and gm.user_id = (select auth.uid())
      and gm.membership_status = 'active'
  );
$$;

create or replace function public.can_manage_guild(p_guild_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.guild_members as gm
    where gm.guild_id = p_guild_id
      and gm.user_id = (select auth.uid())
      and gm.membership_status = 'active'
      and gm.role in ('guild_master', 'officer')
  );
$$;

revoke all on function public.is_guild_member(uuid), public.can_manage_guild(uuid) from public, anon;
grant execute on function public.is_guild_member(uuid), public.can_manage_guild(uuid) to authenticated;

revoke all on public.guild_settings, public.guilds, public.guild_members,
  public.guild_join_requests, public.guild_invites, public.guild_bans,
  public.guild_announcements, public.guild_exp_ledger, public.guild_audit_logs,
  public.guild_creation_requests
from public, anon, authenticated;

grant select on public.guild_settings, public.guilds, public.guild_members,
  public.guild_join_requests, public.guild_invites, public.guild_announcements,
  public.guild_exp_ledger, public.guild_audit_logs to authenticated;

alter table public.guild_settings enable row level security;
alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;
alter table public.guild_join_requests enable row level security;
alter table public.guild_invites enable row level security;
alter table public.guild_bans enable row level security;
alter table public.guild_announcements enable row level security;
alter table public.guild_exp_ledger enable row level security;
alter table public.guild_audit_logs enable row level security;
alter table public.guild_creation_requests enable row level security;

drop policy if exists guild_settings_select_authenticated on public.guild_settings;
create policy guild_settings_select_authenticated on public.guild_settings
for select to authenticated using (true);

drop policy if exists guilds_select_visible on public.guilds;
create policy guilds_select_visible on public.guilds
for select to authenticated
using (
  (status = 'active' and visibility = 'public')
  or owner_id = (select auth.uid())
  or public.is_guild_member(id)
);

drop policy if exists guild_members_select_visible on public.guild_members;
create policy guild_members_select_visible on public.guild_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_guild_member(guild_id)
  or exists (
    select 1 from public.guilds as visible_guild
    where visible_guild.id = guild_members.guild_id
      and visible_guild.status = 'active'
      and visible_guild.visibility = 'public'
  )
);

drop policy if exists guild_join_requests_select_participant on public.guild_join_requests;
create policy guild_join_requests_select_participant on public.guild_join_requests
for select to authenticated
using (user_id = (select auth.uid()) or public.can_manage_guild(guild_id));

drop policy if exists guild_invites_select_participant on public.guild_invites;
create policy guild_invites_select_participant on public.guild_invites
for select to authenticated
using (inviter_id = (select auth.uid()) or invitee_id = (select auth.uid()) or public.can_manage_guild(guild_id));

drop policy if exists guild_announcements_select_visible on public.guild_announcements;
create policy guild_announcements_select_visible on public.guild_announcements
for select to authenticated
using (public.is_guild_member(guild_id) or exists (
  select 1 from public.guilds as visible_guild
  where visible_guild.id = guild_announcements.guild_id
    and visible_guild.status = 'active'
    and visible_guild.visibility = 'public'
));

drop policy if exists guild_exp_ledger_select_member on public.guild_exp_ledger;
create policy guild_exp_ledger_select_member on public.guild_exp_ledger
for select to authenticated using (public.is_guild_member(guild_id));

drop policy if exists guild_audit_logs_select_manager on public.guild_audit_logs;
create policy guild_audit_logs_select_manager on public.guild_audit_logs
for select to authenticated using (public.can_manage_guild(guild_id));

create or replace view public.public_guild_members
with (security_invoker = true)
as
select
  gm.guild_id, gm.user_id, gm.role, gm.membership_status,
  gm.contribution_exp, gm.joined_at,
  pp.display_name, pp.handle, pp.avatar_url, pp.level, pp.skill_bp
from public.guild_members as gm
join public.public_profiles as pp on pp.id = gm.user_id
where gm.membership_status = 'active';

revoke all on public.public_guild_members from public, anon, authenticated;
grant select on public.public_guild_members to authenticated;

create or replace function public.create_guild(
  p_name text,
  p_description text,
  p_logo_url text,
  p_province text,
  p_district text,
  p_subdistrict text,
  p_visibility text,
  p_join_policy text,
  p_request_key text
)
returns public.guilds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.profiles;
  v_settings public.guild_settings;
  v_existing public.guilds;
  v_inventory public.user_item_inventory;
  v_item public.shop_items;
  v_guild public.guilds;
  v_request_guild_id uuid;
  v_is_free boolean;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_request_key is null or char_length(p_request_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Invalid request key';
  end if;

  select g.* into v_existing
  from public.guilds as g
  where g.owner_id = v_user_id and g.status = 'active';
  if found then
    return v_existing;
  end if;

  select p.* into v_profile
  from public.profiles as p
  where p.id = v_user_id
  for update;
  if not found or v_profile.profile_completed_at is null then
    raise exception using errcode = '42501', message = 'Profile completion required';
  end if;

  select gs.* into v_settings
  from public.guild_settings as gs
  where gs.id = 'default'
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Guild settings are missing';
  end if;

  select gcr.guild_id into v_request_guild_id
  from public.guild_creation_requests as gcr
  where gcr.user_id = v_user_id and gcr.request_key = p_request_key;
  if v_request_guild_id is not null then
    select g.* into v_guild from public.guilds as g where g.id = v_request_guild_id;
    return v_guild;
  end if;

  if p_visibility not in ('public', 'private')
     or p_join_policy not in ('open', 'request', 'invite_only')
     or p_name is null or char_length(btrim(p_name)) not between 2 and 100
     or p_description is not null and char_length(p_description) > 1000 then
    raise exception using errcode = '22023', message = 'Invalid Guild data';
  end if;

  v_is_free := v_settings.creation_mode = 'free'
    or (v_settings.free_until is not null and v_settings.free_until > timezone('utc', now()));

  if not v_is_free then
    select si.* into v_item
    from public.shop_items as si
    where si.slug = v_settings.founder_item_slug and si.is_active = true
    for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'Guild founding item is not available';
    end if;

    select ui.* into v_inventory
    from public.user_item_inventory as ui
    where ui.user_id = v_user_id and ui.item_id = v_item.id and ui.quantity > 0
    for update;
    if not found then
      raise exception using errcode = '22023', message = 'Guild founding item required';
    end if;

    if v_inventory.quantity = 1 then
      delete from public.user_item_inventory where id = v_inventory.id;
    else
      update public.user_item_inventory set quantity = quantity - 1 where id = v_inventory.id;
    end if;
  end if;

  insert into public.guilds (
    owner_id, name, slug, description, logo_url, province, district,
    subdistrict, visibility, join_policy, max_members
  )
  values (
    v_user_id,
    btrim(p_name),
    'guild-' || replace(substr(gen_random_uuid()::text, 1, 18), '-', ''),
    btrim(coalesce(p_description, '')),
    nullif(btrim(coalesce(p_logo_url, '')), ''),
    nullif(btrim(coalesce(p_province, '')), ''),
    nullif(btrim(coalesce(p_district, '')), ''),
    nullif(btrim(coalesce(p_subdistrict, '')), ''),
    p_visibility,
    p_join_policy,
    32
  )
  returning * into v_guild;

  insert into public.guild_members (guild_id, user_id, role, membership_status)
  values (v_guild.id, v_user_id, 'guild_master', 'active');

  insert into public.guild_creation_requests (user_id, request_key, guild_id)
  values (v_user_id, p_request_key, v_guild.id);

  insert into public.guild_audit_logs (guild_id, actor_id, action, metadata)
  values (v_guild.id, v_user_id, 'guild_created', jsonb_build_object('free_creation', v_is_free));

  return v_guild;
end;
$$;

create or replace function public.create_guild_invite(p_guild_id uuid, p_invitee_id uuid)
returns public.guild_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_invite public.guild_invites;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not public.can_manage_guild(p_guild_id) then raise exception using errcode = '42501', message = 'Only Guild managers can invite members'; end if;
  if p_invitee_id is null or p_invitee_id = v_user_id or not exists (select 1 from public.profiles where id = p_invitee_id) then
    raise exception using errcode = '22023', message = 'Invite target is invalid';
  end if;
  if exists (select 1 from public.guild_members where user_id = p_invitee_id and membership_status = 'active') then
    raise exception using errcode = '22023', message = 'This player already belongs to an active Guild';
  end if;
  insert into public.guild_invites (guild_id, inviter_id, invitee_id, invite_token)
  values (p_guild_id, v_user_id, p_invitee_id, replace(substr(gen_random_uuid()::text, 1, 24), '-', ''))
  returning * into v_invite;
  insert into public.notifications (user_id, notification_type, title, body, href)
  values (p_invitee_id, 'guild_invite', 'คุณได้รับคำเชิญเข้า Guild', 'มีคำเชิญใหม่จาก Guild ของคุณ', '/guilds/' || p_guild_id::text);
  return v_invite;
end;
$$;

create or replace function public.accept_guild_invite(p_invite_token text)
returns public.guild_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_invite public.guild_invites;
  v_guild public.guilds;
  v_member public.guild_members;
  v_count integer;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select i.* into v_invite from public.guild_invites as i where i.invite_token = btrim(p_invite_token) and i.invitee_id = v_user_id for update;
  if not found or v_invite.status <> 'pending' or v_invite.expires_at <= timezone('utc', now()) then raise exception using errcode = '22023', message = 'Guild invite is expired or invalid'; end if;
  select g.* into v_guild from public.guilds as g where g.id = v_invite.guild_id for update;
  if not found or v_guild.status <> 'active' then raise exception using errcode = '22023', message = 'Guild is not active'; end if;
  if exists (select 1 from public.guild_members where user_id = v_user_id and membership_status = 'active') then raise exception using errcode = '22023', message = 'You already belong to an active Guild'; end if;
  select count(*)::integer into v_count from public.guild_members where guild_id = v_guild.id and membership_status = 'active';
  if v_count >= v_guild.max_members then raise exception using errcode = '22023', message = 'Guild member capacity is full'; end if;
  insert into public.guild_members (guild_id, user_id, role, membership_status)
  values (v_guild.id, v_user_id, 'member', 'active')
  on conflict (guild_id, user_id) do update set membership_status = 'active', role = 'member', joined_at = timezone('utc', now())
  returning * into v_member;
  update public.guild_invites set status = 'accepted' where id = v_invite.id;
  insert into public.guild_audit_logs (guild_id, actor_id, action) values (v_guild.id, v_user_id, 'invite_accepted');
  return v_member;
end;
$$;

create or replace function public.update_guild(
  p_guild_id uuid,
  p_name text,
  p_description text,
  p_logo_url text,
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
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not public.can_manage_guild(p_guild_id) then raise exception using errcode = '42501', message = 'Only Guild managers can update this Guild'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 2 and 100 or char_length(coalesce(p_description, '')) > 1000
     or p_visibility not in ('public', 'private') or p_join_policy not in ('open', 'request', 'invite_only') then
    raise exception using errcode = '22023', message = 'Invalid Guild data';
  end if;
  update public.guilds
  set name = btrim(p_name), description = btrim(coalesce(p_description, '')), logo_url = nullif(btrim(coalesce(p_logo_url, '')), ''),
      province = nullif(btrim(coalesce(p_province, '')), ''), district = nullif(btrim(coalesce(p_district, '')), ''),
      subdistrict = nullif(btrim(coalesce(p_subdistrict, '')), ''), visibility = p_visibility, join_policy = p_join_policy
  where id = p_guild_id and status = 'active'
  returning * into v_guild;
  if not found then raise exception using errcode = 'P0002', message = 'Guild not found'; end if;
  insert into public.guild_audit_logs (guild_id, actor_id, action) values (p_guild_id, v_user_id, 'guild_updated');
  return v_guild;
end;
$$;

create or replace function public.manage_guild_member(p_guild_id uuid, p_target_user_id uuid, p_action text, p_reason text default '')
returns public.guild_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_member public.guild_members;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not public.can_manage_guild(p_guild_id) then raise exception using errcode = '42501', message = 'Only Guild managers can manage members'; end if;
  if p_target_user_id = v_user_id or p_action not in ('promote', 'demote', 'kick', 'ban') then raise exception using errcode = '22023', message = 'Invalid member action'; end if;
  select gm.* into v_member from public.guild_members as gm where gm.guild_id = p_guild_id and gm.user_id = p_target_user_id for update;
  if not found or v_member.membership_status <> 'active' or v_member.role = 'guild_master' then raise exception using errcode = '22023', message = 'Member cannot be managed'; end if;
  if p_action = 'promote' then
    update public.guild_members set role = 'officer' where guild_id = p_guild_id and user_id = p_target_user_id;
  elsif p_action = 'demote' then
    update public.guild_members set role = 'member' where guild_id = p_guild_id and user_id = p_target_user_id;
  elsif p_action = 'kick' then
    update public.guild_members set role = 'member', membership_status = 'kicked' where guild_id = p_guild_id and user_id = p_target_user_id;
  else
    insert into public.guild_bans (guild_id, user_id, banned_by, reason)
    values (p_guild_id, p_target_user_id, v_user_id, btrim(coalesce(p_reason, '')))
    on conflict (guild_id, user_id) do update set banned_by = excluded.banned_by, reason = excluded.reason, created_at = timezone('utc', now());
    update public.guild_members set role = 'member', membership_status = 'banned' where guild_id = p_guild_id and user_id = p_target_user_id;
  end if;
  select gm.* into v_member from public.guild_members as gm where gm.guild_id = p_guild_id and gm.user_id = p_target_user_id;
  insert into public.guild_audit_logs (guild_id, actor_id, action, target_user_id, metadata)
  values (p_guild_id, v_user_id, 'member_' || p_action, p_target_user_id, jsonb_build_object('reason', btrim(coalesce(p_reason, ''))));
  return v_member;
end;
$$;

create or replace function public.apply_guild_expansion_item(p_guild_id uuid, p_item_id uuid)
returns public.guilds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_guild public.guilds;
  v_item public.shop_items;
  v_inventory public.user_item_inventory;
  v_increase smallint;
  v_cap smallint;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not public.can_manage_guild(p_guild_id) then raise exception using errcode = '42501', message = 'Only Guild managers can expand this Guild'; end if;
  select g.* into v_guild from public.guilds as g where g.id = p_guild_id for update;
  select si.* into v_item from public.shop_items as si where si.id = p_item_id and si.is_active = true for update;
  if not found then raise exception using errcode = 'P0002', message = 'Guild expansion item not found'; end if;
  v_increase := case v_item.slug when 'guild-expansion-8' then 8 when 'guild-expansion-16' then 16 when 'guild-expansion-32' then 32 else 0 end;
  if v_increase = 0 then raise exception using errcode = '22023', message = 'This item cannot expand a Guild'; end if;
  select gs.max_members_cap into v_cap from public.guild_settings as gs where gs.id = 'default';
  select ui.* into v_inventory from public.user_item_inventory as ui where ui.user_id = v_user_id and ui.item_id = p_item_id and ui.quantity > 0 for update;
  if not found then raise exception using errcode = '22023', message = 'You do not own this Guild expansion item'; end if;
  if v_guild.max_members + v_increase > v_cap then raise exception using errcode = '22023', message = 'Guild capacity cap reached'; end if;
  if v_inventory.quantity = 1 then delete from public.user_item_inventory where id = v_inventory.id; else update public.user_item_inventory set quantity = quantity - 1 where id = v_inventory.id; end if;
  update public.guilds set max_members = max_members + v_increase where id = p_guild_id returning * into v_guild;
  insert into public.guild_audit_logs (guild_id, actor_id, action, metadata) values (p_guild_id, v_user_id, 'capacity_expanded', jsonb_build_object('item_slug', v_item.slug, 'increase', v_increase));
  return v_guild;
end;
$$;

create or replace function public.create_guild_announcement(p_guild_id uuid, p_title text, p_body text, p_is_pinned boolean default false)
returns public.guild_announcements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_announcement public.guild_announcements;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not public.can_manage_guild(p_guild_id) then raise exception using errcode = '42501', message = 'Only Guild managers can post announcements'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 160 or p_body is null or char_length(btrim(p_body)) not between 1 and 3000 then raise exception using errcode = '22023', message = 'Invalid announcement'; end if;
  insert into public.guild_announcements (guild_id, author_id, title, body, is_pinned)
  values (p_guild_id, v_user_id, btrim(p_title), btrim(p_body), coalesce(p_is_pinned, false))
  returning * into v_announcement;
  insert into public.guild_audit_logs (guild_id, actor_id, action) values (p_guild_id, v_user_id, 'announcement_created');
  return v_announcement;
end;
$$;

create or replace function public.get_guild_creation_settings()
returns table (creation_mode text, free_until timestamptz, founder_item_slug text, max_members_cap smallint)
language sql
stable
security invoker
set search_path = ''
as $$
  select gs.creation_mode, gs.free_until, gs.founder_item_slug, gs.max_members_cap
  from public.guild_settings as gs where gs.id = 'default';
$$;

create or replace function public.admin_update_guild_settings(
  p_creation_mode text,
  p_free_until timestamptz,
  p_founder_item_slug text,
  p_max_members_cap smallint
)
returns public.guild_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_settings public.guild_settings;
begin
  if v_user_id is null or not public.is_current_user_admin() then raise exception using errcode = '42501', message = 'Admin access required'; end if;
  if p_creation_mode not in ('free', 'item') or p_founder_item_slug is null or char_length(p_founder_item_slug) not between 3 and 80 or p_max_members_cap not between 32 and 256 then raise exception using errcode = '22023', message = 'Invalid Guild settings'; end if;
  if not exists (select 1 from public.shop_items where slug = p_founder_item_slug) then raise exception using errcode = 'P0002', message = 'Founder item not found'; end if;
  update public.guild_settings
  set creation_mode = p_creation_mode, free_until = p_free_until, founder_item_slug = p_founder_item_slug, max_members_cap = p_max_members_cap, updated_by = v_user_id
  where id = 'default'
  returning * into v_settings;
  return v_settings;
end;
$$;

-- Guild EXP is earned from a confirmed Match whose Group references that
-- Guild. The trigger is internal, idempotent, and not callable by clients.
create or replace function public.award_guild_match_exp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guild_id uuid;
  v_player record;
  v_added boolean;
  v_amount bigint := 50;
begin
  if new.settlement_status <> 'applied' then return new; end if;
  select g.guild_id into v_guild_id
  from public.matches as m
  join public.groups as g on g.id = m.group_id
  where m.id = new.match_id;
  if v_guild_id is null then return new; end if;

  for v_player in
    select distinct mp.user_id
    from public.match_participants as mp
    join public.guild_members as gm
      on gm.guild_id = v_guild_id
      and gm.user_id = mp.user_id
      and gm.membership_status = 'active'
    where mp.match_id = new.match_id
  loop
    insert into public.guild_exp_ledger (guild_id, user_id, source_type, amount, match_id, metadata)
    values (v_guild_id, v_player.user_id, 'match', v_amount, new.match_id, jsonb_build_object('reason', 'confirmed_match_participation'))
    on conflict (guild_id, user_id, match_id, source_type) do nothing;
    v_added := found;
    if v_added then
      update public.guilds
      set exp_total = exp_total + v_amount,
          level = least(99, greatest(1, floor((exp_total + v_amount) / 1000)::integer + 1))
      where id = v_guild_id;
      update public.guild_members
      set contribution_exp = contribution_exp + v_amount
      where guild_id = v_guild_id and user_id = v_player.user_id and membership_status = 'active';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists match_settlements_award_guild_exp on public.match_settlements;
create trigger match_settlements_award_guild_exp
after insert on public.match_settlements
for each row execute function public.award_guild_match_exp();

revoke all on function public.award_guild_match_exp() from public, anon, authenticated;

revoke all on function public.create_guild(text, text, text, text, text, text, text, text, text)
from public, anon;
grant execute on function public.create_guild(text, text, text, text, text, text, text, text, text)
to authenticated;

-- Link a Group to a Guild at creation time. The group owner must be an active
-- Guild manager; Match rows continue to use group_id as their sole source.
drop function if exists public.create_group(text, text, text, timestamptz, smallint, smallint, smallint, smallint, text, numeric, text, uuid);

create or replace function public.create_group(
  p_title text,
  p_description text,
  p_location_text text,
  p_starts_at timestamptz,
  p_duration_minutes smallint,
  p_capacity smallint,
  p_min_level smallint,
  p_max_level smallint,
  p_play_type text,
  p_entry_fee numeric,
  p_notes text,
  p_venue_id uuid default null,
  p_guild_id uuid default null
)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group public.groups;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not exists (select 1 from public.profiles where id = v_user_id and profile_completed_at is not null) then raise exception using errcode = '42501', message = 'Profile completion required'; end if;
  if p_starts_at <= timezone('utc', now()) + interval '15 minutes' then raise exception using errcode = '22023', message = 'Group must start at least 15 minutes from now'; end if;
  if p_venue_id is not null and not exists (select 1 from public.venues where id = p_venue_id and status = 'active') then raise exception using errcode = '22023', message = 'Selected venue is not active'; end if;
  if p_guild_id is not null and not exists (select 1 from public.guild_members where guild_id = p_guild_id and user_id = v_user_id and membership_status = 'active' and role in ('guild_master', 'officer')) then raise exception using errcode = '42501', message = 'Only a Guild manager can reference a Guild'; end if;
  insert into public.groups (owner_id, venue_id, guild_id, title, description, location_text, starts_at, duration_minutes, capacity, min_level, max_level, play_type, entry_fee, status, notes)
  values (v_user_id, p_venue_id, p_guild_id, trim(p_title), nullif(trim(coalesce(p_description, '')), ''), trim(p_location_text), p_starts_at, p_duration_minutes, p_capacity, p_min_level, p_max_level, p_play_type, p_entry_fee, 'published', nullif(trim(coalesce(p_notes, '')), ''))
  returning * into v_group;
  insert into public.group_members (group_id, user_id, membership_status) values (v_group.id, v_user_id, 'registered');
  if v_group.capacity <= 1 then update public.groups set status = 'full' where id = v_group.id returning * into v_group; end if;
  return v_group;
end;
$$;

revoke all on function public.create_group(text, text, text, timestamptz, smallint, smallint, smallint, smallint, text, numeric, text, uuid, uuid) from public, anon;
grant execute on function public.create_group(text, text, text, timestamptz, smallint, smallint, smallint, smallint, text, numeric, text, uuid, uuid) to authenticated;

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
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select p.* into v_profile from public.profiles as p where p.id = v_user_id;
  if not found or v_profile.profile_completed_at is null then raise exception using errcode = '42501', message = 'Profile completion required'; end if;

  select g.* into v_guild from public.guilds as g where g.id = p_guild_id for update;
  if not found or v_guild.status <> 'active' then raise exception using errcode = 'P0002', message = 'Guild not found'; end if;
  if exists (select 1 from public.guild_bans where guild_id = p_guild_id and user_id = v_user_id) then
    raise exception using errcode = '42501', message = 'You are banned from this Guild';
  end if;

  select gm.membership_status into v_existing_status
  from public.guild_members as gm
  where gm.guild_id = p_guild_id and gm.user_id = v_user_id;
  if v_existing_status = 'active' then
    select count(*)::integer into v_member_count from public.guild_members where guild_id = p_guild_id and membership_status = 'active';
    return query select p_guild_id, 'active'::text, v_member_count, v_guild.max_members, v_guild.status;
    return;
  end if;
  if exists (select 1 from public.guild_members where user_id = v_user_id and membership_status = 'active') then
    raise exception using errcode = '22023', message = 'You already belong to an active Guild';
  end if;

  select count(*)::integer into v_member_count from public.guild_members where guild_id = p_guild_id and membership_status = 'active';
  if v_guild.join_policy = 'invite_only' then
    raise exception using errcode = '22023', message = 'This Guild accepts invitations only';
  elsif v_guild.join_policy = 'request' or v_member_count >= v_guild.max_members then
    insert into public.guild_join_requests (guild_id, user_id, status)
    values (p_guild_id, v_user_id, 'pending')
    on conflict (guild_id, user_id) where status = 'pending' do nothing;
    insert into public.notifications (user_id, notification_type, title, body, href)
    select gm.user_id, 'guild_join_request', 'มีคำขอเข้าร่วม Guild ใหม่', v_profile.display_name || ' ขอเข้าร่วม ' || v_guild.name, '/guilds/' || p_guild_id::text
    from public.guild_members as gm
    where gm.guild_id = p_guild_id and gm.membership_status = 'active' and gm.role in ('guild_master', 'officer');
    v_result_status := 'pending';
  else
    insert into public.guild_members (guild_id, user_id, role, membership_status)
    values (p_guild_id, v_user_id, 'member', 'active')
    on conflict (guild_id, user_id) do update set membership_status = 'active', role = 'member', joined_at = timezone('utc', now());
    v_member_count := v_member_count + 1;
    v_result_status := 'active';
    insert into public.guild_audit_logs (guild_id, actor_id, action) values (p_guild_id, v_user_id, 'member_joined');
  end if;

  return query select p_guild_id, v_result_status, v_member_count, v_guild.max_members, v_guild.status;
end;
$$;

create or replace function public.leave_guild(p_guild_id uuid)
returns public.guild_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_member public.guild_members;
  v_guild public.guilds;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select g.* into v_guild from public.guilds as g where g.id = p_guild_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Guild not found'; end if;
  select gm.* into v_member from public.guild_members as gm where gm.guild_id = p_guild_id and gm.user_id = v_user_id for update;
  if not found or v_member.membership_status <> 'active' then raise exception using errcode = '22023', message = 'You are not an active Guild member'; end if;
  if v_member.role = 'guild_master' then raise exception using errcode = '22023', message = 'Guild Master must transfer ownership before leaving'; end if;
  update public.guild_members set membership_status = 'left' where guild_id = p_guild_id and user_id = v_user_id returning * into v_member;
  insert into public.guild_audit_logs (guild_id, actor_id, action) values (p_guild_id, v_user_id, 'member_left');
  return v_member;
end;
$$;

create or replace function public.review_guild_join_request(p_request_id uuid, p_decision text)
returns public.guild_join_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_request public.guild_join_requests;
  v_guild public.guilds;
  v_member_count integer;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_decision not in ('approve', 'reject') then raise exception using errcode = '22023', message = 'Invalid request decision'; end if;
  select r.* into v_request from public.guild_join_requests as r where r.id = p_request_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Join request not found'; end if;
  if not public.can_manage_guild(v_request.guild_id) then raise exception using errcode = '42501', message = 'Only Guild managers can review requests'; end if;
  select g.* into v_guild from public.guilds as g where g.id = v_request.guild_id for update;
  if v_request.status <> 'pending' then raise exception using errcode = '22023', message = 'Join request is no longer pending'; end if;

  if p_decision = 'approve' then
    select count(*)::integer into v_member_count from public.guild_members where guild_id = v_request.guild_id and membership_status = 'active';
    if v_member_count >= v_guild.max_members then raise exception using errcode = '22023', message = 'Guild member capacity is full'; end if;
    if exists (select 1 from public.guild_members where user_id = v_request.user_id and membership_status = 'active') then
      raise exception using errcode = '22023', message = 'Applicant already belongs to an active Guild';
    end if;
    insert into public.guild_members (guild_id, user_id, role, membership_status)
    values (v_request.guild_id, v_request.user_id, 'member', 'active')
    on conflict (guild_id, user_id) do update set membership_status = 'active', role = 'member', joined_at = timezone('utc', now());
    update public.guild_join_requests set status = 'approved', reviewed_by = v_user_id, reviewed_at = timezone('utc', now()) where id = p_request_id returning * into v_request;
    insert into public.notifications (user_id, notification_type, title, body, href)
    values (v_request.user_id, 'guild_join_approved', 'คำขอเข้า Guild ได้รับการอนุมัติ', 'ยินดีต้อนรับสู่ ' || v_guild.name, '/guilds/' || v_guild.id::text);
    insert into public.guild_audit_logs (guild_id, actor_id, action, target_user_id) values (v_guild.id, v_user_id, 'join_request_approved', v_request.user_id);
  else
    update public.guild_join_requests set status = 'rejected', reviewed_by = v_user_id, reviewed_at = timezone('utc', now()) where id = p_request_id returning * into v_request;
    insert into public.notifications (user_id, notification_type, title, body, href)
    values (v_request.user_id, 'guild_join_rejected', 'คำขอเข้า Guild ยังไม่ได้รับการอนุมัติ', 'คุณสามารถลองค้นหา Guild อื่นได้', '/guilds');
  end if;
  return v_request;
end;
$$;

revoke all on function public.create_guild_invite(uuid, uuid), public.accept_guild_invite(text),
  public.update_guild(uuid, text, text, text, text, text, text, text, text),
  public.manage_guild_member(uuid, uuid, text, text), public.apply_guild_expansion_item(uuid, uuid),
  public.create_guild_announcement(uuid, text, text, boolean), public.get_guild_creation_settings(),
  public.admin_update_guild_settings(text, timestamptz, text, smallint),
  public.join_guild(uuid), public.leave_guild(uuid), public.review_guild_join_request(uuid, text)
from public, anon;
grant execute on function public.create_guild_invite(uuid, uuid), public.accept_guild_invite(text),
  public.update_guild(uuid, text, text, text, text, text, text, text, text),
  public.manage_guild_member(uuid, uuid, text, text), public.apply_guild_expansion_item(uuid, uuid),
  public.create_guild_announcement(uuid, text, text, boolean), public.get_guild_creation_settings(),
  public.admin_update_guild_settings(text, timestamptz, text, smallint),
  public.join_guild(uuid), public.leave_guild(uuid), public.review_guild_join_request(uuid, text)
to authenticated;
