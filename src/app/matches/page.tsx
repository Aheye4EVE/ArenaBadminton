import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MatchesBrowser, { type MatchListItem } from "@/components/matches-browser";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "แมตช์ของฉัน | Arena-Badminton" };
export const dynamic = "force-dynamic";

type MatchRow = {
  id: string;
  group_id: string;
  match_number: number;
  format: string;
  status: string;
  team_a_score: number | null;
  team_b_score: number | null;
  created_at: string;
};

type GroupRow = { id: string; title: string };

export default async function MatchesPage() {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const [participantResult, createdResult] = await Promise.all([
    supabase.from("match_participants").select("match_id").eq("user_id", user.id),
    supabase.from("matches").select("id").eq("created_by", user.id),
  ]);
  const matchIds = [...new Set([
    ...(participantResult.data ?? []).map((row) => row.match_id as string),
    ...(createdResult.data ?? []).map((row) => row.id as string),
  ])];

  if (matchIds.length === 0) return <MatchesBrowser matches={[]} />;

  const { data: matchData } = await supabase
    .from("matches")
    .select("id, group_id, match_number, format, status, team_a_score, team_b_score, created_at")
    .in("id", matchIds)
    .order("created_at", { ascending: false });
  const matches = (matchData ?? []) as MatchRow[];
  const groupIds = [...new Set(matches.map((match) => match.group_id))];
  const { data: groupData } = groupIds.length > 0 ? await supabase.from("groups").select("id, title").in("id", groupIds) : { data: [] as GroupRow[] };
  const groups = new Map(((groupData ?? []) as GroupRow[]).map((group) => [group.id, group.title]));

  const items: MatchListItem[] = matches.map((match) => ({
    id: match.id,
    groupId: match.group_id,
    groupTitle: groups.get(match.group_id) ?? "ก๊วนแบดมินตัน",
    matchNumber: Number(match.match_number),
    format: match.format,
    status: match.status,
    teamAScore: match.team_a_score === null ? null : Number(match.team_a_score),
    teamBScore: match.team_b_score === null ? null : Number(match.team_b_score),
    createdAt: match.created_at,
  }));

  return <MatchesBrowser matches={items} />;
}
