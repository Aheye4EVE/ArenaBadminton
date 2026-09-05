-- Arena-Badminton: protected Admin user directory, role control, and wallet
-- adjustment workflows.
--
-- The Admin UI never receives direct table access to private profiles, wallets,
-- or the role table. Every read/write below checks admin_users through a
-- security-definer boundary. BP remains intentionally absent from all write
-- operations: it is earned only through the competitive settlement workflow.

create table if not exists public.admin_role_changes (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  target_user_id uuid not null,
  previous_role text not null,
  next_role text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint admin_role_changes_previous_role_allowed check (previous_role in ('user', 'admin')),
  constraint admin_role_changes_next_role_allowed check (next_role in ('user', 'admin'))
);

create index if not exists admin_role_changes_target_created_idx
  on public.admin_role_changes (target_user_id, created_at desc, id);
create index if not exists admin_role_changes_actor_created_idx
  on public.admin_role_changes (actor_user_id, created_at desc, id);

revoke all on public.admin_role_changes from public, anon, authenticated;
alter table public.admin_role_changes enable row level security;

create or replace function public.admin_list_users(
  p_search text default null,
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  avatar_url text,
  level smallint,
  exp_total bigint,
  skill_bp integer,
  province text,
  district text,
  subdistrict text,
  profile_completed_at timestamptz,
  profile_created_at timestamptz,
  profile_updated_at timestamptz,
  role text,
  is_active boolean,
  gems_balance bigint,
  total_credits bigint,
  total_debits bigint,
  total_purchases bigint,
  inventory_quantity bigint,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
begin
  if not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if p_limit is null or p_limit not between 1 and 100
     or p_offset is null or p_offset < 0 then
    raise exception using errcode = '22023', message = 'User list paging is invalid';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.handle,
    p.avatar_url,
    p.level,
    p.exp_total,
    p.skill_bp,
    p.province,
    p.district,
    p.subdistrict,
    p.profile_completed_at,
    p.created_at,
    p.updated_at,
    case when coalesce(au.is_active, false) and au.role = 'admin' then 'admin' else 'user' end,
    coalesce(au.is_active, false),
    coalesce(uw.gems_balance, 0)::bigint,
    coalesce((select sum(wl.amount) from public.wallet_ledger wl where wl.user_id = p.id and wl.amount > 0), 0)::bigint,
    coalesce((select sum(abs(wl.amount)) from public.wallet_ledger wl where wl.user_id = p.id and wl.amount < 0), 0)::bigint,
    coalesce((select count(*) from public.shop_purchases sp where sp.user_id = p.id and sp.status = 'completed'), 0)::bigint,
    coalesce((select sum(ui.quantity) from public.user_item_inventory ui where ui.user_id = p.id), 0)::bigint,
    count(*) over ()::bigint
  from public.profiles p
  left join public.admin_users au on au.user_id = p.id
  left join public.user_wallets uw on uw.user_id = p.id
  where v_search is null
     or lower(p.display_name) like '%' || v_search || '%'
     or lower(p.handle) like '%' || v_search || '%'
     or p.id::text = v_search
  order by p.created_at desc, p.id desc
  limit p_limit
  offset p_offset;
end;
$$;

create or replace function public.admin_count_users(p_search text default null)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
begin
  if not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  return (
    select count(*)::bigint
    from public.profiles p
    where v_search is null
       or lower(p.display_name) like '%' || v_search || '%'
       or lower(p.handle) like '%' || v_search || '%'
       or p.id::text = v_search
  );
end;
$$;

create or replace function public.admin_get_user_detail(p_user_id uuid)
returns table (
  user_id uuid,
  email text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  display_name text,
  handle text,
  avatar_url text,
  bio text,
  level smallint,
  exp_total bigint,
  skill_bp integer,
  rank_tier smallint,
  rank_name text,
  rank_color text,
  address_line text,
  province text,
  district text,
  subdistrict text,
  postal_code text,
  profile_completed_at timestamptz,
  profile_created_at timestamptz,
  profile_updated_at timestamptz,
  role text,
  is_active boolean,
  gems_balance bigint,
  total_credits bigint,
  total_debits bigint,
  total_purchases bigint,
  inventory_item_types bigint,
  inventory_quantity bigint,
  last_wallet_activity timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if p_user_id is null then
    raise exception using errcode = '22023', message = 'Target user id is invalid';
  end if;

  return query
  select
    p.id,
    au_auth.email::text,
    au_auth.email_confirmed_at,
    au_auth.last_sign_in_at,
    p.display_name,
    p.handle,
    p.avatar_url,
    p.bio,
    p.level,
    p.exp_total,
    p.skill_bp,
    coalesce(rank_definition.tier, 1)::smallint,
    coalesce(rank_definition.name, 'มือใหม่')::text,
    coalesce(rank_definition.color, 'slate')::text,
    p.address_line,
    p.province,
    p.district,
    p.subdistrict,
    p.postal_code,
    p.profile_completed_at,
    p.created_at,
    p.updated_at,
    case when coalesce(au.is_active, false) and au.role = 'admin' then 'admin' else 'user' end,
    coalesce(au.is_active, false),
    coalesce(uw.gems_balance, 0)::bigint,
    coalesce((select sum(wl.amount) from public.wallet_ledger wl where wl.user_id = p.id and wl.amount > 0), 0)::bigint,
    coalesce((select sum(abs(wl.amount)) from public.wallet_ledger wl where wl.user_id = p.id and wl.amount < 0), 0)::bigint,
    coalesce((select count(*) from public.shop_purchases sp where sp.user_id = p.id and sp.status = 'completed'), 0)::bigint,
    coalesce((select count(*) from public.user_item_inventory ui where ui.user_id = p.id), 0)::bigint,
    coalesce((select sum(ui.quantity) from public.user_item_inventory ui where ui.user_id = p.id), 0)::bigint,
    (select max(wl.created_at) from public.wallet_ledger wl where wl.user_id = p.id)
  from public.profiles p
  left join auth.users au_auth on au_auth.id = p.id
  left join public.admin_users au on au.user_id = p.id
  left join public.user_wallets uw on uw.user_id = p.id
  left join lateral (
    select srd.tier, srd.name, srd.color
    from public.skill_rank_definitions srd
    where srd.min_bp <= p.skill_bp
    order by srd.min_bp desc, srd.tier desc
    limit 1
  ) rank_definition on true
  where p.id = p_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Target user not found';
  end if;
end;
$$;

create or replace function public.admin_get_user_wallet_ledger(
  p_user_id uuid,
  p_limit integer default 40
)
returns table (
  ledger_id uuid,
  transaction_type text,
  amount bigint,
  balance_before bigint,
  balance_after bigint,
  reference_text text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if p_user_id is null or p_limit is null or p_limit not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Wallet history request is invalid';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'Target user not found';
  end if;

  return query
  select
    wl.id,
    wl.transaction_type,
    wl.amount,
    wl.balance_before,
    wl.balance_after,
    coalesce(nullif(wl.metadata->>'reference', ''), si.name, 'ธุรกรรมระบบ')::text,
    wl.created_at
  from public.wallet_ledger wl
  left join public.shop_purchases sp on sp.id = wl.reference_id
  left join public.shop_items si on si.id = sp.item_id
  where wl.user_id = p_user_id
  order by wl.created_at desc, wl.id desc
  limit p_limit;
end;
$$;

create or replace function public.admin_adjust_gems(
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

  if p_user_id is null or p_amount is null or p_amount = 0
     or p_amount not between -1000000000 and 1000000000
     or char_length(v_reference) not between 3 and 160
     or p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'Gems adjustment request is invalid';
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
    if v_existing.amount <> p_amount
       or coalesce(v_existing.metadata->>'reference', '') <> v_reference then
      raise exception using errcode = '23505', message = 'Idempotency key was already used for a different adjustment';
    end if;
    return v_wallet;
  end if;

  if p_amount > 0 and v_wallet.gems_balance > 9223372036854775807::bigint - p_amount then
    raise exception using errcode = '22003', message = 'Gems balance is out of range';
  end if;

  if p_amount < 0 and v_wallet.gems_balance < (p_amount * -1) then
    raise exception using errcode = '22023', message = 'Insufficient Gems for debit';
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
    case when p_amount > 0 then 'admin_credit' else 'admin_debit' end,
    p_amount,
    v_wallet.gems_balance - p_amount,
    v_wallet.gems_balance,
    null,
    p_idempotency_key,
    jsonb_build_object(
      'reference', v_reference,
      'adjustment_source', 'admin_internal'
    )
  );

  return v_wallet;
end;
$$;

create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_was_admin boolean := false;
  v_is_admin boolean := p_role = 'admin';
  v_changed boolean;
begin
  if not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if p_user_id is null or p_role not in ('user', 'admin') then
    raise exception using errcode = '22023', message = 'User role request is invalid';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = 'P0002', message = 'Target user not found';
  end if;

  select exists (
    select 1
    from public.admin_users
    where user_id = p_user_id
      and role = 'admin'
      and is_active = true
  ) into v_was_admin;

  if p_role = 'user' and p_user_id = v_actor_id then
    raise exception using errcode = '22023', message = 'You cannot remove your own admin access';
  end if;

  if p_role = 'user' and v_was_admin
     and (select count(*) from public.admin_users where role = 'admin' and is_active = true) <= 1 then
    raise exception using errcode = '22023', message = 'The last active admin cannot be removed';
  end if;

  if p_role = 'admin' then
    insert into public.admin_users (user_id, role, is_active)
    values (p_user_id, 'admin', true)
    on conflict (user_id) do update set role = 'admin', is_active = true, updated_at = timezone('utc', now());
  else
    delete from public.admin_users where user_id = p_user_id;
  end if;

  v_changed := v_was_admin is distinct from v_is_admin;
  if v_changed then
    insert into public.admin_role_changes (
      actor_user_id,
      target_user_id,
      previous_role,
      next_role,
      metadata
    )
    values (
      v_actor_id,
      p_user_id,
      case when v_was_admin then 'admin' else 'user' end,
      p_role,
      jsonb_build_object('source', 'admin_user_management')
    );
  end if;

  return jsonb_build_object(
    'user_id', p_user_id,
    'role', p_role,
    'is_active', v_is_admin,
    'changed', v_changed
  );
end;
$$;

revoke all on function public.admin_list_users(text, integer, integer) from public, anon;
revoke all on function public.admin_count_users(text) from public, anon;
revoke all on function public.admin_get_user_detail(uuid) from public, anon;
revoke all on function public.admin_get_user_wallet_ledger(uuid, integer) from public, anon;
revoke all on function public.admin_adjust_gems(uuid, bigint, text, text) from public, anon;
revoke all on function public.admin_set_user_role(uuid, text) from public, anon;

grant execute on function public.admin_list_users(text, integer, integer) to authenticated;
grant execute on function public.admin_count_users(text) to authenticated;
grant execute on function public.admin_get_user_detail(uuid) to authenticated;
grant execute on function public.admin_get_user_wallet_ledger(uuid, integer) to authenticated;
grant execute on function public.admin_adjust_gems(uuid, bigint, text, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
