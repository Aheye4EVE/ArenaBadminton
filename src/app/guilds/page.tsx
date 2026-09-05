import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GuildsBrowser, { type GuildCardData } from "@/components/guilds-browser";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { matchesLocationFilters, matchesSearchTerms, searchTerms } from "@/lib/search-utils";

export const metadata: Metadata = { title: "Guild | Arena-Badminton" };
export const dynamic = "force-dynamic";

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function cleanSearchValue(value: string, maxLength = 80) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export default async function GuildsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const rawParams = await searchParams;
  const filters = {
    q: cleanSearchValue(firstParam(rawParams, "q")),
    province: cleanSearchValue(firstParam(rawParams, "province")),
    district: cleanSearchValue(firstParam(rawParams, "district")),
    subdistrict: cleanSearchValue(firstParam(rawParams, "subdistrict")),
  };
  const [guildResult, membershipResult, settingsResult] = await Promise.all([
    supabase.from("guilds").select("id, owner_id, name, description, logo_url, province, district, subdistrict, level, exp_total, max_members, join_policy").eq("status", "active").order("level", { ascending: false }).order("exp_total", { ascending: false }).order("created_at", { ascending: false }).limit(100),
    supabase.from("guild_members").select("guild_id").eq("user_id", user.id).eq("membership_status", "active").maybeSingle(),
    supabase.rpc("get_guild_creation_settings"),
  ]);

  const terms = searchTerms(filters.q);
  const rows = (guildResult.data ?? []).filter((guild) => matchesSearchTerms([guild.name, guild.description, guild.province, guild.district, guild.subdistrict], terms) && matchesLocationFilters(filters, {
    province: guild.province,
    district: guild.district,
    subdistrict: guild.subdistrict,
    searchable: [guild.name, guild.description],
  }));
  const guildIds = rows.map((guild) => guild.id);
  const ownerIds = [...new Set(rows.map((guild) => guild.owner_id))];
  const [membersResult, ownersResult] = await Promise.all([
    guildIds.length > 0 ? supabase.from("guild_members").select("guild_id").in("guild_id", guildIds).eq("membership_status", "active") : Promise.resolve({ data: [] as Array<{ guild_id: string }> }),
    ownerIds.length > 0 ? supabase.from("public_profile_directory").select("id, display_name").in("id", ownerIds) : Promise.resolve({ data: [] as Array<{ id: string; display_name: string }> }),
  ]);
  const countByGuild = new Map<string, number>();
  for (const member of membersResult.data ?? []) countByGuild.set(member.guild_id, (countByGuild.get(member.guild_id) ?? 0) + 1);
  const ownerById = new Map((ownersResult.data ?? []).map((owner) => [owner.id, owner.display_name]));
  const guilds: GuildCardData[] = rows.map((guild) => ({
    id: guild.id,
    name: guild.name,
    description: guild.description,
    logoUrl: guild.logo_url,
    province: guild.province,
    district: guild.district,
    level: numberValue(guild.level, 1),
    expTotal: numberValue(guild.exp_total),
    maxMembers: numberValue(guild.max_members, 32),
    memberCount: countByGuild.get(guild.id) ?? 0,
    joinPolicy: guild.join_policy,
    ownerName: ownerById.get(guild.owner_id) ?? "Arena Master",
  }));

  const settings = Array.isArray(settingsResult.data) ? settingsResult.data[0] : settingsResult.data;
  const currentGuildId = membershipResult.data?.guild_id ?? null;
  const isFree = settings?.is_free === true || settings?.creation_mode === "free";
  const creationLabel = isFree ? "ช่วงโปรโมชั่น: สร้าง Guild ฟรี ไม่ต้องใช้ไอเทมก่อตั้ง" : "การสร้าง Guild ใช้ Guild Founding Contract 1 ชิ้น · ซื้อได้จาก Shop";

  return <GuildsBrowser guilds={guilds} currentGuildId={currentGuildId} canCreate={!currentGuildId} creationLabel={creationLabel} filters={filters} />;
}
