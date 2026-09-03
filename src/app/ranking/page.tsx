import type { Metadata } from "next";
import RankingBrowser, { type RankingEntry } from "@/components/ranking-browser";
import PreviewPage from "@/components/preview-page";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Ranking | Arena-Badminton" };
export const dynamic = "force-dynamic";

function numberValue(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export default async function RankingPage() {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) return <PreviewPage kind="ranking" />;

  const { data, count, error } = await supabase
    .from("public_profiles")
    .select("id, display_name, handle, avatar_url, level, skill_bp", { count: "exact" })
    .order("skill_bp", { ascending: false })
    .order("level", { ascending: false })
    .order("exp_total", { ascending: false })
    .limit(50);

  if (error) return <PreviewPage kind="ranking" />;

  const entries: RankingEntry[] = ((data ?? []) as Array<Record<string, unknown>>).map((row, index) => ({
    id: typeof row.id === "string" ? row.id : `ranking-${index}`,
    name: typeof row.display_name === "string" && row.display_name.trim() ? row.display_name : "ผู้เล่น Arena",
    handle: typeof row.handle === "string" ? row.handle : "arena_player",
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    level: Math.min(99, Math.max(1, numberValue(row.level, 1))),
    bp: Math.max(1000, numberValue(row.skill_bp, 1000)),
    rank: index + 1,
  }));

  return <RankingBrowser entries={entries} totalPlayers={count ?? entries.length} currentUserId={user.id} />;
}
