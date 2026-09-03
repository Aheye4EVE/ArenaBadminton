"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type NotificationActionState = { error?: string; message?: string };
const idSchema = z.string().uuid("การแจ้งเตือนไม่ถูกต้อง");

export async function markNotificationReadAction(
  _previousState: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const id = idSchema.safeParse(formData.get("notificationId"));
  if (!id.success) return { error: "การแจ้งเตือนไม่ถูกต้อง" };

  const result = await getAuthenticatedProfile();
  if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required");
  const { error } = await result.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("user_id", result.user.id);
  if (error) return { error: "อัปเดตการแจ้งเตือนไม่สำเร็จ" };

  revalidatePath("/notifications");
  return { message: "อ่านแล้ว" };
}
