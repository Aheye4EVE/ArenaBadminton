"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, MessageCircle, Send, UserRound, Wifi, XCircle } from "lucide-react";
import { sendDirectMessageAction, type MessageActionState } from "@/app/messages/actions";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type DirectConversation = {
  id: string;
  otherUserId: string;
  otherName: string;
  otherHandle: string;
  otherAvatarUrl: string | null;
  lastMessageAt: string | null;
};

export type DirectMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "เมื่อสักครู่" : new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(date);
}

function Avatar({ url }: { url: string | null }) {
  return url ? <img className="messages-avatar" src={url} alt="" /> : <span className="messages-avatar messages-avatar--fallback"><UserRound size={17} /></span>;
}

function Feedback({ state }: { state: MessageActionState }) {
  if (!state.error && !state.message) return null;
  return <p className={state.error ? "messages-feedback messages-feedback--error" : "messages-feedback"} role={state.error ? "alert" : "status"}>{state.error ? <XCircle size={14} /> : <Check size={14} />}{state.error ?? state.message}</p>;
}

export default function MessagesBrowser({ conversations, selectedConversationId, initialMessages, currentUserId, friendOnlyNotice = false }: { conversations: DirectConversation[]; selectedConversationId: string | null; initialMessages: DirectMessage[]; currentUserId: string; friendOnlyNotice?: boolean }) {
  const selected = conversations.find((conversation) => conversation.id === selectedConversationId) ?? conversations[0] ?? null;
  const [messages, setMessages] = useState(initialMessages);
  const [realtime, setRealtime] = useState<"connecting" | "connected" | "offline">("connecting");
  const [state, action, pending] = useActionState(sendDirectMessageAction, {});
  const selectedConversationKey = selected?.id ?? null;

  useEffect(() => {
    if (!selectedConversationKey) return;
    const client = getSupabaseBrowserClient();
    const channel = client.channel(`direct-messages:${selectedConversationKey}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${selectedConversationKey}` },
      (payload: { new: Record<string, unknown> }) => {
        const row = payload.new;
        const next: DirectMessage = {
          id: String(row.id),
          conversationId: String(row.conversation_id),
          senderId: String(row.sender_id),
          body: String(row.body),
          createdAt: String(row.created_at),
          readAt: typeof row.read_at === "string" ? row.read_at : null,
        };
        setMessages((current) => current.some((message) => message.id === next.id) ? current : [...current, next]);
      },
    ).subscribe((status: string) => setRealtime(status === "SUBSCRIBED" ? "connected" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "offline" : "connecting"));
    void client.rpc("mark_direct_messages_read", { p_conversation_id: selectedConversationKey });
    return () => { void client.removeChannel(channel); };
  }, [selectedConversationKey]);

  const selectedMessages = useMemo(() => messages.filter((message) => message.conversationId === selected?.id), [messages, selected?.id]);
  const connectionState = selected ? realtime : "offline";

  return (
    <main className="messages-page">
      <div className="messages-shell">
        <header className="messages-topbar">
          <Link href="/" className="messages-brand"><span>Arena</span><em>-Badminton</em></Link>
          <div><p lang="en">Arena Direct</p><h1>Messages</h1></div>
          <Link href="/community" className="messages-back"><ArrowLeft size={15} /> Community</Link>
        </header>

        <div className="messages-layout">
          <aside className="messages-inbox">
            <div className="messages-inbox__heading"><div><p lang="en">Inbox</p><h2>บทสนทนา</h2></div><MessageCircle size={20} /></div>
            {conversations.length > 0 ? conversations.map((conversation) => (
              <Link className={`messages-conversation ${conversation.id === selected?.id ? "messages-conversation--active" : ""}`} href={`/messages?conversation=${conversation.id}`} key={conversation.id}>
                <Avatar url={conversation.otherAvatarUrl} />
                <span><strong>{conversation.otherName}</strong><small>@{conversation.otherHandle}</small></span>
              </Link>
            )) : <div className="messages-empty"><MessageCircle size={26} /><span>ยังไม่มีข้อความใหม่</span><small>เริ่มคุยกับผู้เล่นจากหน้า Marketplace หรือ Profile</small></div>}
          </aside>

          <section className="messages-thread">
            {selected ? <>
              <header className="messages-thread__header">
                <Avatar url={selected.otherAvatarUrl} />
                <div><strong>{selected.otherName}</strong><small>@{selected.otherHandle}</small></div>
                <span className={`messages-connection messages-connection--${connectionState}`}><Wifi size={13} /> {connectionState === "connected" ? "Realtime" : connectionState === "connecting" ? "กำลังเชื่อม" : "Offline"}</span>
              </header>
              <div className="messages-list">
                {selectedMessages.length > 0 ? selectedMessages.map((message) => (
                  <article className={`messages-bubble ${message.senderId === currentUserId ? "messages-bubble--mine" : ""}`} key={message.id}>
                    <p>{message.body}</p><small>{message.senderId === currentUserId ? "คุณ" : selected.otherName} · {dateLabel(message.createdAt)}</small>
                  </article>
                )) : <div className="messages-thread-empty"><MessageCircle size={28} /><strong>เริ่มบทสนทนา</strong><span>คุยกันเรื่องก๊วน สนาม หรืออุปกรณ์แบดได้เลย</span></div>}
              </div>
              <form className="messages-compose" action={action}>
                <input type="hidden" name="conversationId" value={selected.id} />
                <textarea name="body" maxLength={2000} placeholder="พิมพ์ข้อความถึงเพื่อน..." required />
                <button type="submit" className="group-primary-action" disabled={pending}><Send size={15} /> {pending ? "กำลังส่ง" : "ส่งข้อความ"}</button>
                <Feedback state={state} />
              </form>
            </> : <div className="messages-no-selection"><MessageCircle size={32} /><h2>{friendOnlyNotice ? "เพิ่มเพื่อนก่อนเริ่มคุย" : "เลือกบทสนทนา"}</h2><p>{friendOnlyNotice ? "ระบบเปิด DM เฉพาะผู้เล่นที่เป็นเพื่อนกันแล้ว ไปที่หน้าเพื่อนเพื่อส่งคำขอได้เลย" : "เมื่อคุณติดต่อผู้เล่น บทสนทนาจะแสดงที่นี่"}</p>{friendOnlyNotice ? <Link href="/friends" className="group-secondary-action">ไปจัดการเพื่อน</Link> : null}</div>}
          </section>
        </div>

        <footer className="messages-footer"><span>Direct Messages · Supabase Realtime</span><span>คุยกันอย่างสุภาพและอย่าแชร์ข้อมูลสำคัญ</span></footer>
      </div>
    </main>
  );
}
