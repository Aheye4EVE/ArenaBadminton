-- Keep public profile cards on a dedicated, non-sensitive directory table.
-- This lets the public-facing views use SECURITY INVOKER without exposing the
-- private address/GPS/LINE columns in profiles.

create table if not exists public.public_profile_directory (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  handle text not null,
  avatar_url text,
  bio text,
  level smallint not null,
  exp_total bigint not null,
  skill_bp integer not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists public_profile_directory_bp_idx
  on public.public_profile_directory (skill_bp desc, level desc, exp_total desc, id);
create index if not exists public_profile_directory_handle_idx
  on public.public_profile_directory (lower(handle));

revoke all on public.public_profile_directory from public, anon, authenticated;
grant select on public.public_profile_directory to authenticated;
alter table public.public_profile_directory enable row level security;

drop policy if exists public_profile_directory_select_authenticated on public.public_profile_directory;
create policy public_profile_directory_select_authenticated on public.public_profile_directory
for select to authenticated
using (true);

create or replace function public.sync_public_profile_directory()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  insert into public.public_profile_directory (
    id, display_name, handle, avatar_url, bio, level, exp_total,
    skill_bp, created_at, updated_at
  )
  values (
    new.id, new.display_name, new.handle, new.avatar_url, new.bio, new.level,
    new.exp_total, new.skill_bp, new.created_at, new.updated_at
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    handle = excluded.handle,
    avatar_url = excluded.avatar_url,
    bio = excluded.bio,
    level = excluded.level,
    exp_total = excluded.exp_total,
    skill_bp = excluded.skill_bp,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

revoke all on function public.sync_public_profile_directory() from public, anon, authenticated;

drop trigger if exists profiles_sync_public_profile_directory on public.profiles;
create trigger profiles_sync_public_profile_directory
after insert or update of display_name, handle, avatar_url, bio, level, exp_total, skill_bp, created_at, updated_at
on public.profiles
for each row execute function public.sync_public_profile_directory();

insert into public.public_profile_directory (
  id, display_name, handle, avatar_url, bio, level, exp_total,
  skill_bp, created_at, updated_at
)
select id, display_name, handle, avatar_url, bio, level, exp_total,
  skill_bp, created_at, updated_at
from public.profiles
on conflict (id) do update set
  display_name = excluded.display_name,
  handle = excluded.handle,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  level = excluded.level,
  exp_total = excluded.exp_total,
  skill_bp = excluded.skill_bp,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

-- Rebuild the safe views over the directory. Drop dependent views first.
drop view if exists public.public_match_participants;
drop view if exists public.public_group_members;
drop view if exists public.public_profiles;

create view public.public_profiles
with (security_invoker = true)
as
select id, display_name, handle, avatar_url, bio, level, exp_total,
  skill_bp, created_at, updated_at
from public.public_profile_directory;

create view public.public_group_members
with (security_invoker = true)
as
select
  gm.group_id,
  gm.user_id,
  gm.membership_status,
  gm.joined_at,
  pp.display_name,
  pp.handle,
  pp.avatar_url,
  pp.level
from public.group_members as gm
join public.groups as g on g.id = gm.group_id
join public.public_profile_directory as pp on pp.id = gm.user_id
where g.status <> 'draft'
  and gm.membership_status <> 'cancelled';

create view public.public_match_participants
with (security_invoker = true)
as
select
  mp.match_id,
  mp.user_id,
  mp.team,
  pp.display_name,
  pp.handle,
  pp.avatar_url,
  pp.level,
  coalesce(ci.status, 'pending') as check_in_status,
  ci.checked_in_at
from public.match_participants as mp
join public.matches as m on m.id = mp.match_id
join public.groups as g on g.id = m.group_id
join public.public_profile_directory as pp on pp.id = mp.user_id
left join public.match_check_ins as ci
  on ci.match_id = mp.match_id and ci.user_id = mp.user_id
where g.status <> 'draft';

revoke all on public.public_profiles, public.public_group_members,
  public.public_match_participants from public, anon, authenticated;
grant select on public.public_profiles, public.public_group_members,
  public.public_match_participants to authenticated;
