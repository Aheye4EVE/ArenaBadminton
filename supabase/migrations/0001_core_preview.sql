-- Arena-Badminton Phase 1: identity, venues, groups, and membership foundation.
--
-- This migration intentionally does not activate match settlement, EXP/BP
-- formulas, shop items, badges, trophies, posts, or payments. Those domains
-- need their own audited ledgers and business rules in later phases.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'ผู้เล่นใหม่',
  handle text not null,
  avatar_url text,
  bio text,
  level smallint not null default 1,
  exp_total bigint not null default 0,
  skill_bp integer not null default 1000,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 80),
  constraint profiles_handle_length check (char_length(handle) between 3 and 40),
  constraint profiles_level_range check (level between 1 and 99),
  constraint profiles_exp_total_nonnegative check (exp_total >= 0),
  constraint profiles_skill_bp_floor check (skill_bp >= 1000)
);

create unique index if not exists profiles_handle_lower_uidx
  on public.profiles (lower(handle));

create table if not exists public.level_definitions (
  level smallint primary key,
  required_exp bigint not null unique,
  label text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint level_definitions_level_range check (level between 1 and 99),
  constraint level_definitions_exp_nonnegative check (required_exp >= 0),
  constraint level_definitions_label_length check (char_length(label) between 1 and 80)
);

insert into public.level_definitions (level, required_exp, label)
values (1, 0, 'ผู้เล่นใหม่')
on conflict (level) do nothing;

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  district text,
  address text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  cover_image_url text,
  court_count smallint not null default 1,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint venues_name_length check (char_length(name) between 1 and 160),
  constraint venues_court_count_positive check (court_count > 0),
  constraint venues_status_allowed check (status in ('active', 'inactive', 'pending')),
  constraint venues_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint venues_longitude_range check (longitude is null or longitude between -180 and 180)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete set null,
  title text not null,
  description text,
  location_text text not null,
  starts_at timestamptz not null,
  duration_minutes smallint not null default 120,
  capacity smallint not null,
  min_level smallint not null default 1,
  max_level smallint not null default 99,
  play_type text not null default 'open',
  entry_fee numeric(10, 2) not null default 0,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint groups_title_length check (char_length(title) between 1 and 160),
  constraint groups_location_length check (char_length(location_text) between 1 and 240),
  constraint groups_duration_range check (duration_minutes between 30 and 480),
  constraint groups_capacity_positive check (capacity > 0),
  constraint groups_min_level_range check (min_level between 1 and 99),
  constraint groups_max_level_range check (max_level between 1 and 99),
  constraint groups_level_order check (min_level <= max_level),
  constraint groups_play_type_allowed check (play_type in ('open', 'friendly', 'tournament', 'training')),
  constraint groups_entry_fee_nonnegative check (entry_fee >= 0),
  constraint groups_status_allowed check (status in ('draft', 'published', 'full', 'cancelled', 'completed'))
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  membership_status text not null default 'registered',
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (group_id, user_id),
  constraint group_members_status_allowed check (
    membership_status in ('registered', 'waitlisted', 'cancelled', 'attended', 'no_show')
  )
);

create index if not exists venues_status_district_idx
  on public.venues (status, district);

create index if not exists venues_created_by_idx
  on public.venues (created_by);

create index if not exists groups_status_starts_at_idx
  on public.groups (status, starts_at);

create index if not exists groups_owner_id_idx
  on public.groups (owner_id);

create index if not exists groups_venue_starts_at_idx
  on public.groups (venue_id, starts_at);

create index if not exists group_members_user_id_idx
  on public.group_members (user_id);

create index if not exists group_members_group_status_idx
  on public.group_members (group_id, membership_status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists venues_set_updated_at on public.venues;
create trigger venues_set_updated_at
before update on public.venues
for each row execute function public.set_updated_at();

drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

-- Explicit grants keep the Data API surface closed to anonymous callers.
revoke all on public.profiles, public.level_definitions, public.venues,
  public.groups, public.group_members from public, anon;

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.level_definitions to authenticated;
grant select, insert, update on public.venues to authenticated;
grant select, insert, update on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;

alter table public.profiles enable row level security;
alter table public.level_definitions enable row level security;
alter table public.venues enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- The migration owns these named policies. Re-running it replaces only these
-- policies and leaves unrelated future policy names untouched.
drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_select_authenticated on public.profiles
for select to authenticated
using (true);
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists level_definitions_select_authenticated on public.level_definitions;
create policy level_definitions_select_authenticated on public.level_definitions
for select to authenticated
using (true);

drop policy if exists venues_select_authenticated on public.venues;
drop policy if exists venues_insert_creator on public.venues;
drop policy if exists venues_update_creator on public.venues;
create policy venues_select_authenticated on public.venues
for select to authenticated
using (status = 'active' or created_by = (select auth.uid()));
create policy venues_insert_creator on public.venues
for insert to authenticated
with check (created_by = (select auth.uid()));
create policy venues_update_creator on public.venues
for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

drop policy if exists groups_select_authenticated on public.groups;
drop policy if exists groups_insert_owner on public.groups;
drop policy if exists groups_update_owner on public.groups;
create policy groups_select_authenticated on public.groups
for select to authenticated
using (status <> 'draft' or owner_id = (select auth.uid()));
create policy groups_insert_owner on public.groups
for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy groups_update_owner on public.groups
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists group_members_select_authenticated on public.group_members;
drop policy if exists group_members_insert_self on public.group_members;
drop policy if exists group_members_update_owner on public.group_members;
drop policy if exists group_members_delete_self_or_owner on public.group_members;
create policy group_members_select_authenticated on public.group_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.groups as visible_group
    where visible_group.id = group_members.group_id
      and visible_group.status <> 'draft'
  )
  or exists (
    select 1
    from public.groups as owned_group
    where owned_group.id = group_members.group_id
      and owned_group.owner_id = (select auth.uid())
  )
);
create policy group_members_insert_self on public.group_members
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.groups as joinable_group
    where joinable_group.id = group_members.group_id
      and joinable_group.status = 'published'
  )
);
create policy group_members_update_owner on public.group_members
for update to authenticated
using (
  exists (
    select 1
    from public.groups as owned_group
    where owned_group.id = group_members.group_id
      and owned_group.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.groups as owned_group
    where owned_group.id = group_members.group_id
      and owned_group.owner_id = (select auth.uid())
  )
);
create policy group_members_delete_self_or_owner on public.group_members
for delete to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.groups as owned_group
    where owned_group.id = group_members.group_id
      and owned_group.owner_id = (select auth.uid())
  )
);
