-- Arena-Badminton competitive feature completion.
-- Adds venue reviews, public ranking statistics, tournament brackets/rewards,
-- and one-vote-per-member MVP awards. All progression writes stay in RPCs.

-- ---------------------------------------------------------------------------
-- Venue reviews and aggregate rating
-- ---------------------------------------------------------------------------

create table if not exists public.venue_reviews (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null,
  body text not null default '',
  status text not null default 'published',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint venue_reviews_rating_range check (rating between 1 and 5),
  constraint venue_reviews_body_length check (char_length(body) <= 1000),
  constraint venue_reviews_status_allowed check (status in ('published', 'hidden', 'deleted')),
  unique (venue_id, user_id)
);

create index if not exists venue_reviews_venue_status_created_idx
  on public.venue_reviews (venue_id, status, created_at desc, id);
create index if not exists venue_reviews_user_created_idx
  on public.venue_reviews (user_id, created_at desc, id);

drop trigger if exists venue_reviews_set_updated_at on public.venue_reviews;
create trigger venue_reviews_set_updated_at
before update on public.venue_reviews
for each row execute function public.set_updated_at();

create or replace function public.upsert_venue_review(
  p_venue_id uuid,
  p_rating smallint,
  p_body text default ''
)
returns public.venue_reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_review public.venue_reviews;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not exists (select 1 from public.venues where id = p_venue_id and status = 'active') then
    raise exception using errcode = 'P0002', message = 'Venue not found';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception using errcode = '22023', message = 'Rating is out of range';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) > 1000 then
    raise exception using errcode = '22023', message = 'Review is too long';
  end if;

  insert into public.venue_reviews (venue_id, user_id, rating, body, status)
  values (p_venue_id, v_user_id, p_rating, btrim(coalesce(p_body, '')), 'published')
  on conflict (venue_id, user_id) do update
    set rating = excluded.rating,
        body = excluded.body,
        status = 'published',
        updated_at = timezone('utc', now())
  returning * into v_review;

  update public.venues
  set rating = coalesce((
    select round(avg(vr.rating)::numeric, 1)
    from public.venue_reviews as vr
    where vr.venue_id = p_venue_id and vr.status = 'published'
  ), 0)
  where id = p_venue_id;

  return v_review;
end;
$$;

revoke all on function public.upsert_venue_review(uuid, smallint, text) from public, anon;
grant execute on function public.upsert_venue_review(uuid, smallint, text) to authenticated;

revoke all on public.venue_reviews from public, anon, authenticated;
grant select on public.venue_reviews to authenticated;
alter table public.venue_reviews enable row level security;

drop policy if exists venue_reviews_select_visible on public.venue_reviews;
create policy venue_reviews_select_visible on public.venue_reviews
for select to authenticated
using (status = 'published' or user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Ranking directory with location scopes and match tie-break statistics
-- ---------------------------------------------------------------------------

create table if not exists public.player_ranking_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  handle text not null,
  avatar_url text,
  level smallint not null default 1,
  exp_total bigint not null default 0,
  skill_bp integer not null default 1000,
  province text,
  district text,
  subdistrict text,
  matches_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  win_rate numeric(5, 2) not null default 0,
  last_match_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint player_ranking_level_range check (level between 1 and 99),
  constraint player_ranking_exp_nonnegative check (exp_total >= 0),
  constraint player_ranking_bp_floor check (skill_bp >= 1000),
  constraint player_ranking_matches_nonnegative check (matches_played >= 0 and wins >= 0 and losses >= 0),
  constraint player_ranking_win_rate_range check (win_rate between 0 and 100)
);

create index if not exists player_ranking_scope_bp_idx
  on public.player_ranking_stats (province, district, subdistrict, skill_bp desc, matches_played desc, win_rate desc, level desc, exp_total desc, user_id);
create index if not exists player_ranking_bp_idx
  on public.player_ranking_stats (skill_bp desc, matches_played desc, win_rate desc, level desc, exp_total desc, user_id);

create or replace function public.sync_player_ranking_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.player_ranking_stats (
    user_id, display_name, handle, avatar_url, level, exp_total, skill_bp,
    province, district, subdistrict, updated_at
  )
  values (
    new.id, new.display_name, new.handle, new.avatar_url, new.level,
    new.exp_total, new.skill_bp, new.province, new.district, new.subdistrict,
    timezone('utc', now())
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    handle = excluded.handle,
    avatar_url = excluded.avatar_url,
    level = excluded.level,
    exp_total = excluded.exp_total,
    skill_bp = excluded.skill_bp,
    province = excluded.province,
    district = excluded.district,
    subdistrict = excluded.subdistrict,
    updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke all on function public.sync_player_ranking_profile() from public, anon, authenticated;

drop trigger if exists profiles_sync_player_ranking on public.profiles;
create trigger profiles_sync_player_ranking
after insert or update of display_name, handle, avatar_url, level, exp_total, skill_bp,
  province, district, subdistrict
on public.profiles
for each row execute function public.sync_player_ranking_profile();

insert into public.player_ranking_stats (
  user_id, display_name, handle, avatar_url, level, exp_total, skill_bp,
  province, district, subdistrict
)
select id, display_name, handle, avatar_url, level, exp_total, skill_bp,
  province, district, subdistrict
from public.profiles
on conflict (user_id) do update set
  display_name = excluded.display_name,
  handle = excluded.handle,
  avatar_url = excluded.avatar_url,
  level = excluded.level,
  exp_total = excluded.exp_total,
  skill_bp = excluded.skill_bp,
  province = excluded.province,
  district = excluded.district,
  subdistrict = excluded.subdistrict,
  updated_at = timezone('utc', now());

create or replace function public.refresh_player_ranking_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.player_ranking_stats as prs
  set matches_played = coalesce((
        select count(distinct mp.match_id)::integer
        from public.match_participants as mp
        join public.match_settlements as ms on ms.match_id = mp.match_id and ms.settlement_status = 'applied'
        where mp.user_id = p_user_id
      ), 0),
      wins = coalesce((
        select count(distinct mp.match_id)::integer
        from public.match_participants as mp
        join public.matches as m on m.id = mp.match_id
        join public.match_settlements as ms on ms.match_id = mp.match_id and ms.settlement_status = 'applied'
        where mp.user_id = p_user_id and mp.team = m.winner_team
      ), 0),
      losses = coalesce((
        select count(distinct mp.match_id)::integer
        from public.match_participants as mp
        join public.match_settlements as ms on ms.match_id = mp.match_id and ms.settlement_status = 'applied'
        where mp.user_id = p_user_id
      ), 0) - coalesce((
        select count(distinct mp.match_id)::integer
        from public.match_participants as mp
        join public.matches as m on m.id = mp.match_id
        join public.match_settlements as ms on ms.match_id = mp.match_id and ms.settlement_status = 'applied'
        where mp.user_id = p_user_id and mp.team = m.winner_team
      ), 0),
      last_match_at = (
        select max(ms.settled_at)
        from public.match_participants as mp
        join public.match_settlements as ms on ms.match_id = mp.match_id and ms.settlement_status = 'applied'
        where mp.user_id = p_user_id
      ),
      updated_at = timezone('utc', now())
  where prs.user_id = p_user_id;

  update public.player_ranking_stats
  set win_rate = case when matches_played = 0 then 0 else round((wins::numeric / matches_played::numeric) * 100, 2) end
  where user_id = p_user_id;
end;
$$;

create or replace function public.refresh_player_ranking_after_settlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player record;
begin
  for v_player in select distinct user_id from public.match_participants where match_id = new.match_id loop
    perform public.refresh_player_ranking_user(v_player.user_id);
  end loop;
  return new;
end;
$$;

revoke all on function public.refresh_player_ranking_user(uuid), public.refresh_player_ranking_after_settlement() from public, anon, authenticated;

drop trigger if exists match_settlements_refresh_player_ranking on public.match_settlements;
create trigger match_settlements_refresh_player_ranking
after insert on public.match_settlements
for each row execute function public.refresh_player_ranking_after_settlement();

revoke all on public.player_ranking_stats from public, anon, authenticated;
grant select on public.player_ranking_stats to authenticated;
alter table public.player_ranking_stats enable row level security;

drop policy if exists player_ranking_stats_select_authenticated on public.player_ranking_stats;
create policy player_ranking_stats_select_authenticated on public.player_ranking_stats
for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Tournament bracket and reward settlement
-- ---------------------------------------------------------------------------

create table if not exists public.tournament_brackets (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null unique references public.tournaments(id) on delete cascade,
  bracket_type text not null default 'single_elimination',
  status text not null default 'active',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournament_brackets_type_allowed check (bracket_type = 'single_elimination'),
  constraint tournament_brackets_status_allowed check (status in ('active', 'completed', 'cancelled'))
);

create table if not exists public.tournament_bracket_matches (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references public.tournament_brackets(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_number smallint not null,
  match_number smallint not null,
  player_a_id uuid references public.profiles(id) on delete set null,
  player_b_id uuid references public.profiles(id) on delete set null,
  winner_id uuid references public.profiles(id) on delete set null,
  score_a smallint,
  score_b smallint,
  status text not null default 'scheduled',
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournament_bracket_matches_round_positive check (round_number > 0),
  constraint tournament_bracket_matches_number_positive check (match_number > 0),
  constraint tournament_bracket_matches_score_range check ((score_a is null or score_a between 0 and 30) and (score_b is null or score_b between 0 and 30)),
  constraint tournament_bracket_matches_status_allowed check (status in ('scheduled', 'live', 'awaiting_confirmation', 'confirmed', 'bye', 'cancelled')),
  constraint tournament_bracket_matches_players_distinct check (player_a_id is null or player_b_id is null or player_a_id <> player_b_id),
  unique (bracket_id, round_number, match_number)
);

create index if not exists tournament_bracket_matches_tournament_round_idx
  on public.tournament_bracket_matches (tournament_id, round_number, match_number);
create index if not exists tournament_bracket_matches_player_idx
  on public.tournament_bracket_matches (player_a_id, player_b_id, status);

create table if not exists public.tournament_reward_awards (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  placement smallint not null,
  exp_reward bigint not null default 0,
  bp_reward integer not null default 0,
  item_id uuid references public.shop_items(id) on delete restrict,
  label text not null default '',
  awarded_at timestamptz not null default timezone('utc', now()),
  constraint tournament_reward_awards_placement_positive check (placement > 0),
  constraint tournament_reward_awards_exp_nonnegative check (exp_reward >= 0),
  constraint tournament_reward_awards_bp_nonnegative check (bp_reward >= 0),
  unique (tournament_id, user_id)
);

create index if not exists tournament_reward_awards_user_idx
  on public.tournament_reward_awards (user_id, awarded_at desc, id);

drop trigger if exists tournament_brackets_set_updated_at on public.tournament_brackets;
create trigger tournament_brackets_set_updated_at
before update on public.tournament_brackets
for each row execute function public.set_updated_at();

drop trigger if exists tournament_bracket_matches_set_updated_at on public.tournament_bracket_matches;
create trigger tournament_bracket_matches_set_updated_at
before update on public.tournament_bracket_matches
for each row execute function public.set_updated_at();

create or replace function public.create_tournament_bracket(p_tournament_id uuid)
returns public.tournament_brackets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_tournament public.tournaments;
  v_bracket public.tournament_brackets;
  v_entry record;
  v_pending_player uuid;
  v_match_number smallint := 0;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Tournament not found'; end if;
  if v_tournament.created_by <> v_user_id and not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Only the tournament organizer can manage the bracket';
  end if;

  select * into v_bracket from public.tournament_brackets where tournament_id = p_tournament_id for update;
  if found then return v_bracket; end if;
  if v_tournament.status not in ('published', 'registration_closed', 'in_progress') then
    raise exception using errcode = '22023', message = 'Tournament is not ready for a bracket';
  end if;
  if (select count(*) from public.tournament_entries where tournament_id = p_tournament_id and entry_status = 'registered') < 2 then
    raise exception using errcode = '22023', message = 'At least two registered players are required';
  end if;

  insert into public.tournament_brackets (tournament_id, created_by)
  values (p_tournament_id, v_user_id)
  returning * into v_bracket;

  for v_entry in
    select user_id
    from public.tournament_entries
    where tournament_id = p_tournament_id and entry_status = 'registered'
    order by seed nulls last, joined_at, user_id
  loop
    if v_pending_player is null then
      v_pending_player := v_entry.user_id;
    else
      v_match_number := v_match_number + 1;
      insert into public.tournament_bracket_matches (
        bracket_id, tournament_id, round_number, match_number, player_a_id, player_b_id, status
      ) values (
        v_bracket.id, p_tournament_id, 1, v_match_number, v_pending_player, v_entry.user_id, 'scheduled'
      );
      v_pending_player := null;
    end if;
  end loop;

  if v_pending_player is not null then
    v_match_number := v_match_number + 1;
    insert into public.tournament_bracket_matches (
      bracket_id, tournament_id, round_number, match_number, player_a_id, winner_id, status
    ) values (
      v_bracket.id, p_tournament_id, 1, v_match_number, v_pending_player, v_pending_player, 'bye'
    );
  end if;

  update public.tournaments set status = 'in_progress' where id = p_tournament_id;
  return v_bracket;
end;
$$;

create or replace function public.upsert_tournament_reward(
  p_tournament_id uuid,
  p_placement smallint,
  p_exp_reward bigint,
  p_bp_reward integer,
  p_item_id uuid default null,
  p_label text default ''
)
returns public.tournament_rewards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reward public.tournament_rewards;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not exists (select 1 from public.tournaments where id = p_tournament_id and (created_by = v_user_id or public.is_current_user_admin())) then
    raise exception using errcode = '42501', message = 'Only the tournament organizer can manage rewards';
  end if;
  if p_placement is null or p_placement < 1 or p_placement > 99 or p_exp_reward is null or p_exp_reward < 0 or p_bp_reward is null or p_bp_reward < 0 or char_length(coalesce(p_label, '')) > 160 then
    raise exception using errcode = '22023', message = 'Invalid tournament reward';
  end if;
  insert into public.tournament_rewards (tournament_id, placement, exp_reward, bp_reward, item_id, label)
  values (p_tournament_id, p_placement, p_exp_reward, p_bp_reward, p_item_id, btrim(coalesce(p_label, '')))
  on conflict (tournament_id, placement) do update set
    exp_reward = excluded.exp_reward,
    bp_reward = excluded.bp_reward,
    item_id = excluded.item_id,
    label = excluded.label
  returning * into v_reward;
  return v_reward;
end;
$$;

create or replace function public.award_tournament_reward(
  p_tournament_id uuid,
  p_user_id uuid,
  p_placement smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reward public.tournament_rewards;
  v_award_id uuid;
begin
  select * into v_reward from public.tournament_rewards where tournament_id = p_tournament_id and placement = p_placement;
  if not found then return; end if;

  insert into public.tournament_reward_awards (
    tournament_id, user_id, placement, exp_reward, bp_reward, item_id, label
  ) values (
    p_tournament_id, p_user_id, v_reward.placement, v_reward.exp_reward,
    v_reward.bp_reward, v_reward.item_id, v_reward.label
  ) on conflict (tournament_id, user_id) do nothing returning id into v_award_id;
  if v_award_id is null then return; end if;

  update public.profiles
  set exp_total = exp_total + v_reward.exp_reward,
      skill_bp = greatest(1000, skill_bp + v_reward.bp_reward)
  where id = p_user_id;
  update public.profiles as p
  set level = coalesce((select max(ld.level) from public.level_definitions as ld where ld.required_exp <= p.exp_total), 1)::smallint
  where p.id = p_user_id;

  if v_reward.item_id is not null then
    insert into public.user_item_inventory (user_id, item_id, quantity)
    values (p_user_id, v_reward.item_id, 1)
    on conflict (user_id, item_id) do update
      set quantity = least(1000000, public.user_item_inventory.quantity + 1),
          updated_at = timezone('utc', now());
  end if;

  insert into public.notifications (user_id, notification_type, title, body, href)
  values (p_user_id, 'tournament_reward', 'คุณได้รับรางวัลจาก Tournament', coalesce(nullif(v_reward.label, ''), 'ยินดีด้วยกับผลงานของคุณ'), '/events/' || p_tournament_id::text);
end;
$$;

create or replace function public.advance_tournament_bracket(
  p_tournament_id uuid,
  p_bracket_id uuid,
  p_round_number smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending boolean;
  v_winner_count integer;
  v_next_round smallint := p_round_number + 1;
  v_next_match_number smallint := 0;
  v_pending_player uuid;
  v_match record;
  v_final record;
begin
  select exists (
    select 1 from public.tournament_bracket_matches
    where bracket_id = p_bracket_id and round_number = p_round_number
      and status not in ('confirmed', 'bye', 'cancelled')
  ) into v_pending;
  if v_pending then return; end if;

  select count(*)::integer into v_winner_count
  from public.tournament_bracket_matches
  where bracket_id = p_bracket_id and round_number = p_round_number and winner_id is not null;
  if v_winner_count = 0 then return; end if;

  if v_winner_count = 1 then
    select * into v_final
    from public.tournament_bracket_matches
    where bracket_id = p_bracket_id and round_number = p_round_number and winner_id is not null
    order by match_number desc limit 1;
    update public.tournament_entries
    set entry_status = case when user_id = v_final.winner_id then 'winner' else 'eliminated' end
    where tournament_id = p_tournament_id and entry_status in ('registered', 'eliminated', 'winner');
    perform public.award_tournament_reward(p_tournament_id, v_final.winner_id, 1);
    if v_final.player_a_id is not null and v_final.player_a_id <> v_final.winner_id then
      perform public.award_tournament_reward(p_tournament_id, v_final.player_a_id, 2);
    elsif v_final.player_b_id is not null and v_final.player_b_id <> v_final.winner_id then
      perform public.award_tournament_reward(p_tournament_id, v_final.player_b_id, 2);
    end if;
    update public.tournament_brackets set status = 'completed' where id = p_bracket_id;
    update public.tournaments set status = 'completed' where id = p_tournament_id;
    return;
  end if;

  if exists (select 1 from public.tournament_bracket_matches where bracket_id = p_bracket_id and round_number = v_next_round) then
    return;
  end if;

  for v_match in
    select winner_id
    from public.tournament_bracket_matches
    where bracket_id = p_bracket_id and round_number = p_round_number and winner_id is not null
    order by match_number
  loop
    if v_pending_player is null then
      v_pending_player := v_match.winner_id;
    else
      v_next_match_number := v_next_match_number + 1;
      insert into public.tournament_bracket_matches (
        bracket_id, tournament_id, round_number, match_number, player_a_id, player_b_id, status
      ) values (
        p_bracket_id, p_tournament_id, v_next_round, v_next_match_number, v_pending_player, v_match.winner_id, 'scheduled'
      );
      v_pending_player := null;
    end if;
  end loop;
  if v_pending_player is not null then
    v_next_match_number := v_next_match_number + 1;
    insert into public.tournament_bracket_matches (
      bracket_id, tournament_id, round_number, match_number, player_a_id, winner_id, status
    ) values (
      p_bracket_id, p_tournament_id, v_next_round, v_next_match_number, v_pending_player, v_pending_player, 'bye'
    );
  end if;
end;
$$;

create or replace function public.record_tournament_bracket_result(
  p_match_id uuid,
  p_score_a smallint,
  p_score_b smallint
)
returns public.tournament_bracket_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_match public.tournament_bracket_matches;
  v_tournament public.tournaments;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select * into v_match from public.tournament_bracket_matches where id = p_match_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Tournament match not found'; end if;
  select * into v_tournament from public.tournaments where id = v_match.tournament_id;
  if v_tournament.created_by <> v_user_id and v_match.player_a_id <> v_user_id and v_match.player_b_id <> v_user_id and not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Only a tournament participant or organizer can submit the result';
  end if;
  if v_match.status not in ('scheduled', 'live') or v_match.player_a_id is null or v_match.player_b_id is null then
    raise exception using errcode = '22023', message = 'Tournament match is not ready for a result';
  end if;
  if p_score_a is null or p_score_b is null or p_score_a not between 0 and 30 or p_score_b not between 0 and 30 or p_score_a = p_score_b or greatest(p_score_a, p_score_b) < 21 or (greatest(p_score_a, p_score_b) <> 30 and abs(p_score_a - p_score_b) < 2) then
    raise exception using errcode = '22023', message = 'Invalid badminton score';
  end if;
  update public.tournament_bracket_matches
  set score_a = p_score_a, score_b = p_score_b, status = 'awaiting_confirmation', submitted_by = v_user_id, submitted_at = timezone('utc', now())
  where id = p_match_id
  returning * into v_match;
  return v_match;
end;
$$;

create or replace function public.confirm_tournament_bracket_result(p_match_id uuid)
returns public.tournament_bracket_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_match public.tournament_bracket_matches;
  v_tournament public.tournaments;
  v_winner uuid;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select * into v_match from public.tournament_bracket_matches where id = p_match_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Tournament match not found'; end if;
  select * into v_tournament from public.tournaments where id = v_match.tournament_id;
  if v_match.status <> 'awaiting_confirmation' or v_match.submitted_by = v_user_id then
    raise exception using errcode = '22023', message = 'Tournament result is not ready to confirm';
  end if;
  if v_tournament.created_by <> v_user_id and v_match.player_a_id <> v_user_id and v_match.player_b_id <> v_user_id and not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Only a tournament participant or organizer can confirm the result';
  end if;
  v_winner := case when v_match.score_a > v_match.score_b then v_match.player_a_id else v_match.player_b_id end;
  update public.tournament_bracket_matches
  set winner_id = v_winner, status = 'confirmed', confirmed_by = v_user_id, confirmed_at = timezone('utc', now())
  where id = p_match_id
  returning * into v_match;
  update public.tournament_entries
  set entry_status = 'eliminated'
  where tournament_id = v_match.tournament_id
    and user_id = case when v_winner = v_match.player_a_id then v_match.player_b_id else v_match.player_a_id end
    and entry_status = 'registered';
  perform public.advance_tournament_bracket(v_match.tournament_id, v_match.bracket_id, v_match.round_number);
  return v_match;
end;
$$;

revoke all on function public.create_tournament_bracket(uuid), public.upsert_tournament_reward(uuid, smallint, bigint, integer, uuid, text), public.record_tournament_bracket_result(uuid, smallint, smallint), public.confirm_tournament_bracket_result(uuid) from public, anon;
grant execute on function public.create_tournament_bracket(uuid), public.upsert_tournament_reward(uuid, smallint, bigint, integer, uuid, text), public.record_tournament_bracket_result(uuid, smallint, smallint), public.confirm_tournament_bracket_result(uuid) to authenticated;
revoke all on function public.award_tournament_reward(uuid, uuid, smallint), public.advance_tournament_bracket(uuid, uuid, smallint) from public, anon, authenticated;

revoke all on public.tournament_brackets, public.tournament_bracket_matches, public.tournament_reward_awards from public, anon, authenticated;
grant select on public.tournament_brackets, public.tournament_bracket_matches, public.tournament_reward_awards to authenticated;
alter table public.tournament_brackets enable row level security;
alter table public.tournament_bracket_matches enable row level security;
alter table public.tournament_reward_awards enable row level security;

drop policy if exists tournament_brackets_select_visible on public.tournament_brackets;
create policy tournament_brackets_select_visible on public.tournament_brackets
for select to authenticated
using (exists (select 1 from public.tournaments t where t.id = tournament_brackets.tournament_id and (t.status <> 'draft' or t.created_by = (select auth.uid()))));

drop policy if exists tournament_bracket_matches_select_visible on public.tournament_bracket_matches;
create policy tournament_bracket_matches_select_visible on public.tournament_bracket_matches
for select to authenticated
using (exists (
  select 1 from public.tournaments t
  where t.id = tournament_bracket_matches.tournament_id
    and (t.status <> 'draft' or t.created_by = (select auth.uid()))
));

drop policy if exists tournament_reward_awards_select_visible on public.tournament_reward_awards;
create policy tournament_reward_awards_select_visible on public.tournament_reward_awards
for select to authenticated
using (user_id = (select auth.uid()) or exists (select 1 from public.tournaments t where t.id = tournament_reward_awards.tournament_id and t.created_by = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- MVP voting for confirmed group matches
-- ---------------------------------------------------------------------------

create table if not exists public.match_mvp_votes (
  match_id uuid not null references public.matches(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  candidate_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (match_id, voter_id)
);

create index if not exists match_mvp_votes_match_candidate_idx
  on public.match_mvp_votes (match_id, candidate_user_id, created_at);

create table if not exists public.match_mvp_awards (
  match_id uuid primary key references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_count integer not null,
  bonus_exp bigint not null default 50,
  bonus_bp integer not null default 10,
  awarded_at timestamptz not null default timezone('utc', now()),
  constraint match_mvp_awards_votes_positive check (vote_count > 0),
  constraint match_mvp_awards_exp_nonnegative check (bonus_exp >= 0),
  constraint match_mvp_awards_bp_nonnegative check (bonus_bp >= 0)
);

create index if not exists match_mvp_awards_user_idx
  on public.match_mvp_awards (user_id, awarded_at desc, match_id);

create or replace function public.cast_match_mvp_vote(p_match_id uuid, p_candidate_user_id uuid)
returns public.match_mvp_votes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_vote public.match_mvp_votes;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not exists (select 1 from public.matches where id = p_match_id and status = 'confirmed') then
    raise exception using errcode = '22023', message = 'MVP voting is open only after match confirmation';
  end if;
  if not exists (
    select 1 from public.matches m
    join public.group_members gm on gm.group_id = m.group_id and gm.user_id = v_user_id and gm.membership_status in ('registered', 'attended')
    where m.id = p_match_id
  ) then
    raise exception using errcode = '42501', message = 'Only group members can vote for MVP';
  end if;
  if not exists (select 1 from public.match_participants where match_id = p_match_id and user_id = p_candidate_user_id) then
    raise exception using errcode = '22023', message = 'MVP candidate is not in this match';
  end if;
  if exists (select 1 from public.match_mvp_awards where match_id = p_match_id) then
    raise exception using errcode = '22023', message = 'MVP has already been finalized';
  end if;
  insert into public.match_mvp_votes (match_id, voter_id, candidate_user_id)
  values (p_match_id, v_user_id, p_candidate_user_id)
  returning * into v_vote;
  return v_vote;
end;
$$;

create or replace function public.finalize_match_mvp(p_match_id uuid)
returns public.match_mvp_awards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_match public.matches;
  v_candidate record;
  v_award public.match_mvp_awards;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Match not found'; end if;
  if v_match.created_by <> v_user_id and not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Only the match organizer can finalize MVP';
  end if;
  if v_match.status <> 'confirmed' then raise exception using errcode = '22023', message = 'Match must be confirmed before MVP'; end if;
  select candidate_user_id, count(*)::integer as votes
  into v_candidate
  from public.match_mvp_votes
  where match_id = p_match_id
  group by candidate_user_id
  order by count(*) desc, min(created_at), candidate_user_id
  limit 1;
  if not found then raise exception using errcode = '22023', message = 'No MVP votes yet'; end if;
  insert into public.match_mvp_awards (match_id, user_id, vote_count)
  values (p_match_id, v_candidate.candidate_user_id, v_candidate.votes)
  on conflict (match_id) do nothing
  returning * into v_award;
  if v_award.match_id is null then
    select * into v_award from public.match_mvp_awards where match_id = p_match_id;
    return v_award;
  end if;
  update public.profiles
  set exp_total = exp_total + v_award.bonus_exp,
      skill_bp = skill_bp + v_award.bonus_bp
  where id = v_award.user_id;
  update public.profiles as p
  set level = coalesce((select max(ld.level) from public.level_definitions as ld where ld.required_exp <= p.exp_total), 1)::smallint
  where p.id = v_award.user_id;
  insert into public.notifications (user_id, notification_type, title, body, href)
  values (v_award.user_id, 'match_mvp', 'คุณได้รับ MVP ประจำแมตช์', 'รับโบนัส EXP และ BP จากการโหวตของสมาชิกในก๊วน', '/matches/' || p_match_id::text);
  return v_award;
end;
$$;

revoke all on function public.cast_match_mvp_vote(uuid, uuid), public.finalize_match_mvp(uuid) from public, anon;
grant execute on function public.cast_match_mvp_vote(uuid, uuid), public.finalize_match_mvp(uuid) to authenticated;

revoke all on public.match_mvp_votes, public.match_mvp_awards from public, anon, authenticated;
grant select on public.match_mvp_votes, public.match_mvp_awards to authenticated;
alter table public.match_mvp_votes enable row level security;
alter table public.match_mvp_awards enable row level security;

drop policy if exists match_mvp_votes_select_group_member on public.match_mvp_votes;
create policy match_mvp_votes_select_group_member on public.match_mvp_votes
for select to authenticated
using (exists (
  select 1 from public.matches m
  join public.group_members gm on gm.group_id = m.group_id and gm.user_id = (select auth.uid()) and gm.membership_status in ('registered', 'attended')
  where m.id = match_mvp_votes.match_id
));

drop policy if exists match_mvp_awards_select_group_member on public.match_mvp_awards;
create policy match_mvp_awards_select_group_member on public.match_mvp_awards
for select to authenticated
using (exists (
  select 1 from public.matches m
  join public.group_members gm on gm.group_id = m.group_id and gm.user_id = (select auth.uid()) and gm.membership_status in ('registered', 'attended')
  where m.id = match_mvp_awards.match_id
));

