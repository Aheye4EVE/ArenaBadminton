-- Cover the remaining foreign keys reported by Supabase performance advisor.
create index if not exists tournament_rewards_item_idx
  on public.tournament_rewards (item_id)
  where item_id is not null;
create index if not exists tournaments_venue_idx
  on public.tournaments (venue_id, starts_at, id)
  where venue_id is not null;
