import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import GroupDetail from "@/components/group-detail";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "รายละเอียดก๊วน | Arena-Badminton" };
export const dynamic = "force-dynamic";

type GroupRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  location_text: string;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  min_level: number;
  max_level: number;
  play_type: string;
  entry_fee: string | number;
  status: string;
};

type PublicMemberRow = {
  user_id: string;
  membership_status: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  level: number;
};

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();

  const { data, error } = await supabase
    .from("groups")
    .select("id, owner_id, title, description, location_text, starts_at, duration_minutes, capacity, min_level, max_level, play_type, entry_fee, status")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) notFound();

  const group = data as GroupRow;
  const [membersResult, membershipResult] = await Promise.all([
    supabase.from("public_group_members").select("user_id, membership_status, display_name, handle, avatar_url, level").eq("group_id", id).order("membership_status", { ascending: true }).order("joined_at", { ascending: true }),
    supabase.from("group_members").select("membership_status").eq("group_id", id).eq("user_id", user.id).maybeSingle(),
  ]);

  return <GroupDetail group={{ id: group.id, ownerId: group.owner_id, title: group.title, description: group.description, locationText: group.location_text, startsAt: group.starts_at, durationMinutes: Number(group.duration_minutes), capacity: Number(group.capacity), minLevel: Number(group.min_level), maxLevel: Number(group.max_level), playType: group.play_type, entryFee: group.entry_fee, status: group.status }} members={(membersResult.data ?? []) as PublicMemberRow[]} membershipStatus={(membershipResult.data as { membership_status?: string } | null)?.membership_status ?? null} currentUserId={user.id} />;
}
