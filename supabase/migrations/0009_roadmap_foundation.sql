-- Arena-Badminton roadmap foundation.
-- This migration adds auditable Trophy, Community, Notification, Tournament,
-- Moderation and Payment boundary tables. Real money is intentionally not
-- credited by this migration; a verified provider webhook is required.

create table if not exists public.trophy_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.shop_items(id) on delete restrict,
  title text not null,
  description text not null default '',
  icon text not null default '🏆',
  rarity_tier text not null default 'white',
  source_type text not null default 'system',
  metadata jsonb not null default '{}',
  awarded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint trophy_records_title_length check (char_length(title) between 1 and 120),
  constraint trophy_records_description_length check (char_length(description) <= 500),
  constraint trophy_records_icon_length check (char_length(icon) between 1 and 16),
  constraint trophy_records_rarity_allowed check (rarity_tier in ('white', 'green', 'blue', 'purple', 'orange', 'red', 'gold', 'rainbow')),
  constraint trophy_records_source_allowed check (source_type in ('system', 'admin', 'group', 'match', 'tournament'))
);

create index if not exists trophy_records_user_awarded_idx
  on public.trophy_records (user_id, awarded_at desc, id);
create index if not exists trophy_records_item_idx
  on public.trophy_records (item_id)
  where item_id is not null;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  image_url text,
  status text not null default 'published',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint social_posts_body_length check (char_length(btrim(body)) between 1 and 2000),
  constraint social_posts_status_allowed check (status in ('published', 'hidden', 'deleted'))
);

create index if not exists social_posts_feed_idx
  on public.social_posts (status, created_at desc, id);
create index if not exists social_posts_user_created_idx
  on public.social_posts (user_id, created_at desc, id);

drop trigger if exists social_posts_set_updated_at on public.social_posts;
create trigger social_posts_set_updated_at
before update on public.social_posts
for each row execute function public.set_updated_at();

create table if not exists public.social_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  status text not null default 'published',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint social_post_comments_body_length check (char_length(btrim(body)) between 1 and 1000),
  constraint social_post_comments_status_allowed check (status in ('published', 'hidden', 'deleted'))
);

create index if not exists social_post_comments_post_created_idx
  on public.social_post_comments (post_id, status, created_at asc, id);
create index if not exists social_post_comments_user_created_idx
  on public.social_post_comments (user_id, created_at desc, id);

drop trigger if exists social_post_comments_set_updated_at on public.social_post_comments;
create trigger social_post_comments_set_updated_at
before update on public.social_post_comments
for each row execute function public.set_updated_at();

create table if not exists public.social_post_likes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create index if not exists social_post_likes_user_created_idx
  on public.social_post_likes (user_id, created_at desc, post_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_type_length check (char_length(notification_type) between 1 and 60),
  constraint notifications_title_length check (char_length(title) between 1 and 160),
  constraint notifications_body_length check (char_length(body) <= 500),
  constraint notifications_href_local check (href is null or (href like '/%' and href not like '//%'))
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc, id)
  where read_at is null;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete set null,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  format text not null default 'singles',
  status text not null default 'draft',
  max_entries smallint not null default 8,
  entry_fee numeric(10, 2) not null default 0,
  rules text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournaments_title_length check (char_length(title) between 1 and 160),
  constraint tournaments_description_length check (char_length(description) <= 2000),
  constraint tournaments_format_allowed check (format in ('singles', 'doubles', 'team')),
  constraint tournaments_status_allowed check (status in ('draft', 'published', 'registration_closed', 'in_progress', 'completed', 'cancelled')),
  constraint tournaments_max_entries_range check (max_entries between 2 and 256),
  constraint tournaments_entry_fee_nonnegative check (entry_fee >= 0),
  constraint tournaments_rules_length check (char_length(rules) <= 5000)
);

create index if not exists tournaments_status_starts_idx
  on public.tournaments (status, starts_at, id);
create index if not exists tournaments_creator_idx
  on public.tournaments (created_by, created_at desc, id);

drop trigger if exists tournaments_set_updated_at on public.tournaments;
create trigger tournaments_set_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

create table if not exists public.tournament_entries (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_status text not null default 'registered',
  seed smallint,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (tournament_id, user_id),
  constraint tournament_entries_status_allowed check (entry_status in ('registered', 'waitlisted', 'withdrawn', 'eliminated', 'winner')),
  constraint tournament_entries_seed_positive check (seed is null or seed > 0)
);

create index if not exists tournament_entries_user_status_idx
  on public.tournament_entries (user_id, entry_status, joined_at desc);
create index if not exists tournament_entries_tournament_status_idx
  on public.tournament_entries (tournament_id, entry_status, joined_at asc);

create table if not exists public.tournament_rewards (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  placement smallint not null,
  exp_reward bigint not null default 0,
  bp_reward integer not null default 0,
  item_id uuid references public.shop_items(id) on delete restrict,
  label text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  constraint tournament_rewards_placement_positive check (placement > 0),
  constraint tournament_rewards_exp_nonnegative check (exp_reward >= 0),
  constraint tournament_rewards_bp_nonnegative check (bp_reward >= 0),
  constraint tournament_rewards_label_length check (char_length(label) <= 160),
  unique (tournament_id, placement)
);

create index if not exists tournament_rewards_tournament_idx
  on public.tournament_rewards (tournament_id, placement);

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open',
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint moderation_reports_target_type_allowed check (target_type in ('post', 'comment', 'group', 'match', 'profile', 'tournament')),
  constraint moderation_reports_reason_length check (char_length(reason) between 1 and 120),
  constraint moderation_reports_details_length check (char_length(details) <= 1000),
  constraint moderation_reports_status_allowed check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  constraint moderation_reports_resolution_consistency check ((status in ('resolved', 'dismissed') and resolved_at is not null) or status in ('open', 'reviewing'))
);

create index if not exists moderation_reports_status_created_idx
  on public.moderation_reports (status, created_at desc, id);
create index if not exists moderation_reports_reporter_idx
  on public.moderation_reports (reporter_id, created_at desc, id);
create index if not exists moderation_reports_resolver_idx
  on public.moderation_reports (resolved_by)
  where resolved_by is not null;

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_order_id text,
  amount numeric(12, 2) not null,
  currency text not null default 'THB',
  status text not null default 'pending',
  idempotency_key text not null,
  metadata jsonb not null default '{}',
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payment_orders_provider_length check (char_length(provider) between 1 and 60),
  constraint payment_orders_provider_order_length check (provider_order_id is null or char_length(provider_order_id) between 1 and 160),
  constraint payment_orders_amount_positive check (amount > 0),
  constraint payment_orders_currency_allowed check (currency in ('THB', 'USD')),
  constraint payment_orders_status_allowed check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  constraint payment_orders_idempotency_length check (char_length(idempotency_key) between 16 and 128),
  unique (provider, idempotency_key),
  unique (provider, provider_order_id)
);

create index if not exists payment_orders_user_created_idx
  on public.payment_orders (user_id, created_at desc, id);
create index if not exists payment_orders_status_created_idx
  on public.payment_orders (status, created_at desc, id);

drop trigger if exists payment_orders_set_updated_at on public.payment_orders;
create trigger payment_orders_set_updated_at
before update on public.payment_orders
for each row execute function public.set_updated_at();

-- Exposed tables have explicit grants and RLS. There is intentionally no
-- direct authenticated INSERT on notifications, rewards, or payment orders.
revoke all on public.trophy_records, public.social_posts, public.social_post_comments,
  public.social_post_likes, public.notifications, public.tournaments,
  public.tournament_entries, public.tournament_rewards, public.moderation_reports,
  public.payment_orders from public, anon, authenticated;

grant select, insert, update, delete on public.trophy_records to authenticated;
grant select, insert, update, delete on public.social_posts to authenticated;
grant select, insert, update, delete on public.social_post_comments to authenticated;
grant select, insert, delete on public.social_post_likes to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update on public.tournaments to authenticated;
grant select, insert, update on public.tournament_entries to authenticated;
grant select on public.tournament_rewards to authenticated;
grant select, insert on public.moderation_reports to authenticated;
grant select on public.payment_orders to authenticated;

alter table public.trophy_records enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_post_comments enable row level security;
alter table public.social_post_likes enable row level security;
alter table public.notifications enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_rewards enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.payment_orders enable row level security;

drop policy if exists trophy_records_select_self on public.trophy_records;
create policy trophy_records_select_self on public.trophy_records
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists trophy_records_insert_self on public.trophy_records;
create policy trophy_records_insert_self on public.trophy_records
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists trophy_records_delete_self on public.trophy_records;
create policy trophy_records_delete_self on public.trophy_records
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists social_posts_select_visible on public.social_posts;
create policy social_posts_select_visible on public.social_posts
for select to authenticated
using (status = 'published' or user_id = (select auth.uid()));

drop policy if exists social_posts_insert_self on public.social_posts;
create policy social_posts_insert_self on public.social_posts
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists social_posts_update_self on public.social_posts;
create policy social_posts_update_self on public.social_posts
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists social_posts_delete_self on public.social_posts;
create policy social_posts_delete_self on public.social_posts
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists social_post_comments_select_visible on public.social_post_comments;
create policy social_post_comments_select_visible on public.social_post_comments
for select to authenticated
using (
  (user_id = (select auth.uid()) or status = 'published')
  and exists (
    select 1 from public.social_posts p
    where p.id = social_post_comments.post_id
      and (p.status = 'published' or p.user_id = (select auth.uid()))
  )
);

drop policy if exists social_post_comments_insert_self on public.social_post_comments;
create policy social_post_comments_insert_self on public.social_post_comments
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.social_posts p
    where p.id = social_post_comments.post_id
      and p.status = 'published'
  )
);

drop policy if exists social_post_comments_update_self on public.social_post_comments;
create policy social_post_comments_update_self on public.social_post_comments
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists social_post_comments_delete_self on public.social_post_comments;
create policy social_post_comments_delete_self on public.social_post_comments
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists social_post_likes_select_visible on public.social_post_likes;
create policy social_post_likes_select_visible on public.social_post_likes
for select to authenticated
using (exists (select 1 from public.social_posts p where p.id = social_post_likes.post_id and p.status = 'published'));

drop policy if exists social_post_likes_insert_self on public.social_post_likes;
create policy social_post_likes_insert_self on public.social_post_likes
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.social_posts p where p.id = social_post_likes.post_id and p.status = 'published')
);

drop policy if exists social_post_likes_delete_self on public.social_post_likes;
create policy social_post_likes_delete_self on public.social_post_likes
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists notifications_select_self on public.notifications;
create policy notifications_select_self on public.notifications
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists tournaments_select_visible on public.tournaments;
create policy tournaments_select_visible on public.tournaments
for select to authenticated
using (status <> 'draft' or created_by = (select auth.uid()));

drop policy if exists tournaments_insert_creator on public.tournaments;
create policy tournaments_insert_creator on public.tournaments
for insert to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists tournaments_update_creator on public.tournaments;
create policy tournaments_update_creator on public.tournaments
for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

drop policy if exists tournament_entries_select_visible on public.tournament_entries;
create policy tournament_entries_select_visible on public.tournament_entries
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.tournaments t
    where t.id = tournament_entries.tournament_id
      and t.status <> 'draft'
  )
);

drop policy if exists tournament_entries_insert_self on public.tournament_entries;
create policy tournament_entries_insert_self on public.tournament_entries
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.tournaments t
    where t.id = tournament_entries.tournament_id
      and t.status = 'published'
  )
);

drop policy if exists tournament_entries_update_self on public.tournament_entries;
create policy tournament_entries_update_self on public.tournament_entries
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists tournament_rewards_select_visible on public.tournament_rewards;
create policy tournament_rewards_select_visible on public.tournament_rewards
for select to authenticated
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_rewards.tournament_id
      and t.status <> 'draft'
  )
);

drop policy if exists moderation_reports_insert_self on public.moderation_reports;
create policy moderation_reports_insert_self on public.moderation_reports
for insert to authenticated
with check (reporter_id = (select auth.uid()));

drop policy if exists moderation_reports_select_self on public.moderation_reports;
create policy moderation_reports_select_self on public.moderation_reports
for select to authenticated
using (reporter_id = (select auth.uid()));

drop policy if exists payment_orders_select_self on public.payment_orders;
create policy payment_orders_select_self on public.payment_orders
for select to authenticated
using (user_id = (select auth.uid()));

-- Admin-only BP rule editor. The minimum BP remains fixed at 1,000.
create or replace function public.admin_update_bp_rules(
  p_rule_version text,
  p_base_win_bp integer,
  p_base_loss_bp integer,
  p_upset_bonus_per_level integer,
  p_favorite_win_penalty_per_level integer,
  p_upset_loss_penalty_per_level integer,
  p_favorite_loss_protection_per_level integer,
  p_min_win_delta integer,
  p_max_win_delta integer,
  p_min_loss_delta integer,
  p_max_loss_delta integer
)
returns public.bp_rule_configs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rules public.bp_rule_configs;
begin
  if not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if p_rule_version is null or char_length(btrim(p_rule_version)) not between 1 and 80
     or p_base_win_bp is null or p_base_win_bp <= 0
     or p_base_loss_bp is null or p_base_loss_bp <= 0
     or p_upset_bonus_per_level is null or p_upset_bonus_per_level < 0
     or p_favorite_win_penalty_per_level is null or p_favorite_win_penalty_per_level < 0
     or p_upset_loss_penalty_per_level is null or p_upset_loss_penalty_per_level < 0
     or p_favorite_loss_protection_per_level is null or p_favorite_loss_protection_per_level < 0
     or p_min_win_delta is null or p_min_win_delta <= 0
     or p_max_win_delta is null or p_max_win_delta < p_min_win_delta
     or p_min_loss_delta is null or p_min_loss_delta <= 0
     or p_max_loss_delta is null or p_max_loss_delta < p_min_loss_delta then
    raise exception using errcode = '22023', message = 'BP rule configuration is invalid';
  end if;

  update public.bp_rule_configs
  set rule_version = btrim(p_rule_version),
      base_win_bp = p_base_win_bp,
      base_loss_bp = p_base_loss_bp,
      upset_bonus_per_level = p_upset_bonus_per_level,
      favorite_win_penalty_per_level = p_favorite_win_penalty_per_level,
      upset_loss_penalty_per_level = p_upset_loss_penalty_per_level,
      favorite_loss_protection_per_level = p_favorite_loss_protection_per_level,
      min_win_delta = p_min_win_delta,
      max_win_delta = p_max_win_delta,
      min_loss_delta = p_min_loss_delta,
      max_loss_delta = p_max_loss_delta
  where id = 'default'
  returning * into v_rules;

  if not found then
    raise exception using errcode = 'P0002', message = 'BP rule configuration is missing';
  end if;

  return v_rules;
end;
$$;

revoke all on function public.admin_update_bp_rules(text, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer) from public, anon;
grant execute on function public.admin_update_bp_rules(text, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer) to authenticated;

-- Admin-only Trophy award boundary. Users cannot mint Trophy records by
-- changing an Item or EXP value in the browser.
create or replace function public.admin_award_trophy(
  p_user_id uuid,
  p_item_id uuid,
  p_title text,
  p_description text,
  p_icon text,
  p_rarity_tier text,
  p_source_type text
)
returns public.trophy_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_trophy public.trophy_records;
begin
  if not public.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;

  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id)
     or p_title is null or char_length(btrim(p_title)) not between 1 and 120
     or p_description is null or char_length(p_description) > 500
     or p_icon is null or char_length(p_icon) not between 1 and 16
     or p_rarity_tier not in ('white', 'green', 'blue', 'purple', 'orange', 'red', 'gold', 'rainbow')
     or p_source_type not in ('system', 'admin', 'group', 'match', 'tournament') then
    raise exception using errcode = '22023', message = 'Trophy data is invalid';
  end if;

  if p_item_id is not null and not exists (select 1 from public.shop_items where id = p_item_id) then
    raise exception using errcode = 'P0002', message = 'Trophy item not found';
  end if;

  insert into public.trophy_records (user_id, item_id, title, description, icon, rarity_tier, source_type)
  values (p_user_id, p_item_id, btrim(p_title), p_description, p_icon, p_rarity_tier, p_source_type)
  returning * into v_trophy;

  return v_trophy;
end;
$$;

revoke all on function public.admin_award_trophy(uuid, uuid, text, text, text, text, text) from public, anon;
grant execute on function public.admin_award_trophy(uuid, uuid, text, text, text, text, text) to authenticated;

