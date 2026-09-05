"use client";

import { useActionState } from "react";
import { Check, CircleAlert, Crown, Flag, Swords } from "lucide-react";
import {
  confirmTournamentBracketResultAction,
  recordTournamentBracketResultAction,
  type TournamentActionState,
} from "@/app/events/actions";

export type TournamentBracketPlayer = { id: string | null; name: string; handle: string };
export type TournamentBracketMatchData = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  playerA: TournamentBracketPlayer;
  playerB: TournamentBracketPlayer;
  winnerId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  status: string;
  submittedBy: string | null;
};

function Feedback({ state }: { state: TournamentActionState }) {
  if (!state.error && !state.message) return null;
  return <small className={state.error ? "tournament-inline-feedback tournament-inline-feedback--error" : "tournament-inline-feedback"} role={state.error ? "alert" : "status"}>{state.error ?? state.message}</small>;
}

function BracketPlayer({ player, winner }: { player: TournamentBracketPlayer; winner: boolean }) {
  return <div className={`tournament-bracket-player ${winner ? "tournament-bracket-player--winner" : ""} ${player.id ? "" : "tournament-bracket-player--empty"}`}><span>{player.name}</span>{winner ? <Crown size={13} /> : null}<small>{player.id ? `@${player.handle}` : "รอผู้ชนะรอบก่อน"}</small></div>;
}

function BracketMatchCard({ match, currentUserId, isOrganizer }: { match: TournamentBracketMatchData; currentUserId: string; isOrganizer: boolean }) {
  const [recordState, recordAction, isRecording] = useActionState(recordTournamentBracketResultAction, {});
  const [confirmState, confirmAction, isConfirming] = useActionState(confirmTournamentBracketResultAction, {});
  const isPlayer = match.playerA.id === currentUserId || match.playerB.id === currentUserId;
  const canSubmit = (isPlayer || isOrganizer) && ["scheduled", "live"].includes(match.status) && Boolean(match.playerA.id && match.playerB.id);
  const canConfirm = (isPlayer || isOrganizer) && match.status === "awaiting_confirmation" && match.submittedBy !== currentUserId;
  const isBye = match.status === "bye";
  const winnerA = Boolean(match.winnerId && match.winnerId === match.playerA.id);
  const winnerB = Boolean(match.winnerId && match.winnerId === match.playerB.id);

  return <article className={`tournament-bracket-match tournament-bracket-match--${match.status}`}>
    <header><span>Match {match.matchNumber}</span><em>{isBye ? "ผ่านอัตโนมัติ" : match.status === "confirmed" ? "ยืนยันแล้ว" : match.status === "awaiting_confirmation" ? "รอยืนยัน" : "รอแข่ง"}</em></header>
    <BracketPlayer player={match.playerA} winner={winnerA} />
    <div className="tournament-bracket-scoreline"><strong>{match.scoreA ?? "—"}</strong><span>:</span><strong>{match.scoreB ?? "—"}</strong></div>
    <BracketPlayer player={match.playerB} winner={winnerB} />
    {canSubmit ? <form className="tournament-bracket-result-form" action={recordAction}><input type="hidden" name="matchId" value={match.id} /><label><span>A</span><input name="scoreA" type="number" min="0" max="30" defaultValue={match.scoreA ?? ""} required /></label><label><span>B</span><input name="scoreB" type="number" min="0" max="30" defaultValue={match.scoreB ?? ""} required /></label><button type="submit" disabled={isRecording}><Swords size={13} /> {isRecording ? "กำลังส่ง" : "ส่งผล"}</button></form> : null}
    {canConfirm ? <form className="tournament-bracket-confirm-form" action={confirmAction}><input type="hidden" name="matchId" value={match.id} /><button type="submit" disabled={isConfirming}><Check size={13} /> {isConfirming ? "กำลังยืนยัน" : "ยืนยันผลนี้"}</button></form> : null}
    {match.status === "awaiting_confirmation" && !canConfirm ? <p className="tournament-bracket-note"><CircleAlert size={13} /> รอผู้เล่นอีกฝั่งยืนยันผล</p> : null}
    <Feedback state={recordState.error ? recordState : confirmState} />
  </article>;
}

export default function TournamentBracket({ matches, currentUserId, isOrganizer }: { matches: TournamentBracketMatchData[]; currentUserId: string; isOrganizer: boolean }) {
  const rounds = [...new Set(matches.map((match) => match.roundNumber))].sort((a, b) => a - b);
  if (matches.length === 0) return <div className="tournament-empty-state"><Flag size={26} /><strong>ยังไม่มีสายการแข่งขัน</strong><span>ผู้จัดต้องสร้าง Bracket หลังมีผู้สมัครอย่างน้อย 2 คน</span></div>;
  return <div className="tournament-bracket-wrap" aria-label="สายการแข่งขัน Tournament"><div className="tournament-bracket-rounds">{rounds.map((round) => <section className="tournament-bracket-round" key={round}><header><p lang="en">Round {round}</p><h3>{rounds.length === round ? "Final" : round === 1 ? "รอบแรก" : `รอบ ${round}`}</h3></header><div>{matches.filter((match) => match.roundNumber === round).map((match) => <BracketMatchCard key={match.id} match={match} currentUserId={currentUserId} isOrganizer={isOrganizer} />)}</div></section>)}</div></div>;
}
