"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, MessageCircle, Send, UserPlus, UserRound, Users, X, XCircle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { safeMediaUrl } from "@/lib/safe-media-url";

type FriendshipRow = { low_user_id: string; high_user_id: string; status: string };
type ProfileRow = { id: string; display_name: string; handle: string; avatar_url: string | null; level: number };
type MessengerPerson = { id: string; displayName: string; handle: string; avatarUrl: string | null; level: number };
type MessengerConversation = MessengerPerson & { conversationId: string; lastMessageAt: string | null };
type MessengerMessage = { id: string; conversationId: string; senderId: string; body: string; createdAt: string };

function row(data: unknown) {
  return (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
}

function toPerson(value: ProfileRow): MessengerPerson {
  return { id: value.id, displayName: value.display_name || "ผู้เล่น Arena", handle: value.handle || "arena_player", avatarUrl: safeMediaUrl(value.avatar_url), level: Number.isFinite(Number(value.level)) ? Number(value.level) : 1 };
}

function timeLabel(value: string | null) {
  if (!value) return "ยังไม่มีข้อความ";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "เมื่อสักครู่" : new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(date);
}

function errorLabel(value: { message?: string }) {
  const message = (value.message ?? "").toLowerCase();
  if (message.includes("friends only")) return "ต้องเป็นเพื่อนกันก่อนจึงจะเริ่มแชทได้";
  if (message.includes("authentication")) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
  return "Messenger ยังไม่พร้อมใช้งาน ลองใหม่อีกครั้ง";
}

function Avatar({ person, large = false }: { person: MessengerPerson; large?: boolean }) {
  return person.avatarUrl ? <img className={`messenger-avatar${large ? " messenger-avatar--large" : ""}`} src={person.avatarUrl} alt="" /> : <span className={`messenger-avatar messenger-avatar--fallback${large ? " messenger-avatar--large" : ""}`}><UserRound size={large ? 22 : 16} /></span>;
}

export default function MessengerWidget() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<MessengerPerson[]>([]);
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [selected, setSelected] = useState<MessengerConversation | null>(null);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (currentUserId: string) => {
    const client = getSupabaseBrowserClient();
    const { data: relationshipRows, error: relationshipError } = await client.from("user_friendships").select("low_user_id, high_user_id, status").or(`low_user_id.eq.${currentUserId},high_user_id.eq.${currentUserId}`);
    if (relationshipError) {
      setReady(false);
      return;
    }
    const friendships = (relationshipRows ?? []) as FriendshipRow[];
    const accepted = friendships.filter((relationship) => relationship.status === "accepted");
    const friendIds = accepted.map((relationship) => relationship.low_user_id === currentUserId ? relationship.high_user_id : relationship.low_user_id);
    const profileResult = friendIds.length > 0 ? await client.from("public_profile_directory").select("id, display_name, handle, avatar_url, level").in("id", friendIds) : { data: [] as ProfileRow[] };
    const profileMap = new Map(((profileResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, toPerson(profile)]));
    const nextFriends = friendIds.flatMap((id) => { const value = profileMap.get(id); return value ? [value] : []; });

    const { data: membershipRows } = await client.from("direct_conversation_members").select("conversation_id").eq("user_id", currentUserId);
    const conversationIds = [...new Set(((membershipRows ?? []) as Array<{ conversation_id: string }>).map((membership) => membership.conversation_id))];
    const conversationResult = conversationIds.length > 0 ? await client.from("direct_conversations").select("id, last_message_at").in("id", conversationIds).order("last_message_at", { ascending: false, nullsFirst: false }) : { data: [] as Array<Record<string, unknown>> };
    const memberResult = conversationIds.length > 0 ? await client.from("direct_conversation_members").select("conversation_id, user_id").in("conversation_id", conversationIds) : { data: [] as Array<Record<string, unknown>> };
    const otherByConversation = new Map<string, string>();
    for (const member of (memberResult.data ?? []) as Array<Record<string, unknown>>) if (String(member.user_id) !== currentUserId) otherByConversation.set(String(member.conversation_id), String(member.user_id));
    const otherIds = [...new Set([...otherByConversation.values()])];
    const otherProfileResult = otherIds.length > 0 ? await client.from("public_profile_directory").select("id, display_name, handle, avatar_url, level").in("id", otherIds) : { data: [] as ProfileRow[] };
    const otherProfileMap = new Map(((otherProfileResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, toPerson(profile)]));
    const acceptedIds = new Set(nextFriends.map((friend) => friend.id));
    const nextConversations: MessengerConversation[] = ((conversationResult.data ?? []) as Array<Record<string, unknown>>).flatMap((conversation) => {
      const conversationId = String(conversation.id);
      const otherId = otherByConversation.get(conversationId);
      const person = otherId ? otherProfileMap.get(otherId) : undefined;
      if (!otherId || !person || !acceptedIds.has(otherId)) return [];
      return [{ ...person, conversationId, lastMessageAt: typeof conversation.last_message_at === "string" ? conversation.last_message_at : null }];
    });
    const unreadResult = nextConversations.length > 0 ? await client.from("direct_messages").select("id", { count: "exact", head: true }).in("conversation_id", nextConversations.map((conversation) => conversation.conversationId)).neq("sender_id", currentUserId).is("read_at", null) : { count: 0 };
    setFriends(nextFriends);
    setConversations(nextConversations);
    setUnreadCount(Math.max(0, unreadResult.count ?? 0));
    setReady(true);
    setSelected((current) => current && !nextConversations.some((conversation) => conversation.conversationId === current.conversationId) ? null : current);
  }, []);

  const loadMessages = useCallback(async (conversation: MessengerConversation) => {
    setLoadingMessages(true);
    setError("");
    const client = getSupabaseBrowserClient();
    const { data, error: messageErrorResult } = await client.from("direct_messages").select("id, conversation_id, sender_id, body, created_at, read_at").eq("conversation_id", conversation.conversationId).order("created_at", { ascending: true }).limit(80);
    const messageRows = (data ?? []) as Array<Record<string, unknown>>;
    const nextMessages: MessengerMessage[] = messageRows.map((message) => ({ id: String(message.id), conversationId: String(message.conversation_id), senderId: String(message.sender_id), body: String(message.body), createdAt: String(message.created_at) }));
    if (messageErrorResult) setError("โหลดข้อความไม่สำเร็จ ลองเปิดแชทอีกครั้ง");
    else setMessages(nextMessages);
    await client.rpc("mark_direct_messages_read", { p_conversation_id: conversation.conversationId });
    const unreadInThread = messageRows.filter((message) => message.read_at === null && String(message.sender_id) !== userId).length;
    setUnreadCount((current) => Math.max(0, current - unreadInThread));
    setLoadingMessages(false);
  }, [userId]);

  useEffect(() => {
    let active = true;
    const connect = async () => {
      try {
        const client = getSupabaseBrowserClient();
        const { data } = await client.auth.getUser();
        if (!active || !data.user) return;
        setUserId(data.user.id);
        await loadData(data.user.id);
      } catch {
        if (active) setReady(false);
      }
    };
    void connect();
    return () => { active = false; };
  }, [loadData]);

  useEffect(() => {
    if (!selected?.conversationId) return;
    const client = getSupabaseBrowserClient();
    const channel = client.channel(`messenger-widget:${selected.conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${selected.conversationId}` }, (payload: { new: Record<string, unknown> }) => {
      const message = payload.new;
      const next: MessengerMessage = { id: String(message.id), conversationId: String(message.conversation_id), senderId: String(message.sender_id), body: String(message.body), createdAt: String(message.created_at) };
      setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
    }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [selected?.conversationId]);

  const selectedMessages = useMemo(() => messages.filter((message) => message.conversationId === selected?.conversationId), [messages, selected?.conversationId]);

  const openFriendChat = async (person: MessengerPerson) => {
    if (!userId) return;
    setLoading(true);
    setError("");
    const client = getSupabaseBrowserClient();
    const { data, error: conversationError } = await client.rpc("get_or_create_direct_conversation", { p_other_user_id: person.id });
    const conversationRow = row(data);
    if (conversationError || typeof conversationRow?.id !== "string") {
      setError(conversationError ? errorLabel(conversationError) : "สร้างบทสนทนาไม่สำเร็จ");
      setLoading(false);
      return;
    }
    const conversation: MessengerConversation = { ...person, conversationId: conversationRow.id, lastMessageAt: typeof conversationRow.last_message_at === "string" ? conversationRow.last_message_at : null };
    setConversations((current) => current.some((item) => item.conversationId === conversation.conversationId) ? current : [conversation, ...current]);
    setSelected(conversation);
    await loadMessages(conversation);
    setLoading(false);
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !userId || !draft.trim()) return;
    setLoading(true);
    setError("");
    const client = getSupabaseBrowserClient();
    const { data, error: sendError } = await client.rpc("send_direct_message", { p_conversation_id: selected.conversationId, p_body: draft.trim() });
    if (sendError) setError(errorLabel(sendError));
    else {
      const messageRow = row(data);
      const messageId = typeof messageRow?.id === "string" ? messageRow.id : null;
      if (messageId) setMessages((current) => current.some((item) => item.id === messageId) ? current : [...current, { id: messageId, conversationId: selected.conversationId, senderId: userId, body: String(messageRow?.body ?? draft.trim()), createdAt: String(messageRow?.created_at ?? new Date().toISOString()) }]);
      setDraft("");
    }
    setLoading(false);
  };

  const toggleMessenger = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && userId) void loadData(userId);
  };

  if (!ready || !userId) return null;

  return <div className="messenger-widget">
    <button type="button" className={`messenger-fab${open ? " messenger-fab--open" : ""}`} aria-label={open ? "ปิด Messenger" : "เปิด Messenger"} aria-expanded={open} onClick={toggleMessenger}><MessageCircle size={24} />{unreadCount > 0 ? <b>{Math.min(99, unreadCount)}</b> : null}</button>
    {open ? <section className="messenger-panel" role="dialog" aria-label="Messenger ของ Arena">
      <header className="messenger-panel__header"><div><p lang="en">Arena Messenger</p><h2>{selected ? selected.displayName : "เพื่อนของฉัน"}</h2></div><button type="button" onClick={() => { setOpen(false); setSelected(null); }} aria-label="ปิด Messenger"><X size={18} /></button></header>
      {error ? <p className="messenger-feedback" role="alert"><XCircle size={14} /> {error}</p> : null}
      {selected ? <div className="messenger-thread"><button type="button" className="messenger-back" onClick={() => { setSelected(null); setMessages([]); }}><ArrowLeft size={14} /> เพื่อนทั้งหมด</button><div className="messenger-thread__identity"><Avatar person={selected} large /><span><strong>{selected.displayName}</strong><small>@{selected.handle} · Level {selected.level}</small></span></div><div className="messenger-thread__messages" aria-live="polite">{loadingMessages ? <span className="messenger-loading"><LoaderCircle size={17} /> กำลังโหลดข้อความ...</span> : selectedMessages.length > 0 ? selectedMessages.map((message) => <article key={message.id} className={`messenger-bubble${message.senderId === userId ? " messenger-bubble--mine" : ""}`}><p>{message.body}</p><small>{timeLabel(message.createdAt)}</small></article>) : <div className="messenger-empty"><MessageCircle size={26} /><strong>เริ่มคุยกับเพื่อนคนนี้</strong><span>ชวนกันลงก๊วน นัดสนาม แล้วไปตีด้วยกัน</span></div>}</div><form className="messenger-compose" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="พิมพ์ข้อความถึงเพื่อน..." aria-label="ข้อความถึงเพื่อน" /><button type="submit" aria-label="ส่งข้อความ" disabled={loading || !draft.trim()}><Send size={16} /></button></form></div> : <div className="messenger-home"><div className="messenger-home__links"><span><Users size={15} /> {friends.length} เพื่อน</span><Link href="/friends" onClick={() => setOpen(false)}>จัดการเพื่อน <ArrowRight size={13} /></Link></div>{friends.length > 0 ? <div className="messenger-list">{friends.map((friend) => <button type="button" className="messenger-person" key={friend.id} onClick={() => void openFriendChat(friend)} disabled={loading}><Avatar person={friend} /><span><strong>{friend.displayName}</strong><small>@{friend.handle} · Level {friend.level}</small></span><MessageCircle size={15} /></button>)}</div> : <div className="messenger-empty"><UserPlus size={27} /><strong>เพิ่มเพื่อนก่อนเริ่มแชท</strong><span>ระบบ DM ของ Arena เปิดให้เฉพาะเพื่อนที่รับคำขอแล้ว</span><Link href="/friends" className="messenger-empty__cta" onClick={() => setOpen(false)}>ค้นหาเพื่อน <ArrowRight size={14} /></Link></div>}{conversations.length > 0 ? <div className="messenger-recent"><p>บทสนทนาล่าสุด</p>{conversations.slice(0, 3).map((conversation) => <button type="button" key={conversation.conversationId} onClick={() => void openFriendChat(conversation)}>{conversation.displayName}<small>{timeLabel(conversation.lastMessageAt)}</small></button>)}</div> : null}<Link href="/messages" className="messenger-all-link" onClick={() => setOpen(false)}>เปิด Messages แบบเต็ม <ArrowRight size={14} /></Link></div>}
      <footer className="messenger-panel__footer"><Check size={13} /> คุยได้เฉพาะกับเพื่อนใน Arena</footer>
    </section> : null}
  </div>;
}
