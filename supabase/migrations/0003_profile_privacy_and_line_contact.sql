-- Arena-Badminton Phase 2: keep private profile location/provider data out of
-- the public profile read surface and store the user-facing LINE contact ID.

alter table public.profiles
  add column if not exists line_contact_id text;

create index if not exists profiles_line_contact_lower_idx
  on public.profiles (lower(line_contact_id))
  where line_contact_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_line_contact_id_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_line_contact_id_length
      check (line_contact_id is null or char_length(line_contact_id) between 1 and 80);
  end if;
end $$;

-- Direct profile reads are owner-only because this table contains address,
-- coordinates and the stable LINE provider subject.
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

-- The future feed/profile surfaces can read only these non-sensitive fields.
create or replace view public.public_profiles as
select
  id,
  display_name,
  handle,
  avatar_url,
  bio,
  level,
  exp_total,
  skill_bp,
  created_at,
  updated_at
from public.profiles;

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to authenticated;
