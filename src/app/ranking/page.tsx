import type { Metadata } from "next";
import RankingBrowser, { type RankingEntry, type RankingFilters } from "@/components/ranking-browser";
import PreviewPage from "@/components/preview-page";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Ranking | Arena-Badminton" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function clean(value: string, max = 80) {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function numberValue(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export default async function RankingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters: RankingFilters = {
    q: clean(firstParam(params, "q"), 120),
    province: clean(firstParam(params, "province")),
    district: clean(firstParam(params, "district")),
    subdistrict: clean(firstParam(params, "subdistrict")),
    sort: ["bp", "win_rate", "matches"].includes(firstParam(params, "sort")) ? firstParam(params, "sort") as RankingFilters["sort"] : "bp",
  };
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) return <PreviewPage kind="ranking" />;

  const { data, count, error } = await supabase
    .from("player_ranking_stats")
    .select("user_id, display_name, handle, avatar_url, level, exp_total, skill_bp, province, district, subdistrict, matches_played, wins, losses, win_rate", { count: "exact" })
    .limit(500);

  if (error) return <RankingBrowser entries={[]} totalPlayers={0} currentUserId={user.id} filters={filters} loadError="กรุณาลองใหม่อีกครั้ง หรือตรวจสอบการเชื่อมต่อบัญชี" />;

  const matchingRows = ((data ?? []) as Array<Record<string, unknown>>).filter((row) => {
    const q = filters.q.toLowerCase();
    const matchesQuery = !q || [row.display_name, row.handle].some((value) => typeof value === "string" && value.toLowerCase().includes(q));
    const matchesProvince = !filters.province || row.province === filters.province;
    const matchesDistrict = !filters.district || row.district === filters.district;
    const matchesSubdistrict = !filters.subdistrict || row.subdistrict === filters.subdistrict;
    return matchesQuery && matchesProvince && matchesDistrict && matchesSubdistrict;
  }).sort((left, right) => {
    if (filters.sort === "win_rate") return numberValue(right.win_rate) - numberValue(left.win_rate) || numberValue(right.matches_played) - numberValue(left.matches_played) || numberValue(right.skill_bp) - numberValue(left.skill_bp);
    if (filters.sort === "matches") return numberValue(right.matches_played) - numberValue(left.matches_played) || numberValue(right.win_rate) - numberValue(left.win_rate) || numberValue(right.skill_bp) - numberValue(left.skill_bp);
    return numberValue(right.skill_bp) - numberValue(left.skill_bp) || numberValue(right.matches_played) - numberValue(left.matches_played) || numberValue(right.win_rate) - numberValue(left.win_rate) || numberValue(right.level) - numberValue(left.level) || numberValue(right.exp_total) - numberValue(left.exp_total);
  });
  const entries: RankingEntry[] = matchingRows.slice(0, 100).map((row, index) => ({
    id: typeof row.user_id === "string" ? row.user_id : `ranking-${index}`,
    name: typeof row.display_name === "string" && row.display_name.trim() ? row.display_name : "ผู้เล่น Arena",
    handle: typeof row.handle === "string" ? row.handle : "arena_player",
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    level: Math.min(99, Math.max(1, numberValue(row.level, 1))),
    bp: Math.max(1000, numberValue(row.skill_bp, 1000)),
    province: typeof row.province === "string" ? row.province : null,
    district: typeof row.district === "string" ? row.district : null,
    subdistrict: typeof row.subdistrict === "string" ? row.subdistrict : null,
    matchesPlayed: Math.max(0, numberValue(row.matches_played)),
    wins: Math.max(0, numberValue(row.wins)),
    losses: Math.max(0, numberValue(row.losses)),
    winRate: Math.max(0, Math.min(100, numberValue(row.win_rate))),
    rank: index + 1,
  }));

  return <RankingBrowser entries={entries} totalPlayers={matchingRows.length || count || 0} currentUserId={user.id} filters={filters} />;
}
