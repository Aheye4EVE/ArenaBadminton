"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Award, Check, ChevronDown, Link2, Save, ShieldCheck, Sparkles } from "lucide-react";
import { awardTrophyAction, type AdminTrophyActionState } from "@/app/admin/trophies/actions";

export type AdminTrophyItem = {
  id: string;
  name: string;
  icon: string;
  rarityTier: string;
};

const rarityOptions = [
  ["white", "ขาว"],
  ["green", "เขียว"],
  ["blue", "ฟ้า"],
  ["purple", "ม่วง"],
  ["orange", "ส้ม"],
  ["red", "แดง"],
  ["gold", "ทอง"],
  ["rainbow", "รุ้ง"],
] as const;

function Feedback({ state }: { state: AdminTrophyActionState }) {
  if (!state.error && !state.message) return null;
  return <p className={`admin-trophy-feedback ${state.error ? "admin-trophy-feedback--error" : "admin-trophy-feedback--success"}`} role={state.error ? "alert" : "status"}>{state.error ? <Sparkles size={15} /> : <Check size={15} />}{state.error ?? state.message}</p>;
}

export default function AdminTrophyPanel({ items, loadError }: { items: AdminTrophyItem[]; loadError?: string }) {
  const [state, action, isPending] = useActionState(awardTrophyAction, {});

  return <main className="admin-trophy-page"><div className="admin-trophy-shell">
    <header className="admin-trophy-topbar"><Link href="/admin" className="admin-trophy-brand"><span>Arena</span><em>-Badminton</em></Link><nav><Link href="/admin/shop">Admin Shop</Link><Link href="/profile">Profile</Link></nav><span className="admin-trophy-role"><ShieldCheck size={15} /> Admin Console</span></header>
    <section className="admin-trophy-hero"><div><p lang="en">Achievement Control</p><h1>แจก Trophy ให้ผู้เล่น</h1><span>ทุกการมอบรางวัลผ่าน Admin RPC และบันทึกเป็นประวัติถาวรใน Trophy ของ User</span></div><div className="admin-trophy-hero__art" aria-hidden="true">🏆</div></section>
    <form className="admin-trophy-form" action={action}>
      <div className="admin-trophy-section-heading"><div><p lang="en">Admin-only award</p><h2>รายละเอียด Trophy</h2></div><span>ไม่สามารถลบหรือแก้ย้อนหลังจากหน้า User</span></div>
      {loadError ? <p className="admin-trophy-feedback admin-trophy-feedback--error" role="alert"><Sparkles size={15} />{loadError}</p> : null}
      <Feedback state={state} />
      <div className="admin-trophy-fields">
        <label><span>User UUID <b>*</b></span><input name="userId" placeholder="เช่น 00000000-0000-0000-0000-000000000000" required /><small>ใช้ UUID จาก Supabase Auth/Profile เท่านั้น</small></label>
        <label><span>ผูกกับ Item (ไม่บังคับ)</span><div className="admin-trophy-select"><select name="itemId" defaultValue=""><option value="">ไม่ผูก Item</option>{items.map((item) => <option value={item.id} key={item.id}>{item.icon} {item.name} · {item.rarityTier}</option>)}</select><ChevronDown size={15} /></div></label>
        <label><span>ชื่อ Trophy <b>*</b></span><input name="title" placeholder="เช่น First Win" maxLength={120} required /></label>
        <label><span>Icon <b>*</b></span><input name="icon" defaultValue="🏆" maxLength={16} required /></label>
        <label><span>Tier <b>*</b></span><div className="admin-trophy-select"><select name="rarityTier" defaultValue="white">{rarityOptions.map(([value, label]) => <option value={value} key={value}>{label} · {value}</option>)}</select><ChevronDown size={15} /></div></label>
        <label><span>แหล่งที่มา <b>*</b></span><div className="admin-trophy-select"><select name="sourceType" defaultValue="admin"><option value="admin">Admin</option><option value="system">System</option><option value="group">Group</option><option value="match">Match</option><option value="tournament">Tournament</option></select><ChevronDown size={15} /></div></label>
        <label className="admin-trophy-field--wide"><span>รายละเอียด</span><textarea name="description" placeholder="เหตุผลหรือรายละเอียดที่จะแสดงใน Trophy" maxLength={500} rows={4} /></label>
      </div>
      <aside className="admin-trophy-notice"><Award size={18} /><span>ระบบจะบันทึก User ID, Item, Tier, Source และเวลาที่แจกไว้เป็น Record ถาวร คะแนน EXP/BP จะไม่ถูกแก้ด้วยการแจก Trophy</span></aside>
      <button type="submit" className="admin-trophy-save" disabled={isPending}><Save size={16} />{isPending ? "กำลังบันทึก..." : "แจก Trophy และบันทึก Record"}</button>
    </form>
    <footer className="admin-trophy-footer"><Link href="/admin">กลับ Admin Hub</Link><span><Link2 size={13} /> Trophy record protected by RPC</span></footer>
  </div></main>;
}
