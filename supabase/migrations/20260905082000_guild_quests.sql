-- Arena-Badminton Guild quests.
-- Quest progress is calculated in the database so rewards cannot be claimed
-- by editing client-side counters.

create table if not exists public.guild_quests (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  title text not null,
  description text not null default '',
  quest_type text not null,
  target_value integer not null,
  reward_guild_exp bigint not null default 0,
  reward_exp bigint not null default 0,
  reward_item_id uuid references public.shop_items(id) on delete restrict,
  status text not null default 'active',
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint guild_quests_title_length check (char_length(btrim(title)) between 2 and 160),
  constraint guild_quests_description_length check (char_length(description) <= 1000),
  constraint guild_quests_type_allowed check (quest_type in ('match_played', 'match_wins', 'members_joined', 'guild_exp')),
  constraint guild_quests_target_positive check (target_value > 0),
  constraint guild_quests_rewards_nonnegative check (reward_guild_exp >= 0 and reward_exp >= 0),
  constraint guild_quests_status_allowed check (status in ('active', 'paused', 'completed', 'expired')),
  constraint guild_quests_date_order check (ends_at > starts_at)
);

create index if not exists guild_quests_guild_status_dates_idx
  on public.guild_quests (guild_id, status, starts_at, ends_at, created_at desc, id);

create table if not exists public.guild_quest_claims (
  quest_id uuid not null references public.guild_quests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  progress_snapshot integer not null,
  reward_guild_exp bigint not null default 0,
  reward_exp bigint not null default 0,
  reward_item_id uuid references public.shop_items(id) on delete restrict,
  claimed_at timestamptz not null default timezone('utc', now()),
  primary key (quest_id, user_id),
  constraint guild_quest_claims_progress_nonnegative check (progress_snapshot >= 0),
  constraint guild_quest_claims_rewards_nonnegative check (reward_guild_exp >= 0 and reward_exp >= 0)
);

create index if not exists guild_quest_claims_user_claimed_idx
  on public.guild_quest_claims (user_id, claimed_at desc, quest_id);

drop trigger if exists guild_quests_set_updated_at on public.guild_quests;
create trigger guild_quests_set_updated_at
before update on public.guild_quests
for each row execute function public.set_updated_at();

create or replace function public.create_guild_quest(
  p_guild_id uuid,
  p_title text,
  p_description text,
  p_quest_type text,
  p_target_value integer,
  p_reward_guild_exp bigint,
  p_reward_exp bigint,
  p_reward_item_id uuid default null,
  p_starts_at timestamptz default timezone('utc', now()),
  p_ends_at timestamptz default (timezone('utc', now()) + interval '30 days')
)
returns public.guild_quests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_quest public.guild_quests;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not public.can_manage_guild(p_guild_id) then
    raise exception using errcode = '42501', message = 'Only Guild managers can create quests';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 2 and 160
     or char_length(coalesce(p_description, '')) > 1000
     or p_quest_type not in ('match_played', 'match_wins', 'members_joined', 'guild_exp')
     or p_target_value is null or p_target_value <= 0
     or p_reward_guild_exp is null or p_reward_guild_exp < 0
     or p_reward_exp is null or p_reward_exp < 0
     or p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception using errcode = '22023', message = 'Invalid Guild quest';
  end if;
  if p_reward_item_id is not null and not exists (
    select 1 from public.shop_items where id = p_reward_item_id and is_active = true
  ) then
    raise exception using errcode = 'P0002', message = 'Quest reward item not found';
  end if;

  insert into public.guild_quests (
    guild_id, title, description, quest_type, target_value, reward_guild_exp,
    reward_exp, reward_item_id, starts_at, ends_at, created_by
  ) values (
    p_guild_id, btrim(p_title), btrim(coalesce(p_description, '')), p_quest_type,
    p_target_value, p_reward_guild_exp, p_reward_exp, p_reward_item_id,
    p_starts_at, p_ends_at, v_user_id
  ) returning * into v_quest;

  insert into public.guild_audit_logs (guild_id, actor_id, action, metadata)
  values (p_guild_id, v_user_id, 'quest_created', jsonb_build_object('quest_id', v_quest.id, 'quest_type', p_quest_type));
  return v_quest;
end;
$$;

create or replace function public.guild_quest_progress(p_quest_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_quest public.guild_quests;
  v_progress integer := 0;
begin
  if v_user_id is null then return 0; end if;
  select * into v_quest from public.guild_quests where id = p_quest_id;
  if not found then return 0; end if;
  if not exists (
    select 1 from public.guild_members
    where guild_id = v_quest.guild_id and user_id = v_user_id and membership_status = 'active'
  ) then return 0; end if;

  if v_quest.quest_type = 'match_played' then
    select count(distinct m.id)::integer into v_progress
    from public.matches m
    join public.groups g on g.id = m.group_id and g.guild_id = v_quest.guild_id
    join public.match_settlements ms on ms.match_id = m.id and ms.settlement_status = 'applied'
    join public.match_participants mp on mp.match_id = m.id
    join public.guild_members gm on gm.guild_id = v_quest.guild_id and gm.user_id = mp.user_id and gm.membership_status = 'active'
    where ms.settled_at >= v_quest.starts_at and ms.settled_at <= v_quest.ends_at;
  elsif v_quest.quest_type = 'match_wins' then
    select count(distinct m.id)::integer into v_progress
    from public.matches m
    join public.groups g on g.id = m.group_id and g.guild_id = v_quest.guild_id
    join public.match_settlements ms on ms.match_id = m.id and ms.settlement_status = 'applied'
    join public.match_participants mp on mp.match_id = m.id and mp.team = m.winner_team
    join public.guild_members gm on gm.guild_id = v_quest.guild_id and gm.user_id = mp.user_id and gm.membership_status = 'active'
    where ms.settled_at >= v_quest.starts_at and ms.settled_at <= v_quest.ends_at;
  elsif v_quest.quest_type = 'members_joined' then
    select count(*)::integer into v_progress
    from public.guild_members
    where guild_id = v_quest.guild_id and membership_status = 'active'
      and joined_at >= v_quest.starts_at and joined_at <= v_quest.ends_at;
  else
    select coalesce(sum(amount), 0)::integer into v_progress
    from public.guild_exp_ledger
    where guild_id = v_quest.guild_id and created_at >= v_quest.starts_at and created_at <= v_quest.ends_at;
  end if;
  return greatest(0, coalesce(v_progress, 0));
end;
$$;

create or replace function public.claim_guild_quest(p_quest_id uuid)
returns public.guild_quest_claims
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_quest public.guild_quests;
  v_claim public.guild_quest_claims;
  v_progress integer;
  v_level smallint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  select * into v_quest from public.guild_quests where id = p_quest_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Guild quest not found'; end if;
  if not exists (
    select 1 from public.guild_members
    where guild_id = v_quest.guild_id and user_id = v_user_id and membership_status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Active Guild member required';
  end if;
  if v_quest.status <> 'active' or timezone('utc', now()) < v_quest.starts_at or timezone('utc', now()) > v_quest.ends_at then
    raise exception using errcode = '22023', message = 'Guild quest is not active';
  end if;
  v_progress := public.guild_quest_progress(p_quest_id);
  if v_progress < v_quest.target_value then
    raise exception using errcode = '22023', message = 'Guild quest target has not been reached';
  end if;

  insert into public.guild_quest_claims (
    quest_id, user_id, progress_snapshot, reward_guild_exp, reward_exp, reward_item_id
  ) values (
    v_quest.id, v_user_id, v_progress, v_quest.reward_guild_exp, v_quest.reward_exp, v_quest.reward_item_id
  ) on conflict (quest_id, user_id) do nothing returning * into v_claim;
  if v_claim.quest_id is null then
    select * into v_claim from public.guild_quest_claims where quest_id = p_quest_id and user_id = v_user_id;
    return v_claim;
  end if;

  if v_claim.reward_guild_exp > 0 then
    update public.guilds
    set exp_total = exp_total + v_claim.reward_guild_exp,
        level = least(99, greatest(1, floor((exp_total + v_claim.reward_guild_exp) / 1000)::integer + 1))
    where id = v_quest.guild_id;
    insert into public.guild_exp_ledger (guild_id, user_id, source_type, amount, metadata)
    values (v_quest.guild_id, v_user_id, 'quest', v_claim.reward_guild_exp, jsonb_build_object('quest_id', v_quest.id));
    update public.guild_members
    set contribution_exp = contribution_exp + v_claim.reward_guild_exp
    where guild_id = v_quest.guild_id and user_id = v_user_id and membership_status = 'active';
  end if;

  if v_claim.reward_exp > 0 then
    update public.profiles set exp_total = exp_total + v_claim.reward_exp where id = v_user_id;
    select coalesce(max(level), 1)::smallint into v_level from public.level_definitions where required_exp <= (select exp_total from public.profiles where id = v_user_id);
    update public.profiles set level = v_level where id = v_user_id;
  end if;
  if v_claim.reward_item_id is not null then
    insert into public.user_item_inventory (user_id, item_id, quantity)
    values (v_user_id, v_claim.reward_item_id, 1)
    on conflict (user_id, item_id) do update
      set quantity = least(1000000, public.user_item_inventory.quantity + 1), updated_at = timezone('utc', now());
  end if;
  insert into public.notifications (user_id, notification_type, title, body, href)
  values (v_user_id, 'guild_quest', 'รับรางวัล Guild Quest แล้ว', 'คุณได้รับรางวัลจากภารกิจของ Guild', '/guilds/' || v_quest.guild_id::text);
  return v_claim;
end;
$$;

revoke all on function public.create_guild_quest(uuid, text, text, text, integer, bigint, bigint, uuid, timestamptz, timestamptz), public.guild_quest_progress(uuid), public.claim_guild_quest(uuid) from public, anon;
grant execute on function public.create_guild_quest(uuid, text, text, text, integer, bigint, bigint, uuid, timestamptz, timestamptz), public.guild_quest_progress(uuid), public.claim_guild_quest(uuid) to authenticated;

revoke all on public.guild_quests, public.guild_quest_claims from public, anon, authenticated;
grant select on public.guild_quests, public.guild_quest_claims to authenticated;
alter table public.guild_quests enable row level security;
alter table public.guild_quest_claims enable row level security;

drop policy if exists guild_quests_select_member on public.guild_quests;
create policy guild_quests_select_member on public.guild_quests
for select to authenticated
using (exists (
  select 1 from public.guild_members gm
  where gm.guild_id = guild_quests.guild_id and gm.user_id = (select auth.uid()) and gm.membership_status = 'active'
));

drop policy if exists guild_quest_claims_select_member on public.guild_quest_claims;
create policy guild_quest_claims_select_member on public.guild_quest_claims
for select to authenticated
using (user_id = (select auth.uid()) or exists (
  select 1 from public.guild_quests q
  join public.guild_members gm on gm.guild_id = q.guild_id and gm.user_id = (select auth.uid()) and gm.membership_status = 'active'
  where q.id = guild_quest_claims.quest_id
));

