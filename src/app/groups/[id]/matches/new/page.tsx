import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CreateMatchForm from "@/components/create-match-form";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "จัดแมตช์ | Arena-Badminton" };
export const dynamic = "force-dynamic";

type GroupRow = {
  id: string;
  title: string;
  owner_id: string;
  status: string;
  starts_at: string;
};

type MemberRow = {
  user_id: string;
  display_name: string;
  handle: string;
  level: number;
  membership_status: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function NewMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { data: groupData, error: groupError } = await supabase
    .from("groups")
    .select("id, title, owner_id, status, starts_at")
    .eq("id", id)
    .maybeSingle();
  if (groupError || !groupData) notFound();

  const group = groupData as GroupRow;
  if (group.owner_id !== user.id) redirect(`/groups/${id}`);

  const { data: memberData } = await supabase
    .from("public_group_members")
    .select("user_id, display_name, handle, level, membership_status")
    .eq("group_id", id)
    .eq("membership_status", "registered")
    .order("display_name", { ascending: true });

  const players = (memberData ?? []) as MemberRow[];
  return (
    <main className="matches-page match-create-page">
      <div className="matches-shell">
        <header className="groups-topbar"><span className="groups-back">Organizer Hub</span><Link href="/" className="groups-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link><span className="organizer-user-chip">สร้างแมตช์</span></header>
        <section className="match-create-heading"><p lang="en">Organizer match desk</p><h1>จัดการแข่งขันในก๊วน</h1><span>เลือกผู้เล่นที่ยืนยันที่นั่งแล้ว และกำหนด Base EXP ให้รอบนี้</span></section>
        {group.status === "cancelled" || group.status === "completed" ? <div className="match-feedback match-feedback--error" role="alert">ก๊วนนี้ไม่อยู่ในสถานะที่สร้างแมตช์เพิ่มได้</div> : players.length < 2 ? <div className="match-feedback match-feedback--error" role="alert">ต้องมีสมาชิกที่ยืนยันที่นั่งอย่างน้อย 2 คนก่อนจัดแมตช์</div> : <CreateMatchForm groupId={group.id} groupTitle={group.title} players={players} ownerId={user.id} />}
      </div>
    </main>
  );
}
