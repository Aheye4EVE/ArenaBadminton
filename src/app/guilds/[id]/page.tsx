import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import GuildDetail, { type GuildAnnouncementData, type GuildJoinRequestData, type GuildMemberData } from "@/components/guild-detail";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Guild Detail | Arena-Badminton" };
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function numberValue(value: unknown, fallback = 0) { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) ? parsed : fallback; }

export default async function GuildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

  const guildResult = await supabase.from("guilds").select("id, name, slug, description, logo_url, province, district, subdistrict, visibility, join_policy, level, exp_total, max_members, owner_id").eq("id", id).maybeSingle();
  if (guildResult.error || !guildResult.data) notFound();
  const guild = guildResult.data;
  const [ownerResult, membersResult, announcementResult, membershipResult, pendingRequestResult] = await Promise.all([
    supabase.from("public_profile_directory").select("display_name").eq("id", guild.owner_id).maybeSingle(),
    supabase.from("public_guild_members").select("user_id, display_name, handle, avatar_url, level, role, contribution_exp").eq("guild_id", id).order("role", { ascending: true }).order("contribution_exp", { ascending: false }),
    supabase.from("guild_announcements").select("id, title, body, is_pinned, created_at").eq("guild_id", id).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(30),
    supabase.from("guild_members").select("role, membership_status").eq("guild_id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("guild_join_requests").select("id").eq("guild_id", id).eq("user_id", user.id).eq("status", "pending").maybeSingle(),
  ]);

  const membership = membershipResult.data ? { role: membershipResult.data.role, membershipStatus: membershipResult.data.membership_status } : null;
  const isManager = membership?.membershipStatus === "active" && ["guild_master", "officer"].includes(membership.role);
  let requests: GuildJoinRequestData[] = [];
  if (isManager) {
    const requestResult = await supabase.from("guild_join_requests").select("id, user_id, created_at").eq("guild_id", id).eq("status", "pending").order("created_at", { ascending: true }).limit(50);
    const requestRows = requestResult.data ?? [];
    const requestUserIds = requestRows.map((request) => request.user_id);
    const requestProfiles = requestUserIds.length > 0 ? await supabase.from("public_profile_directory").select("id, display_name, handle, level").in("id", requestUserIds) : { data: [] as Array<{ id: string; display_name: string; handle: string; level: number }> };
    const profileById = new Map((requestProfiles.data ?? []).map((requestProfile) => [requestProfile.id, requestProfile]));
    requests = requestRows.flatMap((request) => { const requestProfile = profileById.get(request.user_id); return requestProfile ? [{ id: request.id, userId: request.user_id, displayName: requestProfile.display_name, handle: requestProfile.handle, level: numberValue(requestProfile.level, 1), createdAt: request.created_at }] : []; });
  }

  return <GuildDetail guild={{ id: guild.id, name: guild.name, slug: guild.slug, description: guild.description, logoUrl: guild.logo_url, province: guild.province, district: guild.district, subdistrict: guild.subdistrict, visibility: guild.visibility, joinPolicy: guild.join_policy, level: numberValue(guild.level, 1), expTotal: numberValue(guild.exp_total), maxMembers: numberValue(guild.max_members, 32), ownerName: ownerResult.data?.display_name ?? "Arena Master" }} members={(membersResult.data ?? []).map((member): GuildMemberData => ({ userId: member.user_id, displayName: member.display_name, handle: member.handle, avatarUrl: member.avatar_url, level: numberValue(member.level, 1), role: member.role, contributionExp: numberValue(member.contribution_exp) }))} announcements={(announcementResult.data ?? []).map((announcement): GuildAnnouncementData => ({ id: announcement.id, title: announcement.title, body: announcement.body, isPinned: Boolean(announcement.is_pinned), createdAt: announcement.created_at }))} requests={requests} membership={membership} pendingRequest={Boolean(pendingRequestResult.data)} />;
}
