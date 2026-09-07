import { unstable_cache } from "next/cache";
import { getSupabasePublicServerClient } from "@/lib/supabase-server";
import { safeMediaUrl } from "@/lib/safe-media-url";

export type GuildRankingEntry = {
  id: string;
  name: string;
  logoUrl: string | null;
  province: string | null;
  district: string | null;
  level: number;
  expTotal: number;
  memberCount: number;
  maxMembers: number;
};

function asNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function fetchGuildRanking(
  province: string | null,
): Promise<GuildRankingEntry[]> {
  const client = getSupabasePublicServerClient();
  if (!client) return [];
  let query = client
    .from("guilds")
    .select(
      "id, name, logo_url, province, district, level, exp_total, max_members",
    )
    .eq("status", "active")
    .eq("visibility", "public")
    .order("level", { ascending: false })
    .order("exp_total", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(200);
  if (province) query = query.eq("province", province);
  const { data, error } = await query;
  if (error || !data) return [];
  const guildIds = data.map((guild) => guild.id);
  const membersResult =
    guildIds.length > 0
      ? await client
          .from("public_guild_members")
          .select("guild_id")
          .in("guild_id", guildIds)
      : { data: [] as Array<{ guild_id: string }> };
  const counts = new Map<string, number>();
  for (const member of (membersResult.data ?? []) as Array<{
    guild_id: string;
  }>)
    counts.set(member.guild_id, (counts.get(member.guild_id) ?? 0) + 1);
  return data.map((guild) => ({
    id: guild.id,
    name: guild.name,
    logoUrl: safeMediaUrl(guild.logo_url),
    province: guild.province,
    district: guild.district,
    level: Math.max(1, Math.trunc(asNumber(guild.level, 1))),
    expTotal: Math.max(0, asNumber(guild.exp_total)),
    memberCount: counts.get(guild.id) ?? 0,
    maxMembers: Math.max(1, Math.trunc(asNumber(guild.max_members, 32))),
  }));
}

export const getCachedGuildRanking = unstable_cache(
  fetchGuildRanking,
  ["arena-guild-ranking-v1"],
  { revalidate: 60, tags: ["guild-ranking"] },
);
