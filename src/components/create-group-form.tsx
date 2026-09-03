"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, Coins, MapPin, Users } from "lucide-react";
import { createGroupAction, type GroupActionState } from "@/app/groups/actions";
import ThaiAreaSelect from "@/components/thai-area-select";

export type OrganizerVenueOption = {
  id: string;
  name: string;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  address: string | null;
};

function errorFor(state: GroupActionState, field: string) {
  return state.fieldErrors?.[field]?.[0];
}

function fieldClass(state: GroupActionState, field: string) {
  return errorFor(state, field) ? "group-form-field group-form-field--error" : "group-form-field";
}

export default function CreateGroupForm({ minimumDate, venues }: { minimumDate: string; venues: OrganizerVenueOption[] }) {
  const [state, formAction, isPending] = useActionState(createGroupAction, {});

  return (
    <form className="group-form" action={formAction} noValidate>
      <div className="group-form__section-heading">
        <span>01</span>
        <div><h2>รายละเอียดก๊วน</h2><p>กำหนดข้อมูลหลักให้คนที่สนใจตัดสินใจได้ง่าย</p></div>
      </div>

      <label className={`${fieldClass(state, "title")} group-form-field--full`}>
        <span>ชื่อก๊วน <b>*</b></span>
        <input name="title" placeholder="เช่น ตีแบดหลังเลิกงาน อังคารนี้" maxLength={160} required />
        {errorFor(state, "title") ? <small>{errorFor(state, "title")}</small> : null}
      </label>

      <div className="group-form__grid">
        <label className={`${fieldClass(state, "venueId")} group-form-field--venue`}>
          <span><MapPin size={15} /> เลือกสนามจากระบบ <b>*</b></span>
          <div className="group-form-select-wrap">
            <select name="venueId" defaultValue="" required={venues.length > 0} aria-describedby="group-venue-help">
              <option value="">{venues.length > 0 ? "เลือกสนามแบดมินตัน" : "ยังไม่มีสนามที่เปิดให้เลือก"}</option>
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} · {[venue.district, venue.province].filter(Boolean).join(" · ")}</option>)}
            </select>
          </div>
          {errorFor(state, "venueId") ? <small>{errorFor(state, "venueId")}</small> : null}
        </label>
        <label className={fieldClass(state, "locationText")}>
          <span><MapPin size={15} /> รายละเอียดจุดนัดพบ <b>*</b></span>
          <input name="locationText" placeholder="เช่น ทางเข้าอาคาร A / สนามที่ 3" maxLength={240} required />
          {errorFor(state, "locationText") ? <small>{errorFor(state, "locationText")}</small> : null}
        </label>
        <label className={fieldClass(state, "capacity")}>
          <span><Users size={15} /> รับผู้เล่น <b>*</b></span>
          <input name="capacity" type="number" min={2} max={200} defaultValue={12} required />
          {errorFor(state, "capacity") ? <small>{errorFor(state, "capacity")}</small> : null}
        </label>
      </div>

      <ThaiAreaSelect
        mode="form"
        provinceError={errorFor(state, "province")}
        districtError={errorFor(state, "district")}
        subdistrictError={errorFor(state, "subdistrict")}
      />
      <p id="group-venue-help" className="group-form__location-help"><MapPin size={15} />เลือกสนามจากข้อมูล Google Maps/สนามในระบบ แล้วกรอกจุดนัดพบและพื้นที่เพื่อให้ก๊วนถูกค้นหาเจอง่ายขึ้น</p>

      <div className="group-form__grid group-form__grid--three">
        <label className={fieldClass(state, "startsDate")}>
          <span><CalendarDays size={15} /> วันที่ <b>*</b></span>
          <input name="startsDate" type="date" min={minimumDate} required />
          {errorFor(state, "startsDate") ? <small>{errorFor(state, "startsDate")}</small> : null}
        </label>
        <label className={fieldClass(state, "startsTime")}>
          <span><Clock3 size={15} /> เวลาเริ่ม (เวลาไทย) <b>*</b></span>
          <input name="startsTime" type="time" required />
          {errorFor(state, "startsTime") ? <small>{errorFor(state, "startsTime")}</small> : null}
        </label>
        <label className={fieldClass(state, "durationMinutes")}>
          <span>จำนวนเวลา <b>*</b></span>
          <select name="durationMinutes" defaultValue="120" required>
            <option value="60">1 ชั่วโมง</option>
            <option value="90">1.5 ชั่วโมง</option>
            <option value="120">2 ชั่วโมง</option>
            <option value="180">3 ชั่วโมง</option>
            <option value="240">4 ชั่วโมง</option>
            <option value="300">5 ชั่วโมง</option>
            <option value="480">8 ชั่วโมง</option>
          </select>
          {errorFor(state, "durationMinutes") ? <small>{errorFor(state, "durationMinutes")}</small> : null}
        </label>
      </div>

      <div className="group-form__grid group-form__grid--three">
        <label className={fieldClass(state, "minLevel")}>
          <span>รับตั้งแต่ Level <b>*</b></span>
          <input name="minLevel" type="number" min={1} max={99} defaultValue={1} required />
          {errorFor(state, "minLevel") ? <small>{errorFor(state, "minLevel")}</small> : null}
        </label>
        <label className={fieldClass(state, "maxLevel")}>
          <span>ถึง Level <b>*</b></span>
          <input name="maxLevel" type="number" min={1} max={99} defaultValue={99} required />
          {errorFor(state, "maxLevel") ? <small>{errorFor(state, "maxLevel")}</small> : null}
        </label>
        <label className={fieldClass(state, "playType")}>
          <span>ประเภทก๊วน <b>*</b></span>
          <select name="playType" defaultValue="open" required>
            <option value="open">Open — รับทุกคน</option>
            <option value="friendly">Friendly — ตีสนุก</option>
            <option value="training">Training — ฝึกซ้อม</option>
            <option value="tournament">Tournament — แข่งขัน</option>
          </select>
          {errorFor(state, "playType") ? <small>{errorFor(state, "playType")}</small> : null}
        </label>
      </div>

      <div className="group-form__section-heading group-form__section-heading--sub">
        <span>02</span>
        <div><h2>ค่าใช้จ่ายและข้อความเพิ่มเติม</h2><p>รายละเอียดเหล่านี้แก้ไขได้ในขั้นตอน Organizer ที่จะเพิ่มต่อ</p></div>
      </div>

      <div className="group-form__grid">
        <label className={fieldClass(state, "entryFee")}>
          <span><Coins size={15} /> ค่าสนาม / ค่าเข้าร่วม (บาท)</span>
          <input name="entryFee" type="number" min={0} max={100000} step="0.01" defaultValue={0} />
          {errorFor(state, "entryFee") ? <small>{errorFor(state, "entryFee")}</small> : null}
        </label>
        <label className={fieldClass(state, "description")}>
          <span>คำอธิบายสั้น ๆ</span>
          <input name="description" placeholder="เช่น มีลูกแบดให้ ผู้เล่นใหม่เข้าร่วมได้" maxLength={1000} />
          {errorFor(state, "description") ? <small>{errorFor(state, "description")}</small> : null}
        </label>
      </div>

      <label className={`${fieldClass(state, "notes")} group-form-field--full`}>
        <span>หมายเหตุถึงสมาชิก</span>
        <textarea name="notes" rows={4} placeholder="รายละเอียดการเดินทาง จุดนัดพบ หรือกติกาของก๊วน" maxLength={1000} />
        {errorFor(state, "notes") ? <small>{errorFor(state, "notes")}</small> : null}
      </label>

      {state.error ? <div className="group-feedback group-feedback--error" role="alert">{state.error}</div> : null}
      <div className="group-form__note"><CheckCircle2 size={17} /><span>เจ้าของก๊วนจะถูกเพิ่มเป็นสมาชิกอัตโนมัติ และระบบจะกันจำนวนที่นั่ง/คิวรอให้ใน transaction เดียว</span></div>
      <div className="group-form__actions">
        <Link href="/groups" className="group-secondary-action"><ArrowLeft size={16} /> ย้อนกลับ</Link>
        <button type="submit" className="group-primary-action" disabled={isPending}>{isPending ? "กำลังสร้างก๊วน..." : "เผยแพร่ก๊วน"}{!isPending ? <ArrowRight size={17} /> : null}</button>
      </div>
    </form>
  );
}
