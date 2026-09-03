-- Arena-Badminton Phase 7: searchable venue metadata.
--
-- The original venue foundation kept only a free-form district/address pair.
-- These nullable/controlled fields make the public discovery UI searchable by
-- province, district and subdistrict without changing existing venue records.

alter table public.venues
  add column if not exists province text,
  add column if not exists subdistrict text,
  add column if not exists rating numeric(2, 1) not null default 0,
  add column if not exists availability text not null default 'available';

do $$
begin
  alter table public.venues
    add constraint venues_rating_range
    check (rating between 0 and 5);
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter table public.venues
    add constraint venues_availability_allowed
    check (availability in ('available', 'waitlist'));
exception
  when duplicate_object then null;
end;
$$;

create index if not exists venues_discovery_location_idx
  on public.venues (status, province, district, subdistrict);

-- Backfill only values that can be read unambiguously from the existing
-- address text. Operators can correct or enrich these fields later in the
-- venue-management flow without changing the original address.
update public.venues
set province = case
  when address ilike '%กรุงเทพมหานคร%' then 'กรุงเทพมหานคร'
  when address ilike '%นนทบุรี%' then 'นนทบุรี'
  when address ilike '%ปทุมธานี%' then 'ปทุมธานี'
  else province
end
where province is null;

update public.venues
set subdistrict = regexp_replace(address, '.*(แขวง|ตำบล)[[:space:]]*([^[:space:]]+).*', '\2')
where subdistrict is null
  and address ~ '(แขวง|ตำบล)[[:space:]]*[^[:space:]]+';

-- Existing QA venues are safe to enrich with their deterministic test values.
-- The updates are idempotent and do not touch user profiles or memberships.
update public.venues
set province = 'กรุงเทพมหานคร', subdistrict = 'บางนาเหนือ', rating = 4.8, availability = 'available'
where name = '[QA ONLY] Arena Bangna Test Court';

update public.venues
set province = 'นนทบุรี', subdistrict = 'บางกระสอ', rating = 4.6, availability = 'available'
where name = '[QA ONLY] Arena Nonthaburi Test Court';

update public.venues
set province = 'กรุงเทพมหานคร', subdistrict = 'ดินแดง', rating = 4.7, availability = 'available'
where name = '[QA ONLY] Arena Ratchada Test Court';

grant select, insert, update on public.venues to authenticated;
