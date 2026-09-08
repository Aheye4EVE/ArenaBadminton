import { getSupabasePublicServerClient } from "@/lib/supabase-server";
import { FALLBACK_SKILL_RANKS, getSkillRank } from "@/lib/skill-ranks";
import { safeMediaUrl } from "@/lib/safe-media-url";
import type { HeaderProfileSummary } from "@/types/profile";

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type FriendshipStatus =
  | "self"
  | "friends"
  | "pending_sent"
  | "pending_received"
  | "none"
  | "guest";

export type OnlinePlayerItem = {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  avatarFocusX: number;
  avatarFocusY: number;
  level: number;
  skillBp: number;
  skillRankTier: number;
  skillRankName: string;
  skillRankColor: string;
  updatedAt: string;
  secondsAgo: number;
  friendshipStatus: FriendshipStatus;
  friendshipId?: string;
};

export type PlayerPublicSummary = HeaderProfileSummary & {
  friendshipStatus: FriendshipStatus;
  friendshipId?: string;
};

export async function getOnlinePlayers(currentUserId?: string | null): Promise<OnlinePlayerItem[]> {
  const supabase = getSupabasePublicServerClient();
  if (!supabase) return [];

  const [playersResult, skillRanksResult] = await Promise.all([
    supabase
      .from("public_profile_directory")
      .select("id, display_name, handle, avatar_url, avatar_focus_x, avatar_focus_y, level, skill_bp, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("skill_rank_definitions")
      .select("tier, name, min_bp, color")
      .order("min_bp", { ascending: true }),
  ]);

  if (playersResult.error || !Array.isArray(playersResult.data)) {
    return [];
  }

  const rankDefinitions = Array.isArray(skillRanksResult.data)
    ? skillRanksResult.data.map((d) => ({
        tier: asNumber(d.tier, 1),
        name: typeof d.name === "string" ? d.name : "มือใหม่",
        minBp: asNumber(d.min_bp, 1000),
        color: typeof d.color === "string" ? d.color : "slate",
      }))
    : FALLBACK_SKILL_RANKS;

  const playerIds = playersResult.data.map((p) => p.id);

  // Fetch friendships if currentUserId is present
  const friendshipsMap = new Map<string, { status: string; requestedBy: string; friendshipId: string }>();
  if (currentUserId && playerIds.length > 0) {
    const { data: friendships } = await supabase
      .from("user_friendships")
      .select("id, low_user_id, high_user_id, requested_by, status")
      .or(`low_user_id.eq.${currentUserId},high_user_id.eq.${currentUserId}`)
      .in("status", ["pending", "accepted"]);

    if (Array.isArray(friendships)) {
      for (const f of friendships) {
        const otherId = f.low_user_id === currentUserId ? f.high_user_id : f.low_user_id;
        friendshipsMap.set(otherId, {
          status: f.status,
          requestedBy: f.requested_by,
          friendshipId: f.id,
        });
      }
    }
  }

  const now = Date.now();

  return playersResult.data.map((row) => {
    const skillBp = Math.max(1000, asNumber(row.skill_bp, 1000));
    const skillRank = getSkillRank(skillBp, rankDefinitions);
    const updatedTime = new Date(row.updated_at).getTime();
    const secondsAgo = Math.max(0, Math.floor((now - updatedTime) / 1000));

    let friendshipStatus: FriendshipStatus = "guest";
    let friendshipId: string | undefined;

    if (currentUserId) {
      if (row.id === currentUserId) {
        friendshipStatus = "self";
      } else {
        const relation = friendshipsMap.get(row.id);
        if (!relation) {
          friendshipStatus = "none";
        } else if (relation.status === "accepted") {
          friendshipStatus = "friends";
          friendshipId = relation.friendshipId;
        } else if (relation.status === "pending") {
          friendshipId = relation.friendshipId;
          if (relation.requestedBy === currentUserId) {
            friendshipStatus = "pending_sent";
          } else {
            friendshipStatus = "pending_received";
          }
        } else {
          friendshipStatus = "none";
        }
      }
    }

    return {
      id: row.id,
      displayName: typeof row.display_name === "string" && row.display_name.trim() ? row.display_name : "ผู้เล่นใหม่",
      handle: typeof row.handle === "string" ? row.handle : `player_${row.id.replaceAll("-", "").slice(0, 12)}`,
      avatarUrl: safeMediaUrl(row.avatar_url),
      avatarFocusX: clamp(asNumber(row.avatar_focus_x, 50), 0, 100),
      avatarFocusY: clamp(asNumber(row.avatar_focus_y, 50), 0, 100),
      level: clamp(asNumber(row.level, 1), 1, 99),
      skillBp,
      skillRankTier: skillRank.tier,
      skillRankName: skillRank.name,
      skillRankColor: skillRank.color,
      updatedAt: row.updated_at,
      secondsAgo,
      friendshipStatus,
      friendshipId,
    };
  });
}

export async function getPlayerPublicSummary(
  targetUserId: string,
  currentUserId?: string | null
): Promise<PlayerPublicSummary | null> {
  const supabase = getSupabasePublicServerClient();
  if (!supabase) return null;

  const [
    profileResult,
    levelsResult,
    createdGroupsResult,
    joinedGroupsResult,
    matchesResult,
    winsResult,
    lossesResult,
    guildMembershipResult,
    skillRanksResult,
    friendshipsResult,
  ] = await Promise.all([
    supabase
      .from("public_profile_directory")
      .select("id, display_name, handle, avatar_url, avatar_focus_x, avatar_focus_y, profile_background_url, profile_background_focus_x, profile_background_focus_y, bio, level, exp_total, skill_bp, created_at, updated_at")
      .eq("id", targetUserId)
      .maybeSingle(),
    supabase.from("level_definitions").select("level, required_exp, label").order("level", { ascending: true }),
    supabase.from("groups").select("id", { count: "exact", head: true }).eq("owner_id", targetUserId),
    supabase.from("group_members").select("group_id", { count: "exact", head: true }).eq("user_id", targetUserId).in("membership_status", ["registered", "attended"]),
    supabase.from("exp_ledger").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).in("source_type", ["match_win", "match_loss"]),
    supabase.from("exp_ledger").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).eq("source_type", "match_win"),
    supabase.from("exp_ledger").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).eq("source_type", "match_loss"),
    supabase.from("guild_members").select("guild_id, role").eq("user_id", targetUserId).eq("membership_status", "active").maybeSingle(),
    supabase.from("skill_rank_definitions").select("tier, name, min_bp, color").order("min_bp", { ascending: true }),
    supabase.from("user_friendships").select("id", { count: "exact", head: true }).eq("status", "accepted").or(`low_user_id.eq.${targetUserId},high_user_id.eq.${targetUserId}`),
  ]);

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  const profile = profileResult.data;

  // Guild details
  const guildResult = guildMembershipResult.data
    ? await supabase.from("guilds").select("id, name, level").eq("id", guildMembershipResult.data.guild_id).maybeSingle()
    : { data: null };

  const level = clamp(asNumber(profile.level, 1), 1, 99);
  const expTotal = Math.max(0, asNumber(profile.exp_total));
  const definitions = Array.isArray(levelsResult.data) ? levelsResult.data : [];
  const currentDefinition = definitions.find((d) => asNumber(d.level) === level);
  const nextDefinition = definitions.find((d) => asNumber(d.level) === level + 1);
  const currentLevelExp = Math.max(0, asNumber(currentDefinition?.required_exp));
  const nextLevelExp = nextDefinition ? Math.max(currentLevelExp, asNumber(nextDefinition.required_exp)) : null;
  const levelProgress = nextLevelExp === null || nextLevelExp <= currentLevelExp
    ? level >= 99 ? 100 : 0
    : clamp(((expTotal - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100, 0, 100);

  const skillBp = Math.max(1000, asNumber(profile.skill_bp, 1000));
  const wins = Math.max(0, winsResult.count ?? 0);
  const losses = Math.max(0, lossesResult.count ?? 0);
  const matchesPlayed = Math.max(0, matchesResult.count ?? wins + losses);
  const winRate = matchesPlayed > 0 ? clamp((wins / matchesPlayed) * 100, 0, 100) : 0;

  const rankDefinitions = Array.isArray(skillRanksResult.data)
    ? skillRanksResult.data.map((d) => ({
        tier: asNumber(d.tier, 1),
        name: typeof d.name === "string" ? d.name : "มือใหม่",
        minBp: asNumber(d.min_bp, 1000),
        color: typeof d.color === "string" ? d.color : "slate",
      }))
    : FALLBACK_SKILL_RANKS;

  const skillRank = getSkillRank(skillBp, rankDefinitions);

  // Check relationship with current user
  let friendshipStatus: FriendshipStatus = "guest";
  let friendshipId: string | undefined;

  if (currentUserId) {
    if (targetUserId === currentUserId) {
      friendshipStatus = "self";
    } else {
      const { data: friendship } = await supabase
        .from("user_friendships")
        .select("id, requested_by, status")
        .or(
          `and(low_user_id.eq.${currentUserId},high_user_id.eq.${targetUserId}),and(low_user_id.eq.${targetUserId},high_user_id.eq.${currentUserId})`
        )
        .in("status", ["pending", "accepted"])
        .maybeSingle();

      if (!friendship) {
        friendshipStatus = "none";
      } else if (friendship.status === "accepted") {
        friendshipStatus = "friends";
        friendshipId = friendship.id;
      } else if (friendship.status === "pending") {
        friendshipId = friendship.id;
        friendshipStatus = friendship.requested_by === currentUserId ? "pending_sent" : "pending_received";
      } else {
        friendshipStatus = "none";
      }
    }
  }

  return {
    id: profile.id,
    displayName: typeof profile.display_name === "string" && profile.display_name.trim() ? profile.display_name : "ผู้เล่นใหม่",
    handle: typeof profile.handle === "string" ? profile.handle : `player_${profile.id.replaceAll("-", "").slice(0, 12)}`,
    avatarUrl: safeMediaUrl(profile.avatar_url),
    avatarFocusX: clamp(asNumber(profile.avatar_focus_x, 50), 0, 100),
    avatarFocusY: clamp(asNumber(profile.avatar_focus_y, 50), 0, 100),
    profileBackgroundUrl: safeMediaUrl(profile.profile_background_url),
    backgroundFocusX: clamp(asNumber(profile.profile_background_focus_x, 50), 0, 100),
    backgroundFocusY: clamp(asNumber(profile.profile_background_focus_y, 50), 0, 100),
    bio: typeof profile.bio === "string" ? profile.bio : null,
    level,
    levelLabel: typeof currentDefinition?.label === "string" ? currentDefinition.label : "ผู้เล่นใหม่",
    expTotal,
    currentLevelExp,
    nextLevelExp,
    levelProgress: Math.round(levelProgress),
    skillBp,
    skillRankTier: skillRank.tier,
    skillRankName: skillRank.name,
    skillRankColor: skillRank.color,
    gemsBalance: 0,
    unreadNotificationCount: 0,
    unreadMessageCount: 0,
    pendingFriendRequestCount: 0,
    friendCount: Math.max(0, friendshipsResult.count ?? 0),
    rank: null,
    isAdmin: false,
    isProfileComplete: true,
    guild: guildResult.data && guildMembershipResult.data ? {
      id: guildResult.data.id,
      name: guildResult.data.name,
      level: Math.max(1, asNumber(guildResult.data.level, 1)),
      role: typeof guildMembershipResult.data.role === "string" ? guildMembershipResult.data.role : "member",
    } : null,
    stats: {
      createdGroups: Math.max(0, createdGroupsResult.count ?? 0),
      joinedGroups: Math.max(0, joinedGroupsResult.count ?? 0),
      matchesPlayed,
      wins,
      losses,
      winRate,
    },
    friendshipStatus,
    friendshipId,
  };
}
