import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import BpRuleEditor, { type BpRules } from "@/components/bp-rule-editor";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "BP Rule Editor | Arena-Badminton" };
export const dynamic = "force-dynamic";

function numberValue(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export default async function BpRulesPage() {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_user_admin");
  if (adminError || isAdmin !== true) notFound();
  const { data, error } = await supabase.from("bp_rule_configs").select("id, rule_version, min_bp, base_win_bp, base_loss_bp, upset_bonus_per_level, favorite_win_penalty_per_level, upset_loss_penalty_per_level, favorite_loss_protection_per_level, min_win_delta, max_win_delta, min_loss_delta, max_loss_delta").eq("id", "default").maybeSingle();
  if (error || !data) return <p>โหลดกติกา BP ไม่สำเร็จ</p>;
  const row = data as Record<string, unknown>;
  const rules: BpRules = {
    ruleVersion: typeof row.rule_version === "string" ? row.rule_version : "bp-v1",
    minBp: numberValue(row.min_bp, 1000),
    baseWinBp: numberValue(row.base_win_bp),
    baseLossBp: numberValue(row.base_loss_bp),
    upsetBonusPerLevel: numberValue(row.upset_bonus_per_level),
    favoriteWinPenaltyPerLevel: numberValue(row.favorite_win_penalty_per_level),
    upsetLossPenaltyPerLevel: numberValue(row.upset_loss_penalty_per_level),
    favoriteLossProtectionPerLevel: numberValue(row.favorite_loss_protection_per_level),
    minWinDelta: numberValue(row.min_win_delta),
    maxWinDelta: numberValue(row.max_win_delta),
    minLossDelta: numberValue(row.min_loss_delta),
    maxLossDelta: numberValue(row.max_loss_delta),
  };
  return <BpRuleEditor rules={rules} />;
}
