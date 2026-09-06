-- Add optional GPS-aware ordering to the venue directory.
-- The distance is calculated with the Haversine formula in SQL.
-- No user coordinates are persisted by this function.
drop function if exists public.search_arena_venues(text, text, text, text, text, text, integer, integer);

create or replace function public.search_arena_venues(
  p_q text default '',
  p_province text default '',
  p_district text default '',
  p_subdistrict text default '',
  p_sort text default 'nearby',
  p_activity text default 'all',
  p_page integer default 1,
  p_size integer default 24,
  p_latitude numeric default null,
  p_longitude numeric default null
) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select province, district, subdistrict
    from public.profiles
    where id = (select auth.uid())
  ),
  candidates as (
    select
      v.id,
      v.name,
      v.address,
      v.province,
      v.district,
      v.subdistrict,
      v.aliases,
      v.cover_image_url,
      v.court_count,
      v.rating,
      v.source_url,
      v.verified_at,
      v.latitude,
      v.longitude,
      case
        when public.arena_area(v.province) <> ''
          and public.arena_area(v.province) = public.arena_area((select province from me))
        then case
          when public.arena_area(v.district) <> ''
            and public.arena_area(v.district) = public.arena_area((select district from me))
          then case
            when public.arena_area(v.subdistrict) <> ''
              and public.arena_area(v.subdistrict) = public.arena_area((select subdistrict from me))
            then 3
            else 2
          end
          else 1
        end
        else 0
      end as area_score,
      case
        when p_latitude between -90 and 90
          and p_longitude between -180 and 180
          and v.latitude between -90 and 90
          and v.longitude between -180 and 180
        then round(
          (
            6371::numeric * 2 * asin(
              least(
                1::numeric,
                sqrt(
                  greatest(
                    0::numeric,
                    power(sin(radians(v.latitude - p_latitude) / 2), 2)
                    + cos(radians(p_latitude))
                      * cos(radians(v.latitude))
                      * power(sin(radians(v.longitude - p_longitude) / 2), 2)
                  )
                )
              )
            )
          )::numeric,
          3
        )
        else null
      end as distance_km,
      (
        select count(*)
        from public.groups g
        where g.venue_id = v.id
          and g.status = 'completed'
          and g.starts_at between now() - interval '90 days' and now()
          and g.title not like '[QA ONLY]%'
      ) as completed_90,
      (
        select count(*)
        from public.groups g
        where g.venue_id = v.id
          and g.status = 'published'
          and g.starts_at > now()
          and g.title not like '[QA ONLY]%'
          and (
            select count(*)
            from public.group_members m
            where m.group_id = g.id
              and m.membership_status = 'registered'
          ) < g.capacity
      ) as open_groups
    from public.venues v
    where v.status = 'active'
      and v.name not like '[QA ONLY]%'
      and (
        coalesce(p_province, '') = ''
        or public.arena_area(v.province) = public.arena_area(p_province)
      )
      and (
        coalesce(p_district, '') = ''
        or public.arena_area(v.district) = public.arena_area(p_district)
      )
      and (
        coalesce(p_subdistrict, '') = ''
        or public.arena_area(v.subdistrict) = public.arena_area(p_subdistrict)
      )
      and not exists (
        select 1
        from regexp_split_to_table(lower(left(btrim(coalesce(p_q, '')), 160)), '\s+') t
        where t <> ''
          and position(
            t in lower(
              concat_ws(
                ' ',
                v.name,
                array_to_string(v.aliases, ' '),
                v.address,
                v.province,
                v.district,
                v.subdistrict
              )
            )
          ) = 0
      )
  ),
  filtered as (
    select *
    from candidates
    where (p_activity <> 'open' or open_groups > 0)
      and (p_activity <> 'history' or completed_90 > 0)
  ),
  ranked as (
    select
      *,
      row_number() over (
        order by
          case
            when p_sort = 'nearby'
              and p_latitude between -90 and 90
              and p_longitude between -180 and 180
            then distance_km
          end asc nulls last,
          case when p_sort in ('area', 'nearby') then area_score end desc,
          case when p_sort in ('area', 'popular', 'nearby') then completed_90 end desc,
          case when p_sort = 'open' then open_groups end desc,
          name,
          id
      ) as position
    from filtered
  ),
  page as (
    select *
    from ranked
    order by position
    limit greatest(1, least(coalesce(p_size, 24), 50))
    offset (
      greatest(1, least(coalesce(p_page, 1), 100000)) - 1
    ) * greatest(1, least(coalesce(p_size, 24), 50))
  )
  select jsonb_build_object(
    'items',
    coalesce(
      (select jsonb_agg(to_jsonb(page) - 'position' order by position) from page),
      '[]'::jsonb
    ),
    'total',
    (select count(*) from filtered)
  );
$$;

revoke all on function public.search_arena_venues(text, text, text, text, text, text, integer, integer, numeric, numeric) from public, anon;
grant execute on function public.search_arena_venues(text, text, text, text, text, text, integer, integer, numeric, numeric) to authenticated;
