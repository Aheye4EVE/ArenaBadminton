-- Return the effective promotion state from the database so the UI and the
-- transactional create_guild guard cannot disagree about a timed promotion.

drop function if exists public.get_guild_creation_settings();
create function public.get_guild_creation_settings()
returns table (
  creation_mode text,
  free_until timestamptz,
  founder_item_slug text,
  max_members_cap smallint,
  is_free boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    gs.creation_mode,
    gs.free_until,
    gs.founder_item_slug,
    gs.max_members_cap,
    (gs.creation_mode = 'free' or (gs.free_until is not null and gs.free_until > timezone('utc', now()))) as is_free
  from public.guild_settings as gs
  where gs.id = 'default';
$$;

revoke all on function public.get_guild_creation_settings() from public, anon;
grant execute on function public.get_guild_creation_settings() to authenticated;
