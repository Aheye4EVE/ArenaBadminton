"use client";

import { useActionState } from "react";
import { CheckCircle2, Clock3, Flag, LogIn, Send, ShieldCheck } from "lucide-react";
import {
  checkInMatchAction,
  confirmMatchResultAction,
  markMatchAttendanceAction,
  submitMatchResultAction,
  type MatchActionState,
} from "@/app/matches/actions";

type MatchParticipant = {
  user_id: string;
  team: "a" | "b";
  display_name: string;
  check_in_status: string;
};

function Feedback({ state, tone = "error" }: { state: MatchActionState; tone?: "error" | "success" }) {
  if (!state.error && !state.message) return null;
  if (state.error) return <p className="match-feedback match-feedback--error" role="alert">{state.error}</p>;
  return <p className={`match-feedback match-feedback--${tone}`} role="status"><CheckCircle2 size={15} /> {state.message}</p>;
}

function AttendanceLabel({ status }: { status: string }) {
  if (status === "checked_in") return <span className="match-checkin-pill match-checkin-pill--done"><CheckCircle2 size={13} /> เช็กอินแล้ว</span>;
  if (status === "no_show") return <span className="match-checkin-pill match-checkin-pill--no-show"><Flag size={13} /> ไม่มาแข่ง</span>;
  if (status === "excused") return <span className="match-checkin-pill match-checkin-pill--excused"><ShieldCheck size={13} /> ยกเว้น</span>;
  return <span className="match-checkin-pill"><Clock3 size={13} /> รอเช็กอิน</span>;
}

export default function MatchActions({
  matchId,
  status,
  currentUserId,
  currentCheckInStatus,
  submittedBy,
  participants,
  isParticipant,
  isOwner,
  teamAScore,
  teamBScore,
}: {
  matchId: string;
  status: string;
  currentUserId: string;
  currentCheckInStatus: string | null;
  submittedBy: string | null;
  participants: MatchParticipant[];
  isParticipant: boolean;
  isOwner: boolean;
  teamAScore: number | null;
  teamBScore: number | null;
}) {
  const [checkInState, checkInFormAction, isCheckingIn] = useActionState(checkInMatchAction, {});
  const [attendanceState, attendanceFormAction, isMarkingAttendance] = useActionState(markMatchAttendanceAction, {});
  const [submitState, submitFormAction, isSubmitting] = useActionState(submitMatchResultAction, {});
  const [confirmState, confirmFormAction, isConfirming] = useActionState(confirmMatchResultAction, {});
  const canCheckIn = isParticipant && ["scheduled", "live"].includes(status) && currentCheckInStatus !== "checked_in";
  const canSubmit = (isParticipant || isOwner) && ["scheduled", "live"].includes(status);
  const canConfirm = (isParticipant || isOwner) && status === "awaiting_confirmation" && submittedBy !== currentUserId;

  return (
    <section className="match-actions-panel">
      <div className="match-actions-panel__heading"><div><p lang="en">Match actions</p><h2>จัดการแมตช์</h2></div><span>{status === "confirmed" ? "Settlement complete" : "ต้องยืนยันผลก่อนจ่ายแต้ม"}</span></div>

      <div className="match-checkin-list">
        <div className="match-checkin-list__heading"><span>สถานะผู้เล่น</span><small>{participants.filter((participant) => participant.check_in_status === "checked_in").length}/{participants.length} เช็กอิน</small></div>
        {participants.map((participant) => <div className="match-checkin-row" key={participant.user_id}><span className={`match-team-dot match-team-dot--${participant.team}`}>{participant.team.toUpperCase()}</span><strong>{participant.display_name}</strong><AttendanceLabel status={participant.check_in_status} />{isOwner && participant.check_in_status === "pending" ? <form action={attendanceFormAction}><input type="hidden" name="matchId" value={matchId} /><input type="hidden" name="userId" value={participant.user_id} /><input type="hidden" name="status" value="no_show" /><button type="submit" className="match-text-action" disabled={isMarkingAttendance}>ทำเครื่องหมายไม่มา</button></form> : null}</div>)}
      </div>

      {canCheckIn ? <form action={checkInFormAction} className="match-inline-action"><input type="hidden" name="matchId" value={matchId} /><button type="submit" className="group-primary-action" disabled={isCheckingIn}><LogIn size={16} /> {isCheckingIn ? "กำลังเช็กอิน..." : "เช็กอินเข้าแมตช์"}</button></form> : null}
      {currentCheckInStatus === "checked_in" && ["scheduled", "live"].includes(status) ? <p className="match-action-hint"><CheckCircle2 size={15} /> คุณเช็กอินแล้ว รอผู้เล่นทุกคนพร้อมก่อนส่งผล</p> : null}

      {canSubmit ? <form action={submitFormAction} className="match-result-form"><div><p lang="en">Submit result</p><h3>ส่งผลการแข่งขัน</h3></div><div className="match-result-inputs"><label><span>ทีม A</span><input name="teamAScore" type="number" min={0} max={30} defaultValue={teamAScore ?? ""} required /></label><b>–</b><label><span>ทีม B</span><input name="teamBScore" type="number" min={0} max={30} defaultValue={teamBScore ?? ""} required /></label></div><input type="hidden" name="matchId" value={matchId} /><button type="submit" className="group-secondary-action" disabled={isSubmitting}><Send size={15} /> {isSubmitting ? "กำลังส่ง..." : "ส่งผลรอการยืนยัน"}</button></form> : null}
      {status === "awaiting_confirmation" && submittedBy === currentUserId ? <p className="match-action-hint"><Clock3 size={15} /> คุณส่งผลแล้ว รอผู้เล่นอีกฝั่งหรือผู้จัดก๊วนยืนยัน</p> : null}
      {canConfirm ? <form action={confirmFormAction} className="match-confirm-box"><div><ShieldCheck size={21} /><span><strong>ตรวจสอบผลก่อนยืนยัน</strong><small>เมื่อยืนยันแล้ว ระบบจะจ่าย EXP และคำนวณ BP ให้ทุกคนในแมตช์แบบย้อนแก้เองไม่ได้</small></span></div><input type="hidden" name="matchId" value={matchId} /><button type="submit" className="group-primary-action" disabled={isConfirming}>{isConfirming ? "กำลัง settle..." : "ยืนยันผลการแข่งขัน"}</button></form> : null}
      {status === "confirmed" ? <p className="match-action-hint match-action-hint--success"><CheckCircle2 size={15} /> ผลการแข่งขันได้รับการยืนยันและ settlement เรียบร้อยแล้ว</p> : null}

      <Feedback state={checkInState} />
      <Feedback state={attendanceState} />
      <Feedback state={submitState} />
      <Feedback state={confirmState} />
    </section>
  );
}
