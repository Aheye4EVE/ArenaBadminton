import Link from "next/link";
import { ArrowLeft, BadgeCheck, CalendarDays, Coins, Crown, ShieldCheck, Swords, Trophy, Users } from "lucide-react";
import MatchActions from "@/components/match-actions";

type MatchData = {
  id: string;
  groupId: string;
  matchNumber: number;
  format: string;
  status: string;
  createdBy: string;
  expWinReward: number;
  expLossReward: number;
  teamAScore: number | null;
  teamBScore: number | null;
  winnerTeam: string | null;
  resultSubmittedBy: string | null;
};

type MatchParticipant = {
  user_id: string;
  team: "a" | "b";
  display_name: string;
  handle: string;
  avatar_url: string | null;
  level: number;
  check_in_status: string;
  checked_in_at: string | null;
};

type Settlement = {
  rule_version: string;
  winner_team: string;
  winner_level: number;
  loser_level: number;
  winner_bp_delta: number;
  loser_bp_delta: number;
  winner_exp_reward: number;
  loser_exp_reward: number;
  winner_item_bonus_exp: number;
  loser_item_bonus_exp: number;
};

const statusLabels: Record<string, string> = {
  scheduled: "รอเริ่มแข่ง",
  live: "กำลังแข่ง",
  awaiting_confirmation: "รอยืนยันผล",
  confirmed: "จบและ settle แล้ว",
  disputed: "อยู่ระหว่างตรวจสอบ",
  cancelled: "ยกเลิกแล้ว",
};

function statusLabel(status: string) {
  return statusLabels[status] ?? status;
}

function rewardLabel(value: number) {
  return `${Number(value).toLocaleString("th-TH")} EXP`;
}

function TeamColumn({ team, participants, score, winnerTeam }: { team: "a" | "b"; participants: MatchParticipant[]; score: number | null; winnerTeam: string | null }) {
  const isWinner = winnerTeam === team;
  return (
    <section className={`match-score-team match-score-team--${team} ${isWinner ? "match-score-team--winner" : ""}`}>
      <div className="match-score-team__heading"><span className={`match-team-dot match-team-dot--${team}`}>{team.toUpperCase()}</span><div><p lang="en">Team {team.toUpperCase()}</p><h2>{isWinner ? <><Crown size={18} /> ชนะการแข่งขัน</> : `ทีม ${team.toUpperCase()}`}</h2></div></div>
      <strong className="match-score">{score ?? "—"}</strong>
      <div className="match-score-team__players">{participants.map((participant) => <div key={participant.user_id}><span className="match-member-avatar">{participant.avatar_url ? "👤" : "🧑🏻"}</span><span><strong>{participant.display_name}</strong><small>@{participant.handle} · Level {participant.level}</small></span></div>)}</div>
    </section>
  );
}

export default function MatchDetail({
  match,
  group,
  participants,
  settlement,
  currentUserId,
}: {
  match: MatchData;
  group: { id: string; title: string; startsAt: string; locationText: string };
  participants: MatchParticipant[];
  settlement: Settlement | null;
  currentUserId: string;
}) {
  const isOwner = match.createdBy === currentUserId;
  const currentParticipant = participants.find((participant) => participant.user_id === currentUserId);
  const teamA = participants.filter((participant) => participant.team === "a");
  const teamB = participants.filter((participant) => participant.team === "b");
  const date = new Date(group.startsAt);
  const formattedDate = Number.isNaN(date.getTime()) ? "ยังไม่ระบุวันเวลา" : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(date);

  return (
    <main className="matches-page match-detail-page">
      <div className="matches-shell">
        <header className="groups-topbar"><Link href={`/groups/${group.id}`} className="groups-back"><ArrowLeft size={17} /> หน้าก๊วน</Link><Link href="/" className="groups-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link><Link href="/matches" className="organizer-user-chip">แมตช์ของฉัน</Link></header>

        <section className="match-detail-hero"><div><p lang="en">Match #{match.matchNumber} · {match.format === "doubles" ? "Doubles" : "Singles"}</p><h1>{group.title}</h1><span>{statusLabel(match.status)} · ผลจะจ่ายแต้มเมื่อมีผู้ยืนยันเท่านั้น</span></div><div className={`match-status-orb match-status-orb--${match.status}`}><Swords size={26} /><small>{statusLabel(match.status)}</small></div></section>

        <div className="match-detail-meta"><span><CalendarDays size={16} /> {formattedDate}</span><span><Users size={16} /> {group.locationText}</span><span><Coins size={16} /> ชนะ {rewardLabel(match.expWinReward)} · แพ้ {rewardLabel(match.expLossReward)}</span></div>

        <section className="match-scoreboard"><div className="match-scoreboard__heading"><div><p lang="en">Scoreboard</p><h2>ผลการแข่งขัน</h2></div><span>{match.status === "confirmed" ? <><BadgeCheck size={15} /> ยืนยันแล้ว</> : "ยังไม่ยืนยันผล"}</span></div><div className="match-scoreboard__teams"><TeamColumn team="a" participants={teamA} score={match.teamAScore} winnerTeam={match.winnerTeam} /><div className="match-scoreboard__versus"><span>VS</span><small>Badminton</small></div><TeamColumn team="b" participants={teamB} score={match.teamBScore} winnerTeam={match.winnerTeam} /></div></section>

        <MatchActions matchId={match.id} status={match.status} currentUserId={currentUserId} currentCheckInStatus={currentParticipant?.check_in_status ?? null} submittedBy={match.resultSubmittedBy} participants={participants} isParticipant={Boolean(currentParticipant)} isOwner={isOwner} teamAScore={match.teamAScore} teamBScore={match.teamBScore} />

        {settlement ? <section className="match-settlement-card"><div className="match-settlement-card__icon"><Trophy size={22} /></div><div><p lang="en">Settlement receipt · {settlement.rule_version}</p><h2>ระบบบันทึก EXP และ BP ให้แล้ว</h2><span>ทีม {settlement.winner_team.toUpperCase()} ชนะ · ค่าเฉลี่ย Level ฝั่งชนะ {settlement.winner_level} vs ฝั่งแพ้ {settlement.loser_level}</span></div><div className="match-settlement-card__values"><strong>BP {settlement.winner_bp_delta > 0 ? "+" : ""}{settlement.winner_bp_delta}</strong><small>ผู้ชนะ</small><strong>BP {settlement.loser_bp_delta}</strong><small>ผู้แพ้</small></div><div className="match-settlement-card__exp"><div><strong>{(Number(settlement.winner_exp_reward) + Number(settlement.winner_item_bonus_exp)).toLocaleString("th-TH")} EXP</strong><small>ผู้ชนะ · Base {Number(settlement.winner_exp_reward).toLocaleString("th-TH")} + Item {Number(settlement.winner_item_bonus_exp).toLocaleString("th-TH")}</small></div><div><strong>{(Number(settlement.loser_exp_reward) + Number(settlement.loser_item_bonus_exp)).toLocaleString("th-TH")} EXP</strong><small>ผู้แพ้ · Base {Number(settlement.loser_exp_reward).toLocaleString("th-TH")} + Item {Number(settlement.loser_item_bonus_exp).toLocaleString("th-TH")}</small></div></div></section> : null}

        <div className="match-detail-footer"><Link href={`/groups/${group.id}`} className="group-secondary-action"><ArrowLeft size={15} /> กลับหน้าก๊วน</Link>{isOwner ? <Link href={`/groups/${group.id}/matches/new`} className="group-primary-action"><Swords size={15} /> สร้างแมตช์ถัดไป</Link> : null}</div>
        <p className="match-detail-safety"><ShieldCheck size={16} /> EXP/BP ถูกคำนวณใน database transaction และมี ledger อ้างอิงแมตช์เดียว ป้องกันการ settle ซ้ำ</p>
      </div>
    </main>
  );
}
