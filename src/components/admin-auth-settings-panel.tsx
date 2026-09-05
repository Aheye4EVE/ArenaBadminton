"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Check, MailCheck, ShieldCheck, Sparkles } from "lucide-react";
import { updateEmailVerificationAction } from "@/app/admin/auth/actions";

function dateLabel(value: string | null) {
  if (!value) return "ยังไม่เคยเปลี่ยน";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "ข้อมูลล่าสุด" : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(date);
}

export default function AdminAuthSettingsPanel({ required, updatedAt }: { required: boolean; updatedAt: string | null }) {
  const [state, action, isPending] = useActionState(updateEmailVerificationAction, {});
  return <main className="admin-feature-page">
    <div className="admin-feature-shell">
      <header className="admin-feature-topbar"><Link href="/admin" className="admin-feature-back"><ArrowLeft size={16} /> Admin Console</Link><span className="admin-hub-role"><ShieldCheck size={15} /> Auth Control</span></header>
      <section className="admin-feature-hero"><div><p lang="en">Member Access Policy</p><h1>การยืนยัน Email</h1><span>กำหนดว่าสมาชิกใหม่ต้องเปิดอีเมลยืนยันก่อนเข้าสู่ Arena หรือไม่</span></div><div className="admin-feature-hero__icon"><MailCheck size={31} /></div></section>
      <section className="admin-auth-setting-card" aria-labelledby="admin-auth-setting-title">
        <div className="admin-auth-setting-card__topline"><div><p lang="en">Email Verification</p><h2 id="admin-auth-setting-title">สถานะปัจจุบัน: {required ? "เปิดใช้งาน" : "ปิดใช้งาน"}</h2></div><span className={required ? "admin-auth-status admin-auth-status--on" : "admin-auth-status admin-auth-status--off"}>{required ? "ON" : "OFF"}</span></div>
        <p className="admin-auth-setting-card__description">การตั้งค่านี้ใช้เป็นนโยบายของ Arena Signup และถูกบันทึกว่าใครเป็นผู้เปลี่ยนค่า ผู้สมัครผ่าน Google ยังเข้าสู่ระบบตาม OAuth ของ Provider ได้ตามปกติ</p>
        <form action={action} className="admin-auth-toggle-form">
          <button type="submit" name="emailVerificationRequired" value="true" className={required ? "admin-auth-toggle admin-auth-toggle--active" : "admin-auth-toggle"} disabled={isPending}><MailCheck size={20} /><span><strong>เปิดการยืนยัน Email</strong><small>แนะนำสำหรับ Production เพื่อยืนยันว่าอีเมลเป็นของผู้สมัครจริง</small></span>{required ? <Check size={18} /> : null}</button>
          <button type="submit" name="emailVerificationRequired" value="false" className={!required ? "admin-auth-toggle admin-auth-toggle--active admin-auth-toggle--danger" : "admin-auth-toggle"} disabled={isPending}><Sparkles size={20} /><span><strong>ปิดการยืนยัน Email</strong><small>Signup จะเข้าต่อได้เมื่อมี server-only key สำหรับ Auto Confirm</small></span>{!required ? <Check size={18} /> : null}</button>
        </form>
        {state.error ? <p className="admin-feature-feedback admin-feature-feedback--error" role="alert">{state.error}</p> : null}
        {state.message ? <p className="admin-feature-feedback" role="status"><Check size={15} /> {state.message}</p> : null}
        <div className="admin-auth-setting-card__note"><ShieldCheck size={17} /><span>เปลี่ยนค่าโดย Admin เท่านั้น · อัปเดตล่าสุด {dateLabel(updatedAt)} · ค่าตั้งต้นคือเปิด</span></div>
      </section>
      <aside className="admin-feature-safety"><ShieldCheck size={18} /><span>หมายเหตุด้านความปลอดภัย: การปิดในหน้าเว็บจะไม่แก้ Supabase Dashboard โดยตรง หากต้องการให้บัญชี Email ที่สมัครใหม่เข้าระบบได้ทันที Production ต้องมี <code>SUPABASE_SERVICE_ROLE_KEY</code> เป็น Environment ฝั่ง Server เท่านั้น</span></aside>
      <footer className="admin-feature-footer"><Link href="/admin">กลับ Admin Console</Link><Link href="/profile">กลับ Profile</Link></footer>
    </div>
  </main>;
}
