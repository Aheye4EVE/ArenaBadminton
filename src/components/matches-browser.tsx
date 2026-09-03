import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, Clock3, Plus, Swords, Trophy } from "lucide-react";

export type MatchListItem = {
  id: string;
  groupId: string;
  groupTitle: string;
  matchNumber: number;
  format: string;
  status: string;
  teamAScore: number | null;
  teamBScore: number | null;
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  scheduled: "รอเริ่มแข่ง",
  live: "กำลังแข่ง",
  awaiting_confirmation: "รอยืนยันผล",
  confirmed: "ยืนยันและ settle แล้ว",
  disputed: "อยู่ระหว่างตรวจสอบ",
  cancelled: "ยกเลิกแล้ว",
};

function statusLabel(status: string) {
  return statusLabels[status] ?? status;
}

function matchFormat(format: string) {
  return format === "doubles" ? "Doubles · คู่ 2 ต่อ 2" : "Singles · 1 ต่อ 1";
}

function matchDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ยังไม่ระบุวันเวลา";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(date);
}

function MatchCard({ match }: { match: MatchListItem }) {
  const isConfirmed = match.status === "confirmed";
  return (
    <Link href={`/matches/${match.id}`} className="match-list-card">
      <div className={`match-list-card__icon match-list-card__icon--${match.status}`}><Swords size={21} /></div>
      <div className="match-list-card__content"><div className="match-list-card__topline"><span>{matchFormat(match.format)}</span><em>{isConfirmed ? <BadgeCheck size={14} /> : <Clock3 size={14} />} {statusLabel(match.status)}</em></div><h2>{match.groupTitle} <small>Match #{match.matchNumber}</small></h2><p><CalendarDays size={14} /> {matchDate(match.createdAt)}</p></div>
      <div className="match-list-card__score"><span>{match.teamAScore ?? "—"}</span><b>:</b><span>{match.teamBScore ?? "—"}</span></div><ArrowRight className="match-list-card__arrow" size={18} />
    </Link>
  );
}

export default function MatchesBrowser({ matches }: { matches: MatchListItem[] }) {
  return (
    <main className="matches-page">
      <div className="matches-shell">
        <header className="groups-topbar"><Link href="/" className="groups-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link><nav className="groups-nav" aria-label="เมนูหน้าการแข่งขัน"><Link href="/groups">ก๊วน</Link><Link className="groups-nav__active" href="/matches">แมตช์</Link><Link href="/profile">Profile</Link></nav><Link href="/groups" className="group-primary-action"><Plus size={16} /> เข้าร่วมก๊วน</Link></header>

        <section className="matches-hero"><div><p lang="en">My competition desk</p><h1>แมตช์ของฉัน</h1><span>เช็กอิน ส่งผล และยืนยันผลการแข่งขัน เพื่อรับ EXP และคำนวณ BP อย่างโปร่งใส</span></div><div className="matches-hero__art" aria-hidden="true"><Trophy size={42} /><Swords size={27} /></div></section>

        <div className="matches-page-heading"><div><p lang="en">Your matches</p><h2>รายการแข่งขันที่เกี่ยวข้องกับคุณ</h2></div><span>{matches.length} แมตช์</span></div>
        {matches.length > 0 ? <div className="matches-list">{matches.map((match) => <MatchCard key={match.id} match={match} />)}</div> : <section className="matches-empty"><div><Swords size={29} /></div><h2>ยังไม่มีแมตช์ของคุณ</h2><p>เมื่อผู้จัดก๊วนเลือกคุณลงแข่ง รายการจะมาแสดงที่หน้านี้</p><Link href="/groups" className="group-primary-action">ค้นหาก๊วน <ArrowRight size={16} /></Link></section>}

        <section className="matches-info-strip"><span>01</span><p><strong>เช็กอินก่อนแข่ง</strong> ให้ทุกคนพร้อมก่อนส่งผล</p><span>02</span><p><strong>ยืนยันผลสองฝ่าย</strong> ป้องกันการกรอกผลฝ่ายเดียว</p><span>03</span><p><strong>Settlement อัตโนมัติ</strong> EXP/BP ลง ledger ใน transaction เดียว</p></section>
      </div>
    </main>
  );
}
