-- Arena-Badminton Phase 4: matches, check-in, confirmed results, and
-- server-side EXP/BP settlement.
--
-- The organizer controls only the base EXP rewards for a match. BP is always
-- calculated by the database from the active system rule and player levels.
-- No client is allowed to write progression balances or ledger rows directly.

-- Keep the level table ready for the level-99 progression curve. Existing
-- admin-defined thresholds win because missing rows only are inserted here.
insert into public.level_definitions (level, required_exp, label)
select
  level_number::smallint,
  floor(250 * power(level_number - 1, 1.75))::bigint,
  case when level_number = 1 then 'ผู้เล่นใหม่' else 'ผู้เล่น Level ' || level_number end
from generate_series(1, 99) as level_number
on conflict (level) do nothing;

create table if not exists public.bp_rule_configs (
  id text primary key default 'default',
  rule_version text not null unique,
  min_bp integer not null default 1000,
  base_win_bp integer not null default 25,
  base_loss_bp integer not null default 15,
  upset_bonus_per_level integer not null default 2,
  favorite_win_penalty_per_level integer not null default 1,
  upset_loss_penalty_per_level integer not null default 1,
  favorite_loss_protection_per_level integer not null default 1,
  min_win_delta integer not null default 5,
  max_win_delta integer not null default 100,
  min_loss_delta integer not null default 5,
  max_loss_delta integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bp_rule_configs_singleton check (id = 'default'),
  constraint bp_rule_configs_min_bp_fixed check (min_bp = 1000),
  constraint bp_rule_configs_base_win_positive check (base_win_bp > 0),
  constraint bp_rule_configs_base_loss_positive check (base_loss_bp > 0),
  constraint bp_rule_configs_factors_nonnegative check (
    upset_bonus_per_level >= 0
    and favorite_win_penalty_per_level >= 0
    and upset_loss_penalty_per_level >= 0
    and favorite_loss_protection_per_level >= 0
  ),
  constraint bp_rule_configs_delta_ranges check (
    min_win_delta > 0
    and max_win_delta >= min_win_delta
    and min_loss_delta > 0
    and max_loss_delta >= min_loss_delta
  )
);

insert into public.bp_rule_configs (
  id,
  rule_version,
  min_bp,
  base_win_bp,
  base_loss_bp,
  upset_bonus_per_level,
  favorite_win_penalty_per_level,
  upset_loss_penalty_per_level,
  favorite_loss_protection_per_level,
  min_win_delta,
  max_win_delta,
  min_loss_delta,
  max_loss_delta
)
values ('default', 'bp-v1', 1000, 25, 15, 2, 1, 1, 1, 5, 100, 5, 100)
on conflict (id) do nothing;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete restrict,
  match_number smallint not null,
  format text not null default 'singles',
  status text not null default 'scheduled',
  created_by uuid not null references public.profiles(id) on delete restrict,
  exp_win_reward bigint not null default 0,
  exp_loss_reward bigint not null default 0,
  team_a_score smallint,
  team_b_score smallint,
  winner_team text,
  result_submitted_by uuid references public.profiles(id) on delete set null,
  result_submitted_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint matches_number_range check (match_number between 1 and 999),
  constraint matches_format_allowed check (format in ('singles', 'doubles')),
  constraint matches_status_allowed check (
    status in ('scheduled', 'live', 'awaiting_confirmation', 'confirmed', 'disputed', 'cancelled')
  ),
  constraint matches_exp_win_range check (exp_win_reward between 0 and 1000000),
  constraint matches_exp_loss_range check (exp_loss_reward between 0 and 1000000),
  constraint matches_score_pair check (
    (team_a_score is null and team_b_score is null)
    or (team_a_score is not null and team_b_score is not null)
  ),
  constraint matches_score_range check (
    (team_a_score is null or team_a_score between 0 and 30)
    and (team_b_score is null or team_b_score between 0 and 30)
  ),
  constraint matches_winner_consistency check (
    winner_team is null
    or (
      team_a_score is not null
      and team_b_score is not null
      and (
        (winner_team = 'a' and team_a_score > team_b_score)
        or (winner_team = 'b' and team_b_score > team_a_score)
      )
    )
  ),
  constraint matches_notes_length check (notes is null or char_length(notes) <= 1000),
  unique (group_id, match_number)
);

create table if not exists public.match_participants (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  team text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (match_id, user_id),
  constraint match_participants_team_allowed check (team in ('a', 'b'))
);

create table if not exists public.match_check_ins (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending',
  checked_in_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (match_id, user_id),
  constraint match_check_ins_status_allowed check (status in ('pending', 'checked_in', 'no_show', 'excused')),
  constraint match_check_ins_time_consistency check (status <> 'checked_in' or checked_in_at is not null)
);

create table if not exists public.match_settlements (
  match_id uuid primary key references public.matches(id) on delete restrict,
  settlement_status text not null default 'applied',
  rule_version text not null,
  winner_team text not null,
  winner_level smallint not null,
  loser_level smallint not null,
  winner_bp_delta integer not null,
  loser_bp_delta integer not null,
  winner_exp_reward bigint not null,
  loser_exp_reward bigint not null,
  settled_by uuid references public.profiles(id) on delete set null,
  settled_at timestamptz not null default timezone('utc', now()),
  constraint match_settlements_status_allowed check (settlement_status in ('applied', 'reversed')),
  constraint match_settlements_team_allowed check (winner_team in ('a', 'b')),
  constraint match_settlements_levels_range check (winner_level between 1 and 99 and loser_level between 1 and 99),
  constraint match_settlements_rewards_nonnegative check (winner_exp_reward >= 0 and loser_exp_reward >= 0)
);

create table if not exists public.exp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete restrict,
  source_type text not null,
  amount bigint not null,
  rule_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint exp_ledger_source_type_allowed check (source_type in ('match_win', 'match_loss', 'item_bonus', 'admin_adjustment')),
  constraint exp_ledger_amount_nonnegative check (amount >= 0),
  unique (match_id, user_id, source_type)
);

create table if not exists public.bp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete restrict,
  source_type text not null default 'match_result',
  requested_delta integer not null,
  applied_delta integer not null,
  balance_before integer not null,
  balance_after integer not null,
  team text not null,
  rule_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint bp_ledger_source_type_allowed check (source_type in ('match_result', 'admin_adjustment')),
  constraint bp_ledger_balance_before_floor check (balance_before >= 1000),
  constraint bp_ledger_balance_after_floor check (balance_after >= 1000),
  constraint bp_ledger_delta_reconciles check (balance_after = balance_before + applied_delta),
  constraint bp_ledger_team_allowed check (team in ('a', 'b')),
  unique (match_id, user_id)
);

create index if not exists bp_rule_configs_version_idx
  on public.bp_rule_configs (rule_version);

create index if not exists matches_group_status_created_idx
  on public.matches (group_id, status, created_at);

create index if not exists matches_created_by_idx
  on public.matches (created_by);

create index if not exists matches_result_submitter_idx
  on public.matches (result_submitted_by);

create index if not exists matches_confirmer_idx
  on public.matches (confirmed_by);

create index if not exists match_participants_user_match_idx
  on public.match_participants (user_id, match_id);

create index if not exists match_participants_match_team_idx
  on public.match_participants (match_id, team, user_id);

create index if not exists match_check_ins_user_status_idx
  on public.match_check_ins (user_id, status, match_id);

create index if not exists match_check_ins_match_status_idx
  on public.match_check_ins (match_id, status, user_id);

create index if not exists match_settlements_status_settled_idx
  on public.match_settlements (settlement_status, settled_at);

create index if not exists exp_ledger_user_created_idx
  on public.exp_ledger (user_id, created_at desc);

create index if not exists exp_ledger_match_user_idx
  on public.exp_ledger (match_id, user_id);

create index if not exists bp_ledger_user_created_idx
  on public.bp_ledger (user_id, created_at desc);

create index if not exists bp_ledger_match_user_idx
  on public.bp_ledger (match_id, user_id);

drop trigger if exists bp_rule_configs_set_updated_at on public.bp_rule_configs;
create trigger bp_rule_configs_set_updated_at
before update on public.bp_rule_configs
for each row execute function public.set_updated_at();

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

drop trigger if exists match_check_ins_set_updated_at on public.match_check_ins;
create trigger match_check_ins_set_updated_at
before update on public.match_check_ins
for each row execute function public.set_updated_at();

-- Progression balances are system-managed. Profile completion can still insert
-- and update identity/location fields, but never level, EXP, or BP directly.
revoke insert, update on public.profiles from authenticated;
grant insert (
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
) on public.profiles to authenticated;
grant update (
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
) on public.profiles to authenticated;

revoke all on public.bp_rule_configs, public.matches, public.match_participants,
  public.match_check_ins, public.match_settlements, public.exp_ledger, public.bp_ledger
from public, anon, authenticated;
grant select on public.matches, public.match_participants, public.match_check_ins,
  public.match_settlements, public.exp_ledger, public.bp_ledger to authenticated;

alter table public.bp_rule_configs enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;
alter table public.match_check_ins enable row level security;
alter table public.match_settlements enable row level security;
alter table public.exp_ledger enable row level security;
alter table public.bp_ledger enable row level security;

drop policy if exists matches_select_authenticated on public.matches;
create policy matches_select_authenticated on public.matches
for select to authenticated
using (
  exists (
    select 1
    from public.groups as visible_group
    where visible_group.id = matches.group_id
      and visible_group.status <> 'draft'
  )
);

drop policy if exists match_participants_select_authenticated on public.match_participants;
create policy match_participants_select_authenticated on public.match_participants
for select to authenticated
using (
  exists (
    select 1
    from public.matches as visible_match
    join public.groups as visible_group on visible_group.id = visible_match.group_id
    where visible_match.id = match_participants.match_id
      and visible_group.status <> 'draft'
  )
);

drop policy if exists match_check_ins_select_authenticated on public.match_check_ins;
create policy match_check_ins_select_authenticated on public.match_check_ins
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.matches as organizer_match
    where organizer_match.id = match_check_ins.match_id
      and organizer_match.created_by = (select auth.uid())
  )
);

drop policy if exists match_settlements_select_authenticated on public.match_settlements;
create policy match_settlements_select_authenticated on public.match_settlements
for select to authenticated
using (
  exists (
    select 1
    from public.matches as settlement_match
    where settlement_match.id = match_settlements.match_id
      and (
        settlement_match.created_by = (select auth.uid())
        or exists (
          select 1
          from public.match_participants as settlement_participant
          where settlement_participant.match_id = settlement_match.id
            and settlement_participant.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists exp_ledger_select_self on public.exp_ledger;
create policy exp_ledger_select_self on public.exp_ledger
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists bp_ledger_select_self on public.bp_ledger;
create policy bp_ledger_select_self on public.bp_ledger
for select to authenticated
using (user_id = (select auth.uid()));

-- Safe participant cards for the match UI. Private address, GPS, provider
-- subject and contact data remain outside this view.
create or replace view public.public_match_participants as
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
join public.public_profiles as pp on pp.id = mp.user_id
left join public.match_check_ins as ci
  on ci.match_id = mp.match_id and ci.user_id = mp.user_id
where g.status <> 'draft';

revoke all on public.public_match_participants from public, anon, authenticated;
grant select on public.public_match_participants to authenticated;

-- Internal group cancellation also cancels matches that have not settled.
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

  update public.matches
  set status = 'cancelled'
  where group_id = p_group_id
    and status in ('scheduled', 'live', 'awaiting_confirmation', 'disputed');

  return v_group;
end;
$$;

-- Create a match while holding the group row briefly. The group owner is the
-- only caller, teams are validated against registered members, and the match
-- number is assigned atomically.
create or replace function public.create_match(
  p_group_id uuid,
  p_format text,
  p_team_a_user_ids uuid[],
  p_team_b_user_ids uuid[],
  p_exp_win_reward bigint,
  p_exp_loss_reward bigint
)
returns public.matches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group public.groups;
  v_match public.matches;
  v_expected_team_size integer;
  v_all_user_ids uuid[];
  v_next_match_number integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_format not in ('singles', 'doubles') then
    raise exception using errcode = '22023', message = 'Unsupported match format';
  end if;

  if p_exp_win_reward is null or p_exp_win_reward not between 0 and 1000000
     or p_exp_loss_reward is null or p_exp_loss_reward not between 0 and 1000000 then
    raise exception using errcode = '22023', message = 'EXP reward is out of range';
  end if;

  select * into v_group
  from public.groups
  where id = p_group_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Group not found';
  end if;

  if v_group.owner_id <> v_user_id then
    raise exception using errcode = '42501', message = 'Only the organizer can create a match';
  end if;

  if v_group.status in ('cancelled', 'completed') or v_group.starts_at <= now() then
    raise exception using errcode = '22023', message = 'Group is no longer available for new matches';
  end if;

  v_expected_team_size := case when p_format = 'singles' then 1 else 2 end;
  if cardinality(coalesce(p_team_a_user_ids, '{}'::uuid[])) <> v_expected_team_size
     or cardinality(coalesce(p_team_b_user_ids, '{}'::uuid[])) <> v_expected_team_size then
    raise exception using errcode = '22023', message = 'Each team has an invalid number of players';
  end if;

  v_all_user_ids := coalesce(p_team_a_user_ids, '{}'::uuid[]) || coalesce(p_team_b_user_ids, '{}'::uuid[]);

  if exists (select 1 from unnest(v_all_user_ids) as ids(user_id) where ids.user_id is null)
     or exists (
       select ids.user_id
       from unnest(v_all_user_ids) as ids(user_id)
       group by ids.user_id
       having count(*) > 1
     ) then
    raise exception using errcode = '22023', message = 'A player cannot appear twice in the same match';
  end if;

  if exists (
    select 1
    from unnest(v_all_user_ids) as ids(user_id)
    left join public.group_members as gm
      on gm.group_id = p_group_id
      and gm.user_id = ids.user_id
      and gm.membership_status = 'registered'
    where gm.user_id is null
  ) then
    raise exception using errcode = '22023', message = 'Every player must be a registered group member';
  end if;

  select coalesce(max(match_number), 0) + 1 into v_next_match_number
  from public.matches
  where group_id = p_group_id;

  if v_next_match_number > 999 then
    raise exception using errcode = '22023', message = 'This group has reached the match limit';
  end if;

  insert into public.matches (
    group_id,
    match_number,
    format,
    status,
    created_by,
    exp_win_reward,
    exp_loss_reward
  )
  values (
    p_group_id,
    v_next_match_number::smallint,
    p_format,
    'scheduled',
    v_user_id,
    p_exp_win_reward,
    p_exp_loss_reward
  )
  returning * into v_match;

  insert into public.match_participants (match_id, user_id, team)
  select v_match.id, ids.user_id, 'a'
  from unnest(p_team_a_user_ids) as ids(user_id);

  insert into public.match_participants (match_id, user_id, team)
  select v_match.id, ids.user_id, 'b'
  from unnest(p_team_b_user_ids) as ids(user_id);

  insert into public.match_check_ins (match_id, user_id, status)
  select v_match.id, ids.user_id, 'pending'
  from unnest(v_all_user_ids) as ids(user_id);

  return v_match;
end;
$$;

create or replace function public.check_in_match(p_match_id uuid)
returns public.match_check_ins
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_match public.matches;
  v_check_in public.match_check_ins;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Match not found';
  end if;

  if v_match.status not in ('scheduled', 'live') then
    raise exception using errcode = '22023', message = 'Match is not open for check-in';
  end if;

  if not exists (
    select 1 from public.match_participants
    where match_id = p_match_id and user_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'Only match participants can check in';
  end if;

  insert into public.match_check_ins (match_id, user_id, status, checked_in_at)
  values (p_match_id, v_user_id, 'checked_in', timezone('utc', now()))
  on conflict (match_id, user_id) do update
    set status = 'checked_in',
        checked_in_at = coalesce(public.match_check_ins.checked_in_at, excluded.checked_in_at),
        updated_at = timezone('utc', now())
  returning * into v_check_in;

  update public.matches
  set status = 'live'
  where id = p_match_id and status = 'scheduled';

  return v_check_in;
end;
$$;

create or replace function public.mark_match_attendance(
  p_match_id uuid,
  p_user_id uuid,
  p_status text
)
returns public.match_check_ins
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_match public.matches;
  v_check_in public.match_check_ins;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_status not in ('no_show', 'excused') then
    raise exception using errcode = '22023', message = 'Unsupported attendance status';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Match not found';
  end if;

  if v_match.created_by <> v_user_id then
    raise exception using errcode = '42501', message = 'Only the organizer can mark attendance';
  end if;

  if v_match.status not in ('scheduled', 'live') then
    raise exception using errcode = '22023', message = 'Match is not open for attendance changes';
  end if;

  if not exists (
    select 1 from public.match_participants
    where match_id = p_match_id and user_id = p_user_id
  ) then
    raise exception using errcode = '22023', message = 'Player is not in this match';
  end if;

  insert into public.match_check_ins (match_id, user_id, status, checked_in_at)
  values (p_match_id, p_user_id, p_status, null)
  on conflict (match_id, user_id) do update
    set status = excluded.status,
        checked_in_at = null,
        updated_at = timezone('utc', now())
  returning * into v_check_in;

  return v_check_in;
end;
$$;

create or replace function public.submit_match_result(
  p_match_id uuid,
  p_team_a_score smallint,
  p_team_b_score smallint
)
returns public.matches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_match public.matches;
  v_winner_team text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_team_a_score is null or p_team_b_score is null
     or p_team_a_score < 0 or p_team_b_score < 0
     or p_team_a_score > 30 or p_team_b_score > 30
     or p_team_a_score = p_team_b_score then
    raise exception using errcode = '22023', message = 'Invalid badminton score';
  end if;

  if greatest(p_team_a_score, p_team_b_score) < 21
     or (greatest(p_team_a_score, p_team_b_score) < 30
         and abs(p_team_a_score - p_team_b_score) < 2) then
    raise exception using errcode = '22023', message = 'Winner score does not satisfy badminton rules';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Match not found';
  end if;

  if v_match.status not in ('scheduled', 'live') then
    raise exception using errcode = '22023', message = 'Match is not open for result submission';
  end if;

  if v_match.created_by <> v_user_id and not exists (
    select 1 from public.match_participants
    where match_id = p_match_id and user_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'Only a match participant or organizer can submit the result';
  end if;

  if exists (
    select 1
    from public.match_participants as mp
    left join public.match_check_ins as ci
      on ci.match_id = mp.match_id and ci.user_id = mp.user_id
    where mp.match_id = p_match_id
      and ci.status is distinct from 'checked_in'
  ) then
    raise exception using errcode = '22023', message = 'Every player must check in before submitting a result';
  end if;

  v_winner_team := case when p_team_a_score > p_team_b_score then 'a' else 'b' end;

  update public.matches
  set status = 'awaiting_confirmation',
      team_a_score = p_team_a_score,
      team_b_score = p_team_b_score,
      winner_team = v_winner_team,
      result_submitted_by = v_user_id,
      result_submitted_at = timezone('utc', now()),
      confirmed_by = null,
      confirmed_at = null
  where id = p_match_id
  returning * into v_match;

  return v_match;
end;
$$;

-- Confirming a result and applying all ledgers happens in one short database
-- transaction. Profile rows are locked in UUID order before any balance update
-- to avoid cross-match deadlocks.
create or replace function public.confirm_match_result(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_match public.matches;
  v_rules public.bp_rule_configs;
  v_settlement public.match_settlements;
  v_team_a_level smallint;
  v_team_b_level smallint;
  v_winner_level smallint;
  v_loser_level smallint;
  v_level_gap integer;
  v_winner_bp_delta integer;
  v_loser_bp_magnitude integer;
  v_player record;
  v_requested_bp integer;
  v_applied_bp integer;
  v_balance_before integer;
  v_balance_after integer;
  v_exp_reward bigint;
  v_is_winner boolean;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Match not found';
  end if;

  if v_match.status <> 'awaiting_confirmation' then
    raise exception using errcode = '22023', message = 'Match is not awaiting confirmation';
  end if;

  if v_match.submitted_by = v_user_id then
    raise exception using errcode = '22023', message = 'The result submitter cannot confirm the same result';
  end if;

  if v_match.created_by <> v_user_id and not exists (
    select 1 from public.match_participants
    where match_id = p_match_id and user_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'Only a match participant or organizer can confirm the result';
  end if;

  select * into v_rules
  from public.bp_rule_configs
  where id = 'default'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'BP rule configuration is missing';
  end if;

  select round(avg(p.level))::smallint into v_team_a_level
  from public.match_participants as mp
  join public.profiles as p on p.id = mp.user_id
  where mp.match_id = p_match_id and mp.team = 'a';

  select round(avg(p.level))::smallint into v_team_b_level
  from public.match_participants as mp
  join public.profiles as p on p.id = mp.user_id
  where mp.match_id = p_match_id and mp.team = 'b';

  v_winner_level := case when v_match.winner_team = 'a' then v_team_a_level else v_team_b_level end;
  v_loser_level := case when v_match.winner_team = 'a' then v_team_b_level else v_team_a_level end;
  v_level_gap := v_loser_level - v_winner_level;

  if v_level_gap >= 0 then
    v_winner_bp_delta := v_rules.base_win_bp + v_level_gap * v_rules.upset_bonus_per_level;
    v_loser_bp_magnitude := v_rules.base_loss_bp + v_level_gap * v_rules.upset_loss_penalty_per_level;
  else
    v_winner_bp_delta := v_rules.base_win_bp - abs(v_level_gap) * v_rules.favorite_win_penalty_per_level;
    v_loser_bp_magnitude := v_rules.base_loss_bp - abs(v_level_gap) * v_rules.favorite_loss_protection_per_level;
  end if;

  v_winner_bp_delta := least(v_rules.max_win_delta, greatest(v_rules.min_win_delta, v_winner_bp_delta));
  v_loser_bp_magnitude := least(v_rules.max_loss_delta, greatest(v_rules.min_loss_delta, v_loser_bp_magnitude));

  insert into public.match_settlements (
    match_id,
    settlement_status,
    rule_version,
    winner_team,
    winner_level,
    loser_level,
    winner_bp_delta,
    loser_bp_delta,
    winner_exp_reward,
    loser_exp_reward,
    settled_by
  )
  values (
    p_match_id,
    'applied',
    v_rules.rule_version,
    v_match.winner_team,
    v_winner_level,
    v_loser_level,
    v_winner_bp_delta,
    -v_loser_bp_magnitude,
    v_match.exp_win_reward,
    v_match.exp_loss_reward,
    v_user_id
  )
  on conflict (match_id) do nothing
  returning * into v_settlement;

  if v_settlement.match_id is null then
    select * into v_match from public.matches where id = p_match_id;
    return v_match;
  end if;

  update public.matches
  set status = 'confirmed',
      confirmed_by = v_user_id,
      confirmed_at = timezone('utc', now())
  where id = p_match_id
  returning * into v_match;

  for v_player in
    select p.id, p.skill_bp, mp.team
    from public.match_participants as mp
    join public.profiles as p on p.id = mp.user_id
    where mp.match_id = p_match_id
    order by p.id
    for update of p
  loop
    v_is_winner := v_player.team = v_match.winner_team;
    v_requested_bp := case when v_is_winner then v_winner_bp_delta else -v_loser_bp_magnitude end;
    v_exp_reward := case when v_is_winner then v_match.exp_win_reward else v_match.exp_loss_reward end;
    v_balance_before := v_player.skill_bp;
    v_balance_after := greatest(v_rules.min_bp, v_balance_before + v_requested_bp);
    v_applied_bp := v_balance_after - v_balance_before;

    insert into public.exp_ledger (
      user_id,
      match_id,
      source_type,
      amount,
      rule_version,
      metadata
    )
    values (
      v_player.id,
      p_match_id,
      case when v_is_winner then 'match_win' else 'match_loss' end,
      v_exp_reward,
      v_rules.rule_version,
      jsonb_build_object(
        'team', v_player.team,
        'winner_team', v_match.winner_team,
        'winner_level', v_winner_level,
        'loser_level', v_loser_level
      )
    );

    insert into public.bp_ledger (
      user_id,
      match_id,
      source_type,
      requested_delta,
      applied_delta,
      balance_before,
      balance_after,
      team,
      rule_version,
      metadata
    )
    values (
      v_player.id,
      p_match_id,
      'match_result',
      v_requested_bp,
      v_applied_bp,
      v_balance_before,
      v_balance_after,
      v_player.team,
      v_rules.rule_version,
      jsonb_build_object(
        'winner_team', v_match.winner_team,
        'winner_level', v_winner_level,
        'loser_level', v_loser_level,
        'level_gap', v_level_gap
      )
    );

    update public.profiles
    set skill_bp = v_balance_after,
        exp_total = exp_total + v_exp_reward
    where id = v_player.id;
  end loop;

  update public.profiles as p
  set level = coalesce(
    (
      select max(ld.level)
      from public.level_definitions as ld
      where ld.required_exp <= p.exp_total
    ),
    1
  )::smallint
  where p.id in (
    select mp.user_id from public.match_participants as mp where mp.match_id = p_match_id
  );

  return v_match;
end;
$$;

revoke all on function public.create_match(uuid, text, uuid[], uuid[], bigint, bigint) from public, anon;
revoke all on function public.check_in_match(uuid) from public, anon;
revoke all on function public.mark_match_attendance(uuid, uuid, text) from public, anon;
revoke all on function public.submit_match_result(uuid, smallint, smallint) from public, anon;
revoke all on function public.confirm_match_result(uuid) from public, anon;
grant execute on function public.create_match(uuid, text, uuid[], uuid[], bigint, bigint) to authenticated;
grant execute on function public.check_in_match(uuid) to authenticated;
grant execute on function public.mark_match_attendance(uuid, uuid, text) to authenticated;
grant execute on function public.submit_match_result(uuid, smallint, smallint) to authenticated;
grant execute on function public.confirm_match_result(uuid) to authenticated;

