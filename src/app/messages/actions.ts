"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type MessageActionState = { error?: string; message?: string };
const uuid = z.string().uuid();
function text(formData: FormData, key: string) { const value = formData.get(key); return typeof value === "string" ? value : ""; }
function messageError(error: { message?: string }) { const message = (error.message ?? "").toLowerCase(); if (message.includes("authentication")) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง"; if (message.includes("friends only")) return "ส่งข้อความได้เฉพาะเพื่อนที่รับคำขอแล้ว"; if (message.includes("not a member")) return "คุณไม่มีสิทธิ์ในบทสนทนานี้"; if (message.includes("invalid")) return "ข้อความไม่ถูกต้อง"; return "ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"; }
async function requireUser() { const result = await getAuthenticatedProfile(); if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required"); if (!result.profile?.profile_completed_at) redirect("/profile/setup"); return result; }

export async function sendDirectMessageAction(_previousState: MessageActionState, formData: FormData): Promise<MessageActionState> {
  const conversationId = uuid.safeParse(text(formData, "conversationId"));
  const body = z.string().trim().min(1, "กรุณาพิมพ์ข้อความ").max(2000, "ข้อความยาวเกิน 2,000 ตัวอักษร").safeParse(text(formData, "body"));
  if (!conversationId.success || !body.success) return { error: body.success ? "บทสนทนาไม่ถูกต้อง" : body.error.issues[0]?.message };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("send_direct_message", { p_conversation_id: conversationId.data, p_body: body.data });
  if (error) return { error: messageError(error) };
  revalidatePath("/messages");
  return { message: "ส่งข้อความแล้ว" };
}

export async function markDirectMessagesReadAction(_previousState: MessageActionState, formData: FormData): Promise<MessageActionState> {
  const conversationId = uuid.safeParse(text(formData, "conversationId"));
  if (!conversationId.success) return { error: "บทสนทนาไม่ถูกต้อง" };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("mark_direct_messages_read", { p_conversation_id: conversationId.data });
  if (error) return { error: messageError(error) };
  revalidatePath("/messages");
  return { message: "อ่านแล้ว" };
}
