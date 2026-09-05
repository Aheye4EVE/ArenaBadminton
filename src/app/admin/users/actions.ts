"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type AdminUsersActionState = {
  error?: string;
  message?: string;
};

const userIdSchema = z.string().uuid("User ID ไม่ถูกต้อง");
const roleSchema = z.enum(["user", "admin"]);
const signedAmountSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : Number(value)),
  z.number().int().min(-1_000_000_000).max(1_000_000_000).refine((value) => value !== 0, "จำนวน Point ต้องไม่เป็น 0"),
);

const adjustGemsSchema = z.object({
  userId: userIdSchema,
  amount: signedAmountSchema,
  reference: z.string().trim().min(3).max(160),
  idempotencyKey: z.string().trim().min(16).max(128),
});

const setRoleSchema = z.object({
  userId: userIdSchema,
  role: roleSchema,
});

function readFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function adminErrorMessage(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("admin access required")) return "บัญชีนี้ไม่มีสิทธิ์ Admin";
  if (message.includes("target user not found")) return "ไม่พบ User นี้ในระบบ";
  if (message.includes("insufficient gems")) return "ยอด Gems ของ User ไม่พอสำหรับการหัก Point";
  if (message.includes("last active admin")) return "ไม่สามารถถอดสิทธิ์ Admin คนสุดท้ายของระบบได้";
  if (message.includes("own admin access")) return "ไม่สามารถถอดสิทธิ์ Admin ของบัญชีตัวเองได้";
  if (message.includes("balance is out of range")) return "ยอด Gems เกินขอบเขตที่ระบบรองรับ";
  if (message.includes("idempotency key was already used")) return "รายการนี้ถูกดำเนินการไปแล้วด้วยรหัสคำขอเดิม";
  if (error.code === "23505") return "คำขอนี้ถูกดำเนินการไปแล้ว กรุณารีเฟรชข้อมูลอีกครั้ง";
  if (error.code === "22023") return "ข้อมูลการจัดการ User ไม่ถูกต้อง";
  return "ไม่สามารถดำเนินการจัดการ User ได้ กรุณาลองใหม่อีกครั้ง";
}

async function requireAdmin() {
  const result = await getAuthenticatedProfile();
  if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required");

  const { data, error } = await result.supabase.rpc("is_current_user_admin");
  if (error || data !== true) return null;
  return result.supabase;
}

export async function adjustUserGemsAction(
  _previousState: AdminUsersActionState,
  formData: FormData,
): Promise<AdminUsersActionState> {
  const parsed = adjustGemsSchema.safeParse({
    userId: readFormText(formData, "userId"),
    amount: readFormText(formData, "amount"),
    reference: readFormText(formData, "reference"),
    idempotencyKey: readFormText(formData, "idempotencyKey"),
  });

  if (!parsed.success) return { error: "กรุณาตรวจสอบ User ID, จำนวน Point และเหตุผลให้ถูกต้อง" };
  const supabase = await requireAdmin();
  if (!supabase) return { error: "บัญชีนี้ไม่มีสิทธิ์ Admin" };

  const { error } = await supabase.rpc("admin_adjust_gems", {
    p_user_id: parsed.data.userId,
    p_amount: parsed.data.amount,
    p_reference: parsed.data.reference,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) return { error: adminErrorMessage(error) };
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  revalidatePath("/shop");
  revalidatePath("/profile");
  return { message: parsed.data.amount > 0 ? "เพิ่ม Gems ให้ User แล้ว และบันทึก Audit Ledger เรียบร้อย" : "หัก Gems จาก User แล้ว และบันทึก Audit Ledger เรียบร้อย" };
}

export async function setUserRoleAction(
  _previousState: AdminUsersActionState,
  formData: FormData,
): Promise<AdminUsersActionState> {
  const parsed = setRoleSchema.safeParse({
    userId: readFormText(formData, "userId"),
    role: readFormText(formData, "role"),
  });

  if (!parsed.success) return { error: "กรุณาเลือก Role ให้ถูกต้อง" };
  const supabase = await requireAdmin();
  if (!supabase) return { error: "บัญชีนี้ไม่มีสิทธิ์ Admin" };

  const { error } = await supabase.rpc("admin_set_user_role", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  });

  if (error) return { error: adminErrorMessage(error) };
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return { message: parsed.data.role === "admin" ? "ตั้ง Role เป็น Admin แล้ว" : "ตั้ง Role เป็น User ปกติแล้ว" };
}
