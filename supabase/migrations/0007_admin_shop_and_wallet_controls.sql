-- Arena-Badminton Phase 6: admin authorization, catalog management, and a
-- manual/internal Gems credit boundary for the future payment integration.
--
-- Authorization is stored in the database, not in user-editable metadata.
-- There is intentionally no public top-up endpoint and no payment webhook in
-- this migration. A future payment provider must call a server-only boundary
-- after payment verification, using the same idempotent wallet ledger rules.

create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_users_role_allowed check (role = 'admin')
);

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
before update on public.admin_users
for each row execute function public.set_updated_at();

revoke all on public.admin_users from public, anon, authenticated;
alter table public.admin_users enable row level security;

-- This function exposes only a boolean and accepts no user-controlled user id.
-- It is used by both the admin RPCs and the admin catalog SELECT policy.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and role = 'admin'
      and is_active = true
  );
$$;

revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists shop_items_select_admin_all on public.shop_items;
create policy shop_items_select_admin_all on public.shop_items
for select to authenticated
using (public.is_current_user_admin());

-- Admin catalog writes stay behind a server-side security-definer RPC. Items
-- are deactivated rather than deleted so purchase and audit references survive.
create or replace function public.admin_save_shop_item(
  p_item_id uuid,
  p_slug text,
  p_name text,
  p_description text,
  p_item_type text,
  p_rarity_tier text,
  p_icon text,
  p_effect_type text,
  p_effect_value smallint,
  p_price_gems bigint,
  p_is_active boolean,
  p_sort_order smallint
)
returns public.shop_items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.shop_items;
begin
  if not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if p_slug is null or char_length(btrim(p_slug)) not between 3 and 80
     or p_name is null or char_length(btrim(p_name)) not between 1 and 120
     or p_description is not null and char_length(p_description) > 500
     or p_icon is not null and char_length(p_icon) > 16 then
    raise exception using errcode = '22023', message = 'Shop item text is out of range';
  end if;

  if p_item_type not in ('exp_booster', 'badge', 'title', 'cosmetic')
     or p_rarity_tier not in ('white', 'green', 'blue', 'purple', 'orange', 'red', 'gold', 'rainbow')
     or p_effect_type not in ('none', 'exp_boost')
     or p_price_gems is null or p_price_gems not between 0 and 1000000000
     or p_sort_order is null then
    raise exception using errcode = '22023', message = 'Shop item configuration is invalid';
  end if;

  if (p_effect_type = 'none' and coalesce(p_effect_value, 0) <> 0)
     or (p_effect_type = 'exp_boost'
         and p_item_type not in ('exp_booster', 'badge')
         and coalesce(p_effect_value, 0) <> 0)
     or (p_effect_type = 'exp_boost'
         and p_item_type in ('exp_booster', 'badge')
         and coalesce(p_effect_value, 0) not between 1 and 100) then
    raise exception using errcode = '22023', message = 'Shop item effect is invalid';
  end if;

  if p_item_id is null then
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
      is_active,
      sort_order
    )
    values (
      btrim(p_slug),
      btrim(p_name),
      coalesce(p_description, ''),
      p_item_type,
      p_rarity_tier,
      coalesce(nullif(btrim(p_icon), ''), '✨'),
      p_effect_type,
      coalesce(p_effect_value, 0),
      p_price_gems,
      coalesce(p_is_active, true),
      p_sort_order
    )
    returning * into v_item;
  else
    update public.shop_items
    set slug = btrim(p_slug),
        name = btrim(p_name),
        description = coalesce(p_description, ''),
        item_type = p_item_type,
        rarity_tier = p_rarity_tier,
        icon = coalesce(nullif(btrim(p_icon), ''), '✨'),
        effect_type = p_effect_type,
        effect_value = coalesce(p_effect_value, 0),
        price_gems = p_price_gems,
        is_active = coalesce(p_is_active, true),
        sort_order = p_sort_order
    where id = p_item_id
    returning * into v_item;

    if not found then
      raise exception using errcode = 'P0002', message = 'Shop item not found';
    end if;
  end if;

  return v_item;
end;
$$;

-- Internal/admin credit only. The future verified payment webhook should use
-- this same audited operation through a private server boundary, never from a
-- public browser request. The per-user idempotency key prevents duplicate
-- credits when a provider retries a webhook.
create or replace function public.admin_credit_gems(
  p_user_id uuid,
  p_amount bigint,
  p_reference text,
  p_idempotency_key text
)
returns public.user_wallets
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_wallet public.user_wallets;
  v_existing public.wallet_ledger;
  v_reference text := btrim(coalesce(p_reference, ''));
begin
  if not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if p_user_id is null or p_amount is null or p_amount not between 1 and 1000000000
     or char_length(v_reference) not between 3 and 160
     or p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Gems credit request is invalid';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'Target user not found';
  end if;

  insert into public.user_wallets (user_id, gems_balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.user_wallets
  where user_id = p_user_id
  for update;

  select * into v_existing
  from public.wallet_ledger
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  if found then
    return v_wallet;
  end if;

  if v_wallet.gems_balance > 9223372036854775807 - p_amount then
    raise exception using errcode = '22003', message = 'Gems balance is out of range';
  end if;

  update public.user_wallets
  set gems_balance = v_wallet.gems_balance + p_amount
  where user_id = p_user_id
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
    p_user_id,
    'admin_credit',
    p_amount,
    v_wallet.gems_balance - p_amount,
    v_wallet.gems_balance,
    null,
    p_idempotency_key,
    jsonb_build_object(
      'reference', v_reference,
      'credit_source', 'admin_internal'
    )
  );

  return v_wallet;
end;
$$;

revoke all on function public.admin_save_shop_item(uuid, text, text, text, text, text, text, text, smallint, bigint, boolean, smallint) from public, anon;
revoke all on function public.admin_credit_gems(uuid, bigint, text, text) from public, anon;
grant execute on function public.admin_save_shop_item(uuid, text, text, text, text, text, text, text, smallint, bigint, boolean, smallint) to authenticated;
grant execute on function public.admin_credit_gems(uuid, bigint, text, text) to authenticated;

