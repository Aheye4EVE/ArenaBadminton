-- Arena-Badminton: profile media, BP rank titles, and email verification policy.
--
-- Profile image cropping is metadata-only: the original R2 object is retained
-- and the crop position is stored as object-position percentages. This keeps
-- the source resolution intact while allowing every UI surface to frame it.

begin;

alter table public.profiles
  add column if not exists avatar_focus_x numeric(5, 2) not null default 50,
  add column if not exists avatar_focus_y numeric(5, 2) not null default 50,
  add column if not exists profile_background_url text,
  add column if not exists profile_background_focus_x numeric(5, 2) not null default 50,
  add column if not exists profile_background_focus_y numeric(5, 2) not null default 50;

-- LINE is no longer an Arena login/profile contact surface. Keep the legacy
-- columns for backward-compatible schema reads, but remove stored contact and
-- provider subjects so the application cannot continue using that connection.
update public.profiles
set line_user_id = null,
    line_contact_id = null
where line_user_id is not null or line_contact_id is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_focus_x_range' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_avatar_focus_x_range check (avatar_focus_x between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_focus_y_range' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_avatar_focus_y_range check (avatar_focus_y between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_background_focus_x_range' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_background_focus_x_range check (profile_background_focus_x between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_background_focus_y_range' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_background_focus_y_range check (profile_background_focus_y between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_background_url_https' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_background_url_https check (profile_background_url is null or profile_background_url ~* '^https://');
  end if;
end $$;

-- Keep the safe public directory in sync with the new media framing metadata.
alter table public.public_profile_directory
  add column if not exists avatar_focus_x numeric(5, 2) not null default 50,
  add column if not exists avatar_focus_y numeric(5, 2) not null default 50,
  add column if not exists profile_background_url text,
  add column if not exists profile_background_focus_x numeric(5, 2) not null default 50,
  add column if not exists profile_background_focus_y numeric(5, 2) not null default 50;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'public_profile_directory_avatar_focus_x_range' and conrelid = 'public.public_profile_directory'::regclass) then
    alter table public.public_profile_directory add constraint public_profile_directory_avatar_focus_x_range check (avatar_focus_x between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'public_profile_directory_avatar_focus_y_range' and conrelid = 'public.public_profile_directory'::regclass) then
    alter table public.public_profile_directory add constraint public_profile_directory_avatar_focus_y_range check (avatar_focus_y between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'public_profile_directory_background_focus_x_range' and conrelid = 'public.public_profile_directory'::regclass) then
    alter table public.public_profile_directory add constraint public_profile_directory_background_focus_x_range check (profile_background_focus_x between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'public_profile_directory_background_focus_y_range' and conrelid = 'public.public_profile_directory'::regclass) then
    alter table public.public_profile_directory add constraint public_profile_directory_background_focus_y_range check (profile_background_focus_y between 0 and 100);
  end if;
end $$;

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
    id, display_name, handle, avatar_url, bio, level, exp_total, skill_bp,
    avatar_focus_x, avatar_focus_y, profile_background_url,
    profile_background_focus_x, profile_background_focus_y,
    created_at, updated_at
  )
  values (
    new.id, new.display_name, new.handle, new.avatar_url, new.bio, new.level,
    new.exp_total, new.skill_bp, new.avatar_focus_x, new.avatar_focus_y,
    new.profile_background_url, new.profile_background_focus_x,
    new.profile_background_focus_y, new.created_at, new.updated_at
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    handle = excluded.handle,
    avatar_url = excluded.avatar_url,
    bio = excluded.bio,
    level = excluded.level,
    exp_total = excluded.exp_total,
    skill_bp = excluded.skill_bp,
    avatar_focus_x = excluded.avatar_focus_x,
    avatar_focus_y = excluded.avatar_focus_y,
    profile_background_url = excluded.profile_background_url,
    profile_background_focus_x = excluded.profile_background_focus_x,
    profile_background_focus_y = excluded.profile_background_focus_y,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

revoke all on function public.sync_public_profile_directory() from public, anon, authenticated;

drop trigger if exists profiles_sync_public_profile_directory on public.profiles;
create trigger profiles_sync_public_profile_directory
after insert or update of display_name, handle, avatar_url, bio, level, exp_total,
  skill_bp, avatar_focus_x, avatar_focus_y, profile_background_url,
  profile_background_focus_x, profile_background_focus_y, created_at, updated_at
on public.profiles
for each row execute function public.sync_public_profile_directory();

insert into public.public_profile_directory (
  id, display_name, handle, avatar_url, bio, level, exp_total, skill_bp,
  avatar_focus_x, avatar_focus_y, profile_background_url,
  profile_background_focus_x, profile_background_focus_y, created_at, updated_at
)
select id, display_name, handle, avatar_url, bio, level, exp_total, skill_bp,
  avatar_focus_x, avatar_focus_y, profile_background_url,
  profile_background_focus_x, profile_background_focus_y, created_at, updated_at
from public.profiles
on conflict (id) do update set
  display_name = excluded.display_name,
  handle = excluded.handle,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  level = excluded.level,
  exp_total = excluded.exp_total,
  skill_bp = excluded.skill_bp,
  avatar_focus_x = excluded.avatar_focus_x,
  avatar_focus_y = excluded.avatar_focus_y,
  profile_background_url = excluded.profile_background_url,
  profile_background_focus_x = excluded.profile_background_focus_x,
  profile_background_focus_y = excluded.profile_background_focus_y,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

-- BP titles are system-controlled. The thresholds are a calibrated product
-- ladder around the 1,000 BP starting floor, not a purchasable stat.
create table if not exists public.skill_rank_definitions (
  tier smallint primary key,
  name text not null,
  min_bp integer not null unique,
  color text not null default 'blue',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint skill_rank_definitions_tier_range check (tier between 1 and 10),
  constraint skill_rank_definitions_min_bp_floor check (min_bp >= 1000),
  constraint skill_rank_definitions_name_length check (char_length(name) between 1 and 80)
);

insert into public.skill_rank_definitions (tier, name, min_bp, color)
values
  (1, 'มือใหม่', 1000, 'slate'),
  (2, 'มือสมัครเล่น', 1100, 'green'),
  (3, 'มือกลาง', 1250, 'blue'),
  (4, 'มือกลางค่อนเก่ง', 1450, 'indigo'),
  (5, 'มือดี', 1700, 'purple'),
  (6, 'มือสูง', 2000, 'pink'),
  (7, 'มือแข่งขัน', 2350, 'orange'),
  (8, 'มือแข่งขันชั้นนำ', 2750, 'red'),
  (9, 'มืออาชีพ', 3200, 'gold'),
  (10, 'ตำนานสนาม', 3800, 'rainbow')
on conflict (tier) do update set
  name = excluded.name,
  min_bp = excluded.min_bp,
  color = excluded.color,
  updated_at = timezone('utc', now());

revoke all on public.skill_rank_definitions from public, anon, authenticated;
grant select on public.skill_rank_definitions to authenticated;
alter table public.skill_rank_definitions enable row level security;
drop policy if exists skill_rank_definitions_select_authenticated on public.skill_rank_definitions;
create policy skill_rank_definitions_select_authenticated on public.skill_rank_definitions
for select to authenticated using (true);

-- Application policy for signup. The actual Supabase project-level email
-- confirmation setting remains an external Auth setting; when this policy is
-- off, the app route can auto-confirm only if a server-only service key is set.
create table if not exists public.email_verification_settings (
  id text primary key default 'default',
  email_verification_required boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint email_verification_settings_singleton check (id = 'default')
);

insert into public.email_verification_settings (id, email_verification_required)
values ('default', true)
on conflict (id) do nothing;

revoke all on public.email_verification_settings from public, anon, authenticated;
grant select on public.email_verification_settings to anon, authenticated;
alter table public.email_verification_settings enable row level security;
drop policy if exists email_verification_settings_select_default on public.email_verification_settings;
create policy email_verification_settings_select_default on public.email_verification_settings
for select to anon, authenticated using (id = 'default');

create or replace function public.admin_update_email_verification_settings(p_required boolean)
returns public.email_verification_settings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_setting public.email_verification_settings;
begin
  if v_user_id is null or not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  update public.email_verification_settings
  set email_verification_required = coalesce(p_required, true),
      updated_by = v_user_id,
      updated_at = timezone('utc', now())
  where id = 'default'
  returning * into v_setting;

  return v_setting;
end;
$$;

revoke all on function public.admin_update_email_verification_settings(boolean) from public, anon;
grant execute on function public.admin_update_email_verification_settings(boolean) to authenticated;

-- Replace the legacy profile RPCs with a single explicit contract that also
-- accepts TAGNAME and non-destructive media framing metadata.
drop function if exists public.complete_profile(text, text, text, text, text, text, text, text, numeric, numeric, text);
drop function if exists public.complete_profile(text, text, text, text, text, text, text, text, text, numeric, numeric, text, numeric, numeric, text, numeric, numeric);
create function public.complete_profile(
  p_handle text,
  p_display_name text,
  p_bio text,
  p_address_line text,
  p_province text,
  p_district text,
  p_subdistrict text,
  p_postal_code text,
  p_latitude numeric,
  p_longitude numeric,
  p_avatar_url text,
  p_avatar_focus_x numeric,
  p_avatar_focus_y numeric,
  p_profile_background_url text,
  p_background_focus_x numeric,
  p_background_focus_y numeric
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_handle is null or lower(btrim(p_handle)) !~ '^[a-z0-9_]{3,40}$' then
    raise exception using errcode = '22023', message = 'Invalid handle';
  end if;
  if p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'Invalid display name';
  end if;
  if p_bio is not null and char_length(btrim(p_bio)) > 280 then
    raise exception using errcode = '22023', message = 'Invalid bio';
  end if;
  if p_address_line is null or char_length(btrim(p_address_line)) not between 1 and 240
    or p_province is null or char_length(btrim(p_province)) not between 1 and 80
    or p_district is null or char_length(btrim(p_district)) not between 1 and 80
    or p_subdistrict is null or char_length(btrim(p_subdistrict)) not between 1 and 80
    or p_postal_code is null or p_postal_code !~ '^[0-9]{5}$' then
    raise exception using errcode = '22023', message = 'Invalid profile location';
  end if;
  if (p_latitude is null) <> (p_longitude is null) then
    raise exception using errcode = '22023', message = 'Coordinates must be provided together';
  end if;
  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then
    raise exception using errcode = '22023', message = 'Invalid latitude';
  end if;
  if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then
    raise exception using errcode = '22023', message = 'Invalid longitude';
  end if;
  if p_avatar_url is not null and (char_length(p_avatar_url) > 2048 or p_avatar_url !~* '^https://') then
    raise exception using errcode = '22023', message = 'Invalid avatar URL';
  end if;
  if p_profile_background_url is not null and (char_length(p_profile_background_url) > 2048 or p_profile_background_url !~* '^https://') then
    raise exception using errcode = '22023', message = 'Invalid profile background URL';
  end if;
  if coalesce(p_avatar_focus_x, 50) not between 0 and 100 or coalesce(p_avatar_focus_y, 50) not between 0 and 100
    or coalesce(p_background_focus_x, 50) not between 0 and 100 or coalesce(p_background_focus_y, 50) not between 0 and 100 then
    raise exception using errcode = '22023', message = 'Invalid media focus';
  end if;

  insert into public.profiles (
    id, display_name, handle, avatar_url, bio, line_user_id, line_contact_id,
    avatar_focus_x, avatar_focus_y, profile_background_url,
    profile_background_focus_x, profile_background_focus_y,
    address_line, province, district, subdistrict, postal_code, latitude,
    longitude, location_updated_at, profile_completed_at
  )
  values (
    v_user_id, btrim(p_display_name), lower(btrim(p_handle)), p_avatar_url,
    nullif(btrim(p_bio), ''), null, null, coalesce(p_avatar_focus_x, 50),
    coalesce(p_avatar_focus_y, 50), p_profile_background_url,
    coalesce(p_background_focus_x, 50), coalesce(p_background_focus_y, 50),
    btrim(p_address_line), btrim(p_province), btrim(p_district),
    btrim(p_subdistrict), btrim(p_postal_code), p_latitude, p_longitude,
    case when p_latitude is null then null else timezone('utc', now()) end,
    timezone('utc', now())
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    handle = excluded.handle,
    avatar_url = excluded.avatar_url,
    bio = excluded.bio,
    line_user_id = null,
    line_contact_id = null,
    avatar_focus_x = excluded.avatar_focus_x,
    avatar_focus_y = excluded.avatar_focus_y,
    profile_background_url = excluded.profile_background_url,
    profile_background_focus_x = excluded.profile_background_focus_x,
    profile_background_focus_y = excluded.profile_background_focus_y,
    address_line = excluded.address_line,
    province = excluded.province,
    district = excluded.district,
    subdistrict = excluded.subdistrict,
    postal_code = excluded.postal_code,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    location_updated_at = case when excluded.latitude is null then null else timezone('utc', now()) end,
    profile_completed_at = coalesce(public.profiles.profile_completed_at, timezone('utc', now()))
  returning * into v_profile;

  return v_profile;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'Handle already in use';
end;
$$;

revoke all on function public.complete_profile(text, text, text, text, text, text, text, text, numeric, numeric, text, numeric, numeric, text, numeric, numeric) from public, anon;
grant execute on function public.complete_profile(text, text, text, text, text, text, text, text, numeric, numeric, text, numeric, numeric, text, numeric, numeric) to authenticated;

drop function if exists public.update_profile(text, text, text, text, text, text, text, text, text, numeric, numeric, text);
drop function if exists public.update_profile(text, text, text, text, text, text, text, text, text, numeric, numeric, text, numeric, numeric, text, numeric, numeric);
create function public.update_profile(
  p_handle text,
  p_display_name text,
  p_bio text,
  p_address_line text,
  p_province text,
  p_district text,
  p_subdistrict text,
  p_postal_code text,
  p_latitude numeric,
  p_longitude numeric,
  p_avatar_url text,
  p_avatar_focus_x numeric,
  p_avatar_focus_y numeric,
  p_profile_background_url text,
  p_background_focus_x numeric,
  p_background_focus_y numeric
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_handle is null or lower(btrim(p_handle)) !~ '^[a-z0-9_]{3,40}$' then
    raise exception using errcode = '22023', message = 'Invalid handle';
  end if;
  if p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'Invalid display name';
  end if;
  if p_bio is not null and char_length(btrim(p_bio)) > 280 then
    raise exception using errcode = '22023', message = 'Invalid bio';
  end if;
  if p_address_line is null or char_length(btrim(p_address_line)) not between 1 and 240
    or p_province is null or char_length(btrim(p_province)) not between 1 and 80
    or p_district is null or char_length(btrim(p_district)) not between 1 and 80
    or p_subdistrict is null or char_length(btrim(p_subdistrict)) not between 1 and 80
    or p_postal_code is null or p_postal_code !~ '^[0-9]{5}$' then
    raise exception using errcode = '22023', message = 'Invalid profile location';
  end if;
  if (p_latitude is null) <> (p_longitude is null) then
    raise exception using errcode = '22023', message = 'Coordinates must be provided together';
  end if;
  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then
    raise exception using errcode = '22023', message = 'Invalid latitude';
  end if;
  if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then
    raise exception using errcode = '22023', message = 'Invalid longitude';
  end if;
  if p_avatar_url is not null and (char_length(p_avatar_url) > 2048 or p_avatar_url !~* '^https://') then
    raise exception using errcode = '22023', message = 'Invalid avatar URL';
  end if;
  if p_profile_background_url is not null and (char_length(p_profile_background_url) > 2048 or p_profile_background_url !~* '^https://') then
    raise exception using errcode = '22023', message = 'Invalid profile background URL';
  end if;
  if coalesce(p_avatar_focus_x, 50) not between 0 and 100 or coalesce(p_avatar_focus_y, 50) not between 0 and 100
    or coalesce(p_background_focus_x, 50) not between 0 and 100 or coalesce(p_background_focus_y, 50) not between 0 and 100 then
    raise exception using errcode = '22023', message = 'Invalid media focus';
  end if;

  update public.profiles
  set handle = lower(btrim(p_handle)),
      display_name = btrim(p_display_name),
      bio = nullif(btrim(p_bio), ''),
      line_user_id = null,
      line_contact_id = null,
      address_line = btrim(p_address_line),
      province = btrim(p_province),
      district = btrim(p_district),
      subdistrict = btrim(p_subdistrict),
      postal_code = btrim(p_postal_code),
      latitude = p_latitude,
      longitude = p_longitude,
      location_updated_at = case when p_latitude is null then null else timezone('utc', now()) end,
      avatar_url = p_avatar_url,
      avatar_focus_x = coalesce(p_avatar_focus_x, 50),
      avatar_focus_y = coalesce(p_avatar_focus_y, 50),
      profile_background_url = p_profile_background_url,
      profile_background_focus_x = coalesce(p_background_focus_x, 50),
      profile_background_focus_y = coalesce(p_background_focus_y, 50)
  where id = v_user_id and profile_completed_at is not null
  returning * into v_profile;

  if not found then
    raise exception using errcode = '42501', message = 'Profile completion required';
  end if;

  return v_profile;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'Handle already in use';
end;
$$;

revoke all on function public.update_profile(text, text, text, text, text, text, text, text, numeric, numeric, text, numeric, numeric, text, numeric, numeric) from public, anon;
grant execute on function public.update_profile(text, text, text, text, text, text, text, text, numeric, numeric, text, numeric, numeric, text, numeric, numeric) to authenticated;

commit;
