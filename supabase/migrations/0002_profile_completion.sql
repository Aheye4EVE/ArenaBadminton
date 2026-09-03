-- Arena-Badminton Phase 2: profile completion and location search fields.
-- Email remains in auth.users and is read from the authenticated session; it is
-- intentionally not duplicated in public.profiles, which is readable by users.

alter table public.profiles
  add column if not exists line_user_id text,
  add column if not exists address_line text,
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists subdistrict text,
  add column if not exists postal_code text,
  add column if not exists latitude numeric(9, 6),
  add column if not exists longitude numeric(9, 6),
  add column if not exists location_updated_at timestamptz,
  add column if not exists profile_completed_at timestamptz;

create unique index if not exists profiles_line_user_id_uidx
  on public.profiles (line_user_id)
  where line_user_id is not null;

create index if not exists profiles_location_area_idx
  on public.profiles (province, district, subdistrict);

create index if not exists profiles_location_coordinates_idx
  on public.profiles (latitude, longitude)
  where latitude is not null and longitude is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_line_user_id_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_line_user_id_length
      check (line_user_id is null or char_length(line_user_id) between 1 and 128);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_address_line_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_address_line_length
      check (address_line is null or char_length(address_line) between 1 and 240);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_province_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_province_length
      check (province is null or char_length(province) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_district_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_district_length
      check (district is null or char_length(district) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_subdistrict_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_subdistrict_length
      check (subdistrict is null or char_length(subdistrict) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_postal_code_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_postal_code_format
      check (postal_code is null or postal_code ~ '^[0-9]{5}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_latitude_range'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_latitude_range
      check (latitude is null or latitude between -90 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_longitude_range'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_longitude_range
      check (longitude is null or longitude between -180 and 180);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_coordinates_pair'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_coordinates_pair
      check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null));
  end if;
end $$;
