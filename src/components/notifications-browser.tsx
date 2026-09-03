"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Bell, Check, CircleCheck, ExternalLink, Sparkles } from "lucide-react";
import { markNotificationReadAction, type NotificationActionState } from "@/app/notifications/actions";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "เมื่อสักครู่";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(date);
}

function Feedback({ state }: { state: NotificationActionState }) {
  if (!state.error && !state.message) return null;
  return <p className="notification-feedback" role={state.error ? "alert" : "status"}>{state.error ? <Sparkles size={14} /> : <Check size={14} />}{state.error ?? state.message}</p>;
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const [state, action, isPending] = useActionState(markNotificationReadAction, {});
  const content = <><div className="notification-row__icon"><Bell size={17} /></div><div className="notification-row__copy"><div><strong>{item.title}</strong>{!item.readAt ? <span className="notification-unread-dot" aria-label="ยังไม่ได้อ่าน" /> : null}</div><p>{item.body}</p><small>{formatDate(item.createdAt)} · {item.type}</small></div>{item.href ? <ExternalLink size={15} /> : null}</>;

  return <article className={`notification-row ${item.readAt ? "" : "notification-row--unread"}`}>
    {item.href ? <Link href={item.href} className="notification-row__link">{content}</Link> : <div className="notification-row__link notification-row__link--static">{content}</div>}
    {!item.readAt ? <form action={action}><input type="hidden" name="notificationId" value={item.id} /><button type="submit" disabled={isPending}><CircleCheck size={14} /> ทำเครื่องหมายว่าอ่านแล้ว</button></form> : null}
    <Feedback state={state} />
  </article>;
}

export default function NotificationsBrowser({ items }: { items: NotificationItem[] }) {
  const unreadCount = items.filter((item) => !item.readAt).length;
  return <main className="notifications-page"><div className="notifications-shell"><header className="notifications-topbar"><Link href="/" className="notifications-brand"><span>Arena</span><em>-Badminton</em></Link><nav aria-label="เมนูการแจ้งเตือน"><Link href="/">หน้าหลัก</Link><Link href="/groups">ก๊วน</Link><Link href="/profile">Profile</Link></nav></header><section className="notifications-hero"><div><p lang="en">Stay in the loop</p><h1>การแจ้งเตือน</h1><span>อัปเดตสำคัญจากก๊วน แมตช์ และ Community ของคุณ</span></div><div className="notifications-hero__badge"><Bell size={22} /><strong>{unreadCount}</strong><small>ยังไม่ได้อ่าน</small></div></section><section className="notifications-panel"><div className="notifications-panel__heading"><div><p lang="en">Your updates</p><h2>รายการล่าสุด</h2></div><span>{items.length} รายการ</span></div>{items.length > 0 ? <div className="notifications-list">{items.map((item) => <NotificationRow item={item} key={item.id} />)}</div> : <div className="notifications-empty"><Bell size={27} /><strong>ยังไม่มีการแจ้งเตือน</strong><span>เมื่อมีกิจกรรมใหม่ ระบบจะแจ้งให้คุณทราบที่นี่</span></div>}</section><footer className="notifications-footer"><Link href="/">Arena-Badminton</Link><span>Notifications · RLS protected</span></footer></div></main>;
}
