"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type AdminShopActionState = {
  error?: string;
  message?: string;
};

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().uuid("รหัส Item ไม่ถูกต้อง").nullable(),
);

const integerField = (min: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : Number(value)),
    z.number().int().min(min).max(max),
  );

const saveItemSchema = z
  .object({
    itemId: optionalUuid,
    slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/, "Slug ต้องเป็น a-z, 0-9 และขีดกลาง"),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500),
    itemType: z.enum(["exp_booster", "badge", "title", "cosmetic"]),
    rarityTier: z.enum(["white", "green", "blue", "purple", "orange", "red", "gold", "rainbow"]),
    icon: z.string().trim().min(1).max(16),
    effectType: z.enum(["none", "exp_boost"]),
    effectValue: integerField(0, 100),
    priceGems: integerField(0, 1_000_000_000),
    isActive: z.enum(["true", "false"]),
    sortOrder: integerField(-32768, 32767),
  })
  .superRefine((data, context) => {
    if (data.effectType === "none" && data.effectValue !== 0) {
      context.addIssue({ code: "custom", path: ["effectValue"], message: "Effect แบบ none ต้องมีค่า 0" });
    }
    if (data.effectType === "exp_boost" && !["exp_booster", "badge"].includes(data.itemType)) {
      context.addIssue({ code: "custom", path: ["effectType"], message: "เฉพาะ Booster หรือ Badge ที่เพิ่ม EXP ได้" });
    }
    if (data.effectType === "exp_boost" && data.effectValue < 1) {
      context.addIssue({ code: "custom", path: ["effectValue"], message: "EXP Boost ต้องมากกว่า 0" });
    }
  });

const creditSchema = z.object({
  userId: z.string().uuid("User ID ไม่ถูกต้อง"),
  amount: integerField(1, 1_000_000_000),
  reference: z.string().trim().min(3).max(160),
  idempotencyKey: z.string().trim().min(16).max(128),
});

function readFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function adminErrorMessage(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("admin access required")) return "บัญชีนี้ไม่มีสิทธิ์ Admin";
  if (message.includes("target user not found")) return "ไม่พบ User ID นี้ในระบบ";
  if (message.includes("text is out of range")) return "ข้อความของ Item ยาวเกินข้อกำหนด";
  if (message.includes("configuration is invalid") || message.includes("effect is invalid")) return "การตั้งค่า Item ไม่ถูกต้อง";
  if (message.includes("balance is out of range")) return "ยอด Gems เกินขอบเขตที่ระบบรองรับ";
  if (error.code === "23505") return "Slug นี้ถูกใช้แล้ว หรือคำขอนี้ถูกดำเนินการไปแล้ว";
  if (error.code === "22023") return "ข้อมูล Admin ไม่ถูกต้อง";
  return "ไม่สามารถดำเนินการ Admin Shop ได้ กรุณาลองใหม่อีกครั้ง";
}

async function requireAdmin() {
  const result = await getAuthenticatedProfile();
  if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required");

  const { data, error } = await result.supabase.rpc("is_current_user_admin");
  if (error || data !== true) return null;
  return result.supabase;
}

export async function saveShopItemAction(
  _previousState: AdminShopActionState,
  formData: FormData,
): Promise<AdminShopActionState> {
  const parsed = saveItemSchema.safeParse({
    itemId: readFormText(formData, "itemId"),
    slug: readFormText(formData, "slug"),
    name: readFormText(formData, "name"),
    description: readFormText(formData, "description"),
    itemType: readFormText(formData, "itemType"),
    rarityTier: readFormText(formData, "rarityTier"),
    icon: readFormText(formData, "icon"),
    effectType: readFormText(formData, "effectType"),
    effectValue: readFormText(formData, "effectValue"),
    priceGems: readFormText(formData, "priceGems"),
    isActive: readFormText(formData, "isActive"),
    sortOrder: readFormText(formData, "sortOrder"),
  });

  if (!parsed.success) return { error: "กรุณาตรวจสอบข้อมูล Item ให้ครบถ้วนและถูกต้อง" };
  const supabase = await requireAdmin();
  if (!supabase) return { error: "บัญชีนี้ไม่มีสิทธิ์ Admin" };

  const { error } = await supabase.rpc("admin_save_shop_item", {
    p_item_id: parsed.data.itemId,
    p_slug: parsed.data.slug,
    p_name: parsed.data.name,
    p_description: parsed.data.description,
    p_item_type: parsed.data.itemType,
    p_rarity_tier: parsed.data.rarityTier,
    p_icon: parsed.data.icon,
    p_effect_type: parsed.data.effectType,
    p_effect_value: parsed.data.effectValue,
    p_price_gems: parsed.data.priceGems,
    p_is_active: parsed.data.isActive === "true",
    p_sort_order: parsed.data.sortOrder,
  });

  if (error) return { error: adminErrorMessage(error) };
  revalidatePath("/admin/shop");
  revalidatePath("/shop");
  return { message: parsed.data.itemId ? "อัปเดต Item แล้ว" : "สร้าง Item แล้ว" };
}

export async function creditGemsAction(
  _previousState: AdminShopActionState,
  formData: FormData,
): Promise<AdminShopActionState> {
  const parsed = creditSchema.safeParse({
    userId: readFormText(formData, "userId"),
    amount: readFormText(formData, "amount"),
    reference: readFormText(formData, "reference"),
    idempotencyKey: readFormText(formData, "idempotencyKey"),
  });

  if (!parsed.success) return { error: "กรุณาตรวจสอบ User ID, จำนวน Gems และเหตุผลให้ถูกต้อง" };
  const supabase = await requireAdmin();
  if (!supabase) return { error: "บัญชีนี้ไม่มีสิทธิ์ Admin" };

  const { error } = await supabase.rpc("admin_credit_gems", {
    p_user_id: parsed.data.userId,
    p_amount: parsed.data.amount,
    p_reference: parsed.data.reference,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) return { error: adminErrorMessage(error) };
  revalidatePath("/admin/shop");
  revalidatePath("/shop");
  return { message: "เติม Gems ให้ User แล้ว และบันทึก Audit Ledger เรียบร้อย" };
}
