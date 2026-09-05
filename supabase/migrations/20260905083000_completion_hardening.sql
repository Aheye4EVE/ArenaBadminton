-- Arena-Badminton completion hardening.
-- Extends moderation targets, awards configured Tournament placements, and
-- keeps Marketplace participants synchronized through notifications.

-- ---------------------------------------------------------------------------
-- Moderation target coverage
-- ---------------------------------------------------------------------------

alter table public.moderation_reports
  drop constraint if exists moderation_reports_target_type_allowed;
alter table public.moderation_reports
  add constraint moderation_reports_target_type_allowed check (
    target_type in ('post', 'comment', 'group', 'match', 'profile', 'tournament', 'venue', 'venue_review', 'guild', 'marketplace_listing')
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
  if p_target_type is null or p_target_type not in ('post', 'comment', 'group', 'match', 'profile', 'tournament', 'venue', 'venue_review', 'guild', 'marketplace_listing') then
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
    or (p_target_type = 'venue' and exists (select 1 from public.venues where id = p_target_id))
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

revoke all on function public.create_moderation_report(text, uuid, text, text) from public, anon;
grant execute on function public.create_moderation_report(text, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Tournament placement rewards
-- ---------------------------------------------------------------------------

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
  v_entry record;
  v_total_rounds smallint;
  v_eliminated_round smallint;
  v_placement smallint;
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

    select max(round_number)::smallint into v_total_rounds
    from public.tournament_bracket_matches
    where bracket_id = p_bracket_id;

    update public.tournament_entries
    set entry_status = case when user_id = v_final.winner_id then 'winner' else 'eliminated' end
    where tournament_id = p_tournament_id and entry_status in ('registered', 'eliminated', 'winner');

    perform public.award_tournament_reward(p_tournament_id, v_final.winner_id, 1);
    for v_entry in
      select user_id
      from public.tournament_entries
      where tournament_id = p_tournament_id and entry_status = 'eliminated'
    loop
      select max(round_number)::smallint into v_eliminated_round
      from public.tournament_bracket_matches
      where bracket_id = p_bracket_id
        and (player_a_id = v_entry.user_id or player_b_id = v_entry.user_id)
        and winner_id is not null and winner_id <> v_entry.user_id;
      if v_eliminated_round is not null then
        v_placement := least(99, (power(2::numeric, greatest(0, v_total_rounds - v_eliminated_round)) + 1)::integer)::smallint;
        perform public.award_tournament_reward(p_tournament_id, v_entry.user_id, v_placement);
      end if;
    end loop;

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

revoke all on function public.advance_tournament_bracket(uuid, uuid, smallint) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Marketplace status synchronization
-- ---------------------------------------------------------------------------

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
  on conflict (listing_id, buyer_id) do update
    set message = excluded.message,
        status = case when marketplace_orders.status in ('rejected', 'cancelled') then 'requested' else marketplace_orders.status end
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
  v_recipient uuid;
  v_title text;
  v_body text;
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
    v_title := 'ผู้ขายรับคำขอซื้อแล้ว'; v_body := 'ผู้ขายตอบรับคำขอซื้อของคุณแล้ว กรุณาคุยรายละเอียดการนัดหมาย';
  elsif p_decision = 'reject' then
    update public.marketplace_orders set status = 'rejected' where id = p_order_id returning * into v_order;
    v_title := 'คำขอซื้อถูกปฏิเสธ'; v_body := 'ผู้ขายปฏิเสธคำขอซื้อรายการนี้แล้ว';
  elsif p_decision = 'complete' then
    if v_order.status <> 'accepted' then raise exception using errcode = '22023', message = 'Purchase request is not accepted'; end if;
    update public.marketplace_orders set status = 'completed' where id = p_order_id returning * into v_order;
    update public.marketplace_listings set status = 'sold' where id = v_order.listing_id;
    update public.marketplace_orders set status = 'cancelled' where listing_id = v_order.listing_id and id <> v_order.id and status in ('requested', 'accepted');
    v_title := 'ปิดการขายแล้ว'; v_body := 'ผู้ขายยืนยันการปิดการขายรายการนี้แล้ว';
  else
    if v_order.status in ('completed', 'cancelled') then raise exception using errcode = '22023', message = 'Purchase request is already closed'; end if;
    update public.marketplace_orders set status = 'cancelled' where id = p_order_id returning * into v_order;
    if v_listing.status = 'reserved' then update public.marketplace_listings set status = 'active' where id = v_order.listing_id; end if;
    v_title := 'คำขอซื้อถูกยกเลิก'; v_body := 'คำขอซื้อรายการนี้ถูกยกเลิกแล้ว';
  end if;

  v_recipient := case when v_user_id = v_order.seller_id then v_order.buyer_id else v_order.seller_id end;
  insert into public.notifications (user_id, notification_type, title, body, href)
  values (v_recipient, 'marketplace_order', v_title, v_body, '/marketplace/' || v_order.listing_id::text);
  return v_order;
end;
$$;

revoke all on function public.request_marketplace_purchase(uuid, text), public.update_marketplace_order(uuid, text) from public, anon;
grant execute on function public.request_marketplace_purchase(uuid, text), public.update_marketplace_order(uuid, text) to authenticated;
