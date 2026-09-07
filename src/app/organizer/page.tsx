import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CreateGroupForm from "@/components/create-group-form";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Organizer Hub | Arena-Badminton" };
export const dynamic = "force-dynamic";

function todayInBangkok() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function OrganizerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const rawSearchParams = await searchParams;
  const requestedVenueId =
    firstParam(rawSearchParams, "venueId") ||
    firstParam(rawSearchParams, "venue");
  let initialVenue: {
    id: string;
    name: string;
    province: string | null;
    district: string | null;
    subdistrict: string | null;
    address: string | null;
  } | null = null;
  let requestedVenueUnavailable = false;
  if (uuidPattern.test(requestedVenueId)) {
    const venueResult = await supabase
      .from("venues")
      .select("id, name, province, district, subdistrict, address")
      .eq("id", requestedVenueId)
      .eq("status", "active")
      .maybeSingle();
    if (venueResult.data) initialVenue = venueResult.data;
    else requestedVenueUnavailable = true;
  }

  let guilds: Array<{
    id: string;
    name: string;
    level: number;
    max_members: number;
  }> = [];
  const guildMemberships = await supabase
    .from("guild_members")
    .select("guild_id, role")
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .in("role", ["guild_master", "officer"]);
  const guildIds = (guildMemberships.data ?? []).map(
    (membership) => membership.guild_id,
  );
  if (guildIds.length > 0) {
    const guildResult = await supabase
      .from("guilds")
      .select("id, name, level, max_members")
      .in("id", guildIds)
      .eq("status", "active")
      .order("name", { ascending: true });
    guilds = guildResult.data ?? [];
  }

  return (
    <main className="groups-page organizer-live-page">
      <div className="groups-shell">
        <header className="groups-topbar">
          <Link
            href="/"
            className="groups-brand"
            aria-label="กลับหน้าหลัก Arena-Badminton"
          >
            <span>Arena</span>
            <em>-Badminton</em>
          </Link>
          <span className="organizer-user-chip">🧑🏻 {profile.display_name}</span>
        </header>

        <section className="organizer-live-hero">
          <div>
            <p lang="en">Organizer Hub</p>
            <h1>สร้างก๊วนในแบบของคุณ</h1>
            <span>คุณเป็นคนกำหนดสนาม เวลา ระดับฝีมือ และบรรยากาศของก๊วน</span>
          </div>
          <div className="organizer-live-hero__art" aria-hidden="true">
            ✨<b>🏸</b>
          </div>
        </section>

        <div className="organizer-live-layout">
          <section className="organizer-live-panel">
            <CreateGroupForm
              minimumDate={todayInBangkok()}
              initialVenue={initialVenue}
              guilds={guilds}
            />
            {requestedVenueUnavailable ? (
              <p className="group-form__location-help">
                สนามที่แนบมากับลิงก์ไม่พร้อมใช้งานแล้ว
                กรุณาค้นหาสนามใหม่จากตัวเลือก
              </p>
            ) : null}
          </section>
          <aside className="organizer-live-sidebar">
            <section className="groups-side-card organizer-side-card">
              <div className="organizer-side-card__badge">LIVE GROUP</div>
              <h2>ก๊วนของคุณจะเป็นพื้นที่เปิด</h2>
              <p>
                เว็บทำหน้าที่เป็นพื้นที่กลาง ใครจะจัดก๊วนแบบไหนก็ออกแบบได้เอง
                ภายใต้กติกาความปลอดภัยของระบบ
              </p>
              <div className="organizer-side-stat">
                <span>เจ้าของก๊วน</span>
                <strong>{profile.display_name}</strong>
              </div>
              <div className="organizer-side-stat">
                <span>สถานะบัญชี</span>
                <strong className="organizer-side-stat__ready">
                  พร้อมจัดก๊วน ✓
                </strong>
              </div>
            </section>
            <section className="groups-side-card">
              <h2>ระบบจะช่วยจัดการให้</h2>
              <ul className="groups-rules">
                <li>
                  <span>01</span>
                  <p>เพิ่มผู้จัดเป็นสมาชิกอัตโนมัติ</p>
                </li>
                <li>
                  <span>02</span>
                  <p>กันที่นั่งและคิวรอแบบ atomic</p>
                </li>
                <li>
                  <span>03</span>
                  <p>สมาชิกยกเลิกเองได้ ผู้จัดยกเลิกก๊วนได้</p>
                </li>
              </ul>
            </section>
            <section className="groups-side-card groups-side-card--tip">
              <p>
                เลือก Guild ที่คุณดูแลเพื่อผูกกับก๊วนได้ ส่วน EXP/BP ของ Match
                ยังใช้กติกากลางจากระบบและผู้จัดไม่สามารถแก้ BP โดยตรง
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
