"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type ShopActionState = {
  error?: string;
  message?: string;
};

const uuidSchema = z.string().uuid("รหัส Item ไม่ถูกต้อง");

const quantitySchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : Number(value)),
  z.number().int().min(1).max(99),
);

const purchaseSchema = z.object({
  itemId: uuidSchema,
  quantity: quantitySchema,
  idempotencyKey: z.string().trim().min(16).max(128),
});

function readFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function shopErrorMessage(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("authentication required")) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";
  if (message.includes("insufficient gems")) return "Gems ของคุณไม่เพียงพอ รายการเติมเงินจะเปิดใน Payment phase";
  if (message.includes("not found or inactive")) return "Item นี้ไม่พร้อมจำหน่ายแล้ว";
  if (message.includes("quantity is out of range")) return "จำนวนซื้อไม่ถูกต้อง";
  if (message.includes("idempotency key")) return "คำขอซื้อไม่ถูกต้อง กรุณารีเฟรชแล้วลองใหม่";
  if (message.includes("only exp booster")) return "Item นี้ยังไม่ใช่ประเภทที่ Equip ได้";
  if (message.includes("not in your inventory")) return "คุณยังไม่มี Item นี้ใน Inventory";
  if (error.code === "23505") return "รายการนี้ถูกดำเนินการไปแล้ว กรุณารีเฟรชหน้า Shop";
  if (error.code === "22023") return "ข้อมูลรายการซื้อไม่ถูกต้อง";
  return "ไม่สามารถทำรายการ Shop ได้ กรุณาลองใหม่อีกครั้ง";
}

async function requireCompletedProfile() {
  const result = await getAuthenticatedProfile();
  if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required");
  if (!result.profile?.profile_completed_at) redirect("/profile/setup");
  return result;
}

export async function purchaseShopItemAction(
  _previousState: ShopActionState,
  formData: FormData,
): Promise<ShopActionState> {
  const parsed = purchaseSchema.safeParse({
    itemId: readFormText(formData, "itemId"),
    quantity: readFormText(formData, "quantity"),
    idempotencyKey: readFormText(formData, "idempotencyKey"),
  });

  if (!parsed.success) return { error: "ข้อมูลการซื้อไม่ถูกต้อง กรุณารีเฟรชแล้วลองใหม่" };

  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("purchase_shop_item", {
    p_item_id: parsed.data.itemId,
    p_quantity: parsed.data.quantity,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error) return { error: shopErrorMessage(error) };
  revalidatePath("/shop");
  revalidatePath("/profile");
  return { message: "ซื้อ Item สำเร็จและเพิ่มเข้า Inventory แล้ว" };
}

export async function setShopItemEquippedAction(
  _previousState: ShopActionState,
  formData: FormData,
): Promise<ShopActionState> {
  const itemId = uuidSchema.safeParse(readFormText(formData, "itemId"));
  const equipped = z.enum(["true", "false"]).safeParse(readFormText(formData, "equipped"));
  if (!itemId.success || !equipped.success) return { error: "ข้อมูลการ Equip ไม่ถูกต้อง" };

  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("set_shop_item_equipped", {
    p_item_id: itemId.data,
    p_equipped: equipped.data === "true",
  });

  if (error) return { error: shopErrorMessage(error) };
  revalidatePath("/shop");
  revalidatePath("/matches");
  return { message: equipped.data === "true" ? "Equip EXP Booster แล้ว" : "ถอด EXP Booster แล้ว" };
}
