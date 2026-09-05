"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type ModerationActionState = { error?: string; message?: string };
const targetTypes = ["post", "comment", "group", "match", "profile", "tournament", "venue", "venue_review", "guild", "marketplace_listing"] as const;
function text(formData: FormData, key: string) { const value = formData.get(key); return typeof value === "string" ? value : ""; }
function safeReturnTo(value: string) { return value.startsWith("/") && !value.startsWith("//") ? value.slice(0, 300) : "/community"; }
export async function createModerationReportAction(_previousState: ModerationActionState, formData: FormData): Promise<ModerationActionState> {
  const parsed = z.object({ targetType: z.enum(targetTypes), targetId: z.string().uuid(), reason: z.string().trim().min(1).max(120), details: z.string().trim().max(1000), returnTo: z.string() }).safeParse({ targetType: text(formData, "targetType"), targetId: text(formData, "targetId"), reason: text(formData, "reason"), details: text(formData, "details"), returnTo: text(formData, "returnTo") });
  if (!parsed.success) return { error: "กรุณากรอกข้อมูลรายงานให้ครบถ้วน" };
  const { supabase } = await getAuthenticatedProfile();
  if (!supabase) redirect("/auth/login?message=auth_required");
  const { error } = await supabase.rpc("create_moderation_report", { p_target_type: parsed.data.targetType, p_target_id: parsed.data.targetId, p_reason: parsed.data.reason, p_details: parsed.data.details });
  if (error) return { error: "ส่งรายงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  revalidatePath("/admin/moderation");
  redirect(`${safeReturnTo(parsed.data.returnTo)}?reported=1`);
}
