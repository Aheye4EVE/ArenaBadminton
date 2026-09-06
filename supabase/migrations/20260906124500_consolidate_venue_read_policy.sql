drop policy if exists venues_read_admin on public.venues;
drop policy if exists venues_select_authenticated on public.venues;

create policy venues_select_authenticated
on public.venues
for select
to authenticated
using (
  status = 'active'
  or created_by = (select auth.uid())
  or (select public.is_current_user_admin())
);
