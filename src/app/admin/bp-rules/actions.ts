"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type BpRuleActionState = { error?: string; message?: string };

const integerField = (min: number, max: number) => z.preprocess((value) => Number(value), z.number().int().min(min).max(max));
const schema = z.object({
  ruleVersion: z.string().trim().min(1).max(80),
  baseWinBp: integerField(1, 100000),
  baseLossBp: integerField(1, 100000),
  upsetBonusPerLevel: integerField(0, 10000),
  favoriteWinPenaltyPerLevel: integerField(0, 10000),
  upsetLossPenaltyPerLevel: integerField(0, 10000),
  favoriteLossProtectionPerLevel: integerField(0, 10000),
  minWinDelta: integerField(1, 100000),
  maxWinDelta: integerField(1, 100000),
  minLossDelta: integerField(1, 100000),
  maxLossDelta: integerField(1, 100000),
}).superRefine((data, context) => {
  if (data.maxWinDelta < data.minWinDelta) context.addIssue({ code: "custom", path: ["maxWinDelta"], message: "ค่าสูงสุดต้องไม่น้อยกว่าค่าต่ำสุด" });
  if (data.maxLossDelta < data.minLossDelta) context.addIssue({ code: "custom", path: ["maxLossDelta"], message: "ค่าสูงสุดต้องไม่น้อยกว่าค่าต่ำสุด" });
});

function formText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function requireAdmin() {
  const result = await getAuthenticatedProfile();
  if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required");
  const { data, error } = await result.supabase.rpc("is_current_user_admin");
  if (error || data !== true) return null;
  return result.supabase;
}

export async function updateBpRulesAction(_previousState: BpRuleActionState, formData: FormData): Promise<BpRuleActionState> {
  const parsed = schema.safeParse({
    ruleVersion: formText(formData, "ruleVersion"),
    baseWinBp: formText(formData, "baseWinBp"),
    baseLossBp: formText(formData, "baseLossBp"),
    upsetBonusPerLevel: formText(formData, "upsetBonusPerLevel"),
    favoriteWinPenaltyPerLevel: formText(formData, "favoriteWinPenaltyPerLevel"),
    upsetLossPenaltyPerLevel: formText(formData, "upsetLossPenaltyPerLevel"),
    favoriteLossProtectionPerLevel: formText(formData, "favoriteLossProtectionPerLevel"),
    minWinDelta: formText(formData, "minWinDelta"),
    maxWinDelta: formText(formData, "maxWinDelta"),
    minLossDelta: formText(formData, "minLossDelta"),
    maxLossDelta: formText(formData, "maxLossDelta"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบกติกา BP" };

  const supabase = await requireAdmin();
  if (!supabase) return { error: "บัญชีนี้ไม่มีสิทธิ์ Admin" };
  const { error } = await supabase.rpc("admin_update_bp_rules", {
    p_rule_version: parsed.data.ruleVersion,
    p_base_win_bp: parsed.data.baseWinBp,
    p_base_loss_bp: parsed.data.baseLossBp,
    p_upset_bonus_per_level: parsed.data.upsetBonusPerLevel,
    p_favorite_win_penalty_per_level: parsed.data.favoriteWinPenaltyPerLevel,
    p_upset_loss_penalty_per_level: parsed.data.upsetLossPenaltyPerLevel,
    p_favorite_loss_protection_per_level: parsed.data.favoriteLossProtectionPerLevel,
    p_min_win_delta: parsed.data.minWinDelta,
    p_max_win_delta: parsed.data.maxWinDelta,
    p_min_loss_delta: parsed.data.minLossDelta,
    p_max_loss_delta: parsed.data.maxLossDelta,
  });
  if (error) {
    const message = (error.message ?? "").toLowerCase();
    return { error: message.includes("admin access") ? "บัญชีนี้ไม่มีสิทธิ์ Admin" : "บันทึกกติกา BP ไม่สำเร็จ" };
  }

  revalidatePath("/admin/bp-rules");
  revalidatePath("/profile");
  revalidatePath("/ranking");
  return { message: "บันทึกกติกา BP และ Version ใหม่แล้ว" };
}
