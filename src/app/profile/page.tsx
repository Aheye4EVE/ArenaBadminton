import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfileOverview from "@/components/profile-overview";
import { getAuthenticatedProfileSummary } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Profile | Arena-Badminton" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { supabase, user, profile, summary } = await getAuthenticatedProfileSummary();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at || !summary) redirect("/profile/setup");

  const { data: trophyRows } = await supabase
    .from("trophy_records")
    .select("id, title, description, icon, rarity_tier, source_type, awarded_at")
    .eq("user_id", user.id)
    .order("awarded_at", { ascending: false })
    .limit(8);

  const trophies = (trophyRows ?? []).map((row) => ({
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "Arena Trophy",
    description: typeof row.description === "string" ? row.description : "",
    icon: typeof row.icon === "string" ? row.icon : "🏆",
    rarityTier: typeof row.rarity_tier === "string" ? row.rarity_tier : "white",
    sourceType: typeof row.source_type === "string" ? row.source_type : "system",
    awardedAt: typeof row.awarded_at === "string" ? row.awarded_at : "",
  }));

  return <ProfileOverview summary={summary} province={typeof profile.province === "string" ? profile.province : null} trophies={trophies} />;
}
