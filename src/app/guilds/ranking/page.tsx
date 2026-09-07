import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GuildRankingBrowser from "@/components/guild-ranking-browser";
import {
  getCachedGuildRanking,
  type GuildRankingEntry,
} from "@/lib/guild-ranking";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Guild Ranking | Arena-Badminton" };
export const revalidate = 60;

type SearchParams = Record<string, string | string[] | undefined>;
function firstParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function GuildRankingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const context = await getAuthenticatedProfile();
  if (!context.supabase || !context.user)
    redirect("/auth/login?message=auth_required");
  if (!context.profile?.profile_completed_at) redirect("/profile/setup");
  const scope =
    firstParam(await searchParams, "scope") === "province"
      ? "province"
      : "national";
  const province =
    typeof context.profile.province === "string" &&
    context.profile.province.trim()
      ? context.profile.province.trim()
      : null;
  let entries: GuildRankingEntry[] = await getCachedGuildRanking(
    scope === "province" ? province : null,
  );
  if (entries.length === 0 && context.supabase) {
    const result = await context.supabase
      .from("guilds")
      .select(
        "id, name, logo_url, province, district, level, exp_total, max_members",
      )
      .eq("status", "active")
      .eq("visibility", "public")
      .order("level", { ascending: false })
      .order("exp_total", { ascending: false })
      .limit(200);
    const rows = result.data ?? [];
    const ids = rows.map((row) => row.id);
    const memberResult =
      ids.length > 0
        ? await context.supabase
            .from("public_guild_members")
            .select("guild_id")
            .in("guild_id", ids)
        : { data: [] as Array<{ guild_id: string }> };
    const counts = new Map<string, number>();
    for (const member of memberResult.data ?? [])
      counts.set(member.guild_id, (counts.get(member.guild_id) ?? 0) + 1);
    entries = rows
      .filter((row) => scope !== "province" || row.province === province)
      .map((row) => ({
        id: row.id,
        name: row.name,
        logoUrl: typeof row.logo_url === "string" ? row.logo_url : null,
        province: row.province,
        district: row.district,
        level: Number(row.level) || 1,
        expTotal: Number(row.exp_total) || 0,
        memberCount: counts.get(row.id) ?? 0,
        maxMembers: Number(row.max_members) || 32,
      }));
  }
  return (
    <GuildRankingBrowser entries={entries} province={province} scope={scope} />
  );
}
