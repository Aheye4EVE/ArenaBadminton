-- Arena-Badminton friend graph and friend-only direct messages.
-- The relationship is stored once per unordered pair so duplicate requests
-- cannot be created by swapping requester/addressee IDs.

create table if not exists public.user_friendships (
  id uuid primary key default gen_random_uuid(),
  low_user_id uuid not null references public.profiles(id) on delete cascade,
  high_user_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_friendships_pair_order check (low_user_id < high_user_id),
  constraint user_friendships_requester_member check (requested_by = low_user_id or requested_by = high_user_id),
  constraint user_friendships_status_allowed check (status in ('pending', 'accepted', 'declined')),
  constraint user_friendships_not_self check (low_user_id <> high_user_id)
);

create unique index if not exists user_friendships_pair_uidx
  on public.user_friendships (low_user_id, high_user_id);
create index if not exists user_friendships_low_status_idx
  on public.user_friendships (low_user_id, status, updated_at desc, id);
create index if not exists user_friendships_high_status_idx
  on public.user_friendships (high_user_id, status, updated_at desc, id);

drop trigger if exists user_friendships_set_updated_at on public.user_friendships;
create trigger user_friendships_set_updated_at
before update on public.user_friendships
for each row execute function public.set_updated_at();

revoke all on public.user_friendships from public, anon, authenticated;
grant select on public.user_friendships to authenticated;
alter table public.user_friendships enable row level security;

drop policy if exists user_friendships_select_self on public.user_friendships;
create policy user_friendships_select_self on public.user_friendships
for select to authenticated
using (low_user_id = (select auth.uid()) or high_user_id = (select auth.uid()));

create or replace function public.send_friend_request(p_other_user_id uuid)
returns public.user_friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_low uuid;
  v_high uuid;
  v_relationship public.user_friendships;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_other_user_id is null or p_other_user_id = v_user_id then
    raise exception using errcode = '22023', message = 'Invalid friend participant';
  end if;
  if not exists (select 1 from public.profiles where id = v_user_id and profile_completed_at is not null)
    or not exists (select 1 from public.profiles where id = p_other_user_id and profile_completed_at is not null) then
    raise exception using errcode = '42501', message = 'Profile completion required';
  end if;

  v_low := least(v_user_id, p_other_user_id);
  v_high := greatest(v_user_id, p_other_user_id);
  select * into v_relationship
  from public.user_friendships
  where low_user_id = v_low and high_user_id = v_high
  for update;

  if found then
    if v_relationship.status = 'accepted' then
      raise exception using errcode = '23505', message = 'Already friends';
    end if;
    if v_relationship.status = 'pending' then
      if v_relationship.requested_by = v_user_id then
        raise exception using errcode = '23505', message = 'Friend request already pending';
      end if;
      raise exception using errcode = '23505', message = 'Incoming friend request is waiting';
    end if;

    update public.user_friendships
    set requested_by = v_user_id,
        status = 'pending',
        responded_at = null,
        updated_at = timezone('utc', now())
    where id = v_relationship.id
    returning * into v_relationship;
  else
    insert into public.user_friendships (low_user_id, high_user_id, requested_by, status)
    values (v_low, v_high, v_user_id, 'pending')
    returning * into v_relationship;
  end if;

  insert into public.notifications (user_id, notification_type, title, body, href)
  values (
    p_other_user_id,
    'friend_request',
    'มีคำขอเป็นเพื่อนใหม่',
    'มีผู้เล่นส่งคำขอเป็นเพื่อนมาให้คุณ',
    '/friends'
  );
  return v_relationship;
end;
$$;

create or replace function public.respond_friend_request(p_friendship_id uuid, p_accept boolean)
returns public.user_friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_relationship public.user_friendships;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_friendship_id is null or p_accept is null then
    raise exception using errcode = '22023', message = 'Invalid friend request';
  end if;

  select * into v_relationship
  from public.user_friendships
  where id = p_friendship_id
  for update;
  if not found or v_relationship.status <> 'pending' then
    raise exception using errcode = 'P0002', message = 'Friend request not found';
  end if;

  if v_relationship.requested_by = v_user_id then
    raise exception using errcode = '42501', message = 'Only the recipient can respond';
  end if;
  if v_user_id <> v_relationship.low_user_id and v_user_id <> v_relationship.high_user_id then
    raise exception using errcode = '42501', message = 'Friend request access denied';
  end if;

  update public.user_friendships
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = p_friendship_id
  returning * into v_relationship;

  insert into public.notifications (user_id, notification_type, title, body, href)
  values (
    v_relationship.requested_by,
    'friend_request',
    case when p_accept then 'คำขอเป็นเพื่อนถูกรับแล้ว' else 'คำขอเป็นเพื่อนถูกปฏิเสธ' end,
    case when p_accept then 'คุณกับผู้เล่นคนนี้เป็นเพื่อนกันแล้ว เริ่มคุยผ่าน Messenger ได้เลย' else 'คำขอเป็นเพื่อนของคุณถูกปฏิเสธแล้ว' end,
    case when p_accept then '/messages' else '/friends' end
  );
  return v_relationship;
end;
$$;

create or replace function public.cancel_friend_request(p_friendship_id uuid)
returns public.user_friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_relationship public.user_friendships;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  delete from public.user_friendships
  where id = p_friendship_id
    and requested_by = v_user_id
    and status = 'pending'
  returning * into v_relationship;
  if not found then
    raise exception using errcode = 'P0002', message = 'Friend request not found';
  end if;
  return v_relationship;
end;
$$;

create or replace function public.remove_friend(p_other_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_low uuid;
  v_high uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_other_user_id is null or p_other_user_id = v_user_id then
    raise exception using errcode = '22023', message = 'Invalid friend participant';
  end if;
  v_low := least(v_user_id, p_other_user_id);
  v_high := greatest(v_user_id, p_other_user_id);
  delete from public.user_friendships
  where low_user_id = v_low and high_user_id = v_high and status = 'accepted';
  if not found then
    raise exception using errcode = 'P0002', message = 'Friendship not found';
  end if;
  return true;
end;
$$;

revoke all on function public.send_friend_request(uuid), public.respond_friend_request(uuid, boolean), public.cancel_friend_request(uuid), public.remove_friend(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid), public.respond_friend_request(uuid, boolean), public.cancel_friend_request(uuid), public.remove_friend(uuid) to authenticated;

-- Existing conversations remain readable as history, but creating a new
-- conversation and sending a message both require an accepted friendship.
create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns public.direct_conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_key text;
  v_conversation public.direct_conversations;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_other_user_id is null or p_other_user_id = v_user_id or not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception using errcode = '22023', message = 'Invalid conversation participant';
  end if;
  if not exists (
    select 1 from public.user_friendships
    where status = 'accepted'
      and low_user_id = least(v_user_id, p_other_user_id)
      and high_user_id = greatest(v_user_id, p_other_user_id)
  ) then
    raise exception using errcode = '42501', message = 'Friends only';
  end if;

  v_key := least(v_user_id::text, p_other_user_id::text) || ':' || greatest(v_user_id::text, p_other_user_id::text);
  insert into public.direct_conversations (direct_key)
  values (v_key)
  on conflict (direct_key) do update set updated_at = public.direct_conversations.updated_at
  returning * into v_conversation;
  insert into public.direct_conversation_members (conversation_id, user_id)
  values (v_conversation.id, v_user_id), (v_conversation.id, p_other_user_id)
  on conflict do nothing;
  return v_conversation;
end;
$$;

create or replace function public.send_direct_message(p_conversation_id uuid, p_body text)
returns public.direct_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_message public.direct_messages;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not exists (select 1 from public.direct_conversation_members where conversation_id = p_conversation_id and user_id = v_user_id) then
    raise exception using errcode = '42501', message = 'You are not a member of this conversation';
  end if;
  if not exists (
    select 1
    from public.direct_conversation_members other_member
    where other_member.conversation_id = p_conversation_id
      and other_member.user_id <> v_user_id
      and exists (
        select 1 from public.user_friendships
        where status = 'accepted'
          and low_user_id = least(v_user_id, other_member.user_id)
          and high_user_id = greatest(v_user_id, other_member.user_id)
      )
  ) then
    raise exception using errcode = '42501', message = 'Friends only';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 2000 then raise exception using errcode = '22023', message = 'Message is invalid'; end if;
  insert into public.direct_messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_user_id, btrim(p_body))
  returning * into v_message;
  update public.direct_conversations set last_message_at = v_message.created_at where id = p_conversation_id;
  insert into public.notifications (user_id, notification_type, title, body, href)
  select dcm.user_id, 'direct_message', 'มีข้อความใหม่', left(v_message.body, 160), '/messages?conversation=' || p_conversation_id::text
  from public.direct_conversation_members dcm
  where dcm.conversation_id = p_conversation_id and dcm.user_id <> v_user_id;
  return v_message;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid), public.send_direct_message(uuid, text) from public, anon;
grant execute on function public.get_or_create_direct_conversation(uuid), public.send_direct_message(uuid, text) to authenticated;
