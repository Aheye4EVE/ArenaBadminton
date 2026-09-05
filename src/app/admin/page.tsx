import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Award, Gem, MailCheck, Settings2, ShieldCheck, Store, Swords, Users } from "lucide-react";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Admin Console | Arena-Badminton" };
export const dynamic = "force-dynamic";

const adminTools = [
  {
    href: "/admin/guilds",
    icon: Users,
    eyebrow: "Guild Control",
    title: "ตั้งค่า Guild",
    description: "เปิด/ปิดการสร้าง Guild ฟรี กำหนดไอเทมก่อตั้ง และเพดานสมาชิกสูงสุด",
    tone: "admin-hub-card--purple",
  },
  {
    href: "/admin/shop",
    icon: Store,
    eyebrow: "Catalog & Wallet",
    title: "จัดการ Shop & Gems",
    description: "ดูแล Badge, EXP Booster, ราคา Gems และรายการเติมภายในที่มี Audit trail",
    tone: "admin-hub-card--pink",
  },
  {
    href: "/admin/bp-rules",
    icon: Swords,
    eyebrow: "Battle Rules",
    title: "ตั้งค่ากติกา Skill BP",
    description: "กำหนดกติกากลางของ BP และรักษา Floor ขั้นต่ำ 1,000 ให้ผู้เล่นทุกคน",
    tone: "admin-hub-card--purple",
  },
  {
    href: "/admin/trophies",
    icon: Award,
    eyebrow: "Achievement Control",
    title: "แจก Trophy ให้ผู้เล่น",
    description: "มอบ Badge/Trophy ผ่าน RPC พร้อมเก็บ Record ถาวรและตรวจสอบย้อนหลังได้",
    tone: "admin-hub-card--gold",
  },
  {
    href: "/admin/moderation",
    icon: AlertTriangle,
    eyebrow: "Safety Queue",
    title: "ตรวจสอบ Report",
    description: "ดูแลรายงานจาก Community, สนาม, Guild และ Marketplace พร้อมบันทึกผลการตรวจสอบ",
    tone: "admin-hub-card--gold",
  },
  {
    href: "/admin/auth",
    icon: MailCheck,
    eyebrow: "Member Access",
    title: "ยืนยัน Email",
    description: "เปิดหรือปิดการยืนยัน Email สำหรับสมาชิกใหม่ พร้อมบันทึกการเปลี่ยนแปลงโดย Admin",
    tone: "admin-hub-card--pink",
  },
] as const;

export default async function AdminPage() {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");

  const { data: isAdmin, error } = await supabase.rpc("is_current_user_admin");
  if (error || isAdmin !== true) notFound();

  return (
    <main className="admin-hub-page">
      <div className="admin-hub-shell">
        <header className="admin-hub-topbar">
          <Link href="/" className="admin-hub-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link>
          <span className="admin-hub-role"><ShieldCheck size={15} /> Admin Console</span>
        </header>

        <section className="admin-hub-hero">
          <div>
            <p lang="en">Arena Control Center</p>
            <h1>พื้นที่จัดการระบบ</h1>
            <span>ตั้งค่าระบบกลาง ดูแลร้านค้า และควบคุมกติกาการแข่งขันสำหรับผู้ดูแลที่ได้รับสิทธิ์เท่านั้น</span>
          </div>
          <div className="admin-hub-hero__art" aria-hidden="true">🛡️</div>
        </section>

        <div className="admin-hub-stats">
          <div><ShieldCheck size={16} /><span>สิทธิ์ปัจจุบัน</span><strong>Admin</strong></div>
          <div><Gem size={16} /><span>Wallet / Shop</span><strong>Protected</strong></div>
          <div><Settings2 size={16} /><span>กติกา BP</span><strong>Database RPC</strong></div>
        </div>

        <section className="admin-hub-tools" aria-label="เครื่องมือผู้ดูแลระบบ">
          {adminTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href} className={`admin-hub-card ${tool.tone}`}>
                <span className="admin-hub-card__icon"><Icon size={22} /></span>
                <span className="admin-hub-card__copy"><small lang="en">{tool.eyebrow}</small><strong>{tool.title}</strong><span>{tool.description}</span></span>
                <ArrowRight className="admin-hub-card__arrow" size={19} />
              </Link>
            );
          })}
        </section>

        <aside className="admin-hub-safety"><ShieldCheck size={18} /><span>หน้านี้เป็นเพียงทางเข้าเครื่องมือ Admin การตรวจสิทธิ์จะทำซ้ำที่ Supabase RPC ทุกครั้ง และผู้ใช้ทั่วไปจะไม่สามารถอ่านหรือแก้ไขข้อมูล Admin ได้</span></aside>
        <footer className="admin-hub-footer"><Link href="/profile">กลับ Profile</Link><Link href="/">กลับหน้าหลัก</Link></footer>
      </div>
    </main>
  );
}
