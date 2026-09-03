-- Arena-Badminton: indexes for the homepage group recommendation query.
-- Candidate groups already use groups_status_starts_at_idx. This partial
-- history index keeps organizer counts efficient as cancelled/draft groups
-- accumulate over time.
create index if not exists groups_owner_recommendation_idx
  on public.groups (owner_id, created_at desc)
  where status in ('published', 'full', 'completed');
