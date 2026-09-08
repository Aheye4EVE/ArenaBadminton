-- Arena-Badminton: Player presence and heartbeat tracking schema.
-- This migration documents the presence and activity tracking system
-- using public_profile_directory and realtime channels.

begin;

-- Ensure public_profile_directory is readable by public/anon for lobby preview
grant select on public.public_profile_directory to anon;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'public_profile_directory' 
    and policyname = 'public_profile_directory_select_anon'
  ) then
    create policy public_profile_directory_select_anon on public.public_profile_directory
    for select to anon
    using (true);
  end if;
end $$;

-- Index for speedy online/recent players feed
create index if not exists public_profile_directory_updated_at_idx
  on public.public_profile_directory (updated_at desc, id);

commit;
