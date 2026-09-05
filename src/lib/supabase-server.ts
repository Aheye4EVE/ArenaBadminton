import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { HeaderProfileSummary } from "@/types/profile";
import { FALLBACK_SKILL_RANKS, getSkillRank } from "@/lib/skill-ranks";

export async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always mutate cookies. Middleware handles refresh when enabled.
        }
      },
    },
  });
}

export async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getAuthenticatedProfile() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, profile: null };

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, handle, avatar_url, bio, level, exp_total, skill_bp, line_user_id, line_contact_id, avatar_focus_x, avatar_focus_y, profile_background_url, profile_background_focus_x, profile_background_focus_y, address_line, province, district, subdistrict, postal_code, latitude, longitude, profile_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
}

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type AuthenticatedProfileContext = Awaited<ReturnType<typeof getAuthenticatedProfile>>;

export async function getAuthenticatedProfileSummary(context?: AuthenticatedProfileContext) {
  const profileContext = context ?? await getAuthenticatedProfile();
  if (!profileContext.supabase || !profileContext.user || !profileContext.profile) {
    return { ...profileContext, summary: null as HeaderProfileSummary | null };
  }

  const { supabase, user, profile } = profileContext;
  const [levelsResult, createdGroupsResult, joinedGroupsResult, matchesResult, winsResult, walletResult, notificationsResult, rankResult, adminResult, guildMembershipResult, directMembershipsResult, pendingFriendshipsResult, friendsResult, skillRanksResult] = await Promise.all([
    supabase.from("level_definitions").select("level, required_exp, label").order("level", { ascending: true }),
    supabase.from("groups").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("group_members").select("group_id", { count: "exact", head: true }).eq("user_id", user.id).in("membership_status", ["registered", "attended"]),
    supabase.from("exp_ledger").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("source_type", ["match_win", "match_loss"]),
    supabase.from("exp_ledger").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("source_type", "match_win"),
    supabase.from("user_wallets").select("gems_balance").eq("user_id", user.id).maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    supabase.rpc("get_current_user_rank"),
    supabase.rpc("is_current_user_admin"),
    supabase.from("guild_members").select("guild_id, role").eq("user_id", user.id).eq("membership_status", "active").maybeSingle(),
    supabase.from("direct_conversation_members").select("conversation_id").eq("user_id", user.id),
    supabase.from("user_friendships").select("id", { count: "exact", head: true }).eq("status", "pending").neq("requested_by", user.id).or(`low_user_id.eq.${user.id},high_user_id.eq.${user.id}`),
    supabase.from("user_friendships").select("id", { count: "exact", head: true }).eq("status", "accepted").or(`low_user_id.eq.${user.id},high_user_id.eq.${user.id}`),
    supabase.from("skill_rank_definitions").select("tier, name, min_bp, color").order("min_bp", { ascending: true }),
  ]);

  const directConversationIds = [...new Set(((directMembershipsResult.data ?? []) as Array<{ conversation_id: string }>).map((membership) => membership.conversation_id))];
  const unreadMessagesResult = directConversationIds.length > 0
    ? await supabase.from("direct_messages").select("id", { count: "exact", head: true }).in("conversation_id", directConversationIds).neq("sender_id", user.id).is("read_at", null)
    : { count: 0 };

  const guildResult = guildMembershipResult.data
    ? await supabase.from("guilds").select("id, name, level").eq("id", guildMembershipResult.data.guild_id).maybeSingle()
    : { data: null };

  const level = clamp(asNumber(profile.level, 1), 1, 99);
  const expTotal = Math.max(0, asNumber(profile.exp_total));
  const definitions = Array.isArray(levelsResult.data) ? levelsResult.data : [];
  const currentDefinition = definitions.find((definition) => asNumber(definition.level) === level);
  const nextDefinition = definitions.find((definition) => asNumber(definition.level) === level + 1);
  const currentLevelExp = Math.max(0, asNumber(currentDefinition?.required_exp));
  const nextLevelExp = nextDefinition ? Math.max(currentLevelExp, asNumber(nextDefinition.required_exp)) : null;
  const levelProgress = nextLevelExp === null || nextLevelExp <= currentLevelExp
    ? level >= 99 ? 100 : 0
    : clamp(((expTotal - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100, 0, 100);

  const rank = rankResult.error || rankResult.data === null || rankResult.data === undefined
    ? null
    : Math.max(1, Math.trunc(asNumber(rankResult.data, 1)));
  const skillBp = Math.max(1000, asNumber(profile.skill_bp, 1000));
  const rankDefinitions = Array.isArray(skillRanksResult.data)
    ? skillRanksResult.data.map((definition) => ({ tier: asNumber(definition.tier, 1), name: typeof definition.name === "string" ? definition.name : "มือใหม่", minBp: asNumber(definition.min_bp, 1000), color: typeof definition.color === "string" ? definition.color : "slate" }))
    : FALLBACK_SKILL_RANKS;
  const skillRank = getSkillRank(skillBp, rankDefinitions);

  const summary: HeaderProfileSummary = {
    id: user.id,
    displayName: typeof profile.display_name === "string" && profile.display_name.trim() ? profile.display_name : "ผู้เล่นใหม่",
    handle: typeof profile.handle === "string" ? profile.handle : `player_${user.id.replaceAll("-", "").slice(0, 12)}`,
    avatarUrl: typeof profile.avatar_url === "string" ? profile.avatar_url : null,
    avatarFocusX: clamp(asNumber(profile.avatar_focus_x, 50), 0, 100),
    avatarFocusY: clamp(asNumber(profile.avatar_focus_y, 50), 0, 100),
    profileBackgroundUrl: typeof profile.profile_background_url === "string" ? profile.profile_background_url : null,
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
    gemsBalance: Math.max(0, asNumber(walletResult.data?.gems_balance)),
    unreadNotificationCount: Math.max(0, notificationsResult.count ?? 0),
    unreadMessageCount: Math.max(0, unreadMessagesResult.count ?? 0),
    pendingFriendRequestCount: Math.max(0, pendingFriendshipsResult.count ?? 0),
    friendCount: Math.max(0, friendsResult.count ?? 0),
    rank,
    isAdmin: !adminResult.error && adminResult.data === true,
    isProfileComplete: Boolean(profile.profile_completed_at),
    guild: guildResult.data && guildMembershipResult.data ? {
      id: guildResult.data.id,
      name: guildResult.data.name,
      level: Math.max(1, asNumber(guildResult.data.level, 1)),
      role: guildMembershipResult.data.role,
    } : null,
    stats: {
      createdGroups: createdGroupsResult.count ?? 0,
      joinedGroups: joinedGroupsResult.count ?? 0,
      matchesPlayed: matchesResult.count ?? 0,
      wins: winsResult.count ?? 0,
    },
  };

  return { ...profileContext, summary };
}
