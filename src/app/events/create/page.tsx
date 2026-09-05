import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import CreateTournamentForm from "@/components/create-tournament-form";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "สร้างกิจกรรม | Arena-Badminton" };
export const dynamic = "force-dynamic";

export default async function CreateEventPage() {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required&next=/events/create");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const { data } = await supabase
    .from("venues")
    .select("id, name, province, district, subdistrict")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(500);

  return (
    <main className="tournament-create-page">
      <div className="tournament-create-shell">
        <header className="groups-topbar">
          <Link href="/events" className="groups-back"><ArrowLeft size={17} /> กลับหน้ากิจกรรม</Link>
          <Link href="/" className="groups-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link>
          <span className="organizer-user-chip"><CalendarDays size={15} /> Organizer</span>
        </header>
        <section className="tournament-create-hero">
          <div><p lang="en">Create your arena moment</p><h1>จัดกิจกรรมในแบบของคุณ</h1><span>สร้างเวทีให้ผู้เล่นได้เจอกัน แข่งขันกัน และเติบโตไปด้วยกัน</span></div>
          <div className="tournament-create-hero__art" aria-hidden="true">🏆<i>✦</i><b>🏸</b></div>
        </section>
        <CreateTournamentForm venues={(data ?? []).map((venue) => ({
          id: venue.id,
          name: venue.name,
          province: venue.province,
          district: venue.district,
          subdistrict: venue.subdistrict,
        }))} />
      </div>
    </main>
  );
}
