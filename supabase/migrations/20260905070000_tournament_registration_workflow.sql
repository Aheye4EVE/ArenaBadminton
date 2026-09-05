-- Arena-Badminton: first production-safe tournament workflow.
-- Tournament creation and registration are transaction boundaries. Direct
-- authenticated DML stays disabled so capacity cannot be bypassed in the
-- browser. Payment, bracket generation and reward settlement remain separate
-- phases and are intentionally not enabled by this migration.

create or replace function public.create_tournament(
  p_title text,
  p_description text,
  p_starts_at timestamptz,
  p_format text,
  p_max_entries smallint,
  p_entry_fee numeric,
  p_rules text,
  p_venue_id uuid
)
returns public.tournaments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_tournament public.tournaments;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user_id and profile_completed_at is not null
  ) then
    raise exception using errcode = '42501', message = 'Profile completion required';
  end if;

  if p_title is null or char_length(btrim(p_title)) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'Invalid tournament title';
  end if;

  if p_description is not null and char_length(p_description) > 2000 then
    raise exception using errcode = '22023', message = 'Invalid tournament description';
  end if;

  if p_starts_at is null or p_starts_at <= now() + interval '15 minutes' then
    raise exception using errcode = '22023', message = 'Tournament must start at least 15 minutes from now';
  end if;

  if p_format is null or p_format not in ('singles', 'doubles', 'team') then
    raise exception using errcode = '22023', message = 'Invalid tournament format';
  end if;

  if p_max_entries is null or p_max_entries < 2 or p_max_entries > 256 then
    raise exception using errcode = '22023', message = 'Invalid tournament capacity';
  end if;

  -- No payment gateway/webhook exists yet. Do not allow an organizer to
  -- publish an event that asks players to pay without a verified charge.
  if p_entry_fee is null or p_entry_fee <> 0 then
    raise exception using errcode = '0A000', message = 'Tournament payments are not configured';
  end if;

  if p_rules is not null and char_length(p_rules) > 5000 then
    raise exception using errcode = '22023', message = 'Invalid tournament rules';
  end if;

  if p_venue_id is not null and not exists (
    select 1 from public.venues
    where id = p_venue_id and status = 'active'
  ) then
    raise exception using errcode = '22023', message = 'Tournament venue is not active';
  end if;

  insert into public.tournaments (
    created_by,
    venue_id,
    title,
    description,
    starts_at,
    format,
    status,
    max_entries,
    entry_fee,
    rules
  )
  values (
    v_user_id,
    p_venue_id,
    btrim(p_title),
    coalesce(p_description, ''),
    p_starts_at,
    p_format,
    'published',
    p_max_entries,
    0,
    coalesce(p_rules, '')
  )
  returning * into v_tournament;

  return v_tournament;
end;
$$;

create or replace function public.join_tournament(p_tournament_id uuid)
returns public.tournament_entries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_tournament public.tournaments;
  v_existing public.tournament_entries;
  v_entry public.tournament_entries;
  v_registered_count integer;
  v_status text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user_id and profile_completed_at is not null
  ) then
    raise exception using errcode = '42501', message = 'Profile completion required';
  end if;

  select * into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Tournament not found';
  end if;

  if v_tournament.status <> 'published' then
    raise exception using errcode = '22023', message = 'Tournament is not open for registration';
  end if;

  if v_tournament.starts_at <= now() then
    raise exception using errcode = '22023', message = 'Tournament registration has closed';
  end if;

  select * into v_existing
  from public.tournament_entries
  where tournament_id = p_tournament_id and user_id = v_user_id
  for update;

  if found and v_existing.entry_status in ('registered', 'waitlisted') then
    return v_existing;
  end if;

  if found and v_existing.entry_status in ('winner', 'eliminated') then
    raise exception using errcode = '22023', message = 'Tournament entry cannot be reopened';
  end if;

  select count(*)::integer into v_registered_count
  from public.tournament_entries
  where tournament_id = p_tournament_id
    and entry_status = 'registered';

  v_status := case when v_registered_count < v_tournament.max_entries then 'registered' else 'waitlisted' end;

  insert into public.tournament_entries (tournament_id, user_id, entry_status, seed, joined_at)
  values (p_tournament_id, v_user_id, v_status, null, timezone('utc', now()))
  on conflict (tournament_id, user_id) do update
  set entry_status = excluded.entry_status,
      seed = null,
      joined_at = excluded.joined_at
  returning * into v_entry;

  return v_entry;
end;
$$;

create or replace function public.withdraw_tournament_entry(p_tournament_id uuid)
returns public.tournament_entries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_tournament public.tournaments;
  v_entry public.tournament_entries;
  v_previous_status text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select * into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Tournament not found';
  end if;

  if v_tournament.status <> 'published' or v_tournament.starts_at <= now() then
    raise exception using errcode = '22023', message = 'Tournament registration is closed';
  end if;

  select entry_status into v_previous_status
  from public.tournament_entries
  where tournament_id = p_tournament_id
    and user_id = v_user_id
    and entry_status in ('registered', 'waitlisted')
  for update;

  update public.tournament_entries
  set entry_status = 'withdrawn', seed = null
  where tournament_id = p_tournament_id
    and user_id = v_user_id
    and entry_status in ('registered', 'waitlisted')
  returning * into v_entry;

  if not found then
    raise exception using errcode = 'P0002', message = 'Active tournament entry not found';
  end if;

  if v_previous_status = 'registered' then
    update public.tournament_entries
    set entry_status = 'registered'
    where tournament_id = p_tournament_id
      and user_id = (
        select user_id
        from public.tournament_entries
        where tournament_id = p_tournament_id and entry_status = 'waitlisted'
        order by joined_at asc, user_id asc
        limit 1
      );
  end if;

  return v_entry;
end;
$$;

revoke all on function public.create_tournament(text, text, timestamptz, text, smallint, numeric, text, uuid) from public, anon;
grant execute on function public.create_tournament(text, text, timestamptz, text, smallint, numeric, text, uuid) to authenticated;
revoke all on function public.join_tournament(uuid) from public, anon;
grant execute on function public.join_tournament(uuid) to authenticated;
revoke all on function public.withdraw_tournament_entry(uuid) from public, anon;
grant execute on function public.withdraw_tournament_entry(uuid) to authenticated;

-- Keep read-only access for the event pages. All authenticated writes go
-- through the three functions above until bracket/reward workflows exist.
revoke insert, update, delete on public.tournaments from authenticated;
revoke insert, update, delete on public.tournament_entries from authenticated;
