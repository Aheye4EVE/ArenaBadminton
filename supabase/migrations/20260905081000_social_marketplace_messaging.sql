-- Arena-Badminton community completion.
-- Adds moderated venue/community reports, second-hand marketplace workflows,
-- and authenticated direct messaging with Supabase Realtime support.

-- ---------------------------------------------------------------------------
-- Moderation reports: keep user reporting inside a guarded RPC
-- ---------------------------------------------------------------------------

alter table public.moderation_reports
  drop constraint if exists moderation_reports_target_type_allowed;
alter table public.moderation_reports
  add constraint moderation_reports_target_type_allowed check (
    target_type in ('post', 'comment', 'group', 'match', 'profile', 'tournament', 'venue_review', 'guild', 'marketplace_listing')
  );

create or replace function public.create_moderation_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default ''
)
returns public.moderation_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_report public.moderation_reports;
  v_target_exists boolean := false;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_target_type is null or p_target_type not in ('post', 'comment', 'group', 'match', 'profile', 'tournament', 'venue_review', 'guild', 'marketplace_listing') then
    raise exception using errcode = '22023', message = 'Invalid report target';
  end if;
  if p_target_id is null or p_reason is null or char_length(btrim(p_reason)) not between 1 and 120 or char_length(coalesce(p_details, '')) > 1000 then
    raise exception using errcode = '22023', message = 'Invalid report details';
  end if;

  v_target_exists :=
    (p_target_type = 'post' and exists (select 1 from public.social_posts where id = p_target_id))
    or (p_target_type = 'comment' and exists (select 1 from public.social_post_comments where id = p_target_id))
    or (p_target_type = 'group' and exists (select 1 from public.groups where id = p_target_id))
    or (p_target_type = 'match' and exists (select 1 from public.matches where id = p_target_id))
    or (p_target_type = 'profile' and exists (select 1 from public.profiles where id = p_target_id))
    or (p_target_type = 'tournament' and exists (select 1 from public.tournaments where id = p_target_id))
    or (p_target_type = 'venue_review' and exists (select 1 from public.venue_reviews where id = p_target_id))
    or (p_target_type = 'guild' and exists (select 1 from public.guilds where id = p_target_id))
    or (p_target_type = 'marketplace_listing' and exists (select 1 from public.marketplace_listings where id = p_target_id));
  if not v_target_exists then raise exception using errcode = 'P0002', message = 'Report target not found'; end if;

  select * into v_report
  from public.moderation_reports
  where reporter_id = v_user_id and target_type = p_target_type and target_id = p_target_id and status in ('open', 'reviewing')
  order by created_at desc limit 1;
  if found then return v_report; end if;

  insert into public.moderation_reports (reporter_id, target_type, target_id, reason, details)
  values (v_user_id, p_target_type, p_target_id, btrim(p_reason), btrim(coalesce(p_details, '')))
  returning * into v_report;
  return v_report;
end;
$$;

create or replace function public.admin_update_moderation_report(
  p_report_id uuid,
  p_status text
)
returns public.moderation_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_report public.moderation_reports;
begin
  if v_user_id is null or not public.is_current_user_admin() then raise exception using errcode = '42501', message = 'Admin access required'; end if;
  if p_status not in ('reviewing', 'resolved', 'dismissed') then raise exception using errcode = '22023', message = 'Invalid moderation status'; end if;
  update public.moderation_reports
  set status = p_status,
      resolved_by = case when p_status in ('resolved', 'dismissed') then v_user_id else null end,
      resolved_at = case when p_status in ('resolved', 'dismissed') then timezone('utc', now()) else null end
  where id = p_report_id
  returning * into v_report;
  if not found then raise exception using errcode = 'P0002', message = 'Report not found'; end if;
  return v_report;
end;
$$;

revoke all on function public.create_moderation_report(text, uuid, text, text), public.admin_update_moderation_report(uuid, text) from public, anon;
grant execute on function public.create_moderation_report(text, uuid, text, text), public.admin_update_moderation_report(uuid, text) to authenticated;
revoke insert, update, delete on public.moderation_reports from authenticated;

drop policy if exists moderation_reports_select_reporter on public.moderation_reports;
create policy moderation_reports_select_reporter on public.moderation_reports
for select to authenticated
using (reporter_id = (select auth.uid()) or public.is_current_user_admin());

-- ---------------------------------------------------------------------------
-- Second-hand marketplace
-- ---------------------------------------------------------------------------

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'equipment',
  condition_grade text not null default 'good',
  price numeric(12, 2) not null default 0,
  province text,
  district text,
  subdistrict text,
  image_url text,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_listings_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint marketplace_listings_description_length check (char_length(description) <= 3000),
  constraint marketplace_listings_category_allowed check (category in ('racket', 'shoes', 'bag', 'apparel', 'equipment', 'other')),
  constraint marketplace_listings_condition_allowed check (condition_grade in ('new', 'like_new', 'good', 'fair', 'for_parts')),
  constraint marketplace_listings_price_nonnegative check (price >= 0),
  constraint marketplace_listings_status_allowed check (status in ('active', 'reserved', 'sold', 'hidden', 'cancelled'))
);

create index if not exists marketplace_listings_discovery_idx
  on public.marketplace_listings (status, province, district, subdistrict, created_at desc, id);
create index if not exists marketplace_listings_seller_idx
  on public.marketplace_listings (seller_id, status, created_at desc, id);

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'requested',
  message text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketplace_orders_status_allowed check (status in ('requested', 'accepted', 'rejected', 'cancelled', 'completed')),
  constraint marketplace_orders_message_length check (char_length(message) <= 1000),
  unique (listing_id, buyer_id)
);

create index if not exists marketplace_orders_seller_status_idx
  on public.marketplace_orders (seller_id, status, created_at desc, id);
create index if not exists marketplace_orders_buyer_status_idx
  on public.marketplace_orders (buyer_id, status, created_at desc, id);

drop trigger if exists marketplace_listings_set_updated_at on public.marketplace_listings;
create trigger marketplace_listings_set_updated_at
before update on public.marketplace_listings
for each row execute function public.set_updated_at();
drop trigger if exists marketplace_orders_set_updated_at on public.marketplace_orders;
create trigger marketplace_orders_set_updated_at
before update on public.marketplace_orders
for each row execute function public.set_updated_at();

create or replace function public.create_marketplace_listing(
  p_title text,
  p_description text,
  p_category text,
  p_condition_grade text,
  p_price numeric,
  p_province text,
  p_district text,
  p_subdistrict text,
  p_image_url text default null
)
returns public.marketplace_listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_listing public.marketplace_listings;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 160 or char_length(coalesce(p_description, '')) > 3000 or p_category not in ('racket', 'shoes', 'bag', 'apparel', 'equipment', 'other') or p_condition_grade not in ('new', 'like_new', 'good', 'fair', 'for_parts') or p_price is null or p_price < 0 then
    raise exception using errcode = '22023', message = 'Invalid marketplace listing';
  end if;
  insert into public.marketplace_listings (seller_id, title, description, category, condition_grade, price, province, district, subdistrict, image_url)
  values (v_user_id, btrim(p_title), btrim(coalesce(p_description, '')), p_category, p_condition_grade, p_price, nullif(btrim(coalesce(p_province, '')), ''), nullif(btrim(coalesce(p_district, '')), ''), nullif(btrim(coalesce(p_subdistrict, '')), ''), nullif(btrim(coalesce(p_image_url, '')), ''))
  returning * into v_listing;
  return v_listing;
end;
$$;

create or replace function public.request_marketplace_purchase(
  p_listing_id uuid,
  p_message text default ''
)
returns public.marketplace_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_listing public.marketplace_listings;
  v_order public.marketplace_orders;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select * into v_listing from public.marketplace_listings where id = p_listing_id for update;
  if not found or v_listing.status <> 'active' then raise exception using errcode = '22023', message = 'Listing is no longer available'; end if;
  if v_listing.seller_id = v_user_id then raise exception using errcode = '22023', message = 'Seller cannot purchase own listing'; end if;
  if char_length(coalesce(p_message, '')) > 1000 then raise exception using errcode = '22023', message = 'Purchase message is too long'; end if;
  insert into public.marketplace_orders (listing_id, buyer_id, seller_id, message)
  values (p_listing_id, v_user_id, v_listing.seller_id, btrim(coalesce(p_message, '')))
  on conflict (listing_id, buyer_id) do update set message = excluded.message, status = case when marketplace_orders.status = 'rejected' then 'requested' else marketplace_orders.status end
  returning * into v_order;
  insert into public.notifications (user_id, notification_type, title, body, href)
  values (v_listing.seller_id, 'marketplace_order', 'มีคำขอซื้อสินค้าใหม่', 'มีผู้เล่นส่งคำขอซื้อสินค้ามือสองของคุณ', '/marketplace/' || p_listing_id::text);
  return v_order;
end;
$$;

create or replace function public.update_marketplace_order(p_order_id uuid, p_decision text)
returns public.marketplace_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_order public.marketplace_orders;
  v_listing public.marketplace_listings;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select * into v_order from public.marketplace_orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Purchase request not found'; end if;
  select * into v_listing from public.marketplace_listings where id = v_order.listing_id for update;
  if p_decision not in ('accept', 'reject', 'complete', 'cancel') then raise exception using errcode = '22023', message = 'Invalid purchase decision'; end if;
  if p_decision in ('accept', 'reject', 'complete') and v_order.seller_id <> v_user_id then raise exception using errcode = '42501', message = 'Only the seller can manage this purchase request'; end if;
  if p_decision = 'cancel' and v_order.buyer_id <> v_user_id and v_order.seller_id <> v_user_id then raise exception using errcode = '42501', message = 'Only the buyer or seller can cancel this request'; end if;

  if p_decision = 'accept' then
    if v_order.status <> 'requested' or v_listing.status <> 'active' then raise exception using errcode = '22023', message = 'Listing is no longer available'; end if;
    update public.marketplace_orders set status = 'accepted' where id = p_order_id returning * into v_order;
    update public.marketplace_listings set status = 'reserved' where id = v_order.listing_id;
  elsif p_decision = 'reject' then
    update public.marketplace_orders set status = 'rejected' where id = p_order_id returning * into v_order;
  elsif p_decision = 'complete' then
    if v_order.status <> 'accepted' then raise exception using errcode = '22023', message = 'Purchase request is not accepted'; end if;
    update public.marketplace_orders set status = 'completed' where id = p_order_id returning * into v_order;
    update public.marketplace_listings set status = 'sold' where id = v_order.listing_id;
  else
    if v_order.status in ('completed', 'cancelled') then raise exception using errcode = '22023', message = 'Purchase request is already closed'; end if;
    update public.marketplace_orders set status = 'cancelled' where id = p_order_id returning * into v_order;
    if v_listing.status = 'reserved' then update public.marketplace_listings set status = 'active' where id = v_order.listing_id; end if;
  end if;
  return v_order;
end;
$$;

revoke all on function public.create_marketplace_listing(text, text, text, text, numeric, text, text, text, text), public.request_marketplace_purchase(uuid, text), public.update_marketplace_order(uuid, text) from public, anon;
grant execute on function public.create_marketplace_listing(text, text, text, text, numeric, text, text, text, text), public.request_marketplace_purchase(uuid, text), public.update_marketplace_order(uuid, text) to authenticated;

revoke all on public.marketplace_listings, public.marketplace_orders from public, anon, authenticated;
grant select on public.marketplace_listings, public.marketplace_orders to authenticated;
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_orders enable row level security;

drop policy if exists marketplace_listings_select_visible on public.marketplace_listings;
create policy marketplace_listings_select_visible on public.marketplace_listings
for select to authenticated
using (status in ('active', 'reserved', 'sold') or seller_id = (select auth.uid()));
drop policy if exists marketplace_orders_select_participant on public.marketplace_orders;
create policy marketplace_orders_select_participant on public.marketplace_orders
for select to authenticated
using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Direct messages
-- ---------------------------------------------------------------------------

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  direct_key text not null unique,
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint direct_conversations_key_length check (char_length(direct_key) between 73 and 73)
);

create table if not exists public.direct_conversation_members (
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (conversation_id, user_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint direct_messages_body_length check (char_length(btrim(body)) between 1 and 2000)
);

create index if not exists direct_conversation_members_user_idx
  on public.direct_conversation_members (user_id, conversation_id);
create index if not exists direct_messages_conversation_created_idx
  on public.direct_messages (conversation_id, created_at asc, id);
create index if not exists direct_messages_sender_created_idx
  on public.direct_messages (sender_id, created_at desc, id);

drop trigger if exists direct_conversations_set_updated_at on public.direct_conversations;
create trigger direct_conversations_set_updated_at
before update on public.direct_conversations
for each row execute function public.set_updated_at();

create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns public.direct_conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_key text;
  v_conversation public.direct_conversations;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_other_user_id is null or p_other_user_id = v_user_id or not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception using errcode = '22023', message = 'Invalid conversation participant';
  end if;
  v_key := least(v_user_id::text, p_other_user_id::text) || ':' || greatest(v_user_id::text, p_other_user_id::text);
  insert into public.direct_conversations (direct_key)
  values (v_key)
  on conflict (direct_key) do update set updated_at = public.direct_conversations.updated_at
  returning * into v_conversation;
  insert into public.direct_conversation_members (conversation_id, user_id)
  values (v_conversation.id, v_user_id), (v_conversation.id, p_other_user_id)
  on conflict do nothing;
  return v_conversation;
end;
$$;

create or replace function public.send_direct_message(p_conversation_id uuid, p_body text)
returns public.direct_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_message public.direct_messages;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not exists (select 1 from public.direct_conversation_members where conversation_id = p_conversation_id and user_id = v_user_id) then
    raise exception using errcode = '42501', message = 'You are not a member of this conversation';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 2000 then raise exception using errcode = '22023', message = 'Message is invalid'; end if;
  insert into public.direct_messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_user_id, btrim(p_body))
  returning * into v_message;
  update public.direct_conversations set last_message_at = v_message.created_at where id = p_conversation_id;
  insert into public.notifications (user_id, notification_type, title, body, href)
  select dcm.user_id, 'direct_message', 'มีข้อความใหม่', left(v_message.body, 160), '/messages?conversation=' || p_conversation_id::text
  from public.direct_conversation_members dcm
  where dcm.conversation_id = p_conversation_id and dcm.user_id <> v_user_id;
  return v_message;
end;
$$;

create or replace function public.mark_direct_messages_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_count integer;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not exists (select 1 from public.direct_conversation_members where conversation_id = p_conversation_id and user_id = v_user_id) then
    raise exception using errcode = '42501', message = 'You are not a member of this conversation';
  end if;
  update public.direct_messages
  set read_at = timezone('utc', now())
  where conversation_id = p_conversation_id and sender_id <> v_user_id and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid), public.send_direct_message(uuid, text), public.mark_direct_messages_read(uuid) from public, anon;
grant execute on function public.get_or_create_direct_conversation(uuid), public.send_direct_message(uuid, text), public.mark_direct_messages_read(uuid) to authenticated;

revoke all on public.direct_conversations, public.direct_conversation_members, public.direct_messages from public, anon, authenticated;
grant select on public.direct_conversations, public.direct_conversation_members, public.direct_messages to authenticated;
alter table public.direct_conversations enable row level security;
alter table public.direct_conversation_members enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists direct_conversations_select_member on public.direct_conversations;
create policy direct_conversations_select_member on public.direct_conversations
for select to authenticated
using (exists (select 1 from public.direct_conversation_members dcm where dcm.conversation_id = direct_conversations.id and dcm.user_id = (select auth.uid())));
drop policy if exists direct_conversation_members_select_member on public.direct_conversation_members;
create policy direct_conversation_members_select_member on public.direct_conversation_members
for select to authenticated
using (exists (select 1 from public.direct_conversation_members own where own.conversation_id = direct_conversation_members.conversation_id and own.user_id = (select auth.uid())));
drop policy if exists direct_messages_select_member on public.direct_messages;
create policy direct_messages_select_member on public.direct_messages
for select to authenticated
using (exists (select 1 from public.direct_conversation_members dcm where dcm.conversation_id = direct_messages.conversation_id and dcm.user_id = (select auth.uid())));

do $$
begin
  alter publication supabase_realtime add table public.direct_messages;
exception
  when duplicate_object or undefined_object then null;
end;
$$;

