-- Arena-Badminton: calculate the authenticated player's live Ranking position.
-- The order matches the public Ranking page and never exposes private profile data.

create or replace function public.get_current_user_rank()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select ranked.rank_position::integer
  from (
    select
      id,
      row_number() over (
        order by skill_bp desc, level desc, exp_total desc, id asc
      ) as rank_position
    from public.public_profile_directory
  ) as ranked
  where ranked.id = (select auth.uid())
$$;

revoke all on function public.get_current_user_rank() from public, anon;
grant execute on function public.get_current_user_rank() to authenticated;
