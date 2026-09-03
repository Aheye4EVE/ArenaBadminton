-- Arena-Badminton: make Profile edits atomic and allow users to change only
-- the public identity fields they own. Protected game fields remain server-owned.

create or replace function public.update_profile(
  p_handle text,
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
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_handle text := lower(btrim(p_handle));
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if v_handle is null
    or char_length(v_handle) not between 3 and 40
    or v_handle !~ '^[a-z0-9_]+$' then
    raise exception using errcode = '22023', message = 'Invalid handle';
  end if;

  if p_display_name is null
    or char_length(btrim(p_display_name)) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'Invalid display name';
  end if;

  if p_bio is not null and char_length(btrim(p_bio)) > 280 then
    raise exception using errcode = '22023', message = 'Invalid bio';
  end if;

  if p_line_contact_id is not null and char_length(btrim(p_line_contact_id)) > 80 then
    raise exception using errcode = '22023', message = 'Invalid LINE contact';
  end if;

  if p_address_line is null
    or char_length(btrim(p_address_line)) not between 1 and 240
    or p_province is null
    or char_length(btrim(p_province)) not between 1 and 80
    or p_district is null
    or char_length(btrim(p_district)) not between 1 and 80
    or p_subdistrict is null
    or char_length(btrim(p_subdistrict)) not between 1 and 80
    or p_postal_code is null
    or p_postal_code !~ '^[0-9]{5}$' then
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

  update public.profiles
  set handle = v_handle,
      display_name = btrim(p_display_name),
      bio = nullif(btrim(p_bio), ''),
      line_contact_id = nullif(btrim(p_line_contact_id), ''),
      address_line = btrim(p_address_line),
      province = btrim(p_province),
      district = btrim(p_district),
      subdistrict = btrim(p_subdistrict),
      postal_code = btrim(p_postal_code),
      latitude = p_latitude,
      longitude = p_longitude,
      location_updated_at = case when p_latitude is null then null else timezone('utc', now()) end,
      avatar_url = p_avatar_url
  where id = v_user_id
    and profile_completed_at is not null
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

revoke all on function public.update_profile(text, text, text, text, text, text, text, text, text, numeric, numeric, text)
from public, anon;
grant execute on function public.update_profile(text, text, text, text, text, text, text, text, text, numeric, numeric, text)
to authenticated;

-- The RPC is the only authenticated write path for profiles. This prevents
-- client-side updates to handle, Level, EXP, BP, provider IDs, and completion state.
revoke update on public.profiles from public, anon, authenticated;
