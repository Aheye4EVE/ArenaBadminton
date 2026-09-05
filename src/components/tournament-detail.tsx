"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Crown,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Trophy,
  UserRound,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";
import { joinTournamentAction, type TournamentActionState, withdrawTournamentAction } from "@/app/events/actions";
import TournamentBracket, { type TournamentBracketMatchData } from "@/components/tournament-bracket";
import TournamentOrganizerPanel from "@/components/tournament-organizer-panel";

export type TournamentEntry = {
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  level: number;
  status: string;
  seed: number | null;
  joinedAt: string;
};

export type TournamentReward = {
  id: string;
  placement: number;
  expReward: number;
  bpReward: number;
  label: string;
};

type TournamentVenue = {
  name: string;
  address: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
};

type Tournament = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  format: string;
  status: string;
  maxEntries: number;
  entryFee: number;
  rules: string;
  createdAt: string;
  registrationOpen: boolean;
  creatorName: string;
  creatorHandle: string;
  venue: TournamentVenue | null;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ยังไม่ระบุวันเวลา";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(date);
}

function formatLabel(value: string) {
  return ({ singles: "Singles · เดี่ยว", doubles: "Doubles · คู่", team: "Team · ทีม" } as Record<string, string>)[value] ?? value;
}

function statusLabel(value: string) {
  return ({ published: "เปิดรับสมัคร", registration_closed: "ปิดรับสมัคร", in_progress: "กำลังแข่งขัน", completed: "จบกิจกรรม", cancelled: "ยกเลิกแล้ว" } as Record<string, string>)[value] ?? value;
}

function entryStatusLabel(value: string) {
  return ({ registered: "ยืนยันสิทธิ์", waitlisted: "คิวรอ", winner: "ผู้ชนะ", eliminated: "ตกรอบ" } as Record<string, string>)[value] ?? value;
}

function googleMapsHref(venue: TournamentVenue) {
  if (venue.latitude !== null && venue.longitude !== null) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.latitude},${venue.longitude}`)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue.name, venue.address, venue.district, venue.province].filter(Boolean).join(", "))}`;
}

function Feedback({ state }: { state: TournamentActionState }) {
  if (state.error) return <p className="tournament-action-feedback tournament-action-feedback--error" role="alert"><XCircle size={16} /> {state.error}</p>;
  if (state.message) return <p className="tournament-action-feedback" role="status"><CheckCircle2 size={16} /> {state.message}</p>;
  return null;
}

function PlayerAvatar({ entry }: { entry: TournamentEntry }) {
  if (entry.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="tournament-entry-avatar" src={entry.avatarUrl} alt="" />;
  }
  return <span className="tournament-entry-avatar tournament-entry-avatar--empty" aria-hidden="true"><UserRound size={17} /></span>;
}

function RegistrationControl({ tournament, currentStatus }: { tournament: Tournament; currentStatus: string | null }) {
  const [joinState, joinAction, isJoining] = useActionState(joinTournamentAction, {});
  const [withdrawState, withdrawAction, isWithdrawing] = useActionState(withdrawTournamentAction, {});
  const localStatus = withdrawState.entryStatus ?? joinState.entryStatus ?? currentStatus;
  const hasActiveEntry = localStatus === "registered" || localStatus === "waitlisted";
  const isOpen = tournament.registrationOpen;
  const isPaid = tournament.entryFee > 0;

  return (
    <section className="tournament-action-card">
      <div className="tournament-action-card__heading"><div><p lang="en">Your registration</p><h2>สิทธิ์ของคุณ</h2></div><WalletCards size={21} /></div>
      {hasActiveEntry ? (
        <>
          <div className={localStatus === "waitlisted" ? "tournament-registration-status tournament-registration-status--waitlist" : "tournament-registration-status"}><CheckCircle2 size={20} /><div><strong>{localStatus === "waitlisted" ? "อยู่ในคิวรอ" : "สมัครแล้ว"}</strong><span>{localStatus === "waitlisted" ? "ระบบจะเลื่อนเข้าเมื่อมีที่ว่าง" : "เจอกันในสนามนะ"}</span></div></div>
          <form action={withdrawAction}><input type="hidden" name="tournamentId" value={tournament.id} /><button type="submit" className="group-secondary-action tournament-action-card__button" disabled={isWithdrawing}>{isWithdrawing ? "กำลังถอนชื่อ..." : "ถอนชื่อจากกิจกรรม"}</button></form>
          <Feedback state={withdrawState} />
        </>
      ) : isPaid ? (
        <div className="tournament-registration-locked"><WalletCards size={22} /><strong>ยังไม่เปิดรับชำระเงิน</strong><span>กิจกรรมที่มีค่าสมัครจะเปิดให้สมัครเมื่อ Payment Gateway พร้อมใช้งาน</span></div>
      ) : isOpen ? (
        <>
          <p className="tournament-action-card__hint">{tournament.maxEntries} ที่นั่ง · กิจกรรมฟรี {currentStatus ? "· คุณเคยถอนชื่อแล้ว" : ""}</p>
          <form action={joinAction}><input type="hidden" name="tournamentId" value={tournament.id} /><button type="submit" className="group-primary-action tournament-action-card__button" disabled={isJoining}>{isJoining ? "กำลังสมัคร..." : "สมัครกิจกรรม"}<ArrowRight size={16} /></button></form>
          <Feedback state={joinState} />
        </>
      ) : <div className="tournament-registration-locked"><Clock3 size={22} /><strong>{statusLabel(tournament.status)}</strong><span>กิจกรรมนี้ไม่อยู่ในช่วงที่สมัครได้แล้ว</span></div>}
    </section>
  );
}

export default function TournamentDetail({ tournament, entries, rewards, bracketMatches, bracketStatus, rewardItems, isOrganizer, currentUserId }: { tournament: Tournament; entries: TournamentEntry[]; rewards: TournamentReward[]; bracketMatches: TournamentBracketMatchData[]; bracketStatus: string; rewardItems: Array<{ id: string; name: string; icon: string }>; isOrganizer: boolean; currentUserId: string }) {
  const registeredEntries = entries.filter((entry) => entry.status === "registered" || entry.status === "winner");
  const waitlistedEntries = entries.filter((entry) => entry.status === "waitlisted");
  const currentEntry = entries.find((entry) => entry.userId === currentUserId);
  const registeredCount = registeredEntries.length;
  const capacityPercent = Math.min(100, Math.round((registeredCount / Math.max(1, tournament.maxEntries)) * 100));

  return (
    <>
      <section className="tournament-detail-hero">
        <div className="tournament-detail-hero__orb" aria-hidden="true"><Trophy size={42} /></div>
        <div className="tournament-detail-hero__copy"><div className="tournament-detail-tags"><span><Trophy size={13} /> Tournament</span><span><CheckCircle2 size={13} /> {statusLabel(tournament.status)}</span><span>{formatLabel(tournament.format)}</span></div><h1>{tournament.title}</h1><p>{tournament.description || "กิจกรรมการแข่งขันจาก Community Arena"}</p><small><Crown size={13} /> จัดโดย {tournament.creatorName} · @{tournament.creatorHandle}</small></div>
      </section>

      <div className="tournament-detail-layout">
        <section className="tournament-detail-main">
          <div className="tournament-detail-info-grid"><div><CalendarDays size={18} /><span><small>วันและเวลา</small><strong>{dateLabel(tournament.startsAt)}</strong></span></div><div><Users size={18} /><span><small>ผู้สมัคร</small><strong>{registeredCount}/{tournament.maxEntries} คน</strong></span></div><div><ShieldCheck size={18} /><span><small>รูปแบบ</small><strong>{formatLabel(tournament.format)}</strong></span></div></div>
          <div className="tournament-detail-capacity"><div><span>ที่นั่งที่ยืนยันแล้ว</span><strong>{capacityPercent}%</strong></div><div className="tournament-detail-capacity__track"><span style={{ width: `${capacityPercent}%` }} /></div><small>{waitlistedEntries.length > 0 ? `${waitlistedEntries.length} คนอยู่ในคิวรอ` : "ถ้าเต็ม ระบบจะรับเข้าคิวรออัตโนมัติ"}</small></div>

          {tournament.venue ? <section className="tournament-detail-panel"><div className="tournament-detail-panel__heading"><div><p lang="en">Play venue</p><h2><MapPin size={19} /> สนามแข่งขัน</h2></div><a href={googleMapsHref(tournament.venue)} target="_blank" rel="noreferrer" className="group-secondary-action">เปิด Google Maps <ArrowRight size={14} /></a></div><div className="tournament-venue-card"><div className="tournament-venue-card__icon"><MapPin size={23} /></div><div><strong>{tournament.venue.name}</strong><span>{[tournament.venue.address, tournament.venue.subdistrict, tournament.venue.district, tournament.venue.province].filter(Boolean).join(" · ") || "รายละเอียดสนามจะแจ้งโดยผู้จัด"}</span></div></div></section> : null}

          <section className="tournament-detail-panel"><div className="tournament-detail-panel__heading"><div><p lang="en">Roster</p><h2><Users size={19} /> รายชื่อผู้สมัคร</h2></div><span>{registeredCount} ยืนยัน · {waitlistedEntries.length} คิวรอ</span></div>{entries.length > 0 ? <div className="tournament-entry-list">{entries.map((entry) => <div className="tournament-entry-row" key={entry.userId}><PlayerAvatar entry={entry} /><div><strong>{entry.displayName}</strong><span>@{entry.handle} · Level {entry.level}</span></div><em className={entry.status === "waitlisted" ? "tournament-entry-status tournament-entry-status--waitlist" : "tournament-entry-status"}>{entry.seed ? `Seed ${entry.seed}` : entryStatusLabel(entry.status)}</em></div>)}</div> : <div className="tournament-empty-state"><Users size={27} /><strong>ยังไม่มีผู้สมัคร</strong><span>เป็นคนแรกที่ลงชื่อในกิจกรรมนี้ได้เลย</span></div>}</section>

          <section className="tournament-detail-panel"><div className="tournament-detail-panel__heading"><div><p lang="en">Rules & rewards</p><h2><ShieldCheck size={19} /> กติกาและรางวัล</h2></div></div><div className="tournament-rules-copy">{tournament.rules ? <p>{tournament.rules}</p> : <p className="tournament-muted-copy">ผู้จัดยังไม่ได้เพิ่มกติกาเพิ่มเติม</p>}</div>{rewards.length > 0 ? <div className="tournament-reward-list">{rewards.map((reward) => <div className="tournament-reward-row" key={reward.id}><span className="tournament-reward-place">#{reward.placement}</span><div><strong>{reward.label || `อันดับ ${reward.placement}`}</strong><span>{formatNumber(reward.expReward)} EXP · {formatNumber(reward.bpReward)} BP</span></div></div>)}</div> : <p className="tournament-muted-copy tournament-reward-empty">ผู้จัดยังไม่ได้กำหนดรางวัล</p>}</section>
          <section className="tournament-detail-panel"><div className="tournament-detail-panel__heading"><div><p lang="en">Live bracket</p><h2><Trophy size={19} /> สายการแข่งขัน</h2></div><span>{bracketStatus === "completed" ? "จบการแข่งขันแล้ว" : bracketMatches.length > 0 ? "กำลังดำเนินการ" : "ยังไม่เปิดสาย"}</span></div><TournamentBracket matches={bracketMatches} currentUserId={currentUserId} isOrganizer={isOrganizer} /></section>
          {isOrganizer ? <TournamentOrganizerPanel tournamentId={tournament.id} items={rewardItems} /> : null}
        </section>

        <aside className="tournament-detail-sidebar"><RegistrationControl tournament={tournament} currentStatus={currentEntry?.status ?? null} /><section className="tournament-detail-side-card"><p lang="en">Organizer note</p><h2>กิจกรรมจากผู้จัดจริง</h2><span>ข้อมูลกิจกรรมและจำนวนผู้สมัครมาจาก Supabase โดยตรง ผู้จัดยังไม่สามารถเรียกเก็บค่าสมัครผ่านหน้านี้</span><Link href="/events/create" className="group-secondary-action">สร้างกิจกรรมของคุณ <ArrowRight size={15} /></Link></section><Link href="/events" className="tournament-detail-back"><ArrowLeft size={15} /> กลับไปค้นหากิจกรรม</Link></aside>
      </div>
      <footer className="tournament-detail-footer"><span>© Arena-Badminton</span><span className="tournament-detail-footer__links"><Link href={`/moderation/report?targetType=tournament&targetId=${tournament.id}&returnTo=/events/${tournament.id}`} className="venue-review-report"><ShieldAlert size={13} /> รายงานกิจกรรม</Link><span>Registration protected by Supabase transaction</span></span></footer>
    </>
  );
}
