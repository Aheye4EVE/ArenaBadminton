"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
export type AdminModerationActionState = { error?: string; message?: string };
export async function updateModerationReportAction(_previousState: AdminModerationActionState, formData: FormData): Promise<AdminModerationActionState> {
  const reportId = z.string().uuid().safeParse(formData.get("reportId"));
  const status = z.enum(["reviewing", "resolved", "dismissed"]).safeParse(formData.get("status"));
  if (!reportId.success || !status.success) return { error: "รายงานไม่ถูกต้อง" };
  const { supabase } = await getAuthenticatedProfile();
  if (!supabase) return { error: "เซสชันหมดอายุ" };
  const { error } = await supabase.rpc("admin_update_moderation_report", { p_report_id: reportId.data, p_status: status.data });
  if (error) return { error: "อัปเดตสถานะรายงานไม่สำเร็จ" };
  revalidatePath("/admin/moderation");
  return { message: "อัปเดตรายงานแล้ว" };
}
