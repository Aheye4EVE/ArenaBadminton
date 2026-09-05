"use client";

import { useActionState } from "react";
import { Check, Heart, MessageCircle, Plus, Sparkles, UserRound } from "lucide-react";
import { createPostAction, toggleLikeAction, type CommunityActionState } from "@/app/community/actions";

export type ProfileStatus = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "เมื่อสักครู่" : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(date);
}

function Feedback({ state }: { state: CommunityActionState }) {
  if (!state.error && !state.message) return null;
  return <p className={`profile-status-feedback ${state.error ? "profile-status-feedback--error" : "profile-status-feedback--success"}`} role={state.error ? "alert" : "status"}>{state.error ? <Sparkles size={14} /> : <Check size={14} />}{state.error ?? state.message}</p>;
}

function StatusCard({ status }: { status: ProfileStatus }) {
  const [likeState, likeAction, isLiking] = useActionState(toggleLikeAction, {});
  return <article className="profile-status-card">
    <div className="profile-status-card__topline"><span className="profile-status-card__icon"><UserRound size={17} /></span><div><strong>สถานะของฉัน</strong><small>{dateLabel(status.createdAt)}</small></div><span className="profile-status-card__tag">Arena Feed</span></div>
    <p>{status.body}</p>
    {status.imageUrl ? <div className="profile-status-card__image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={status.imageUrl} alt="ภาพประกอบสถานะของฉัน" />
    </div> : null}
    <div className="profile-status-card__actions"><form action={likeAction}><input type="hidden" name="postId" value={status.id} /><button type="submit" className={status.isLiked ? "profile-status-action profile-status-action--liked" : "profile-status-action"} disabled={isLiking}><Heart size={15} fill={status.isLiked ? "currentColor" : "none"} /> {status.likeCount}</button></form><span className="profile-status-action"><MessageCircle size={15} /> {status.commentCount} ความคิดเห็น</span></div>
    <Feedback state={likeState} />
  </article>;
}

export default function ProfileStatusFeed({ statuses }: { statuses: ProfileStatus[] }) {
  const [postState, postAction, isPosting] = useActionState(createPostAction, {});
  return <section className="profile-status-section" aria-labelledby="profile-status-title">
    <div className="profile-status-section__heading"><div><p lang="en">My Arena Status</p><h2 id="profile-status-title">สถานะของฉัน</h2></div><span>{statuses.length} โพสต์</span></div>
    <form className="profile-status-composer" action={postAction}><div className="profile-status-composer__label"><Sparkles size={16} /> แชร์เรื่องราวจากสนามของคุณ</div><textarea name="body" placeholder="วันนี้ตีเป็นอย่างไรบ้าง? เล่าให้เพื่อน ๆ ใน Arena ฟังได้เลย..." maxLength={2000} required /><div className="profile-status-composer__footer"><small>โพสต์นี้จะแสดงใน Community Feed ด้วย</small><button type="submit" className="profile-status-submit" disabled={isPosting}><Plus size={15} /> {isPosting ? "กำลังโพสต์..." : "โพสต์สถานะ"}</button></div><Feedback state={postState} /></form>
    {statuses.length > 0 ? <div className="profile-status-list">{statuses.map((status) => <StatusCard status={status} key={status.id} />)}</div> : <div className="profile-status-empty"><span>💬</span><strong>ยังไม่มีสถานะของคุณ</strong><p>แชร์โมเมนต์แรก แล้วชวนเพื่อนมาคุยกันใน Community</p></div>}
  </section>;
}
