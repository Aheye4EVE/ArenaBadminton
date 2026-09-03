-- Production hardening for the roadmap foundation.
-- Client-side Trophy minting and tournament state changes stay disabled until
-- their audited RPC workflows are implemented.

revoke insert, update, delete on public.trophy_records from authenticated;
revoke insert, update on public.tournament_entries from authenticated;

-- Only the read_at column is client-writable. Notification creation remains a
-- server-side operation so users cannot spoof system messages.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- BP rules are readable only by admins; writes remain behind the RPC.
grant select on public.bp_rule_configs to authenticated;
drop policy if exists bp_rule_configs_select_admin on public.bp_rule_configs;
create policy bp_rule_configs_select_admin on public.bp_rule_configs
for select to authenticated
using (public.is_current_user_admin());

-- Merge the public catalog and admin catalog visibility into one policy so
-- admin reads do not create overlapping permissive policies.
drop policy if exists shop_items_select_active on public.shop_items;
drop policy if exists shop_items_select_admin_all on public.shop_items;
create policy shop_items_select_catalog on public.shop_items
for select to authenticated
using (is_active = true or public.is_current_user_admin());

-- Foreign-key indexes identified by the Supabase performance advisor.
create index if not exists match_settlements_settled_by_idx
  on public.match_settlements (settled_by)
  where settled_by is not null;
create index if not exists wallet_ledger_reference_id_idx
  on public.wallet_ledger (reference_id)
  where reference_id is not null;
create index if not exists tournament_rewards_item_idx
  on public.tournament_rewards (item_id)
  where item_id is not null;
create index if not exists tournaments_venue_idx
  on public.tournaments (venue_id, starts_at, id)
  where venue_id is not null;

-- This helper is not a Data API entry point. Event-trigger execution does not
-- require granting EXECUTE to API roles.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
