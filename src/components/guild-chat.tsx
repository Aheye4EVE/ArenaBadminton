"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Check,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type GuildChatMessageData = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type GuildChatMemberData = {
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  role: string;
};

function roleLabel(role: string) {
  return (
    (
      {
        guild_master: "Guild Master",
        officer: "Officer",
        recruiter: "Recruiter",
        member: "Member",
      } as Record<string, string>
    )[role] ?? "Member"
  );
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "เมื่อสักครู่";
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

export default function GuildChat({
  guildId,
  conversationId,
  currentUserId,
  initialMessages,
  members,
}: {
  guildId: string;
  conversationId: string;
  currentUserId: string;
  initialMessages: GuildChatMessageData[];
  members: GuildChatMemberData[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const memberMap = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members],
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`guild-messages:${guildId}:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new as Record<string, unknown>;
          const next = {
            id: typeof row.id === "string" ? row.id : "",
            senderId: typeof row.sender_id === "string" ? row.sender_id : "",
            body: typeof row.body === "string" ? row.body : "",
            createdAt:
              typeof row.created_at === "string"
                ? row.created_at
                : new Date().toISOString(),
          };
          if (!next.id || !next.senderId || !next.body) return;
          setMessages((current) =>
            current.some((message) => message.id === next.id)
              ? current
              : [...current, next],
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, guildId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextBody = body.trim();
    if (!nextBody || isSending) return;
    setIsSending(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: sendError } = await supabase.rpc(
        "send_direct_message",
        { p_conversation_id: conversationId, p_body: nextBody },
      );
      if (sendError) throw sendError;
      const row = (Array.isArray(data) ? data[0] : data) as Record<
        string,
        unknown
      > | null;
      if (row && typeof row.id === "string") {
        const rowId = row.id;
        const senderId =
          typeof row.sender_id === "string" ? row.sender_id : currentUserId;
        const messageBody = typeof row.body === "string" ? row.body : nextBody;
        const createdAt =
          typeof row.created_at === "string"
            ? row.created_at
            : new Date().toISOString();
        setMessages((current) =>
          current.some((message) => message.id === rowId)
            ? current
            : [
                ...current,
                { id: rowId, senderId, body: messageBody, createdAt },
              ],
        );
      }
      setBody("");
    } catch {
      setError("ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section
      className="guild-chat-panel"
      id="guild-chat"
      aria-labelledby="guild-chat-title"
    >
      <div className="guild-chat-panel__heading">
        <div>
          <p lang="en">Guild Lounge · Realtime</p>
          <h2 id="guild-chat-title">
            <MessageCircle size={19} /> ห้องแชท Guild
          </h2>
          <span>นัดคอร์ท แลกเปลี่ยนเทคนิค และคุยกับสมาชิกในห้องเดียวกัน</span>
        </div>
        <span className="guild-chat-live">
          <span /> Live
        </span>
      </div>
      <div className="guild-chat-stream" aria-live="polite">
        {messages.length > 0 ? (
          messages.map((message) => {
            const member = memberMap.get(message.senderId);
            const isMine = message.senderId === currentUserId;
            return (
              <article
                className={`guild-chat-message ${isMine ? "guild-chat-message--mine" : ""}`}
                key={message.id}
              >
                <span className="guild-chat-message__avatar">
                  {member?.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                </span>
                <div className="guild-chat-message__body">
                  <div className="guild-chat-message__meta">
                    <strong>
                      {member?.displayName ?? (isMine ? "คุณ" : "สมาชิก Guild")}
                    </strong>
                    <span>{roleLabel(member?.role ?? "member")}</span>
                    <time dateTime={message.createdAt}>
                      {timeLabel(message.createdAt)}
                    </time>
                  </div>
                  <p>{message.body}</p>
                </div>
              </article>
            );
          })
        ) : (
          <div className="guild-chat-empty">
            <MessageCircle size={27} />
            <strong>เปิดบทสนทนาแรกของ Guild</strong>
            <span>ชวนเพื่อนนัดตีแบดได้เลย</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form className="guild-chat-composer" onSubmit={sendMessage}>
        <label htmlFor="guild-chat-message" className="sr-only">
          ข้อความในห้องแชท Guild
        </label>
        <textarea
          id="guild-chat-message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="พิมพ์ข้อความถึงสมาชิก Guild..."
          maxLength={2000}
          rows={2}
          disabled={isSending}
        />
        <button
          type="submit"
          className="guild-primary-action"
          disabled={isSending || !body.trim()}
        >
          {isSending ? (
            <LoaderCircle className="community-spin" size={16} />
          ) : (
            <Send size={16} />
          )}{" "}
          {isSending ? "กำลังส่ง" : "ส่งข้อความ"}
        </button>
      </form>
      {error ? (
        <p
          className="guild-form-feedback guild-form-feedback--error"
          role="alert"
        >
          {error}
        </p>
      ) : (
        <p className="guild-chat-note">
          <Check size={13} /> ข้อความนี้แสดงเฉพาะสมาชิก Guild ที่ active
        </p>
      )}
    </section>
  );
}
