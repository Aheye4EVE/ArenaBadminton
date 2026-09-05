"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Check, Heart, ImagePlus, LoaderCircle, MessageCircle, Plus, Send, ShieldAlert, Sparkles, Trophy, UserRound } from "lucide-react";
import {
  createCommentAction,
  createPostAction,
  toggleLikeAction,
  type CommunityActionState,
} from "@/app/community/actions";

export type CommunityProfile = {
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  level: number;
};

export type CommunityComment = {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  author: CommunityProfile;
};

export type CommunityPost = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  author: CommunityProfile;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  comments: CommunityComment[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "เมื่อสักครู่";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(date);
}

function Avatar({ profile }: { profile: CommunityProfile }) {
  if (profile.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="community-avatar" src={profile.avatarUrl} alt={`รูปโปรไฟล์ของ ${profile.displayName}`} />;
  }
  return <span className="community-avatar community-avatar--fallback" aria-label={`รูปโปรไฟล์ของ ${profile.displayName}`} role="img"><UserRound size={20} /></span>;
}

function Feedback({ state }: { state: CommunityActionState }) {
  if (!state.error && !state.message) return null;
  return <p className={`community-feedback ${state.error ? "community-feedback--error" : "community-feedback--success"}`} role={state.error ? "alert" : "status"}>{state.error ? <Sparkles size={15} /> : <Check size={15} />}{state.error ?? state.message}</p>;
}

function PostCard({ post }: { post: CommunityPost }) {
  const [likeState, likeAction, isLiking] = useActionState(toggleLikeAction, {});
  const [commentState, commentAction, isCommenting] = useActionState(createCommentAction, {});

  return <article className="community-live-post">
    <header className="community-live-post__header"><Avatar profile={post.author} /><div><strong>{post.author.displayName}</strong><small>@{post.author.handle.replace(/^@/, "")} · Level {post.author.level} · {formatDate(post.createdAt)}</small></div><span className="community-live-post__badge">Community</span></header>
    <p className="community-live-post__body">{post.body}</p>
    {post.imageUrl ? <div className="community-live-post__image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={post.imageUrl} alt="ภาพประกอบโพสต์จาก Arena" />
    </div> : null}
    <div className="community-live-post__actions">
      <form action={likeAction}><input type="hidden" name="postId" value={post.id} /><button type="submit" className={post.isLiked ? "community-post-action community-post-action--liked" : "community-post-action"} disabled={isLiking}><Heart size={16} fill={post.isLiked ? "currentColor" : "none"} /> {post.likeCount}</button></form>
      <span className="community-post-action"><MessageCircle size={16} /> {post.commentCount}</span>
      <Link href="/shop" className="community-post-action"><Trophy size={16} /> ส่ง Trophy</Link>
      <Link href={`/moderation/report?targetType=post&targetId=${post.id}&returnTo=/community`} className="community-post-action" aria-label="รายงานโพสต์นี้"><ShieldAlert size={16} /> รายงาน</Link>
    </div>
    <Feedback state={likeState} />
    {post.comments.length > 0 ? <div className="community-comments">{post.comments.map((comment) => <div className="community-comment" key={comment.id}><Avatar profile={comment.author} /><div><strong>{comment.author.displayName}</strong><p>{comment.body}</p><small>{formatDate(comment.createdAt)}</small></div></div>)}</div> : null}
    <form className="community-comment-form" action={commentAction}><input type="hidden" name="postId" value={post.id} /><input name="body" placeholder="แสดงความคิดเห็นกับเพื่อน ๆ" maxLength={1000} required /><button type="submit" aria-label="ส่งความคิดเห็น" disabled={isCommenting}><Send size={15} /></button></form>
    <Feedback state={commentState} />
  </article>;
}

export default function CommunityBrowser({ posts, currentProfile, signedIn }: { posts: CommunityPost[]; currentProfile: CommunityProfile | null; signedIn: boolean }) {
  const [postState, postAction, isPosting] = useActionState(createPostAction, {});
  const [imageUrl, setImageUrl] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadImage(file: File) {
    setUploadMessage("");
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setUploadMessage("รองรับเฉพาะไฟล์รูปภาพขนาดไม่เกิน 10 MB");
      return;
    }

    setIsUploading(true);
    try {
      const presignResponse = await fetch("/api/media/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) });
      const presign = await presignResponse.json() as { uploadUrl?: string; publicUrl?: string | null; requiredHeaders?: Record<string, string>; message?: string };
      if (!presignResponse.ok || !presign.uploadUrl || !presign.publicUrl) throw new Error(presign.message ?? "ยังไม่ได้ตั้งค่า Public URL ของ R2");
      const uploadResponse = await fetch(presign.uploadUrl, { method: "PUT", headers: presign.requiredHeaders, body: file });
      if (!uploadResponse.ok) throw new Error("อัปโหลดรูปไม่สำเร็จ");
      setImageUrl(presign.publicUrl);
      setUploadMessage("แนบรูปพร้อมโพสต์แล้ว");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setIsUploading(false);
    }
  }

  return <main className="community-live-page">
    <div className="community-live-shell">
      <header className="community-live-topbar"><Link href="/" className="community-live-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link><nav aria-label="เมนู Community"><Link href="/groups">ก๊วน</Link><Link href="/events">กิจกรรม</Link><Link className="community-live-nav__active" href="/community">Community</Link><Link href="/profile">Profile</Link></nav><Link href={signedIn ? "/profile" : "/auth/login"} className="community-live-user">{currentProfile ? <><Avatar profile={currentProfile} /><span>Lv.{currentProfile.level}</span></> : <><UserRound size={17} /><span>เข้าสู่ระบบ</span></>}</Link></header>
      <section className="community-live-hero"><div><p lang="en">Arena Community</p><h1>คอมมูนิตี้คนรักแบด</h1><span>แชร์โมเมนต์ หา Partner และชวนเพื่อนลงสนามด้วยกัน</span></div><div className="community-live-hero__art" aria-hidden="true">💬<i>✦</i>🏸</div></section>
      <div className="community-live-layout">
        <section className="community-live-main">
          {signedIn ? <form className="community-composer" action={postAction}><div className="community-composer__identity">{currentProfile ? <Avatar profile={currentProfile} /> : <span className="community-avatar community-avatar--fallback"><UserRound size={20} /></span>}<span>วันนี้ตีเป็นอย่างไรบ้าง?</span></div><textarea name="body" placeholder="แชร์เรื่องราวการตีแบดวันนี้..." maxLength={2000} required /><input type="hidden" name="imageUrl" value={imageUrl} /><div className="community-composer__footer"><div className="community-composer__tools"><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} /><button type="button" className="community-attach-action" onClick={() => fileInputRef.current?.click()} disabled={isUploading}><ImagePlus size={16} /> {isUploading ? <><LoaderCircle className="community-spin" size={15} /> กำลังอัปโหลด</> : imageUrl ? "เปลี่ยนรูป" : "แนบรูป"}</button><small>{uploadMessage || "รองรับ JPG, PNG, WebP, GIF ไม่เกิน 10 MB"}</small></div><button type="submit" className="community-primary-action" disabled={isPosting || isUploading}><Plus size={16} />{isPosting ? "กำลังโพสต์..." : "โพสต์เรื่องราว"}</button></div><Feedback state={postState} /></form> : <section className="community-login-prompt"><Sparkles size={22} /><div><strong>เข้าร่วม Community ของ Arena</strong><span>เข้าสู่ระบบเพื่อสร้างโพสต์ กด Like และคุยกับเพื่อนนักแบด</span></div><Link href="/auth/login" className="community-primary-action">เข้าสู่ระบบ</Link></section>}
          <div className="community-live-heading"><div><p lang="en">Fresh from the court</p><h2>เรื่องราวล่าสุด</h2></div><span>{posts.length} โพสต์</span></div>
          {posts.length > 0 ? <div className="community-live-feed">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div> : <div className="community-empty"><span>🏸</span><strong>ยังไม่มีโพสต์ใน Community</strong><p>เป็นคนแรกที่แชร์โมเมนต์จากสนามของคุณ</p></div>}
        </section>
        <aside className="community-live-sidebar"><section className="community-side-card community-side-card--tip"><Trophy size={20} /><p lang="en">Play, share, level up</p><h2>ทุกแมตช์มีเรื่องเล่า</h2><span>แชร์ผลแข่ง ภาพบรรยากาศ หรือหา Partner คู่ใหม่ได้ที่นี่</span></section><section className="community-side-card"><h2>Community guidelines</h2><ul><li><span>01</span>คุยกันด้วยความสุภาพ</li><li><span>02</span>แชร์เฉพาะภาพที่มีสิทธิ์ใช้งาน</li><li><span>03</span>กดรายงานเมื่อพบเนื้อหาไม่เหมาะสม</li></ul></section><Link href="/groups" className="community-side-link">ค้นหาก๊วนเพื่อชวนเพื่อน <Sparkles size={16} /></Link></aside>
      </div>
      <footer className="community-live-footer"><Link href="/">Arena-Badminton</Link><span>Community · Posts / Comments / Likes</span></footer>
    </div>
  </main>;
}
