-- Media URLs are stored as public browser destinations. Keep the database
-- boundary strict so direct Data API callers cannot persist non-HTTPS values
-- that bypass the server-side R2 object-key checks.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_avatar_url_https'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_avatar_url_https
      check (
        avatar_url is null
        or (char_length(avatar_url) <= 2048 and avatar_url ~ '^https://')
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guilds_logo_url_https'
      and conrelid = 'public.guilds'::regclass
  ) then
    alter table public.guilds
      add constraint guilds_logo_url_https
      check (
        logo_url is null
        or (char_length(logo_url) <= 2048 and logo_url ~ '^https://')
      );
  end if;
end;
$$;
