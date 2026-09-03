"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type AdminTrophyActionState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const trophySchema = z.object({
  userId: z.string().uuid("กรุณากรอก User UUID ให้ถูกต้อง"),
  itemId: z.preprocess((value) => typeof value !== "string" || value.trim() === "" ? null : value, z.string().uuid().nullable()),
  title: z.string().trim().min(1, "กรุณากรอกชื่อ Trophy").max(120, "ชื่อ Trophy ยาวเกินไป"),
  description: z.string().trim().max(500, "รายละเอียด Trophy ยาวเกินไป"),
  icon: z.string().trim().min(1, "กรุณากรอก Icon").max(16, "Icon ยาวเกินไป"),
  rarityTier: z.enum(["white", "green", "blue", "purple", "orange", "red", "gold", "rainbow"]),
  sourceType: z.enum(["system", "admin", "group", "match", "tournament"]),
});

function textValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function awardTrophyAction(_previousState: AdminTrophyActionState, formData: FormData): Promise<AdminTrophyActionState> {
  const parsed = trophySchema.safeParse({
    userId: textValue(formData, "userId"),
    itemId: textValue(formData, "itemId"),
    title: textValue(formData, "title"),
    description: textValue(formData, "description"),
    icon: textValue(formData, "icon"),
    rarityTier: textValue(formData, "rarityTier"),
    sourceType: textValue(formData, "sourceType"),
  });

  if (!parsed.success) {
    return { error: "กรุณาตรวจสอบข้อมูล Trophy ให้ครบถ้วน", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_user_admin");
  if (adminError || isAdmin !== true) return { error: "บัญชีนี้ไม่มีสิทธิ์แจก Trophy" };

  const { error } = await supabase.rpc("admin_award_trophy", {
    p_user_id: parsed.data.userId,
    p_item_id: parsed.data.itemId,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_icon: parsed.data.icon,
    p_rarity_tier: parsed.data.rarityTier,
    p_source_type: parsed.data.sourceType,
  });

  if (error) {
    if (error.code === "42501") return { error: "บัญชีนี้ไม่มีสิทธิ์แจก Trophy" };
    if (error.code === "P0002") return { error: "ไม่พบ User หรือ Item ที่ระบุ" };
    return { error: "แจก Trophy ไม่สำเร็จ กรุณาตรวจสอบ User UUID และลองใหม่" };
  }

  revalidatePath("/admin/trophies");
  revalidatePath("/profile");
  return { message: "บันทึก Trophy ให้ User แล้ว" };
}
