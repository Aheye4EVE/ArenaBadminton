-- Arena-Badminton Phase 3: transactional group creation, joining, leaving,
-- waitlisting, and cancellation.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'groups_capacity_range'
      and conrelid = 'public.groups'::regclass
  ) then
    alter table public.groups
      add constraint groups_capacity_range
      check (capacity between 2 and 200);
  end if;
end $$;

-- Prevent clients from changing membership or capacity outside the guarded
-- RPCs. SELECT remains available for authenticated users under RLS.
revoke insert, update on public.groups from authenticated;
revoke insert, update, delete on public.group_members from authenticated;
grant select on public.groups, public.group_members to authenticated;

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
  p_notes text
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

  insert into public.groups (
    owner_id,
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

create or replace function public.join_group(p_group_id uuid)
returns table (
  group_id uuid,
  membership_status text,
  registered_count integer,
  capacity smallint,
  group_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group public.groups;
  v_existing_status text;
  v_registered_count integer;
  v_result_status text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select * into v_group
  from public.groups
  where id = p_group_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Group not found';
  end if;

  if v_group.status not in ('published', 'full') then
    raise exception using errcode = '22023', message = 'Group is not open for joining';
  end if;

  select membership_status into v_existing_status
  from public.group_members
  where group_id = p_group_id and user_id = v_user_id;

  if v_existing_status in ('attended', 'no_show') then
    raise exception using errcode = '22023', message = 'Membership is already finalized';
  end if;

  select count(*)::integer into v_registered_count
  from public.group_members
  where group_id = p_group_id and membership_status = 'registered';

  if v_existing_status = 'registered' then
    update public.groups
    set status = case when v_registered_count >= v_group.capacity then 'full' else 'published' end
    where id = p_group_id;
    return query select p_group_id, 'registered'::text, v_registered_count, v_group.capacity,
      case when v_registered_count >= v_group.capacity then 'full' else 'published' end::text;
    return;
  end if;

  if v_registered_count < v_group.capacity then
    insert into public.group_members (group_id, user_id, membership_status, joined_at)
    values (p_group_id, v_user_id, 'registered', timezone('utc', now()))
    on conflict (group_id, user_id) do update
      set membership_status = 'registered', joined_at = excluded.joined_at;
    v_registered_count := v_registered_count + 1;
    v_result_status := 'registered';
  else
    insert into public.group_members (group_id, user_id, membership_status, joined_at)
    values (p_group_id, v_user_id, 'waitlisted', timezone('utc', now()))
    on conflict (group_id, user_id) do update
      set membership_status = 'waitlisted', joined_at = excluded.joined_at;
    v_result_status := 'waitlisted';
  end if;

  update public.groups
  set status = case when v_registered_count >= v_group.capacity then 'full' else 'published' end
  where id = p_group_id;

  return query select
    p_group_id,
    v_result_status,
    v_registered_count,
    v_group.capacity,
    case when v_registered_count >= v_group.capacity then 'full' else 'published' end::text;
end;
$$;

create or replace function public.leave_group(p_group_id uuid)
returns table (
  group_id uuid,
  membership_status text,
  registered_count integer,
  capacity smallint,
  group_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group public.groups;
  v_existing_status text;
  v_promoted_user_id uuid;
  v_registered_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select * into v_group
  from public.groups
  where id = p_group_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Group not found';
  end if;

  if v_group.status in ('cancelled', 'completed') then
    raise exception using errcode = '22023', message = 'Group is no longer active';
  end if;

  if v_group.owner_id = v_user_id then
    raise exception using errcode = '22023', message = 'Organizer must cancel the group instead of leaving';
  end if;

  select membership_status into v_existing_status
  from public.group_members
  where group_id = p_group_id and user_id = v_user_id;

  if v_existing_status is null or v_existing_status not in ('registered', 'waitlisted') then
    raise exception using errcode = '22023', message = 'You are not an active member of this group';
  end if;

  update public.group_members
  set membership_status = 'cancelled'
  where group_id = p_group_id and user_id = v_user_id;

  select gm.user_id into v_promoted_user_id
  from public.group_members as gm
  where gm.group_id = p_group_id and gm.membership_status = 'waitlisted'
  order by gm.joined_at, gm.user_id
  for update skip locked
  limit 1;

  if v_existing_status = 'registered' and v_promoted_user_id is not null then
    update public.group_members
    set membership_status = 'registered'
    where group_id = p_group_id and user_id = v_promoted_user_id;
  end if;

  select count(*)::integer into v_registered_count
  from public.group_members
  where group_id = p_group_id and membership_status = 'registered';

  update public.groups
  set status = case when v_registered_count >= v_group.capacity then 'full' else 'published' end
  where id = p_group_id;

  return query select p_group_id, 'cancelled'::text, v_registered_count, v_group.capacity,
    case when v_registered_count >= v_group.capacity then 'full' else 'published' end::text;
end;
$$;

create or replace function public.cancel_group(p_group_id uuid)
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

  update public.groups
  set status = 'cancelled'
  where id = p_group_id and owner_id = v_user_id and status not in ('cancelled', 'completed')
  returning * into v_group;

  if not found then
    raise exception using errcode = '42501', message = 'Only the organizer can cancel this group';
  end if;

  update public.group_members
  set membership_status = 'cancelled'
  where group_id = p_group_id and membership_status in ('registered', 'waitlisted');

  return v_group;
end;
$$;

-- Public member cards contain only safe profile fields and never expose draft
-- groups or private address/GPS/provider identity data.
create or replace view public.public_group_members as
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
join public.public_profiles as pp on pp.id = gm.user_id
where g.status <> 'draft'
  and gm.membership_status <> 'cancelled';

revoke all on public.public_group_members from public, anon, authenticated;
grant select on public.public_group_members to authenticated;

revoke all on function public.create_group(text, text, text, timestamptz, smallint, smallint, smallint, smallint, text, numeric, text) from public, anon;
revoke all on function public.join_group(uuid) from public, anon;
revoke all on function public.leave_group(uuid) from public, anon;
revoke all on function public.cancel_group(uuid) from public, anon;
grant execute on function public.create_group(text, text, text, timestamptz, smallint, smallint, smallint, smallint, text, numeric, text) to authenticated;
grant execute on function public.join_group(uuid) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.cancel_group(uuid) to authenticated;
