import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import TournamentDetail, { type TournamentEntry, type TournamentReward } from "@/components/tournament-detail";
import type { TournamentBracketMatchData } from "@/components/tournament-bracket";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { safeMediaUrl } from "@/lib/safe-media-url";

export const metadata: Metadata = { title: "รายละเอียดกิจกรรม | Arena-Badminton" };
export const dynamic = "force-dynamic";

type Params = { id: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export default async function TournamentDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect(`/auth/login?message=auth_required&next=/events/${id}`);
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id, created_by, venue_id, title, description, starts_at, format, status, max_entries, entry_fee, rules, created_at")
    .eq("id", id)
    .maybeSingle();
  if (tournamentError || !tournament) notFound();

  const [{ data: venue }, { data: entryRows }, { data: rewardRows }, { data: bracket }, { data: bracketMatchRows }, { data: rewardItems }] = await Promise.all([
    tournament.venue_id
      ? supabase.from("venues").select("id, name, address, province, district, subdistrict, latitude, longitude").eq("id", tournament.venue_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("tournament_entries").select("user_id, entry_status, seed, joined_at").eq("tournament_id", id).in("entry_status", ["registered", "waitlisted", "winner", "eliminated"]).order("joined_at", { ascending: true }),
    supabase.from("tournament_rewards").select("id, placement, exp_reward, bp_reward, item_id, label").eq("tournament_id", id).order("placement", { ascending: true }),
    supabase.from("tournament_brackets").select("id, status").eq("tournament_id", id).maybeSingle(),
    supabase.from("tournament_bracket_matches").select("id, round_number, match_number, player_a_id, player_b_id, winner_id, score_a, score_b, status, submitted_by").eq("tournament_id", id).order("round_number", { ascending: true }).order("match_number", { ascending: true }),
    supabase.from("shop_items").select("id, name, icon").eq("is_active", true).order("sort_order", { ascending: true }).limit(100),
  ]);

  const rawEntries = (entryRows ?? []) as Array<Record<string, unknown>>;
  const rawBracketMatches = (bracketMatchRows ?? []) as Array<Record<string, unknown>>;
  const bracketPlayerIds = rawBracketMatches.flatMap((match) => [textValue(match.player_a_id), textValue(match.player_b_id), textValue(match.winner_id)]).filter(Boolean);
  const userIds = [...new Set([tournament.created_by, ...rawEntries.map((entry) => textValue(entry.user_id)).filter(Boolean), ...bracketPlayerIds])];
  const { data: publicProfiles } = userIds.length > 0
    ? await supabase.from("public_profile_directory").select("id, display_name, handle, avatar_url, level").in("id", userIds)
    : { data: [] };
  const profileMap = new Map(((publicProfiles ?? []) as Array<Record<string, unknown>>).map((row) => [textValue(row.id), row]));
  const creator = profileMap.get(tournament.created_by);
  const entries: TournamentEntry[] = rawEntries.map((entry) => {
    const player = profileMap.get(textValue(entry.user_id));
    return {
      userId: textValue(entry.user_id),
      displayName: textValue(player?.display_name, "ผู้เล่น Arena"),
      handle: textValue(player?.handle, "arena_player"),
      avatarUrl: safeMediaUrl(player?.avatar_url),
      level: Math.max(1, Math.min(99, numberValue(player?.level, 1))),
      status: textValue(entry.entry_status, "registered"),
      seed: entry.seed === null || entry.seed === undefined ? null : numberValue(entry.seed),
      joinedAt: textValue(entry.joined_at),
    };
  });
  const rewards: TournamentReward[] = ((rewardRows ?? []) as Array<Record<string, unknown>>).map((reward) => ({
    id: textValue(reward.id),
    placement: numberValue(reward.placement),
    expReward: numberValue(reward.exp_reward),
    bpReward: numberValue(reward.bp_reward),
    label: textValue(reward.label),
  }));
  const bracketMatches: TournamentBracketMatchData[] = rawBracketMatches.map((match) => {
    const player = (key: string) => {
      const playerId = textValue(match[key]);
      const row = profileMap.get(playerId);
      return {
        id: playerId || null,
        name: textValue(row?.display_name, playerId ? "ผู้เล่น Arena" : "รอผู้ชนะ"),
        handle: textValue(row?.handle, "arena_player"),
      };
    };
    return {
      id: textValue(match.id),
      roundNumber: numberValue(match.round_number, 1),
      matchNumber: numberValue(match.match_number, 1),
      playerA: player("player_a_id"),
      playerB: player("player_b_id"),
      winnerId: textValue(match.winner_id) || null,
      scoreA: match.score_a === null || match.score_a === undefined ? null : numberValue(match.score_a),
      scoreB: match.score_b === null || match.score_b === undefined ? null : numberValue(match.score_b),
      status: textValue(match.status, "scheduled"),
      submittedBy: textValue(match.submitted_by) || null,
    };
  });

  return (
    <main className="tournament-detail-page">
      <div className="tournament-detail-shell">
        <header className="groups-topbar">
          <Link href="/events" className="groups-back"><ArrowLeft size={17} /> กลับหน้ากิจกรรม</Link>
          <Link href="/" className="groups-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link>
          <Link href="/profile" className="organizer-user-chip"><CalendarDays size={15} /> Profile</Link>
        </header>
        <TournamentDetail
          tournament={{
            id: tournament.id,
            title: tournament.title,
            description: tournament.description,
            startsAt: tournament.starts_at,
            format: tournament.format,
            status: tournament.status,
            maxEntries: Number(tournament.max_entries),
            entryFee: Number(tournament.entry_fee),
            rules: tournament.rules,
            createdAt: tournament.created_at,
            registrationOpen: tournament.status === "published",
            creatorName: textValue(creator?.display_name, "ผู้จัด Arena"),
            creatorHandle: textValue(creator?.handle, "arena_organizer"),
            venue: venue ? {
              name: venue.name,
              address: venue.address,
              province: venue.province,
              district: venue.district,
              subdistrict: venue.subdistrict,
              latitude: venue.latitude,
              longitude: venue.longitude,
            } : null,
          }}
          entries={entries}
          rewards={rewards}
          bracketMatches={bracketMatches}
          bracketStatus={textValue(bracket?.status)}
          rewardItems={((rewardItems ?? []) as Array<Record<string, unknown>>).map((item) => ({ id: textValue(item.id), name: textValue(item.name), icon: textValue(item.icon, "🎁") }))}
          isOrganizer={tournament.created_by === user.id}
          currentUserId={user.id}
        />
      </div>
    </main>
  );
}
