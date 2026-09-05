import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Gem, Search, ShieldCheck, UserCog, Users, WalletCards } from "lucide-react";
import { safeMediaUrl } from "@/lib/safe-media-url";

export type AdminUserListItem = {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  level: number;
  expTotal: number;
  skillBp: number;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  profileCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: "user" | "admin";
  isActive: boolean;
  gemsBalance: number;
  totalCredits: number;
  totalDebits: number;
  totalPurchases: number;
  inventoryQuantity: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "ข้อมูลล่าสุด"
    : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(date);
}

function locationLabel(user: AdminUserListItem) {
  const parts = [user.subdistrict, user.district, user.province].filter((part): part is string => Boolean(part?.trim()));
  return parts.length > 0 ? parts.join(" · ") : "ยังไม่ระบุพื้นที่";
}

function pageHref(search: string, page: number) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function UserAvatar({ user }: { user: AdminUserListItem }) {
  const avatarUrl = safeMediaUrl(user.avatarUrl);
  return <span className="admin-users-row__avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : <Users size={19} />}</span>;
}

export default function AdminUsersPanel({
  users,
  totalCount,
  page,
  pageSize,
  search,
  loadError,
}: {
  users: AdminUserListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  search: string;
  loadError?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstItem = users.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const lastItem = users.length > 0 ? firstItem + users.length - 1 : 0;

  return <main className="admin-users-page">
    <div className="admin-users-shell">
      <header className="admin-users-topbar">
        <Link href="/admin" className="admin-users-back"><ArrowLeft size={16} /> Admin Console</Link>
        <Link href="/" className="admin-users-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link>
        <span className="admin-users-role"><ShieldCheck size={15} /> User Management</span>
      </header>

      <section className="admin-users-hero">
        <div>
          <p lang="en">Member Directory · Admin</p>
          <h1>จัดการผู้ใช้งาน</h1>
          <span>ดูข้อมูลสมาชิกแบบเป็นระบบ จัดการ Gems / Point เติมเงิน และกำหนด Role โดยมี Database ตรวจสิทธิ์ซ้ำทุกครั้ง</span>
        </div>
        <div className="admin-users-hero__art" aria-hidden="true">🧑‍🤝‍🧑</div>
      </section>

      <div className="admin-users-stats">
        <div><Users size={17} /><span>สมาชิกใน Profiles</span><strong>{formatNumber(totalCount)}</strong></div>
        <div><UserCog size={17} /><span>หน้าที่กำลังดู</span><strong>{formatNumber(page)} / {formatNumber(totalPages)}</strong></div>
        <div><Gem size={17} /><span>ขอบเขตจัดการ Point</span><strong>Gems เท่านั้น</strong></div>
      </div>

      {loadError ? <p className="admin-users-feedback admin-users-feedback--error" role="alert">{loadError}</p> : null}

      <section className="admin-users-directory">
        <div className="admin-users-section-heading">
          <div><p lang="en">Member List</p><h2>สมาชิกทั้งหมด</h2></div>
          <span>{search ? `ผลการค้นหา “${search}”` : "เรียงจากสมาชิกใหม่ไปเก่า"}</span>
        </div>

        <form className="admin-users-search" method="get">
          <label><Search size={17} /><input name="q" defaultValue={search} placeholder="ค้นหาชื่อ, TAGNAME หรือ User ID" aria-label="ค้นหาสมาชิก" /></label>
          <button type="submit"><Search size={15} /> ค้นหาสมาชิก</button>
          {search ? <Link href="/admin/users" className="admin-users-clear">ล้าง</Link> : null}
        </form>

        <div className="admin-users-result-meta"><span>แสดง {formatNumber(firstItem)}–{formatNumber(lastItem)} จาก {formatNumber(totalCount)} สมาชิก</span><span>กดการ์ดเพื่อเปิดรายละเอียด</span></div>

        {users.length > 0 ? <div className="admin-users-list">
          {users.map((user) => <Link href={`/admin/users/${user.id}`} className="admin-users-row" key={user.id}>
            <UserAvatar user={user} />
            <div className="admin-users-row__identity">
              <div><strong>{user.displayName}</strong><span className={`admin-users-role-badge ${user.role === "admin" ? "admin-users-role-badge--admin" : ""}`}>{user.role === "admin" ? "Admin" : "User"}</span></div>
              <small>@{user.handle} · {locationLabel(user)}</small>
              <small>สมัครเมื่อ {formatDate(user.createdAt)} · {user.profileCompletedAt ? "Profile พร้อมใช้งาน" : "ยังกรอก Profile ไม่ครบ"}</small>
            </div>
            <div className="admin-users-row__metrics">
              <span><b>Lv.{user.level}</b><small>{formatNumber(user.expTotal)} EXP</small></span>
              <span><b>{formatNumber(user.skillBp)}</b><small>BP</small></span>
              <span className="admin-users-row__gems"><b>{formatNumber(user.gemsBalance)}</b><small>Gems / Point</small></span>
            </div>
            <ArrowRight className="admin-users-row__arrow" size={18} />
          </Link>)}
        </div> : <div className="admin-users-empty"><Users size={31} /><strong>{search ? "ไม่พบสมาชิกตามคำค้นหา" : "ยังไม่มีสมาชิกใน Profiles"}</strong><span>{search ? "ลองค้นหาด้วยชื่อ, TAGNAME หรือ User ID อื่น" : "เมื่อมีสมาชิกกรอกข้อมูล Profile แล้ว รายการจะแสดงที่นี่"}</span></div>}

        {totalPages > 1 ? <nav className="admin-users-pagination" aria-label="เปลี่ยนหน้ารายชื่อสมาชิก">
          {page > 1 ? <Link href={pageHref(search, page - 1)}><ChevronLeft size={15} /> ก่อนหน้า</Link> : <span className="admin-users-pagination__disabled"><ChevronLeft size={15} /> ก่อนหน้า</span>}
          <span>หน้า {formatNumber(page)} / {formatNumber(totalPages)}</span>
          {page < totalPages ? <Link href={pageHref(search, page + 1)}>ถัดไป <ChevronRight size={15} /></Link> : <span className="admin-users-pagination__disabled">ถัดไป <ChevronRight size={15} /></span>}
        </nav> : null}
      </section>

      <aside className="admin-users-safety"><WalletCards size={18} /><span><strong>ขอบเขตสำคัญ:</strong> Point ในหน้านี้หมายถึง Arena Gems สำหรับเติมภายในระบบเท่านั้น การเพิ่ม/หักทุกครั้งจะลง Wallet Ledger พร้อมเหตุผล ส่วน BP, EXP และ Trophy ไม่สามารถแก้จากหน้านี้ และยังคงใช้กติกาการแข่งขัน/ระบบที่กำหนดไว้</span></aside>
      <footer className="admin-users-footer"><Link href="/admin">กลับ Admin Console</Link><Link href="/profile">กลับ Profile</Link><span>Protected by Supabase RPC + RLS</span></footer>
    </div>
  </main>;
}
