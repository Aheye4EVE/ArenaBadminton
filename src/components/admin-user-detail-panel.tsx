"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { Activity, ArrowLeft, CalendarDays, Check, CircleAlert, CircleCheck, Gem, History, KeyRound, LockKeyhole, Mail, MapPin, Package, Plus, ShieldCheck, Sparkles, UserCog, Users, WalletCards } from "lucide-react";
import { adjustUserGemsAction, setUserRoleAction, type AdminUsersActionState } from "@/app/admin/users/actions";
import { safeMediaUrl } from "@/lib/safe-media-url";

export type AdminUserDetail = {
  id: string;
  email: string | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  bio: string | null;
  level: number;
  expTotal: number;
  skillBp: number;
  rankTier: number;
  rankName: string;
  rankColor: string;
  addressLine: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  postalCode: string | null;
  profileCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: "user" | "admin";
  isActive: boolean;
  gemsBalance: number;
  totalCredits: number;
  totalDebits: number;
  totalPurchases: number;
  inventoryItemTypes: number;
  inventoryQuantity: number;
  lastWalletActivity: string | null;
};

export type AdminWalletLedgerItem = {
  id: string;
  transactionType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceText: string;
  createdAt: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string | null, withTime = false) {
  if (!value) return "ยังไม่มีข้อมูล";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "ข้อมูลล่าสุด"
    : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}), timeZone: "Asia/Bangkok" }).format(date);
}

function locationLabel(detail: AdminUserDetail) {
  const parts = [detail.subdistrict, detail.district, detail.province].filter((part): part is string => Boolean(part?.trim()));
  return parts.length > 0 ? parts.join(" · ") : "ยังไม่ระบุพื้นที่";
}

function feedback(state: AdminUsersActionState) {
  if (!state.error && !state.message) return null;
  return <p className={`admin-user-feedback ${state.error ? "admin-user-feedback--error" : "admin-user-feedback--success"}`} role={state.error ? "alert" : "status"}>{state.error ? <CircleAlert size={16} /> : <Check size={16} />}{state.error ?? state.message}</p>;
}

function transactionLabel(type: string) {
  if (type === "admin_credit") return "เพิ่มโดย Admin";
  if (type === "admin_debit") return "หักโดย Admin";
  if (type === "purchase") return "ซื้อ Item";
  if (type === "refund") return "คืน Gems";
  return "ธุรกรรมระบบ";
}

function transactionClass(type: string) {
  if (type === "admin_debit") return "admin-user-ledger-row--debit";
  if (type === "purchase") return "admin-user-ledger-row--purchase";
  if (type === "refund") return "admin-user-ledger-row--refund";
  return "admin-user-ledger-row--credit";
}

function Avatar({ detail }: { detail: AdminUserDetail }) {
  const avatarUrl = safeMediaUrl(detail.avatarUrl);
  return <span className="admin-user-detail-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : <Users size={25} />}</span>;
}

function Stat({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return <div className="admin-user-stat"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></div>;
}

export default function AdminUserDetailPanel({
  detail,
  ledger,
  requestKey,
  isSelf,
  loadError,
}: {
  detail: AdminUserDetail;
  ledger: AdminWalletLedgerItem[];
  requestKey: string;
  isSelf: boolean;
  loadError?: string;
}) {
  const [roleState, roleFormAction, isChangingRole] = useActionState(setUserRoleAction, {});
  const [gemsState, gemsFormAction, isAdjustingGems] = useActionState(adjustUserGemsAction, {});
  const avatarUrl = safeMediaUrl(detail.avatarUrl);

  return <main className="admin-users-page admin-user-detail-page">
    <div className="admin-users-shell admin-user-detail-shell">
      <header className="admin-users-topbar">
        <Link href="/admin/users" className="admin-users-back"><ArrowLeft size={16} /> รายชื่อสมาชิก</Link>
        <Link href="/" className="admin-users-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link>
        <span className="admin-users-role"><ShieldCheck size={15} /> User Management</span>
      </header>

      <section className="admin-user-detail-hero">
        <div className="admin-user-detail-hero__identity"><Avatar detail={detail} /><div><p lang="en">Member Profile · Admin View</p><h1>{detail.displayName}</h1><span>@{detail.handle} · User ID <code>{detail.id}</code></span></div></div>
        <div className="admin-user-detail-hero__status"><span className={`admin-users-role-badge ${detail.role === "admin" ? "admin-users-role-badge--admin" : ""}`}>{detail.role === "admin" ? "Admin" : "User ปกติ"}</span><small>{detail.isActive ? "บัญชีพร้อมใช้งาน" : "ยังไม่มีสิทธิ์ Admin"}</small></div>
      </section>

      {loadError ? <p className="admin-users-feedback admin-users-feedback--error" role="alert">{loadError}</p> : null}

      <div className="admin-user-detail-grid">
        <section className="admin-user-detail-card admin-user-wallet-card">
          <div className="admin-user-detail-heading"><div><p lang="en">Arena Wallet</p><h2><Gem size={19} /> Gems / Point เติมเงิน</h2></div><span className="admin-user-wallet-balance">{formatNumber(detail.gemsBalance)}</span></div>
          <p className="admin-user-wallet-caption">ยอด Point ที่ใช้ซื้อ Item ภายในระบบ · ไม่ใช่ BP และไม่มีผลต่อผลแพ้ชนะ</p>
          <div className="admin-user-wallet-stats"><Stat icon={<Plus size={15} />} label="ยอดเพิ่มสะสม" value={formatNumber(detail.totalCredits)} note="Gems" /><Stat icon={<Activity size={15} />} label="ยอดหักสะสม" value={formatNumber(detail.totalDebits)} note="Gems" /><Stat icon={<Package size={15} />} label="ซื้อ Item สำเร็จ" value={formatNumber(detail.totalPurchases)} note="รายการ" /></div>
          <form className="admin-user-adjust-form" action={gemsFormAction}>
            <input type="hidden" name="userId" value={detail.id} />
            <input type="hidden" name="idempotencyKey" value={requestKey} />
            <div className="admin-user-detail-heading admin-user-detail-heading--small"><div><p lang="en">Wallet Adjustment</p><h3>เพิ่มหรือหัก Gems</h3></div><LockKeyhole size={17} /></div>
            <div className="admin-user-adjust-fields"><label><span>จำนวน Point <b>*</b></span><input name="amount" type="number" min={-1000000000} max={1000000000} step={1} placeholder="เช่น 250 หรือ -100" required /><small>ใช้เลขบวกเพื่อเพิ่ม · เลขลบเพื่อหัก</small></label><label><span>เหตุผล / Reference <b>*</b></span><input name="reference" maxLength={160} placeholder="เช่น manual-reward-2026" required /><small>ทุกธุรกรรมจะถูกเก็บใน Wallet Ledger</small></label></div>
            <button type="submit" className="admin-user-primary-action" disabled={isAdjustingGems}><WalletCards size={16} />{isAdjustingGems ? "กำลังบันทึก..." : "บันทึกการจัดการ Point"}</button>
          </form>
          {feedback(gemsState)}
        </section>

        <section className="admin-user-detail-card admin-user-role-card">
          <div className="admin-user-detail-heading"><div><p lang="en">Access Control</p><h2><UserCog size={19} /> Role ของ User</h2></div><KeyRound size={18} /></div>
          <p className="admin-user-role-caption">กำหนดสิทธิ์จากตาราง Admin โดยตรง ไม่มีการอ่าน Role จากข้อมูลที่ User แก้เองได้</p>
          <form className="admin-user-role-form" action={roleFormAction}>
            <input type="hidden" name="userId" value={detail.id} />
            <button type="submit" name="role" value="admin" className={detail.role === "admin" ? "admin-user-role-option admin-user-role-option--active" : "admin-user-role-option"} disabled={isChangingRole}><ShieldCheck size={19} /><span><strong>Admin</strong><small>เข้าถึงพื้นที่จัดการระบบ</small></span>{detail.role === "admin" ? <CircleCheck size={18} /> : null}</button>
            <button type="submit" name="role" value="user" className={detail.role === "user" ? "admin-user-role-option admin-user-role-option--user" : "admin-user-role-option"} disabled={isChangingRole || (isSelf && detail.role === "admin")}><Users size={19} /><span><strong>User ปกติ</strong><small>ใช้งาน Arena ตามสิทธิ์สมาชิก</small></span>{detail.role === "user" ? <CircleCheck size={18} /> : null}</button>
          </form>
          {isSelf ? <p className="admin-user-self-warning"><CircleAlert size={15} /> บัญชีที่กำลังใช้งานอยู่ไม่สามารถถอดสิทธิ์ Admin ของตัวเองได้</p> : null}
          {feedback(roleState)}
          <div className="admin-user-role-note"><ShieldCheck size={16} /><span>ระบบป้องกันการถอดสิทธิ์ Admin คนสุดท้าย และบันทึกประวัติการเปลี่ยน Role ทุกครั้ง</span></div>
        </section>
      </div>

      <section className="admin-user-detail-card admin-user-profile-card">
        <div className="admin-user-detail-heading"><div><p lang="en">Profile Details</p><h2><Users size={19} /> รายละเอียดสมาชิก</h2></div><span className="admin-user-profile-id">Profile ID: {detail.id}</span></div>
        <div className="admin-user-profile-layout">
          <div className="admin-user-profile-summary"><span className="admin-user-profile-summary__avatar">{avatarUrl ? <img src={avatarUrl} alt={`รูปโปรไฟล์ของ ${detail.displayName}`} /> : <Users size={30} />}</span><strong>{detail.displayName}</strong><span>@{detail.handle}</span>{detail.bio ? <p>{detail.bio}</p> : <p className="admin-user-muted">ยังไม่มี Bio</p>}</div>
          <div className="admin-user-info-grid">
            <div><Mail size={15} /><span><small>Email</small><strong>{detail.email ?? "ยังไม่มี Email"}</strong><em className={detail.emailConfirmedAt ? "admin-user-info-ok" : "admin-user-info-pending"}>{detail.emailConfirmedAt ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}</em></span></div>
            <div><CalendarDays size={15} /><span><small>สมัครสมาชิก</small><strong>{formatDate(detail.createdAt)}</strong><em>อัปเดต {formatDate(detail.updatedAt)}</em></span></div>
            <div><MapPin size={15} /><span><small>พื้นที่ Profile</small><strong>{locationLabel(detail)}</strong><em>{detail.postalCode ? `รหัสไปรษณีย์ ${detail.postalCode}` : "ยังไม่มีรหัสไปรษณีย์"}</em></span></div>
            <div><CircleCheck size={15} /><span><small>สถานะ Profile</small><strong>{detail.profileCompletedAt ? "กรอกข้อมูลครบแล้ว" : "ยังกรอกไม่ครบ"}</strong><em>{detail.profileCompletedAt ? `เสร็จเมื่อ ${formatDate(detail.profileCompletedAt)}` : "สมาชิกสามารถกลับไปกรอกต่อได้"}</em></span></div>
          </div>
        </div>
        {detail.addressLine ? <div className="admin-user-address"><MapPin size={15} /><span><small>ที่อยู่ที่สมาชิกระบุ</small><strong>{detail.addressLine}</strong></span></div> : null}
      </section>

      <section className="admin-user-detail-card admin-user-progression-card">
        <div className="admin-user-detail-heading"><div><p lang="en">Progression Snapshot</p><h2><Sparkles size={19} /> Level, EXP และ BP</h2></div><span>BP แก้จากหน้านี้ไม่ได้</span></div>
        <div className="admin-user-progression-grid"><Stat icon={<Sparkles size={16} />} label="Level" value={`Lv.${formatNumber(detail.level)}`} note="สูงสุด Lv.99" /><Stat icon={<Activity size={16} />} label="EXP สะสม" value={formatNumber(detail.expTotal)} note="จากกิจกรรม/การแข่งขัน" /><Stat icon={<ShieldCheck size={16} />} label="Battle Point" value={formatNumber(detail.skillBp)} note={detail.rankName || `Tier ${detail.rankTier}`} /></div>
      </section>

      <section className="admin-user-detail-card admin-user-ledger-card">
        <div className="admin-user-detail-heading"><div><p lang="en">Wallet Ledger</p><h2><History size={19} /> ประวัติ Point ล่าสุด</h2></div><span>{ledger.length > 0 ? `แสดง ${formatNumber(ledger.length)} รายการล่าสุด` : "ยังไม่มีรายการ"}</span></div>
        {ledger.length > 0 ? <div className="admin-user-ledger-list">{ledger.map((entry) => <div className={`admin-user-ledger-row ${transactionClass(entry.transactionType)}`} key={entry.id}><span className="admin-user-ledger-row__icon">{entry.transactionType === "admin_debit" ? "−" : entry.transactionType === "purchase" ? "🛒" : entry.transactionType === "refund" ? "↩" : "+"}</span><div><strong>{transactionLabel(entry.transactionType)}</strong><small>{entry.referenceText} · {formatDate(entry.createdAt, true)}</small></div><span className="admin-user-ledger-row__amount">{entry.amount > 0 ? "+" : ""}{formatNumber(entry.amount)}<small>คงเหลือ {formatNumber(entry.balanceAfter)}</small></span></div>)}</div> : <div className="admin-user-ledger-empty"><History size={28} /><strong>ยังไม่มี Wallet Ledger</strong><span>เมื่อมีการซื้อ Item หรือจัดการ Gems รายการจะถูกบันทึกที่นี่</span></div>}
      </section>

      <aside className="admin-users-safety"><LockKeyhole size={18} /><span>หน้ารายละเอียดนี้เปิดเฉพาะ Admin · ข้อมูลอ่านผ่าน Supabase RPC แบบตรวจสิทธิ์ซ้ำ · การจัดการ Gems เป็นธุรกรรมแบบ idempotent เพื่อป้องกันการกดซ้ำ · BP/EXP/Trophy ไม่ถูกแก้จากเครื่องมือนี้</span></aside>
      <footer className="admin-users-footer"><Link href="/admin/users"><ArrowLeft size={14} /> กลับรายชื่อสมาชิก</Link><Link href="/admin">Admin Console</Link><span>Last wallet activity: {formatDate(detail.lastWalletActivity, true)}</span></footer>
    </div>
  </main>;
}
