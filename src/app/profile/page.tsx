import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfileOverview from "@/components/profile-overview";
import type { ProfileStatus } from "@/components/profile-status-feed";
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

  const { data: statusRows } = await supabase
    .from("social_posts")
    .select("id, body, image_url, created_at")
    .eq("user_id", user.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(10);
  const statusesRaw = (statusRows ?? []) as Array<Record<string, unknown>>;
  const statusIds = statusesRaw.map((row) => typeof row.id === "string" ? row.id : "").filter(Boolean);
  const [statusLikes, statusComments, myStatusLikes] = await Promise.all([
    statusIds.length > 0 ? supabase.from("social_post_likes").select("post_id").in("post_id", statusIds) : Promise.resolve({ data: [] }),
    statusIds.length > 0 ? supabase.from("social_post_comments").select("post_id").in("post_id", statusIds).eq("status", "published") : Promise.resolve({ data: [] }),
    statusIds.length > 0 ? supabase.from("social_post_likes").select("post_id").eq("user_id", user.id).in("post_id", statusIds) : Promise.resolve({ data: [] }),
  ]);
  const likeCounts = new Map<string, number>();
  for (const like of (statusLikes.data ?? []) as Array<Record<string, unknown>>) {
    const id = typeof like.post_id === "string" ? like.post_id : "";
    if (id) likeCounts.set(id, (likeCounts.get(id) ?? 0) + 1);
  }
  const commentCounts = new Map<string, number>();
  for (const comment of (statusComments.data ?? []) as Array<Record<string, unknown>>) {
    const id = typeof comment.post_id === "string" ? comment.post_id : "";
    if (id) commentCounts.set(id, (commentCounts.get(id) ?? 0) + 1);
  }
  const myLikes = new Set((myStatusLikes.data ?? []).map((like) => typeof like.post_id === "string" ? like.post_id : ""));
  const statuses: ProfileStatus[] = statusesRaw.flatMap((row) => {
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) return [];
    return [{ id, body: typeof row.body === "string" ? row.body : "", imageUrl: typeof row.image_url === "string" && /^https:\/\//i.test(row.image_url) ? row.image_url : null, createdAt: typeof row.created_at === "string" ? row.created_at : "", likeCount: likeCounts.get(id) ?? 0, commentCount: commentCounts.get(id) ?? 0, isLiked: myLikes.has(id) }];
  });

  return <ProfileOverview summary={summary} province={typeof profile.province === "string" ? profile.province : null} trophies={trophies} statuses={statuses} />;
}
