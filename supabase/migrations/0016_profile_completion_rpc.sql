-- Arena-Badminton: make profile completion the only path that can establish
-- protected profile identity fields. Authenticated clients may still update
-- the user-editable profile/location columns, but cannot change handle,
-- provider subject, completion state, Level, EXP, or BP through the Data API.

create or replace function public.complete_profile(
  p_display_name text,
  p_bio text,
  p_line_contact_id text,
  p_address_line text,
  p_province text,
  p_district text,
  p_subdistrict text,
  p_postal_code text,
  p_latitude numeric,
  p_longitude numeric,
  p_avatar_url text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing public.profiles;
  v_profile public.profiles;
  v_handle text;
  v_line_user_id text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select * into v_existing
  from public.profiles
  where id = v_user_id
  for update;

  v_handle := coalesce(
    nullif(trim(v_existing.handle), ''),
    'player_' || replace(v_user_id::text, '-', '')
  );

  -- The provider subject is read from Supabase Auth, never from the browser
  -- form. Existing values remain stable if the identity is not LINE-based.
  select coalesce(
    nullif(identity_data ->> 'sub', ''),
    nullif(identity_data ->> 'user_id', '')
  )
  into v_line_user_id
  from auth.identities
  where user_id = v_user_id
    and provider in ('line', 'custom:line')
  limit 1;

  v_line_user_id := coalesce(v_line_user_id, v_existing.line_user_id);

  insert into public.profiles (
    id,
    display_name,
    handle,
    avatar_url,
    bio,
    line_user_id,
    line_contact_id,
    address_line,
    province,
    district,
    subdistrict,
    postal_code,
    latitude,
    longitude,
    location_updated_at,
    profile_completed_at
  )
  values (
    v_user_id,
    p_display_name,
    v_handle,
    p_avatar_url,
    p_bio,
    v_line_user_id,
    p_line_contact_id,
    p_address_line,
    p_province,
    p_district,
    p_subdistrict,
    p_postal_code,
    p_latitude,
    p_longitude,
    case when p_latitude is null then null else timezone('utc', now()) end,
    timezone('utc', now())
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    bio = excluded.bio,
    line_user_id = coalesce(excluded.line_user_id, public.profiles.line_user_id),
    line_contact_id = excluded.line_contact_id,
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
end;
$$;

revoke all on function public.complete_profile(text, text, text, text, text, text, text, text, numeric, numeric, text)
from public, anon;
grant execute on function public.complete_profile(text, text, text, text, text, text, text, text, numeric, numeric, text)
to authenticated;

-- Keep reads owner-only under the existing RLS policy. Remove broad writes and
-- expose only the fields used by the authenticated Profile edit action.
revoke insert, update on public.profiles from authenticated;
grant update (
  display_name,
  avatar_url,
  bio,
  line_contact_id,
  address_line,
  province,
  district,
  subdistrict,
  postal_code,
  latitude,
  longitude,
  location_updated_at
) on public.profiles to authenticated;
