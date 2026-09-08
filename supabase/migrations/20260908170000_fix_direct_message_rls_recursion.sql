-- Fix the self-referencing RLS policy that prevented Messenger from loading.
-- The helper lives outside the exposed public schema and checks the current
-- authenticated identity before bypassing RLS for the membership lookup.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_direct_conversation_member(
  p_conversation_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and p_user_id = (select auth.uid())
    and exists (
      select 1
      from public.direct_conversation_members as member
      where member.conversation_id = p_conversation_id
        and member.user_id = p_user_id
    );
$$;

revoke all on function private.is_direct_conversation_member(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.is_direct_conversation_member(uuid, uuid)
  to authenticated;

drop policy if exists direct_conversation_members_select_member
  on public.direct_conversation_members;

create policy direct_conversation_members_select_member
  on public.direct_conversation_members
  for select
  to authenticated
  using (
    (select private.is_direct_conversation_member(
      conversation_id,
      (select auth.uid())
    ))
  );
