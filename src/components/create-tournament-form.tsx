"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, MapPin, Trophy } from "lucide-react";
import { createTournamentAction, type TournamentActionState } from "@/app/events/actions";

type TournamentVenue = {
  id: string;
  name: string;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
};

function errorFor(state: TournamentActionState, field: string) {
  return state.fieldErrors?.[field]?.[0];
}

export default function CreateTournamentForm({ venues }: { venues: TournamentVenue[] }) {
  const [state, formAction, isPending] = useActionState(createTournamentAction, {});

  return (
    <form className="tournament-create-form" action={formAction} noValidate>
      <div className="tournament-create-form__intro">
        <div className="tournament-create-form__icon"><Trophy size={23} /></div>
        <div><p lang="en">Tournament setup</p><h2>สร้างกิจกรรมแข่งขัน</h2><span>เปิดกิจกรรมฟรีให้ผู้เล่นสมัครได้ ระบบจะจัดคิวและเก็บรายชื่อให้อัตโนมัติ</span></div>
      </div>

      <div className="tournament-form-section">
        <div className="tournament-form-section__heading"><span>01</span><div><strong>รายละเอียดกิจกรรม</strong><small>บอกให้ผู้เล่นรู้ว่ากิจกรรมนี้เป็นแบบไหน</small></div></div>
        <label className="tournament-form-field tournament-form-field--wide"><span>ชื่อกิจกรรม</span><input name="title" maxLength={160} placeholder="เช่น Arena Sunday Cup #1" required />{errorFor(state, "title") ? <small className="tournament-form-error">{errorFor(state, "title")}</small> : null}</label>
        <label className="tournament-form-field tournament-form-field--wide"><span>คำอธิบาย</span><textarea name="description" maxLength={2000} rows={3} placeholder="เล่ารูปแบบและบรรยากาศของกิจกรรมสั้น ๆ" />{errorFor(state, "description") ? <small className="tournament-form-error">{errorFor(state, "description")}</small> : null}</label>
      </div>

      <div className="tournament-form-section">
        <div className="tournament-form-section__heading"><span>02</span><div><strong>วัน เวลา และสนาม</strong><small>เวลาตามโซนประเทศไทย และต้องเริ่มล่วงหน้าอย่างน้อย 15 นาที</small></div></div>
        <div className="tournament-form-grid">
          <label className="tournament-form-field"><span><CalendarDays size={14} /> วันที่เริ่ม</span><input name="startsDate" type="date" required />{errorFor(state, "startsDate") ? <small className="tournament-form-error">{errorFor(state, "startsDate")}</small> : null}</label>
          <label className="tournament-form-field"><span>เวลาเริ่ม</span><input name="startsTime" type="time" required />{errorFor(state, "startsTime") ? <small className="tournament-form-error">{errorFor(state, "startsTime")}</small> : null}</label>
          <label className="tournament-form-field tournament-form-field--wide"><span><MapPin size={14} /> สนาม</span><select name="venueId" defaultValue=""><option value="">ยังไม่ระบุสนาม</option>{venues.map((venue) => <option value={venue.id} key={venue.id}>{venue.name} · {[venue.subdistrict, venue.district, venue.province].filter(Boolean).join(" · ")}</option>)}</select>{errorFor(state, "venueId") ? <small className="tournament-form-error">{errorFor(state, "venueId")}</small> : null}</label>
        </div>
      </div>

      <div className="tournament-form-section">
        <div className="tournament-form-section__heading"><span>03</span><div><strong>กติกาการรับสมัคร</strong><small>กิจกรรมรุ่นแรกเปิดแบบฟรี ยังไม่เปิดรับชำระเงินออนไลน์</small></div></div>
        <div className="tournament-form-grid">
          <label className="tournament-form-field"><span>รูปแบบการแข่งขัน</span><select name="format" defaultValue="singles"><option value="singles">Singles · เดี่ยว</option><option value="doubles">Doubles · คู่</option><option value="team">Team · ทีม</option></select></label>
          <label className="tournament-form-field"><span>จำนวนผู้สมัครสูงสุด</span><input name="maxEntries" type="number" min={2} max={256} defaultValue={8} required />{errorFor(state, "maxEntries") ? <small className="tournament-form-error">{errorFor(state, "maxEntries")}</small> : null}</label>
          <label className="tournament-form-field tournament-form-field--wide"><span>กติกา / หมายเหตุ</span><textarea name="rules" maxLength={5000} rows={4} placeholder="เช่น แข่งแบบ 21 แต้ม, มาถึงก่อนเวลา 15 นาที" />{errorFor(state, "rules") ? <small className="tournament-form-error">{errorFor(state, "rules")}</small> : null}</label>
        </div>
      </div>

      <div className="tournament-create-note"><CheckCircle2 size={17} /><span>การสร้างครั้งนี้เผยแพร่เป็นกิจกรรมฟรีทันที ระบบยังไม่เรียกเก็บค่าสมัครหรือสร้างรางวัลอัตโนมัติจนกว่า Payment และ Bracket workflow จะพร้อม</span></div>
      {state.error ? <div className="tournament-form-feedback tournament-form-feedback--error" role="alert">{state.error}</div> : null}
      {state.message ? <div className="tournament-form-feedback" role="status">{state.message}</div> : null}

      <div className="tournament-form-actions"><Link href="/events" className="group-secondary-action"><ArrowLeft size={16} /> ย้อนกลับ</Link><button type="submit" className="group-primary-action" disabled={isPending}>{isPending ? "กำลังสร้างกิจกรรม..." : "เผยแพร่กิจกรรม"}{!isPending ? <ArrowRight size={17} /> : null}</button></div>
    </form>
  );
}
