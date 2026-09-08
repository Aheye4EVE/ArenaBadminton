import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfileOverview from "@/components/profile-overview";
import type { ProfileStatus } from "@/components/profile-status-feed";
import { getAuthenticatedProfileSummary } from "@/lib/supabase-server";
import { safeMediaUrl } from "@/lib/safe-media-url";
import type { ProfileFriend, ProfileRecentMatch } from "@/types/profile";

export const metadata: Metadata = { title: "Profile | Arena-Badminton" };
export const dynamic = "force-dynamic";

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function focusValue(value: unknown) {
  return Math.min(100, Math.max(0, numberValue(value, 50)));
}

function textValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function scoreValue(value: unknown) {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

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

  const [friendshipResult, participantResult] = await Promise.all([
    supabase
      .from("user_friendships")
      .select("low_user_id, high_user_id, status")
      .or(`low_user_id.eq.${user.id},high_user_id.eq.${user.id}`)
      .eq("status", "accepted"),
    supabase
      .from("match_participants")
      .select("match_id, team, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const friendshipRows = (friendshipResult.data ?? []) as Array<Record<string, unknown>>;
  const friendIds = [
    ...new Set(
      friendshipRows
        .flatMap((row) => {
          const lowUserId = typeof row.low_user_id === "string" ? row.low_user_id : "";
          const highUserId = typeof row.high_user_id === "string" ? row.high_user_id : "";
          return [lowUserId, highUserId];
        })
        .filter((id) => id && id !== user.id),
    ),
  ].slice(0, 10);

  const { data: friendRows } =
    friendIds.length > 0
      ? await supabase
          .from("public_profile_directory")
          .select("id, display_name, handle, avatar_url, avatar_focus_x, avatar_focus_y, level")
          .in("id", friendIds)
      : { data: [] as Array<Record<string, unknown>> };
  const friendsById = new Map(
    ((friendRows ?? []) as Array<Record<string, unknown>>).map((row) => [
      String(row.id),
      {
        id: String(row.id),
        displayName: textValue(row.display_name, "ผู้เล่น Arena"),
        handle: textValue(row.handle, "arena_player"),
        avatarUrl: safeMediaUrl(typeof row.avatar_url === "string" ? row.avatar_url : null),
        avatarFocusX: focusValue(row.avatar_focus_x),
        avatarFocusY: focusValue(row.avatar_focus_y),
        level: Math.max(1, numberValue(row.level, 1)),
      } satisfies ProfileFriend,
    ]),
  );
  const friends: ProfileFriend[] = friendIds.flatMap((id) => {
    const friend = friendsById.get(id);
    return friend ? [friend] : [];
  });

  const participantRows = (participantResult.data ?? []) as Array<Record<string, unknown>>;
  const participantByMatch = new Map(
    participantRows.flatMap((row) => {
      const matchId = typeof row.match_id === "string" ? row.match_id : "";
      const team = row.team === "a" || row.team === "b" ? row.team : null;
      return matchId && team ? [[matchId, team] as const] : [];
    }),
  );
  const matchIds = [...participantByMatch.keys()];

  let matchRows: Array<Record<string, unknown>> = [];
  let settlementRows: Array<Record<string, unknown>> = [];
  if (matchIds.length > 0) {
    const [matchesResult, settlementsResult] = await Promise.all([
      supabase
        .from("matches")
        .select("id, group_id, match_number, team_a_score, team_b_score")
        .in("id", matchIds),
      supabase
        .from("match_settlements")
        .select(
          "match_id, winner_team, winner_exp_reward, loser_exp_reward, winner_bp_delta, loser_bp_delta, settled_at",
        )
        .in("match_id", matchIds)
        .eq("settlement_status", "applied"),
    ]);
    matchRows = (matchesResult.data ?? []) as Array<Record<string, unknown>>;
    settlementRows = (settlementsResult.data ?? []) as Array<Record<string, unknown>>;
  }

  const matchById = new Map(matchRows.map((row) => [String(row.id), row]));
  const groupIds = [
    ...new Set(
      matchRows
        .map((row) => (typeof row.group_id === "string" ? row.group_id : ""))
        .filter(Boolean),
    ),
  ];
  const { data: groupRows } =
    groupIds.length > 0
      ? await supabase.from("groups").select("id, title").in("id", groupIds)
      : { data: [] as Array<Record<string, unknown>> };
  const groupById = new Map(
    ((groupRows ?? []) as Array<Record<string, unknown>>).map((row) => [
      String(row.id),
      textValue(row.title, "ก๊วน Arena"),
    ]),
  );

  const recentMatches: ProfileRecentMatch[] = settlementRows
    .flatMap((settlement) => {
      const matchId = typeof settlement.match_id === "string" ? settlement.match_id : "";
      const match = matchById.get(matchId);
      const team = participantByMatch.get(matchId);
      if (!match || !team) return [];

      const won = team === settlement.winner_team;
      const ownScore = team === "a" ? match.team_a_score : match.team_b_score;
      const opponentScore = team === "a" ? match.team_b_score : match.team_a_score;
      const matchNumber = Number(match.match_number);
      return [
        {
          id: `match-${matchId}`,
          groupTitle: groupById.get(String(match.group_id)) ?? "ก๊วน Arena",
          matchNumber: Number.isFinite(matchNumber) ? matchNumber : null,
          date: typeof settlement.settled_at === "string" ? settlement.settled_at : "",
          result: won ? "Victory" : "Defeat",
          score: `${scoreValue(ownScore)} - ${scoreValue(opponentScore)}`,
          exp: won
            ? numberValue(settlement.winner_exp_reward)
            : numberValue(settlement.loser_exp_reward),
          bp: won
            ? numberValue(settlement.winner_bp_delta)
            : numberValue(settlement.loser_bp_delta),
        } satisfies ProfileRecentMatch,
      ];
    })
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0, 5);

  return (
    <ProfileOverview
      summary={summary}
      province={typeof profile.province === "string" ? profile.province : null}
      trophies={trophies}
      statuses={statuses}
      friends={friends}
      recentMatches={recentMatches}
    />
  );
}
