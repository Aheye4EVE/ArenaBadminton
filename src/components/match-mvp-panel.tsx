"use client";

import { useActionState } from "react";
import { Award, Check, Crown, Sparkles, Vote, XCircle } from "lucide-react";
import { castMatchMvpVoteAction, finalizeMatchMvpAction, type MatchActionState } from "@/app/matches/actions";

export type MatchMvpCandidate = { userId: string; displayName: string; handle: string; voteCount: number };

function Feedback({ state }: { state: MatchActionState }) {
  if (!state.error && !state.message) return null;
  return <p className={state.error ? "match-mvp-feedback match-mvp-feedback--error" : "match-mvp-feedback"} role={state.error ? "alert" : "status"}>{state.error ? <XCircle size={15} /> : <Check size={15} />}{state.error ?? state.message}</p>;
}

export default function MatchMvpPanel({ matchId, candidates, myVoteCandidateId, isOrganizer, award }: { matchId: string; candidates: MatchMvpCandidate[]; myVoteCandidateId: string | null; isOrganizer: boolean; award: { userId: string; voteCount: number; bonusExp: number; bonusBp: number } | null }) {
  const [voteState, voteAction, isVoting] = useActionState(castMatchMvpVoteAction, {});
  const [finalizeState, finalizeAction, isFinalizing] = useActionState(finalizeMatchMvpAction, {});
  const selected = voteState.mvpUserId ?? myVoteCandidateId;
  return <section className="match-mvp-panel"><div className="match-mvp-panel__heading"><div><p lang="en">Community MVP</p><h2><Award size={19} /> โหวต MVP ประจำแมตช์</h2></div>{award ? <span className="match-mvp-award-pill"><Crown size={13} /> ประกาศแล้ว</span> : <span>คนละ 1 สิทธิ์</span>}</div>{award ? <div className="match-mvp-award"><div className="match-mvp-award__icon"><Crown size={24} /></div><div><strong>{candidates.find((candidate) => candidate.userId === award.userId)?.displayName ?? "ผู้เล่น Arena"}</strong><span>ได้รับ {award.voteCount} เสียง · โบนัส +{award.bonusExp} EXP · +{award.bonusBp} BP</span></div></div> : candidates.length > 0 ? <><div className="match-mvp-candidates">{candidates.map((candidate) => <form className={`match-mvp-candidate ${selected === candidate.userId ? "match-mvp-candidate--selected" : ""}`} action={voteAction} key={candidate.userId}><input type="hidden" name="matchId" value={matchId} /><input type="hidden" name="candidateUserId" value={candidate.userId} /><div><strong>{candidate.displayName}</strong><small>@{candidate.handle} · {candidate.voteCount} เสียง</small></div><button type="submit" disabled={isVoting || Boolean(selected)}>{selected === candidate.userId ? <><Check size={14} /> โหวตแล้ว</> : <><Vote size={14} /> โหวต</>}</button></form>)}</div><Feedback state={voteState} />{isOrganizer ? <form className="match-mvp-finalize" action={finalizeAction}><input type="hidden" name="matchId" value={matchId} /><button type="submit" className="group-primary-action" disabled={isFinalizing}><Sparkles size={15} /> {isFinalizing ? "กำลังประกาศ..." : "ปิดโหวตและประกาศ MVP"}</button><span>ระบบจะเลือกผู้ได้คะแนนสูงสุด และใช้เวลาโหวตเป็นตัวตัดสินกรณีคะแนนเท่ากัน</span></form> : <p className="match-mvp-note">โหวตให้เพื่อนที่เล่นโดดเด่นได้เลย ผู้จัดจะเป็นผู้ปิดโหวตหลังทุกคนมีโอกาสใช้สิทธิ์</p>}<Feedback state={finalizeState} /></> : <div className="match-mvp-empty"><Award size={25} /><span>ยังไม่พบผู้เล่นสำหรับโหวต</span></div>}</section>;
}
