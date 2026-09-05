import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MessagesBrowser, { type DirectConversation, type DirectMessage } from "@/components/messages-browser";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { safeMediaUrl } from "@/lib/safe-media-url";

export const metadata: Metadata = { title: "Messages | Arena-Badminton" };
export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function first(params: Record<string, string | string[] | undefined>, key: string) { const value = params[key]; return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function row(data: unknown) { return Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : data as Record<string, unknown> | undefined; }

export default async function MessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required&next=/messages");
  if (!profile?.profile_completed_at) redirect("/profile/setup");
  const params = await searchParams;
  let selectedId = uuidPattern.test(first(params, "conversation")) ? first(params, "conversation") : "";
  const otherUserId = first(params, "user");
  let friendOnlyNotice = false;
  if (uuidPattern.test(otherUserId) && otherUserId !== user.id) {
    const { data, error } = await supabase.rpc("get_or_create_direct_conversation", { p_other_user_id: otherUserId });
    const created = row(data);
    if (typeof created?.id === "string") selectedId = created.id;
    friendOnlyNotice = Boolean(error?.message.toLowerCase().includes("friends only"));
  }

  const [{ data: memberships }, { data: friendshipRows }] = await Promise.all([
    supabase.from("direct_conversation_members").select("conversation_id").eq("user_id", user.id),
    supabase.from("user_friendships").select("low_user_id, high_user_id").eq("status", "accepted").or(`low_user_id.eq.${user.id},high_user_id.eq.${user.id}`),
  ]);
  const friendIds = new Set(((friendshipRows ?? []) as Array<{ low_user_id: string; high_user_id: string }>).map((friendship) => friendship.low_user_id === user.id ? friendship.high_user_id : friendship.low_user_id));
  const conversationIds = [...new Set(((memberships ?? []) as Array<{ conversation_id: string }>).map((membership) => membership.conversation_id))];
  const { data: conversationRows } = conversationIds.length > 0 ? await supabase.from("direct_conversations").select("id, last_message_at, updated_at").in("id", conversationIds).order("last_message_at", { ascending: false, nullsFirst: false }) : { data: [] as Array<Record<string, unknown>> };
  const { data: memberRows } = conversationIds.length > 0 ? await supabase.from("direct_conversation_members").select("conversation_id, user_id").in("conversation_id", conversationIds) : { data: [] as Array<Record<string, unknown>> };
  const otherIds = [...new Set(((memberRows ?? []) as Array<Record<string, unknown>>).filter((member) => String(member.user_id) !== user.id).map((member) => String(member.user_id)))];
  const { data: otherProfiles } = otherIds.length > 0 ? await supabase.from("public_profile_directory").select("id, display_name, handle, avatar_url").in("id", otherIds) : { data: [] as Array<Record<string, unknown>> };
  const profileMap = new Map(((otherProfiles ?? []) as Array<Record<string, unknown>>).map((person) => [String(person.id), person]));
  const otherByConversation = new Map<string, string>();
  for (const member of (memberRows ?? []) as Array<Record<string, unknown>>) if (String(member.user_id) !== user.id) otherByConversation.set(String(member.conversation_id), String(member.user_id));
  const conversations: DirectConversation[] = ((conversationRows ?? []) as Array<Record<string, unknown>>).flatMap((conversation) => { const conversationId = String(conversation.id); const otherId = otherByConversation.get(conversationId); const person = otherId ? profileMap.get(otherId) : undefined; if (!otherId || !person || !friendIds.has(otherId)) return []; return [{ id: conversationId, otherUserId: otherId, otherName: typeof person.display_name === "string" ? person.display_name : "ผู้เล่น Arena", otherHandle: typeof person.handle === "string" ? person.handle : "arena_player", otherAvatarUrl: safeMediaUrl(person.avatar_url), lastMessageAt: typeof conversation.last_message_at === "string" ? conversation.last_message_at : null }]; });
  if (!selectedId || !conversations.some((conversation) => conversation.id === selectedId)) selectedId = conversations[0]?.id ?? "";
  const { data: messageRows } = selectedId ? await supabase.from("direct_messages").select("id, conversation_id, sender_id, body, created_at, read_at").eq("conversation_id", selectedId).order("created_at", { ascending: true }).limit(200) : { data: [] as Array<Record<string, unknown>> };
  const initialMessages: DirectMessage[] = ((messageRows ?? []) as Array<Record<string, unknown>>).map((message) => ({ id: String(message.id), conversationId: String(message.conversation_id), senderId: String(message.sender_id), body: String(message.body), createdAt: String(message.created_at), readAt: typeof message.read_at === "string" ? message.read_at : null }));
  return <MessagesBrowser conversations={conversations} selectedConversationId={selectedId || null} initialMessages={initialMessages} currentUserId={user.id} friendOnlyNotice={friendOnlyNotice} />;
}
