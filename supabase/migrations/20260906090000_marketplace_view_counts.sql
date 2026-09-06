-- Track listing detail-page views so the homepage can surface popular items
-- that are still active in the second-hand marketplace.

alter table public.marketplace_listings
  add column if not exists view_count bigint not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketplace_listings_view_count_nonnegative'
      and conrelid = 'public.marketplace_listings'::regclass
  ) then
    alter table public.marketplace_listings
      add constraint marketplace_listings_view_count_nonnegative check (view_count >= 0);
  end if;
end;
$$;

create index if not exists marketplace_listings_popularity_idx
  on public.marketplace_listings (status, view_count desc, created_at desc, id);

create or replace function public.record_marketplace_listing_view(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  update public.marketplace_listings
  set view_count = view_count + 1
  where id = p_listing_id
    and status in ('active', 'reserved');
end;
$$;

revoke all on function public.record_marketplace_listing_view(uuid) from public, anon, authenticated;
grant execute on function public.record_marketplace_listing_view(uuid) to authenticated;
