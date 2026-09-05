"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type AdminAuthActionState = { error?: string; message?: string };

export async function updateEmailVerificationAction(_previousState: AdminAuthActionState, formData: FormData): Promise<AdminAuthActionState> {
  const required = z.enum(["true", "false"]).safeParse(formData.get("emailVerificationRequired"));
  if (!required.success) return { error: "ค่าการยืนยัน Email ไม่ถูกต้อง" };

  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };

  const { error } = await supabase.rpc("admin_update_email_verification_settings", { p_required: required.data === "true" });
  if (error) {
    if (error.message.toLowerCase().includes("admin access")) return { error: "บัญชีนี้ไม่มีสิทธิ์ Admin" };
    return { error: "บันทึกนโยบายยืนยัน Email ไม่สำเร็จ" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/auth");
  revalidatePath("/auth/login");
  return { message: required.data === "true" ? "เปิดการยืนยัน Email แล้ว" : "ปิดการยืนยัน Email ในกติกาของ Arena แล้ว" };
}
