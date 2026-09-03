"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Swords, Users } from "lucide-react";
import { createMatchAction, type MatchActionState } from "@/app/matches/actions";

type MatchPlayer = {
  user_id: string;
  display_name: string;
  handle: string;
  level: number;
};

type MatchFormat = "singles" | "doubles";

function errorFor(state: MatchActionState, field: string) {
  return state.fieldErrors?.[field]?.[0];
}

function PlayerSelect({
  name,
  value,
  players,
  onChange,
  label,
}: {
  name: string;
  value: string;
  players: MatchPlayer[];
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <label className="match-player-select">
      <span>{label}</span>
      <select name={name} value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">เลือกผู้เล่น</option>
        {players.map((player) => (
          <option key={player.user_id} value={player.user_id}>
            {player.display_name} · Level {player.level}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CreateMatchForm({ groupId, groupTitle, players, ownerId }: { groupId: string; groupTitle: string; players: MatchPlayer[]; ownerId: string }) {
  const [format, setFormat] = useState<MatchFormat>("singles");
  const [teamA, setTeamA] = useState<string[]>([ownerId]);
  const [teamB, setTeamB] = useState<string[]>([""]);
  const [state, formAction, isPending] = useActionState(createMatchAction, {});
  const teamSize = format === "singles" ? 1 : 2;

  function changeFormat(nextFormat: MatchFormat) {
    setFormat(nextFormat);
    setTeamA((current) => Array.from({ length: nextFormat === "singles" ? 1 : 2 }, (_, index) => current[index] ?? ""));
    setTeamB((current) => Array.from({ length: nextFormat === "singles" ? 1 : 2 }, (_, index) => current[index] ?? ""));
  }

  function setPlayer(team: "a" | "b", index: number, value: string) {
    const setter = team === "a" ? setTeamA : setTeamB;
    setter((current) => current.map((playerId, playerIndex) => playerIndex === index ? value : playerId));
  }

  return (
    <form className="match-form" action={formAction} noValidate>
      <input type="hidden" name="groupId" value={groupId} />
      <div className="match-form__intro">
        <div className="match-form__icon"><Swords size={23} /></div>
        <div><p lang="en">Match setup</p><h2>{groupTitle}</h2><span>เลือกผู้เล่นและรางวัล EXP พื้นฐาน ระบบจะคำนวณ BP หลังยืนยันผลให้เอง</span></div>
      </div>

      <div className="match-form__grid match-form__grid--top">
        <label className="match-form-field">
          <span>รูปแบบการแข่งขัน</span>
          <select name="format" value={format} onChange={(event) => changeFormat(event.target.value as MatchFormat)}>
            <option value="singles">Singles · 1 ต่อ 1</option>
            <option value="doubles">Doubles · คู่ 2 ต่อ 2</option>
          </select>
        </label>
        <div className="match-form__rule-note"><CheckCircle2 size={17} /><span>BP ใช้กติกา system rule version ล่าสุด และไม่มีช่องให้ผู้จัดแก้ BP โดยตรง</span></div>
      </div>

      <div className="match-teams">
        <section className="match-team-card match-team-card--a">
          <div className="match-team-card__heading"><span>A</span><div><p lang="en">Team A</p><h3>ทีม A</h3></div><Users size={18} /></div>
          {teamA.slice(0, teamSize).map((value, index) => <PlayerSelect key={`a-${index}`} name="teamAUserId" value={value} players={players} onChange={(nextValue) => setPlayer("a", index, nextValue)} label={`ผู้เล่น A${index + 1}`} />)}
        </section>
        <div className="match-vs">VS</div>
        <section className="match-team-card match-team-card--b">
          <div className="match-team-card__heading"><span>B</span><div><p lang="en">Team B</p><h3>ทีม B</h3></div><Users size={18} /></div>
          {teamB.slice(0, teamSize).map((value, index) => <PlayerSelect key={`b-${index}`} name="teamBUserId" value={value} players={players} onChange={(nextValue) => setPlayer("b", index, nextValue)} label={`ผู้เล่น B${index + 1}`} />)}
        </section>
      </div>

      <div className="match-form__reward-card">
        <div><p lang="en">Base EXP reward</p><h3>รางวัลจากผู้จัดก๊วน</h3><span>ผู้ชนะและผู้แพ้รับ EXP ได้ตามที่กำหนด ส่วน Item Bonus จะคิดแยกในเฟส Shop</span></div>
        <div className="match-form__reward-fields">
          <label className="match-form-field"><span>ชนะได้ EXP</span><div className="match-number-input"><input name="expWinReward" type="number" min={0} max={1000000} defaultValue={100} required /><em>EXP</em></div>{errorFor(state, "expWinReward") ? <small>{errorFor(state, "expWinReward")}</small> : null}</label>
          <label className="match-form-field"><span>แพ้ได้ EXP</span><div className="match-number-input"><input name="expLossReward" type="number" min={0} max={1000000} defaultValue={25} required /><em>EXP</em></div>{errorFor(state, "expLossReward") ? <small>{errorFor(state, "expLossReward")}</small> : null}</label>
        </div>
      </div>

      {errorFor(state, "teamAUserIds") || errorFor(state, "teamBUserIds") ? <div className="match-feedback match-feedback--error" role="alert">{errorFor(state, "teamAUserIds") ?? errorFor(state, "teamBUserIds")}</div> : null}
      {state.error ? <div className="match-feedback match-feedback--error" role="alert">{state.error}</div> : null}
      {state.message ? <div className="match-feedback match-feedback--success" role="status"><CheckCircle2 size={16} /> {state.message}</div> : null}

      <div className="match-form__actions"><Link href={`/groups/${groupId}`} className="group-secondary-action"><ArrowLeft size={16} /> กลับหน้าก๊วน</Link><button type="submit" className="group-primary-action" disabled={isPending}>{isPending ? "กำลังสร้างแมตช์..." : "สร้างแมตช์"}{!isPending ? <ArrowRight size={17} /> : null}</button></div>
    </form>
  );
}
