import type { Metadata } from "next";
import { redirect } from "next/navigation";
import FriendsBrowser, { type FriendPerson, type FriendRequest, type FriendSearchPerson } from "@/components/friends-browser";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { safeMediaUrl } from "@/lib/safe-media-url";

export const metadata: Metadata = { title: "เพื่อน | Arena-Badminton" };
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type FriendshipRow = { id: string; low_user_id: string; high_user_id: string; requested_by: string; status: string };
type DirectoryRow = { id: string; display_name: string; handle: string; avatar_url: string | null; level: number };

function first(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function cleanSearch(value: string) {
  return value.replace(/[^A-Za-z0-9ก-๙ _@.-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

function otherId(row: FriendshipRow, currentUserId: string) {
  return row.low_user_id === currentUserId ? row.high_user_id : row.low_user_id;
}

function person(row: DirectoryRow): FriendPerson {
  return { id: row.id, displayName: row.display_name || "ผู้เล่น Arena", handle: row.handle || "arena_player", avatarUrl: safeMediaUrl(row.avatar_url), level: Number.isFinite(Number(row.level)) ? Number(row.level) : 1 };
}

export default async function FriendsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required&next=/friends");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const params = await searchParams;
  const query = cleanSearch(first(params, "q"));
  const focusedPersonId = uuidPattern.test(first(params, "user")) && first(params, "user") !== user.id ? first(params, "user") : null;
  const { data: relationshipRows } = await supabase
    .from("user_friendships")
    .select("id, low_user_id, high_user_id, requested_by, status")
    .or(`low_user_id.eq.${user.id},high_user_id.eq.${user.id}`);
  const relationships = (relationshipRows ?? []) as FriendshipRow[];

  let directoryQuery = supabase
    .from("public_profile_directory")
    .select("id, display_name, handle, avatar_url, level")
    .neq("id", user.id)
    .limit(30);
  if (focusedPersonId) directoryQuery = directoryQuery.eq("id", focusedPersonId);
  else if (query) directoryQuery = directoryQuery.or(`display_name.ilike.%${query}%,handle.ilike.%${query}%`);
  else directoryQuery = directoryQuery.limit(0);
  const { data: directoryRows } = await directoryQuery;

  const relationshipByPerson = new Map<string, FriendshipRow>();
  for (const relationship of relationships) relationshipByPerson.set(otherId(relationship, user.id), relationship);
  const directoryById = new Map(((directoryRows ?? []) as DirectoryRow[]).map((row) => [row.id, person(row)]));

  const friendIds = relationships.filter((relationship) => relationship.status === "accepted").map((relationship) => otherId(relationship, user.id));
  const requestIds = relationships.filter((relationship) => relationship.status === "pending").map((relationship) => otherId(relationship, user.id));
  const missingIds = [...new Set([...friendIds, ...requestIds].filter((id) => !directoryById.has(id)))];
  if (missingIds.length > 0) {
    const { data: missingRows } = await supabase.from("public_profile_directory").select("id, display_name, handle, avatar_url, level").in("id", missingIds);
    for (const row of (missingRows ?? []) as DirectoryRow[]) directoryById.set(row.id, person(row));
  }

  const friends: FriendPerson[] = friendIds.flatMap((id) => { const value = directoryById.get(id); return value ? [value] : []; });
  const incoming: FriendRequest[] = relationships.filter((relationship) => relationship.status === "pending" && relationship.requested_by !== user.id).flatMap((relationship) => { const value = directoryById.get(otherId(relationship, user.id)); return value ? [{ ...value, friendshipId: relationship.id }] : []; });
  const outgoing: FriendRequest[] = relationships.filter((relationship) => relationship.status === "pending" && relationship.requested_by === user.id).flatMap((relationship) => { const value = directoryById.get(otherId(relationship, user.id)); return value ? [{ ...value, friendshipId: relationship.id }] : []; });
  const searchResults: FriendSearchPerson[] = ((directoryRows ?? []) as DirectoryRow[]).map((row) => {
    const value = person(row);
    const relationship = relationshipByPerson.get(row.id);
    const status = relationship?.status === "pending" || relationship?.status === "accepted" || relationship?.status === "declined" ? relationship.status : "none";
    return { ...value, friendshipId: relationship?.id ?? null, relationshipStatus: status, requestDirection: relationship?.status === "pending" ? relationship.requested_by === user.id ? "outgoing" : "incoming" : "none" };
  });

  return <FriendsBrowser query={query} focusedPersonId={focusedPersonId} searchResults={searchResults} incoming={incoming} outgoing={outgoing} friends={friends} />;
}
