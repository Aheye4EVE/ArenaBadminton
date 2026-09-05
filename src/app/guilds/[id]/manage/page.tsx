import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import GuildManagePanel from "@/components/guild-manage-panel";
import type { GuildJoinRequestData, GuildMemberData } from "@/components/guild-detail";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "จัดการ Guild | Arena-Badminton" };
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function numberValue(value: unknown, fallback = 0) { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) ? parsed : fallback; }

export default async function GuildManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

  const guildResult = await supabase.from("guilds").select("id, name, description, logo_url, province, district, subdistrict, visibility, join_policy, level, exp_total, max_members").eq("id", id).maybeSingle();
  if (guildResult.error || !guildResult.data) notFound();
  const membershipResult = await supabase.from("guild_members").select("role, membership_status").eq("guild_id", id).eq("user_id", user.id).maybeSingle();
  if (!membershipResult.data || membershipResult.data.membership_status !== "active" || !["guild_master", "officer"].includes(membershipResult.data.role)) notFound();

  const [membersResult, requestsResult, itemsResult] = await Promise.all([
    supabase.from("public_guild_members").select("user_id, display_name, handle, avatar_url, level, role, contribution_exp").eq("guild_id", id).order("role", { ascending: true }).order("contribution_exp", { ascending: false }),
    supabase.from("guild_join_requests").select("id, user_id, created_at").eq("guild_id", id).eq("status", "pending").order("created_at", { ascending: true }).limit(50),
    supabase.from("shop_items").select("id, slug, name, icon").in("slug", ["guild-expansion-8", "guild-expansion-16", "guild-expansion-32"]).eq("is_active", true).order("sort_order", { ascending: true }),
  ]);
  const members: GuildMemberData[] = (membersResult.data ?? []).map((member) => ({ userId: member.user_id, displayName: member.display_name, handle: member.handle, avatarUrl: member.avatar_url, level: numberValue(member.level, 1), role: member.role, contributionExp: numberValue(member.contribution_exp) }));
  const requestRows = requestsResult.data ?? [];
  const requestUserIds = requestRows.map((request) => request.user_id);
  const requestProfiles = requestUserIds.length > 0 ? await supabase.from("public_profile_directory").select("id, display_name, handle, level").in("id", requestUserIds) : { data: [] as Array<{ id: string; display_name: string; handle: string; level: number }> };
  const requestProfileById = new Map((requestProfiles.data ?? []).map((requestProfile) => [requestProfile.id, requestProfile]));
  const requests: GuildJoinRequestData[] = requestRows.flatMap((request) => { const requestProfile = requestProfileById.get(request.user_id); return requestProfile ? [{ id: request.id, userId: request.user_id, displayName: requestProfile.display_name, handle: requestProfile.handle, level: numberValue(requestProfile.level, 1), createdAt: request.created_at }] : []; });
  const itemIds = (itemsResult.data ?? []).map((item) => item.id);
  const inventoryResult = itemIds.length > 0 ? await supabase.from("user_item_inventory").select("item_id, quantity").eq("user_id", user.id).in("item_id", itemIds) : { data: [] as Array<{ item_id: string; quantity: number }> };
  const quantityByItem = new Map((inventoryResult.data ?? []).map((item) => [item.item_id, Number(item.quantity)]));
  const expansionItems = (itemsResult.data ?? []).flatMap((item) => { const quantity = quantityByItem.get(item.id) ?? 0; return quantity > 0 ? [{ id: item.id, name: item.name, icon: item.icon, slug: item.slug, quantity }] : []; });

  const guild = guildResult.data;
  return <GuildManagePanel guild={{ id: guild.id, name: guild.name, description: guild.description, logoUrl: guild.logo_url, province: guild.province, district: guild.district, subdistrict: guild.subdistrict, visibility: guild.visibility, joinPolicy: guild.join_policy, level: numberValue(guild.level, 1), expTotal: numberValue(guild.exp_total), maxMembers: numberValue(guild.max_members, 32) }} members={members} requests={requests} expansionItems={expansionItems} />;
}
