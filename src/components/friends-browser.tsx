"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { ArrowRight, Check, MessageCircle, Search, ShieldCheck, UserPlus, UserRound, Users, X, XCircle } from "lucide-react";
import { cancelFriendRequestAction, removeFriendAction, respondFriendRequestAction, sendFriendRequestAction, type FriendActionState } from "@/app/friends/actions";

export type FriendPerson = {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  level: number;
};

export type FriendRequest = FriendPerson & { friendshipId: string };

export type FriendSearchPerson = FriendPerson & {
  friendshipId: string | null;
  relationshipStatus: "none" | "pending" | "accepted" | "declined";
  requestDirection: "incoming" | "outgoing" | "none";
};

function Feedback({ state }: { state: FriendActionState }) {
  if (!state.error && !state.message) return null;
  return <p className={state.error ? "friends-feedback friends-feedback--error" : "friends-feedback"} role={state.error ? "alert" : "status"}>{state.error ? <XCircle size={14} /> : <Check size={14} />}{state.error ?? state.message}</p>;
}

function Avatar({ person, large = false }: { person: FriendPerson; large?: boolean }) {
  return person.avatarUrl ? <img className={`friends-avatar${large ? " friends-avatar--large" : ""}`} src={person.avatarUrl} alt="" /> : <span className={`friends-avatar friends-avatar--fallback${large ? " friends-avatar--large" : ""}`}><UserRound size={large ? 23 : 17} /></span>;
}

function SendRequestButton({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const [state, action, pending] = useActionState(sendFriendRequestAction, {});
  return <div className="friends-action-stack"><form action={action}><input type="hidden" name="otherUserId" value={userId} /><button type="submit" className={compact ? "friends-button friends-button--small" : "friends-button friends-button--primary"} disabled={pending}><UserPlus size={15} /> {pending ? "กำลังส่ง..." : "แอดเพื่อน"}</button></form><Feedback state={state} /></div>;
}

function IncomingRequestCard({ request }: { request: FriendRequest }) {
  const [state, action, pending] = useActionState(respondFriendRequestAction, {});
  return <article className="friends-card friends-card--request"><Avatar person={request} /><div className="friends-card__body"><strong>{request.displayName}</strong><small>@{request.handle} · Level {request.level}</small><span>ส่งคำขอเป็นเพื่อนมาให้คุณ</span></div><form className="friends-request-actions" action={action}><input type="hidden" name="friendshipId" value={request.friendshipId} /><button type="submit" name="decision" value="accept" className="friends-button friends-button--primary" disabled={pending}><Check size={14} /> รับ</button><button type="submit" name="decision" value="decline" className="friends-button friends-button--ghost" disabled={pending}><X size={14} /> ปฏิเสธ</button><Feedback state={state} /></form></article>;
}

function OutgoingRequestCard({ request }: { request: FriendRequest }) {
  const [state, action, pending] = useActionState(cancelFriendRequestAction, {});
  return <article className="friends-card"><Avatar person={request} /><div className="friends-card__body"><strong>{request.displayName}</strong><small>@{request.handle} · Level {request.level}</small><span>รอผู้เล่นตอบรับคำขอ</span></div><div className="friends-card__action"><form action={action}><input type="hidden" name="friendshipId" value={request.friendshipId} /><button type="submit" className="friends-button friends-button--ghost" disabled={pending}>{pending ? "กำลังยกเลิก..." : "ยกเลิกคำขอ"}</button></form><Feedback state={state} /></div></article>;
}

function FriendCard({ person }: { person: FriendPerson }) {
  const [state, action, pending] = useActionState(removeFriendAction, {});
  return <article className="friends-card friends-card--friend"><Avatar person={person} /><div className="friends-card__body"><strong>{person.displayName}</strong><small>@{person.handle} · Level {person.level}</small><span><ShieldCheck size={13} /> เป็นเพื่อนกันแล้ว</span></div><div className="friends-card__action"><Link href={`/messages?user=${person.id}`} className="friends-button friends-button--primary"><MessageCircle size={15} /> เปิดแชท</Link><form action={action} onSubmit={(event) => { if (!window.confirm(`นำ ${person.displayName} ออกจากรายชื่อเพื่อนหรือไม่?`)) event.preventDefault(); }}><input type="hidden" name="otherUserId" value={person.id} /><button type="submit" className="friends-text-button" disabled={pending}>{pending ? "กำลังลบ..." : "ลบเพื่อน"}</button></form><Feedback state={state} /></div></article>;
}

function SearchPersonCard({ person }: { person: FriendSearchPerson }) {
  if (person.relationshipStatus === "accepted") return <article className="friends-card friends-card--search"><Avatar person={person} /><div className="friends-card__body"><strong>{person.displayName}</strong><small>@{person.handle} · Level {person.level}</small><span><ShieldCheck size={13} /> เป็นเพื่อนกันแล้ว</span></div><Link href={`/messages?user=${person.id}`} className="friends-button friends-button--primary"><MessageCircle size={15} /> เปิดแชท</Link></article>;
  if (person.relationshipStatus === "pending" && person.requestDirection === "incoming") return <IncomingSearchAction person={person} />;
  if (person.relationshipStatus === "pending") return <article className="friends-card friends-card--search"><Avatar person={person} /><div className="friends-card__body"><strong>{person.displayName}</strong><small>@{person.handle} · Level {person.level}</small><span>รอการตอบรับคำขอของคุณ</span></div><span className="friends-status-pill">รอการตอบรับ</span></article>;
  return <article className="friends-card friends-card--search"><Avatar person={person} /><div className="friends-card__body"><strong>{person.displayName}</strong><small>@{person.handle} · Level {person.level}</small><span>ชวนมาเป็นเพื่อน แล้วค่อยเริ่มคุยกัน</span></div><SendRequestButton userId={person.id} compact /></article>;
}

function IncomingSearchAction({ person }: { person: FriendSearchPerson }) {
  const [state, action, pending] = useActionState(respondFriendRequestAction, {});
  return <article className="friends-card friends-card--search"><Avatar person={person} /><div className="friends-card__body"><strong>{person.displayName}</strong><small>@{person.handle} · Level {person.level}</small><span>ผู้เล่นคนนี้แอดคุณมาแล้ว</span></div><form action={action}><input type="hidden" name="friendshipId" value={person.friendshipId ?? ""} /><button type="submit" name="decision" value="accept" className="friends-button friends-button--primary" disabled={pending}><Check size={15} /> รับเป็นเพื่อน</button><Feedback state={state} /></form></article>;
}

function PanelHeading({ eyebrow, title, count, icon }: { eyebrow: string; title: string; count?: number; icon: ReactNode }) {
  return <div className="friends-panel__heading"><div><p lang="en">{eyebrow}</p><h2>{title}</h2></div><span>{icon}{count !== undefined ? count : null}</span></div>;
}

export default function FriendsBrowser({ query, focusedPersonId, searchResults, incoming, outgoing, friends }: { query: string; focusedPersonId: string | null; searchResults: FriendSearchPerson[]; incoming: FriendRequest[]; outgoing: FriendRequest[]; friends: FriendPerson[] }) {
  const hasSearch = Boolean(query || focusedPersonId);
  return <main className="friends-page"><div className="friends-shell">
    <section className="friends-hero"><div><p lang="en">Social Arena</p><h1>เพื่อนของฉัน</h1><span>แอดเพื่อนก่อน แล้วค่อยเปิดบทสนทนาใน Messenger อย่างสบายใจ</span></div><div className="friends-hero__art" aria-hidden="true">🤝<span>✦</span></div></section>

    <form className="friends-search-form" method="get"><div><Search size={18} /><input name="q" defaultValue={query} placeholder="ค้นหาด้วยชื่อ หรือ @handle ของผู้เล่น" /></div><button type="submit" className="friends-button friends-button--primary"><Search size={16} /> ค้นหาผู้เล่น</button></form>

    <div className="friends-layout">
      <div className="friends-main">
        {incoming.length > 0 ? <section className="friends-panel friends-panel--requests"><PanelHeading eyebrow="Friend requests" title="คำขอเป็นเพื่อน" count={incoming.length} icon={<UserPlus size={18} />} /><div className="friends-list">{incoming.map((request) => <IncomingRequestCard key={request.friendshipId} request={request} />)}</div></section> : null}

        <section className="friends-panel"><PanelHeading eyebrow="Your circle" title="เพื่อนของคุณ" count={friends.length} icon={<Users size={18} />} />{friends.length > 0 ? <div className="friends-list">{friends.map((person) => <FriendCard key={person.id} person={person} />)}</div> : <div className="friends-empty"><Users size={29} /><strong>วงเพื่อนของคุณยังว่างอยู่</strong><span>ค้นหาผู้เล่น แล้วส่งคำขอเป็นเพื่อนเพื่อเริ่มสร้างทีม</span></div>}</section>

        {outgoing.length > 0 ? <section className="friends-panel"><PanelHeading eyebrow="Waiting room" title="คำขอที่ส่งไป" count={outgoing.length} icon={<ArrowRight size={18} />} /><div className="friends-list">{outgoing.map((request) => <OutgoingRequestCard key={request.friendshipId} request={request} />)}</div></section> : null}

        <section className="friends-panel friends-panel--search"><PanelHeading eyebrow="Find your people" title="ค้นหาผู้เล่น" count={hasSearch ? searchResults.length : undefined} icon={<Search size={18} />} />{hasSearch ? searchResults.length > 0 ? <div className="friends-list">{searchResults.map((person) => <SearchPersonCard key={person.id} person={person} />)}</div> : <div className="friends-empty"><Search size={29} /><strong>ไม่พบผู้เล่นที่ตรงกับคำค้น</strong><span>ลองค้นหาด้วยชื่อหรือ @handle อื่น</span></div> : <div className="friends-empty"><UserPlus size={29} /><strong>ชวนเพื่อนเข้าสู่ Arena</strong><span>พิมพ์ชื่อหรือ @handle ด้านบน เพื่อค้นหาและส่งคำขอเป็นเพื่อน</span></div>}</section>
      </div>

      <aside className="friends-side"><section className="friends-tip-card"><div className="friends-tip-card__icon"><ShieldCheck size={23} /></div><p lang="en">Arena social rule</p><h2>DM คุยได้เมื่อเป็นเพื่อนกันแล้ว</h2><span>ทั้งปุ่มเริ่มแชทและฐานข้อมูลจะตรวจสถานะเพื่อนซ้ำ เพื่อให้ทุกคนเลือกได้ว่าจะเปิดบทสนทนากับใคร</span><Link href="/messages" className="friends-side-link">เปิด Messenger <ArrowRight size={15} /></Link></section><section className="friends-side-card"><p lang="en">Build your squad</p><h2>พร้อมลงสนามกับเพื่อนหรือยัง?</h2><Link href="/groups" className="friends-side-link">ค้นหาก๊วน <ArrowRight size={15} /></Link><Link href="/guilds" className="friends-side-link">เข้าร่วม Guild <ArrowRight size={15} /></Link></section></aside>
    </div>
  </div></main>;
}
