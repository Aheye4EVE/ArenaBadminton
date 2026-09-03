import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import MatchDetail from "@/components/match-detail";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "รายละเอียดแมตช์ | Arena-Badminton" };
export const dynamic = "force-dynamic";

type MatchRow = {
  id: string;
  group_id: string;
  match_number: number;
  format: string;
  status: string;
  created_by: string;
  exp_win_reward: number;
  exp_loss_reward: number;
  team_a_score: number | null;
  team_b_score: number | null;
  winner_team: string | null;
  result_submitted_by: string | null;
};

type GroupRow = { id: string; title: string; starts_at: string; location_text: string };

type ParticipantRow = {
  match_id: string;
  user_id: string;
  team: "a" | "b";
  display_name: string;
  handle: string;
  avatar_url: string | null;
  level: number;
  check_in_status: string;
  checked_in_at: string | null;
};

type SettlementRow = {
  rule_version: string;
  winner_team: string;
  winner_level: number;
  loser_level: number;
  winner_bp_delta: number;
  loser_bp_delta: number;
  winner_exp_reward: number;
  loser_exp_reward: number;
  winner_item_bonus_exp: number;
  loser_item_bonus_exp: number;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select("id, group_id, match_number, format, status, created_by, exp_win_reward, exp_loss_reward, team_a_score, team_b_score, winner_team, result_submitted_by")
    .eq("id", id)
    .maybeSingle();
  if (matchError || !matchData) notFound();
  const match = matchData as MatchRow;

  const [groupResult, participantResult, settlementResult] = await Promise.all([
    supabase.from("groups").select("id, title, starts_at, location_text").eq("id", match.group_id).maybeSingle(),
    supabase.from("public_match_participants").select("match_id, user_id, team, display_name, handle, avatar_url, level, check_in_status, checked_in_at").eq("match_id", id).order("team", { ascending: true }).order("display_name", { ascending: true }),
    supabase.from("match_settlements").select("rule_version, winner_team, winner_level, loser_level, winner_bp_delta, loser_bp_delta, winner_exp_reward, loser_exp_reward, winner_item_bonus_exp, loser_item_bonus_exp").eq("match_id", id).maybeSingle(),
  ]);

  if (groupResult.error || !groupResult.data) notFound();
  const group = groupResult.data as GroupRow;
  const participants = (participantResult.data ?? []) as ParticipantRow[];
  const settlement = (settlementResult.data as SettlementRow | null) ?? null;

  return <MatchDetail match={{ id: match.id, groupId: match.group_id, matchNumber: Number(match.match_number), format: match.format, status: match.status, createdBy: match.created_by, expWinReward: Number(match.exp_win_reward), expLossReward: Number(match.exp_loss_reward), teamAScore: match.team_a_score === null ? null : Number(match.team_a_score), teamBScore: match.team_b_score === null ? null : Number(match.team_b_score), winnerTeam: match.winner_team, resultSubmittedBy: match.result_submitted_by }} group={{ id: group.id, title: group.title, startsAt: group.starts_at, locationText: group.location_text }} participants={participants} settlement={settlement} currentUserId={user.id} />;
}
