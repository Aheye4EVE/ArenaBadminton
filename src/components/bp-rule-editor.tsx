"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Check, LockKeyhole, Save, ShieldCheck, Sparkles } from "lucide-react";
import { updateBpRulesAction, type BpRuleActionState } from "@/app/admin/bp-rules/actions";

export type BpRules = {
  ruleVersion: string;
  minBp: number;
  baseWinBp: number;
  baseLossBp: number;
  upsetBonusPerLevel: number;
  favoriteWinPenaltyPerLevel: number;
  upsetLossPenaltyPerLevel: number;
  favoriteLossProtectionPerLevel: number;
  minWinDelta: number;
  maxWinDelta: number;
  minLossDelta: number;
  maxLossDelta: number;
};

function Feedback({ state }: { state: BpRuleActionState }) {
  if (!state.error && !state.message) return null;
  return <p className={`bp-rule-feedback ${state.error ? "bp-rule-feedback--error" : "bp-rule-feedback--success"}`} role={state.error ? "alert" : "status"}>{state.error ? <Sparkles size={15} /> : <Check size={15} />}{state.error ?? state.message}</p>;
}

function RuleField({ name, label, value, help }: { name: string; label: string; value: number | string; help?: string }) {
  return <label className="bp-rule-field"><span>{label}</span><input name={name} defaultValue={value} type={typeof value === "number" ? "number" : "text"} required />{help ? <small>{help}</small> : null}</label>;
}

export default function BpRuleEditor({ rules }: { rules: BpRules }) {
  const [state, action, isPending] = useActionState(updateBpRulesAction, {});
  return <main className="bp-rules-page"><div className="bp-rules-shell"><header className="bp-rules-topbar"><Link href="/" className="bp-rules-brand"><span>Arena</span><em>-Badminton</em></Link><nav><Link href="/admin/shop">Admin Shop</Link><Link href="/profile">Profile</Link></nav></header><section className="bp-rules-hero"><div><p lang="en">Battle Board Control</p><h1>ตั้งค่ากติกา Skill BP</h1><span>ผู้จัดกำหนดได้เฉพาะ EXP ส่วน BP ถูกคุมด้วยกติกากลางของระบบ</span></div><div className="bp-rules-hero__floor"><LockKeyhole size={19} /><strong>{rules.minBp.toLocaleString("th-TH")}</strong><small>BP Floor</small></div></section><form className="bp-rules-form" action={action}><div className="bp-rules-form__header"><div><p lang="en">Admin-only settings</p><h2>กติกา Version ปัจจุบัน</h2></div><span>Database RPC protected</span></div><Feedback state={state} /><div className="bp-rules-section"><h3>Version และรางวัลพื้นฐาน</h3><div className="bp-rule-grid"><RuleField name="ruleVersion" label="Rule Version" value={rules.ruleVersion} /><RuleField name="baseWinBp" label="ชนะได้ BP พื้นฐาน" value={rules.baseWinBp} /><RuleField name="baseLossBp" label="แพ้เสีย BP พื้นฐาน" value={rules.baseLossBp} /></div></div><div className="bp-rules-section"><h3>Level Difference Modifier</h3><div className="bp-rule-grid"><RuleField name="upsetBonusPerLevel" label="Upset bonus / Level" value={rules.upsetBonusPerLevel} help="ทีม Level ต่ำกว่าชนะ" /><RuleField name="favoriteWinPenaltyPerLevel" label="Favorite win penalty / Level" value={rules.favoriteWinPenaltyPerLevel} help="ชนะตามคาดจะลดโบนัส" /><RuleField name="upsetLossPenaltyPerLevel" label="Upset loss penalty / Level" value={rules.upsetLossPenaltyPerLevel} help="ทีม Level ต่ำกว่าแพ้" /><RuleField name="favoriteLossProtectionPerLevel" label="Favorite loss protection / Level" value={rules.favoriteLossProtectionPerLevel} help="ทีม Level สูงกว่าแพ้" /></div></div><div className="bp-rules-section"><h3>ขอบเขตการเปลี่ยน BP</h3><div className="bp-rule-grid"><RuleField name="minWinDelta" label="ชนะขั้นต่ำ" value={rules.minWinDelta} /><RuleField name="maxWinDelta" label="ชนะสูงสุด" value={rules.maxWinDelta} /><RuleField name="minLossDelta" label="แพ้ขั้นต่ำ" value={rules.minLossDelta} /><RuleField name="maxLossDelta" label="แพ้สูงสุด" value={rules.maxLossDelta} /></div></div><div className="bp-rules-notice"><ShieldCheck size={17} /><span>ระบบจะบันทึก Rule Version ไปกับ Settlement และ Ledger ทุกครั้ง เพื่อให้ตรวจสอบย้อนหลังได้</span></div><button type="submit" className="bp-rule-save" disabled={isPending}><Save size={16} />{isPending ? "กำลังบันทึก..." : "บันทึกกติกา BP"}</button></form><footer className="bp-rules-footer"><span>Admin · BP rule editor</span><span>BP ต่ำสุดถูกล็อกไว้ที่ 1,000</span></footer></div></main>;
}
