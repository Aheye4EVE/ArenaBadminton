-- Arena-Badminton Phase 5: Shop catalog, virtual Gems, inventory, and
-- server-side EXP Booster rewards.
--
-- Gems are an in-app currency placeholder in this phase. There is deliberately
-- no payment/top-up RPC exposed to a client yet. BP is never a shop effect and
-- can only be changed by the match settlement rules from Phase 4.

create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  item_type text not null default 'exp_booster',
  rarity_tier text not null default 'white',
  icon text not null default '✨',
  effect_type text not null default 'none',
  effect_value smallint not null default 0,
  price_gems bigint not null default 0,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shop_items_slug_length check (char_length(slug) between 3 and 80),
  constraint shop_items_name_length check (char_length(name) between 1 and 120),
  constraint shop_items_description_length check (char_length(description) <= 500),
  constraint shop_items_type_allowed check (item_type in ('exp_booster', 'badge', 'title', 'cosmetic')),
  constraint shop_items_rarity_allowed check (rarity_tier in ('white', 'green', 'blue', 'purple', 'orange', 'red', 'gold', 'rainbow')),
  constraint shop_items_effect_allowed check (effect_type in ('none', 'exp_boost')),
  constraint shop_items_effect_consistency check (
    (effect_type = 'none' and effect_value = 0)
    or (effect_type = 'exp_boost' and item_type in ('exp_booster', 'badge') and effect_value between 1 and 100)
  ),
  constraint shop_items_price_range check (price_gems between 0 and 1000000000),
  constraint shop_items_sort_order_range check (sort_order between -32768 and 32767)
);

insert into public.shop_items (
  slug,
  name,
  description,
  item_type,
  rarity_tier,
  icon,
  effect_type,
  effect_value,
  price_gems,
  sort_order
)
values
  ('exp-booster-10', 'Rally Spark Badge', 'Badge ที่เพิ่ม Base EXP จากแมตช์นี้อีก 10%', 'badge', 'green', '⚡', 'exp_boost', 10, 49, 10),
  ('exp-booster-15', 'Turbo Rally Badge', 'Badge ที่เพิ่ม Base EXP จากแมตช์นี้อีก 15%', 'badge', 'blue', '🚀', 'exp_boost', 15, 99, 20),
  ('exp-booster-20', 'Rainbow Momentum Badge', 'Badge หายากที่เพิ่ม Base EXP จากแมตช์นี้อีก 20%', 'badge', 'rainbow', '🌈', 'exp_boost', 20, 149, 30)
on conflict (slug) do nothing;

create table if not exists public.user_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  gems_balance bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_wallets_balance_nonnegative check (gems_balance >= 0)
);

create table if not exists public.shop_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.shop_items(id) on delete restrict,
  quantity smallint not null,
  unit_price_gems bigint not null,
  total_price_gems bigint not null,
  status text not null default 'completed',
  idempotency_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint shop_purchases_quantity_range check (quantity between 1 and 99),
  constraint shop_purchases_unit_price_nonnegative check (unit_price_gems >= 0),
  constraint shop_purchases_total_price_nonnegative check (total_price_gems >= 0),
  constraint shop_purchases_total_reconciles check (total_price_gems = unit_price_gems * quantity),
  constraint shop_purchases_status_allowed check (status in ('completed', 'refunded')),
  constraint shop_purchases_idempotency_length check (char_length(idempotency_key) between 16 and 128),
  unique (user_id, idempotency_key)
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_type text not null,
  amount bigint not null,
  balance_before bigint not null,
  balance_after bigint not null,
  reference_id uuid references public.shop_purchases(id) on delete set null,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint wallet_ledger_type_allowed check (transaction_type in ('purchase', 'admin_credit', 'admin_debit', 'refund')),
  constraint wallet_ledger_balances_nonnegative check (balance_before >= 0 and balance_after >= 0),
  constraint wallet_ledger_reconciles check (balance_after = balance_before + amount),
  constraint wallet_ledger_idempotency_length check (char_length(idempotency_key) between 16 and 128),
  unique (user_id, idempotency_key)
);

create table if not exists public.user_item_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.shop_items(id) on delete restrict,
  quantity integer not null default 1,
  is_equipped boolean not null default false,
  acquired_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_item_inventory_quantity_range check (quantity between 1 and 1000000),
  unique (user_id, item_id)
);

alter table public.match_settlements
  add column if not exists winner_item_bonus_exp bigint not null default 0,
  add column if not exists loser_item_bonus_exp bigint not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'match_settlements_item_bonus_nonnegative'
      and conrelid = 'public.match_settlements'::regclass
  ) then
    alter table public.match_settlements
      add constraint match_settlements_item_bonus_nonnegative
      check (winner_item_bonus_exp >= 0 and loser_item_bonus_exp >= 0);
  end if;
end;
$$;

create index if not exists shop_items_active_sort_idx
  on public.shop_items (sort_order, created_at, id)
  where is_active = true;

create index if not exists user_wallets_updated_idx
  on public.user_wallets (updated_at desc, user_id);

create index if not exists shop_purchases_user_created_idx
  on public.shop_purchases (user_id, created_at desc, id);

create index if not exists shop_purchases_item_created_idx
  on public.shop_purchases (item_id, created_at desc, id);

create index if not exists wallet_ledger_user_created_idx
  on public.wallet_ledger (user_id, created_at desc, id);

create index if not exists user_item_inventory_user_equipped_idx
  on public.user_item_inventory (user_id, is_equipped, updated_at desc, item_id);

create index if not exists user_item_inventory_item_user_idx
  on public.user_item_inventory (item_id, user_id);

drop trigger if exists shop_items_set_updated_at on public.shop_items;
create trigger shop_items_set_updated_at
before update on public.shop_items
for each row execute function public.set_updated_at();

drop trigger if exists user_wallets_set_updated_at on public.user_wallets;
create trigger user_wallets_set_updated_at
before update on public.user_wallets
for each row execute function public.set_updated_at();

drop trigger if exists user_item_inventory_set_updated_at on public.user_item_inventory;
create trigger user_item_inventory_set_updated_at
before update on public.user_item_inventory
for each row execute function public.set_updated_at();

revoke all on public.shop_items, public.user_wallets, public.shop_purchases,
  public.wallet_ledger, public.user_item_inventory
from public, anon, authenticated;
grant select on public.shop_items to authenticated;
grant select on public.user_wallets, public.shop_purchases,
  public.wallet_ledger, public.user_item_inventory to authenticated;

alter table public.shop_items enable row level security;
alter table public.user_wallets enable row level security;
alter table public.shop_purchases enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.user_item_inventory enable row level security;

drop policy if exists shop_items_select_active on public.shop_items;
create policy shop_items_select_active on public.shop_items
for select to authenticated
using (is_active = true);

drop policy if exists user_wallets_select_self on public.user_wallets;
create policy user_wallets_select_self on public.user_wallets
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists shop_purchases_select_self on public.shop_purchases;
create policy shop_purchases_select_self on public.shop_purchases
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists wallet_ledger_select_self on public.wallet_ledger;
create policy wallet_ledger_select_self on public.wallet_ledger
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists user_item_inventory_select_self on public.user_item_inventory;
create policy user_item_inventory_select_self on public.user_item_inventory
for select to authenticated
using (user_id = (select auth.uid()));

-- A purchase holds the item row and the buyer's wallet for only this short
-- transaction. The idempotency key is checked after the wallet lock, so two
-- concurrent retries cannot charge the same user twice.
create or replace function public.purchase_shop_item(
  p_item_id uuid,
  p_quantity smallint,
  p_idempotency_key text
)
returns public.shop_purchases
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item public.shop_items;
  v_wallet public.user_wallets;
  v_purchase public.shop_purchases;
  v_total_price bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_quantity is null or p_quantity not between 1 and 99 then
    raise exception using errcode = '22023', message = 'Purchase quantity is out of range';
  end if;

  if p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Purchase idempotency key is invalid';
  end if;

  select * into v_item
  from public.shop_items
  where id = p_item_id
  for update;

  if not found or not v_item.is_active then
    raise exception using errcode = 'P0002', message = 'Shop item not found or inactive';
  end if;

  insert into public.user_wallets (user_id, gems_balance)
  values (v_user_id, 0)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.user_wallets
  where user_id = v_user_id
  for update;

  select * into v_purchase
  from public.shop_purchases
  where user_id = v_user_id and idempotency_key = p_idempotency_key;

  if found then
    return v_purchase;
  end if;

  v_total_price := v_item.price_gems * p_quantity;
  if v_wallet.gems_balance < v_total_price then
    raise exception using errcode = '22023', message = 'Insufficient Gems';
  end if;

  insert into public.shop_purchases (
    user_id,
    item_id,
    quantity,
    unit_price_gems,
    total_price_gems,
    idempotency_key
  )
  values (
    v_user_id,
    v_item.id,
    p_quantity,
    v_item.price_gems,
    v_total_price,
    p_idempotency_key
  )
  returning * into v_purchase;

  update public.user_wallets
  set gems_balance = v_wallet.gems_balance - v_total_price
  where user_id = v_user_id
  returning * into v_wallet;

  insert into public.wallet_ledger (
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reference_id,
    idempotency_key,
    metadata
  )
  values (
    v_user_id,
    'purchase',
    -v_total_price,
    v_wallet.gems_balance + v_total_price,
    v_wallet.gems_balance,
    v_purchase.id,
    p_idempotency_key,
    jsonb_build_object(
      'item_id', v_item.id,
      'item_slug', v_item.slug,
      'quantity', p_quantity,
      'unit_price_gems', v_item.price_gems
    )
  );

  insert into public.user_item_inventory (user_id, item_id, quantity)
  values (v_user_id, v_item.id, p_quantity)
  on conflict (user_id, item_id) do update
    set quantity = least(1000000, public.user_item_inventory.quantity + excluded.quantity),
        updated_at = timezone('utc', now());

  return v_purchase;
end;
$$;

-- Equipping an EXP Booster changes only the current user's inventory. The
-- selected booster is the only active EXP effect; it never changes BP.
create or replace function public.set_shop_item_equipped(
  p_item_id uuid,
  p_equipped boolean
)
returns public.user_item_inventory
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item public.shop_items;
  v_inventory public.user_item_inventory;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select * into v_item
  from public.shop_items
  where id = p_item_id
    and is_active = true
  for share;

  if not found then
    raise exception using errcode = 'P0002', message = 'Shop item not found or inactive';
  end if;

  if v_item.effect_type <> 'exp_boost' then
    raise exception using errcode = '22023', message = 'Only EXP Booster items can be equipped';
  end if;

  -- Lock the user's EXP inventory rows in item order before updating any of
  -- them. This keeps concurrent equip requests short and deterministic.
  perform 1
  from public.user_item_inventory as ui
  join public.shop_items as si on si.id = ui.item_id
  where ui.user_id = v_user_id
    and (ui.item_id = p_item_id or (ui.is_equipped = true and si.effect_type = 'exp_boost'))
  order by ui.item_id
  for update of ui;

  select * into v_inventory
  from public.user_item_inventory
  where user_id = v_user_id and item_id = p_item_id
  for update;

  if not found or v_inventory.quantity < 1 then
    raise exception using errcode = '22023', message = 'Shop item is not in your inventory';
  end if;

  if not p_equipped then
    update public.user_item_inventory
    set is_equipped = false,
        updated_at = timezone('utc', now())
    where id = v_inventory.id
    returning * into v_inventory;
    return v_inventory;
  end if;

  update public.user_item_inventory as ui
  set is_equipped = false,
      updated_at = timezone('utc', now())
  from public.shop_items as si
  where ui.user_id = v_user_id
    and ui.is_equipped = true
    and si.id = ui.item_id
    and si.effect_type = 'exp_boost';

  update public.user_item_inventory
  set is_equipped = true,
      updated_at = timezone('utc', now())
  where id = v_inventory.id
  returning * into v_inventory;

  return v_inventory;
end;
$$;

-- Recreate settlement so Base EXP and Item Bonus EXP are separate immutable
-- ledger entries while the profile receives their sum atomically.
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
  v_base_exp_reward bigint;
  v_item_bonus_exp bigint;
  v_total_exp_reward bigint;
  v_boost_item_id uuid;
  v_boost_item_slug text;
  v_boost_percent smallint;
  v_winner_item_bonus_exp bigint := 0;
  v_loser_item_bonus_exp bigint := 0;
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

  if v_match.result_submitted_by = v_user_id then
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
    winner_item_bonus_exp,
    loser_item_bonus_exp,
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
    0,
    0,
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
    v_base_exp_reward := case when v_is_winner then v_match.exp_win_reward else v_match.exp_loss_reward end;
    v_boost_item_id := null;
    v_boost_item_slug := null;
    v_boost_percent := 0;

    select si.id, si.slug, si.effect_value
      into v_boost_item_id, v_boost_item_slug, v_boost_percent
    from public.user_item_inventory as ui
    join public.shop_items as si on si.id = ui.item_id
    where ui.user_id = v_player.id
      and ui.quantity > 0
      and ui.is_equipped = true
      and si.is_active = true
      and si.effect_type = 'exp_boost'
    order by ui.updated_at desc, ui.item_id
    limit 1
    for update of ui;

    v_boost_percent := coalesce(v_boost_percent, 0);
    v_item_bonus_exp := floor((v_base_exp_reward * v_boost_percent)::numeric / 100)::bigint;
    v_total_exp_reward := v_base_exp_reward + v_item_bonus_exp;
    v_balance_before := v_player.skill_bp;
    v_balance_after := greatest(v_rules.min_bp, v_balance_before + v_requested_bp);
    v_applied_bp := v_balance_after - v_balance_before;

    if v_is_winner then
      v_winner_item_bonus_exp := v_winner_item_bonus_exp + v_item_bonus_exp;
    else
      v_loser_item_bonus_exp := v_loser_item_bonus_exp + v_item_bonus_exp;
    end if;

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
      v_base_exp_reward,
      v_rules.rule_version,
      jsonb_build_object(
        'reward_layer', 'base',
        'team', v_player.team,
        'winner_team', v_match.winner_team,
        'winner_level', v_winner_level,
        'loser_level', v_loser_level
      )
    );

    if v_item_bonus_exp > 0 then
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
        'item_bonus',
        v_item_bonus_exp,
        v_rules.rule_version,
        jsonb_build_object(
          'reward_layer', 'item_bonus',
          'item_id', v_boost_item_id,
          'item_slug', v_boost_item_slug,
          'boost_percent', v_boost_percent,
          'base_exp', v_base_exp_reward,
          'team', v_player.team
        )
      );
    end if;

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
        exp_total = exp_total + v_total_exp_reward
    where id = v_player.id;
  end loop;

  update public.match_settlements
  set winner_item_bonus_exp = v_winner_item_bonus_exp,
      loser_item_bonus_exp = v_loser_item_bonus_exp
  where match_id = p_match_id;

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

revoke all on function public.purchase_shop_item(uuid, smallint, text) from public, anon;
revoke all on function public.set_shop_item_equipped(uuid, boolean) from public, anon;
revoke all on function public.confirm_match_result(uuid) from public, anon;
grant execute on function public.purchase_shop_item(uuid, smallint, text) to authenticated;
grant execute on function public.set_shop_item_equipped(uuid, boolean) to authenticated;
grant execute on function public.confirm_match_result(uuid) to authenticated;

