alter table public.venues add column if not exists aliases text[] not null default '{}';
alter table public.venues add column if not exists source_url text;
alter table public.venues add column if not exists verified_at timestamptz;
alter table public.venues alter column court_count drop not null;
alter table public.venues alter column court_count drop default;
alter table public.venues alter column availability set default 'unknown';
alter table public.venues drop constraint if exists venues_availability_allowed;
alter table public.venues add constraint venues_availability_allowed check (availability in ('unknown','available','waitlist'));
create or replace function public.arena_area(value text) returns text
language sql immutable security invoker set search_path = '' as $$
 select case when btrim(coalesce(value,'')) in ('กรุงเทพ','กรุงเทพฯ') then 'กรุงเทพมหานคร'
 else regexp_replace(split_part(btrim(coalesce(value,'')), ' — ', 1), '^(จังหวัด|อำเภอ|เขต|ตำบล|แขวง)\s*', '') end;
$$;
create index if not exists venues_area_directory_idx on public.venues (public.arena_area(province),public.arena_area(district),public.arena_area(subdistrict)) where status='active';
create index if not exists groups_venue_directory_idx on public.groups(venue_id,status,starts_at);
create or replace function public.search_arena_venues(
 p_q text default '', p_province text default '', p_district text default '', p_subdistrict text default '',
 p_sort text default 'area', p_activity text default 'all', p_page integer default 1, p_size integer default 24
) returns jsonb language sql stable security invoker set search_path = '' as $$
 with me as (
   select province,district,subdistrict from public.profiles where id=(select auth.uid())
 ), candidates as (
   select v.id,v.name,v.address,v.province,v.district,v.subdistrict,v.aliases,v.cover_image_url,
     v.court_count,v.rating,v.source_url,v.verified_at,
     case when public.arena_area(v.province) <> '' and public.arena_area(v.province)=public.arena_area((select province from me)) then
       case when public.arena_area(v.district) <> '' and public.arena_area(v.district)=public.arena_area((select district from me)) then
         case when public.arena_area(v.subdistrict) <> '' and public.arena_area(v.subdistrict)=public.arena_area((select subdistrict from me)) then 3 else 2 end
       else 1 end else 0 end as area_score,
     (select count(*) from public.groups g where g.venue_id=v.id and g.status='completed' and g.starts_at between now()-interval '90 days' and now() and g.title not like '[QA ONLY]%') as completed_90,
     (select count(*) from public.groups g where g.venue_id=v.id and g.status='published' and g.starts_at>now() and g.title not like '[QA ONLY]%' and (select count(*) from public.group_members m where m.group_id=g.id and m.membership_status='registered') < g.capacity) as open_groups
   from public.venues v where v.status='active' and v.name not like '[QA ONLY]%'
     and (coalesce(p_province,'')='' or public.arena_area(v.province)=public.arena_area(p_province))
     and (coalesce(p_district,'')='' or public.arena_area(v.district)=public.arena_area(p_district))
     and (coalesce(p_subdistrict,'')='' or public.arena_area(v.subdistrict)=public.arena_area(p_subdistrict))
     and not exists (select 1 from regexp_split_to_table(lower(left(btrim(coalesce(p_q,'')),160)), '\s+') t
       where t<>'' and position(t in lower(concat_ws(' ',v.name,array_to_string(v.aliases,' '),v.address,v.province,v.district,v.subdistrict)))=0)
 ), filtered as (
   select * from candidates where (p_activity<>'open' or open_groups>0) and (p_activity<>'history' or completed_90>0)
 ), ranked as (
   select *,row_number() over(order by
     case when p_sort='area' then area_score end desc,
     case when p_sort in ('area','popular') then completed_90 end desc,
     case when p_sort='open' then open_groups end desc,
     name,id) as position from filtered
 ), page as (
   select * from ranked order by position limit greatest(1,least(coalesce(p_size,24),50))
   offset (greatest(1,least(coalesce(p_page,1),100000))-1)*greatest(1,least(coalesce(p_size,24),50))
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)-'position' order by position) from page),'[]'::jsonb),'total',(select count(*) from filtered));
$$;
revoke all on function public.search_arena_venues(text,text,text,text,text,text,integer,integer) from public,anon;
grant execute on function public.search_arena_venues(text,text,text,text,text,text,integer,integer) to authenticated;
create table public.venue_suggestions (
 id uuid primary key default gen_random_uuid(), submitted_by uuid not null references public.profiles(id),
 name text not null check(char_length(name) between 2 and 160), province text not null check(char_length(province) between 1 and 80),
 district text check(char_length(district)<=80), subdistrict text check(char_length(subdistrict)<=80),
 address text check(char_length(address)<=500), source_url text check(source_url ~ '^https?://' and char_length(source_url)<=2000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 venue_id uuid references public.venues(id), created_at timestamptz not null default now()
);
create unique index venue_suggestions_pending_unique on public.venue_suggestions(submitted_by,lower(name),province,coalesce(district,'')) where status='pending';
create index venue_suggestions_venue_idx on public.venue_suggestions(venue_id);
alter table public.venue_suggestions enable row level security;
grant select,insert,update on public.venue_suggestions to authenticated;
create policy venue_suggestions_read on public.venue_suggestions for select to authenticated using(submitted_by=(select auth.uid()) or (select public.is_current_user_admin()));
create policy venue_suggestions_submit on public.venue_suggestions for insert to authenticated with check(submitted_by=(select auth.uid()) and status='pending' and venue_id is null);
create policy venue_suggestions_admin on public.venue_suggestions for update to authenticated using((select public.is_current_user_admin())) with check((select public.is_current_user_admin()));
create or replace function public.review_venue_suggestion(
  p_suggestion_id uuid,
  p_decision text,
  p_venue_id uuid default null
) returns public.venues
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_suggestion public.venue_suggestions;
  v_venue public.venues;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not public.is_current_user_admin() then raise exception using errcode = '42501', message = 'Admin required'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception using errcode = '22023', message = 'Invalid decision'; end if;

  select * into v_suggestion from public.venue_suggestions where id = p_suggestion_id for update;
  if not found then raise exception using errcode = '22023', message = 'Suggestion not found'; end if;
  if v_suggestion.status <> 'pending' then raise exception using errcode = '22023', message = 'Suggestion already reviewed'; end if;

  if p_decision = 'rejected' then
    update public.venue_suggestions set status = 'rejected' where id = v_suggestion.id;
    return null;
  end if;

  if p_venue_id is null then
    insert into public.venues (created_by, name, province, district, subdistrict, address, availability, status, source_url, verified_at)
    values (v_user_id, v_suggestion.name, v_suggestion.province, v_suggestion.district, v_suggestion.subdistrict, v_suggestion.address, 'unknown', 'active', v_suggestion.source_url, now())
    returning * into v_venue;
  else
    select * into v_venue from public.venues where id = p_venue_id and status = 'active' for update;
    if not found then raise exception using errcode = '22023', message = 'Venue not found'; end if;
  end if;

  update public.venue_suggestions set status = 'approved', venue_id = v_venue.id where id = v_suggestion.id;
  return v_venue;
end;
$$;
revoke all on function public.review_venue_suggestion(uuid,text,uuid) from public,anon;
grant execute on function public.review_venue_suggestion(uuid,text,uuid) to authenticated;
drop policy if exists venues_insert_creator on public.venues;
drop policy if exists venues_update_creator on public.venues;
create policy venues_insert_admin on public.venues for insert to authenticated with check((select public.is_current_user_admin()));
create policy venues_update_admin on public.venues for update to authenticated using((select public.is_current_user_admin())) with check((select public.is_current_user_admin()));
create policy venues_read_admin on public.venues for select to authenticated using((select public.is_current_user_admin()));
notify pgrst,'reload schema';
