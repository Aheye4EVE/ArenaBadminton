"use client";

import { useActionState } from "react";
import { CheckCircle2, Coins, GitBranch, Plus, Trophy, XCircle } from "lucide-react";
import { generateTournamentBracketAction, upsertTournamentRewardAction, type TournamentActionState } from "@/app/events/actions";

type RewardItem = { id: string; name: string; icon: string };

function Feedback({ state }: { state: TournamentActionState }) {
  if (!state.error && !state.message) return null;
  return <p className={state.error ? "tournament-form-feedback tournament-form-feedback--error" : "tournament-form-feedback"} role={state.error ? "alert" : "status"}>{state.error ? <XCircle size={15} /> : <CheckCircle2 size={15} />}{state.error ?? state.message}</p>;
}

export default function TournamentOrganizerPanel({ tournamentId, items }: { tournamentId: string; items: RewardItem[] }) {
  const [bracketState, bracketAction, isCreating] = useActionState(generateTournamentBracketAction, {});
  const [rewardState, rewardAction, isSaving] = useActionState(upsertTournamentRewardAction, {});
  return <section className="tournament-organizer-panel"><div className="tournament-detail-panel__heading"><div><p lang="en">Organizer tools</p><h2><GitBranch size={19} /> เครื่องมือผู้จัด</h2></div><span>Database protected</span></div><div className="tournament-organizer-actions"><form action={bracketAction}><input type="hidden" name="tournamentId" value={tournamentId} /><button type="submit" className="group-primary-action" disabled={isCreating}><GitBranch size={15} /> {isCreating ? "กำลังสร้างสาย..." : "สร้าง / เปิดสายแข่ง"}</button></form><p>สร้างสายแบบ Single Elimination จากรายชื่อที่ยืนยันแล้ว ระบบจะสุ่มตาม Seed/เวลาสมัครและเดินสายเมื่อมีการยืนยันผล</p></div><Feedback state={bracketState} /><div className="tournament-reward-editor"><div className="tournament-reward-editor__heading"><Trophy size={17} /><strong>กำหนด Reward ตามอันดับ</strong><span>BP มาจากการแข่งและ Reward นี้เป็นโบนัสของกิจกรรม</span></div><form className="tournament-reward-grid" action={rewardAction}><input type="hidden" name="tournamentId" value={tournamentId} /><label><span>อันดับ</span><input name="placement" type="number" min="1" max="256" defaultValue="1" required /></label><label><span>EXP</span><input name="expReward" type="number" min="0" max="100000000" defaultValue="0" required /></label><label><span>BP</span><input name="bpReward" type="number" min="0" max="1000000" defaultValue="0" required /></label><label className="tournament-reward-grid__wide"><span>Item (ถ้ามี)</span><select name="itemId" defaultValue=""><option value="">ไม่แจก Item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.name}</option>)}</select></label><label className="tournament-reward-grid__wide"><span>ชื่อรางวัล</span><input name="label" maxLength={160} placeholder="เช่น Champion · Arena Cup" /></label><button type="submit" className="group-secondary-action" disabled={isSaving}><Plus size={14} /> {isSaving ? "กำลังบันทึก" : "บันทึกรางวัล"}</button></form><Feedback state={rewardState} /></div><p className="tournament-organizer-panel__note"><Coins size={14} /> ระบบยังไม่รับค่าสมัครเงินจริง ทุกกิจกรรมในช่วงนี้ตั้งเป็นฟรี และของรางวัลต้องอยู่ในขอบเขต Item/แต้มที่ระบบรองรับ</p></section>;
}
