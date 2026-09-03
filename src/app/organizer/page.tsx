import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CreateGroupForm from "@/components/create-group-form";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { shouldShowQaData } from "@/lib/config";

export const metadata: Metadata = { title: "Organizer Hub | Arena-Badminton" };
export const dynamic = "force-dynamic";

function todayInBangkok() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function OrganizerPage() {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  let venues: Array<{
    id: string;
    name: string;
    province: string | null;
    district: string | null;
    subdistrict: string | null;
    address: string | null;
  }> = [];
  let venuesUnavailable = false;
  let venuesQuery = supabase
    .from("venues")
    .select("id, name, province, district, subdistrict, address")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(200);
  if (!shouldShowQaData()) venuesQuery = venuesQuery.not("name", "like", "[QA ONLY]%");
  const venuesResult = await venuesQuery;
  if (venuesResult.error) {
    venuesUnavailable = true;
  } else {
    venues = venuesResult.data ?? [];
  }

  return (
    <main className="groups-page organizer-live-page">
      <div className="groups-shell">
        <header className="groups-topbar">
          <Link href="/" className="groups-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link>
          <nav className="groups-nav" aria-label="เมนู Organizer"><Link href="/groups">ก๊วนทั้งหมด</Link><Link className="groups-nav__active" href="/organizer">สร้างก๊วน</Link><Link href="/profile">Profile</Link></nav>
          <span className="organizer-user-chip">🧑🏻 {profile.display_name}</span>
        </header>

        <section className="organizer-live-hero"><div><p lang="en">Organizer Hub</p><h1>สร้างก๊วนในแบบของคุณ</h1><span>คุณเป็นคนกำหนดสนาม เวลา ระดับฝีมือ และบรรยากาศของก๊วน</span></div><div className="organizer-live-hero__art" aria-hidden="true">✨<b>🏸</b></div></section>

        <div className="organizer-live-layout">
          <section className="organizer-live-panel">
            <CreateGroupForm minimumDate={todayInBangkok()} venues={venues} />
            {venuesUnavailable ? <p className="group-form__location-help">ไม่สามารถโหลดรายชื่อสนามได้ชั่วคราว คุณยังกรอกรายละเอียดสถานที่ด้วยตัวเองได้</p> : null}
          </section>
          <aside className="organizer-live-sidebar">
            <section className="groups-side-card organizer-side-card"><div className="organizer-side-card__badge">LIVE GROUP</div><h2>ก๊วนของคุณจะเป็นพื้นที่เปิด</h2><p>เว็บทำหน้าที่เป็นพื้นที่กลาง ใครจะจัดก๊วนแบบไหนก็ออกแบบได้เอง ภายใต้กติกาความปลอดภัยของระบบ</p><div className="organizer-side-stat"><span>เจ้าของก๊วน</span><strong>{profile.display_name}</strong></div><div className="organizer-side-stat"><span>สถานะบัญชี</span><strong className="organizer-side-stat__ready">พร้อมจัดก๊วน ✓</strong></div></section>
            <section className="groups-side-card"><h2>ระบบจะช่วยจัดการให้</h2><ul className="groups-rules"><li><span>01</span><p>เพิ่มผู้จัดเป็นสมาชิกอัตโนมัติ</p></li><li><span>02</span><p>กันที่นั่งและคิวรอแบบ atomic</p></li><li><span>03</span><p>สมาชิกยกเลิกเองได้ ผู้จัดยกเลิกก๊วนได้</p></li></ul></section>
            <section className="groups-side-card groups-side-card--tip"><p>รางวัล EXP/BP และการแข่งขันจะต่อยอดใน Phase ถัดไป โดยผู้จัดจะไม่สามารถแก้ BP ของระบบโดยตรง</p></section>
          </aside>
        </div>
      </div>
    </main>
  );
}
