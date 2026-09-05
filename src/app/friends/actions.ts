"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type FriendActionState = { error?: string; message?: string };
const uuid = z.string().uuid();

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function friendError(error: { message?: string; code?: string }) {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("authentication")) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";
  if (message.includes("profile completion")) return "กรุณากรอก Profile ให้ครบก่อนเพิ่มเพื่อน";
  if (message.includes("already friends")) return "คุณเป็นเพื่อนกับผู้เล่นคนนี้อยู่แล้ว";
  if (message.includes("already pending")) return "ส่งคำขอเป็นเพื่อนไปแล้ว กำลังรอการตอบรับ";
  if (message.includes("incoming friend request")) return "ผู้เล่นคนนี้ส่งคำขอมาให้คุณแล้ว ไปที่คำขอเข้าเพื่อกดรับได้เลย";
  if (message.includes("not found")) return "คำขอเป็นเพื่อนนี้ไม่พร้อมใช้งานแล้ว";
  if (message.includes("access denied") || message.includes("only the recipient")) return "คุณไม่มีสิทธิ์จัดการคำขอนี้";
  if (message.includes("invalid")) return "ข้อมูลเพื่อนไม่ถูกต้อง";
  if (error.code === "23505") return "คำขอนี้มีอยู่แล้ว";
  return "จัดการเพื่อนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

async function requireCompletedProfile() {
  const result = await getAuthenticatedProfile();
  if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required&next=/friends");
  if (!result.profile?.profile_completed_at) redirect("/profile/setup");
  return result;
}

function refreshFriendSurfaces() {
  revalidatePath("/friends");
  revalidatePath("/profile");
  revalidatePath("/");
}

export async function sendFriendRequestAction(_previousState: FriendActionState, formData: FormData): Promise<FriendActionState> {
  const otherUserId = uuid.safeParse(text(formData, "otherUserId"));
  if (!otherUserId.success) return { error: "ผู้เล่นไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("send_friend_request", { p_other_user_id: otherUserId.data });
  if (error) return { error: friendError(error) };
  refreshFriendSurfaces();
  return { message: "ส่งคำขอเป็นเพื่อนแล้ว" };
}

export async function respondFriendRequestAction(_previousState: FriendActionState, formData: FormData): Promise<FriendActionState> {
  const friendshipId = uuid.safeParse(text(formData, "friendshipId"));
  const decision = z.enum(["accept", "decline"]).safeParse(text(formData, "decision"));
  if (!friendshipId.success || !decision.success) return { error: "คำขอเป็นเพื่อนไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("respond_friend_request", { p_friendship_id: friendshipId.data, p_accept: decision.data === "accept" });
  if (error) return { error: friendError(error) };
  refreshFriendSurfaces();
  revalidatePath("/messages");
  return { message: decision.data === "accept" ? "รับเป็นเพื่อนแล้ว เริ่มคุยผ่าน Messenger ได้เลย" : "ปฏิเสธคำขอแล้ว" };
}

export async function cancelFriendRequestAction(_previousState: FriendActionState, formData: FormData): Promise<FriendActionState> {
  const friendshipId = uuid.safeParse(text(formData, "friendshipId"));
  if (!friendshipId.success) return { error: "คำขอเป็นเพื่อนไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("cancel_friend_request", { p_friendship_id: friendshipId.data });
  if (error) return { error: friendError(error) };
  refreshFriendSurfaces();
  return { message: "ยกเลิกคำขอแล้ว" };
}

export async function removeFriendAction(_previousState: FriendActionState, formData: FormData): Promise<FriendActionState> {
  const otherUserId = uuid.safeParse(text(formData, "otherUserId"));
  if (!otherUserId.success) return { error: "ผู้เล่นไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("remove_friend", { p_other_user_id: otherUserId.data });
  if (error) return { error: friendError(error) };
  refreshFriendSurfaces();
  revalidatePath("/messages");
  return { message: "นำผู้เล่นออกจากเพื่อนแล้ว" };
}
