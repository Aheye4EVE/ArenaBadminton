-- Arena-Badminton Phase 8: link a published group to a real venue.
--
-- The old RPC accepted only free-form location text. Keep the old eleven
-- argument call compatible by adding p_venue_id as a nullable final argument,
-- while validating any selected venue inside the security-definer boundary.

drop function if exists public.create_group(text, text, text, timestamptz, smallint, smallint, smallint, smallint, text, numeric, text);

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
  p_venue_id uuid default null
)
returns public.groups
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group public.groups;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id and profile_completed_at is not null
  ) then
    raise exception using errcode = '42501', message = 'Profile completion required';
  end if;

  if p_starts_at <= now() + interval '15 minutes' then
    raise exception using errcode = '22023', message = 'Group must start at least 15 minutes from now';
  end if;

  if p_venue_id is not null and not exists (
    select 1
    from public.venues
    where id = p_venue_id and status = 'active'
  ) then
    raise exception using errcode = '22023', message = 'Selected venue is not active';
  end if;

  insert into public.groups (
    owner_id,
    venue_id,
    title,
    description,
    location_text,
    starts_at,
    duration_minutes,
    capacity,
    min_level,
    max_level,
    play_type,
    entry_fee,
    status,
    notes
  )
  values (
    v_user_id,
    p_venue_id,
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    trim(p_location_text),
    p_starts_at,
    p_duration_minutes,
    p_capacity,
    p_min_level,
    p_max_level,
    p_play_type,
    p_entry_fee,
    'published',
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into v_group;

  insert into public.group_members (group_id, user_id, membership_status)
  values (v_group.id, v_user_id, 'registered');

  if v_group.capacity <= 1 then
    update public.groups
    set status = 'full'
    where id = v_group.id
    returning * into v_group;
  end if;

  return v_group;
end;
$$;

revoke all on function public.create_group(text, text, text, timestamptz, smallint, smallint, smallint, smallint, text, numeric, text, uuid) from public, anon;
grant execute on function public.create_group(text, text, text, timestamptz, smallint, smallint, smallint, smallint, text, numeric, text, uuid) to authenticated;
