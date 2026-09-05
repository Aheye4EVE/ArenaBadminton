import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfileHistoryBrowser, { type ProfileHistoryEntry } from "@/components/profile-history-browser";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "ประวัติการเล่น | Arena-Badminton" };
export const dynamic = "force-dynamic";
function num(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
export default async function ProfileHistoryPage() {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required&next=/profile/history");
  if (!profile?.profile_completed_at) redirect("/profile/setup");
  const [participantResult, expResult, bpResult, mvpResult, rewardResult] = await Promise.all([
    supabase.from("match_participants").select("match_id, team").eq("user_id", user.id),
    supabase.from("exp_ledger").select("match_id, amount, source_type, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("bp_ledger").select("match_id, applied_delta, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("match_mvp_awards").select("match_id, bonus_exp, bonus_bp, awarded_at").eq("user_id", user.id).order("awarded_at", { ascending: false }).limit(50),
    supabase.from("tournament_reward_awards").select("id, tournament_id, placement, exp_reward, bp_reward, label, awarded_at").eq("user_id", user.id).order("awarded_at", { ascending: false }).limit(50),
  ]);
  const matchIds = [...new Set(((participantResult.data ?? []) as Array<{ match_id: string }>).map((row) => row.match_id))];
  const { data: matches } = matchIds.length > 0 ? await supabase.from("matches").select("id, group_id, winner_team, team_a_score, team_b_score").in("id", matchIds) : { data: [] as Array<Record<string, unknown>> };
  const groupIds = [...new Set(((matches ?? []) as Array<Record<string, unknown>>).map((match) => String(match.group_id)))];
  const { data: groups } = groupIds.length > 0 ? await supabase.from("groups").select("id, title").in("id", groupIds) : { data: [] as Array<Record<string, unknown>> };
  const groupMap = new Map(((groups ?? []) as Array<Record<string, unknown>>).map((group) => [String(group.id), String(group.title)]));
  const participantMap = new Map(((participantResult.data ?? []) as Array<{ match_id: string; team: string }>).map((row) => [row.match_id, row.team]));
  const settlements = matchIds.length > 0 ? await supabase.from("match_settlements").select("match_id, winner_team, winner_exp_reward, loser_exp_reward, winner_bp_delta, loser_bp_delta, settled_at").in("match_id", matchIds).eq("settlement_status", "applied") : { data: [] as Array<Record<string, unknown>> };
  const entries: ProfileHistoryEntry[] = ((settlements.data ?? []) as Array<Record<string, unknown>>).map((settlement) => { const match = ((matches ?? []) as Array<Record<string, unknown>>).find((item) => item.id === settlement.match_id); const team = participantMap.get(String(settlement.match_id)); const win = team === settlement.winner_team; return { id: `match-${settlement.match_id}`, title: win ? "ชนะการแข่งขัน" : "จบการแข่งขัน", subtitle: `${groupMap.get(String(match?.group_id)) ?? "ก๊วน Arena"} · Match #${String(match?.id).slice(0, 8)}`, date: String(settlement.settled_at), result: win ? "Victory" : "Defeat", exp: win ? num(settlement.winner_exp_reward) : num(settlement.loser_exp_reward), bp: win ? num(settlement.winner_bp_delta) : num(settlement.loser_bp_delta), tone: win ? "win" : "loss" }; });
  for (const mvp of (mvpResult.data ?? []) as Array<Record<string, unknown>>) entries.unshift({ id: `mvp-${mvp.match_id}`, title: "ได้รับ MVP", subtitle: "โบนัสจากการโหวตของสมาชิกก๊วน", date: String(mvp.awarded_at), result: "MVP", exp: num(mvp.bonus_exp), bp: num(mvp.bonus_bp), tone: "mvp" });
  const tournamentIds = [...new Set(((rewardResult.data ?? []) as Array<Record<string, unknown>>).map((reward) => String(reward.tournament_id)))];
  const { data: tournaments } = tournamentIds.length > 0 ? await supabase.from("tournaments").select("id, title").in("id", tournamentIds) : { data: [] as Array<Record<string, unknown>> };
  const tournamentMap = new Map(((tournaments ?? []) as Array<Record<string, unknown>>).map((item) => [String(item.id), String(item.title)]));
  for (const reward of (rewardResult.data ?? []) as Array<Record<string, unknown>>) entries.unshift({ id: String(reward.id), title: `รางวัล Tournament อันดับ ${reward.placement}`, subtitle: `${tournamentMap.get(String(reward.tournament_id)) ?? "กิจกรรม Arena"} · ${reward.label ?? "Reward"}`, date: String(reward.awarded_at), result: "Reward", exp: num(reward.exp_reward), bp: num(reward.bp_reward), tone: "tournament" });
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const exp = ((expResult.data ?? []) as Array<Record<string, unknown>>).reduce((sum, item) => sum + num(item.amount), 0) + ((mvpResult.data ?? []) as Array<Record<string, unknown>>).reduce((sum, item) => sum + num(item.bonus_exp), 0);
  const bp = ((bpResult.data ?? []) as Array<Record<string, unknown>>).reduce((sum, item) => sum + num(item.applied_delta), 0) + ((mvpResult.data ?? []) as Array<Record<string, unknown>>).reduce((sum, item) => sum + num(item.bonus_bp), 0);
  const wins = ((settlements.data ?? []) as Array<Record<string, unknown>>).filter((settlement) => participantMap.get(String(settlement.match_id)) === settlement.winner_team).length;
  return <ProfileHistoryBrowser entries={entries.slice(0, 150)} stats={{ matches: (settlements.data ?? []).length, wins, exp, bp }} />;
}
