"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, ArrowRight, Crown, Shield, Sparkles } from "lucide-react";
import ThaiAreaSelect from "@/components/thai-area-select";
import { createGuildAction, type GuildActionState } from "@/app/guilds/actions";

type GuildCreationSettings = {
  creationMode: "free" | "item";
  isFree: boolean;
  founderItemSlug: string;
  freeUntil: string | null;
  maxMembersCap: number;
  ownedFounderItem: number;
};

function errorFor(state: GuildActionState, field: string) {
  return state.fieldErrors?.[field]?.[0];
}

export default function CreateGuildForm({ settings }: { settings: GuildCreationSettings }) {
  const [state, formAction, isPending] = useActionState(createGuildAction, {});
  const isFree = settings.isFree;

  return (
    <form className="guild-form" action={formAction} noValidate>
      <div className="guild-form__heading"><span className="guild-form__heading-icon"><Crown size={19} /></span><div><p lang="en">Guild Foundry</p><h2>สร้าง Guild ของคุณ</h2><span>รวมผู้เล่น สร้างกิจกรรม และสะสม Guild EXP ไปด้วยกัน</span></div></div>

      <div className={`guild-creation-notice ${isFree ? "guild-creation-notice--free" : ""}`}><Sparkles size={18} /><span>{isFree ? "ช่วงนี้เปิดสร้าง Guild ฟรี ไม่ต้องใช้ไอเทมก่อตั้ง" : `ต้องใช้ ${settings.founderItemSlug} จำนวน 1 ชิ้นในการก่อตั้ง`}</span>{!isFree && settings.ownedFounderItem < 1 ? <Link href="/shop">ไปที่ร้านค้า <ArrowRight size={14} /></Link> : <small>เริ่มต้น 32 สมาชิก · ขยายได้สูงสุด {settings.maxMembersCap} คน</small>}</div>

      <label className={`guild-field guild-field--full ${errorFor(state, "name") ? "guild-field--error" : ""}`}>
        <span>ชื่อ Guild <b>*</b></span>
        <input name="name" maxLength={100} placeholder="เช่น Smash Friends Thailand" required />
        {errorFor(state, "name") ? <small>{errorFor(state, "name")}</small> : null}
      </label>

      <label className={`guild-field guild-field--full ${errorFor(state, "description") ? "guild-field--error" : ""}`}>
        <span>คำอธิบาย Guild</span>
        <textarea name="description" rows={4} maxLength={1000} placeholder="บอกสไตล์การเล่น กติกา และบรรยากาศของ Guild" />
        {errorFor(state, "description") ? <small>{errorFor(state, "description")}</small> : null}
      </label>

      <div className="guild-form__section-label"><Shield size={16} /> พื้นที่หลักของ Guild <small>ใช้ช่วยค้นหา Guild ใกล้คุณ</small></div>
      <ThaiAreaSelect mode="form" provinceError={errorFor(state, "province")} districtError={errorFor(state, "district")} subdistrictError={errorFor(state, "subdistrict")} />

      <div className="guild-form__options">
        <fieldset className="guild-option-group"><legend>การมองเห็น</legend><label><input type="radio" name="visibility" value="public" defaultChecked /> <span><strong>Public</strong><small>ทุกคนค้นหาและดู Guild ได้</small></span></label><label><input type="radio" name="visibility" value="private" /> <span><strong>Private</strong><small>แสดงเฉพาะสมาชิกและผู้ได้รับคำเชิญ</small></span></label></fieldset>
        <fieldset className="guild-option-group"><legend>การเข้าร่วม</legend><label><input type="radio" name="joinPolicy" value="open" defaultChecked /> <span><strong>Open</strong><small>กดเข้าร่วมได้ทันทีเมื่อยังไม่เต็ม</small></span></label><label><input type="radio" name="joinPolicy" value="request" /> <span><strong>Request</strong><small>ส่งคำขอให้ผู้ดูแลอนุมัติ</small></span></label><label><input type="radio" name="joinPolicy" value="invite_only" /> <span><strong>Invite only</strong><small>รับเฉพาะคำเชิญจาก Guild</small></span></label></fieldset>
      </div>

      {state.error ? <p className="guild-form-feedback guild-form-feedback--error" role="alert">{state.error}</p> : null}
      <div className="guild-form__safety"><Shield size={17} /><span>{isFree ? "ระบบจะตรวจสิทธิ์และสร้างสมาชิก Guild Master ในธุรกรรมเดียว ป้องกันการกดซ้ำ" : "ระบบจะหักไอเทมก่อตั้งและสร้างสมาชิก Guild Master ในธุรกรรมเดียว ป้องกันการกดซ้ำ"}</span></div>
      <div className="guild-form__actions"><Link href="/guilds" className="guild-secondary-action"><ArrowLeft size={16} /> ย้อนกลับ</Link><button type="submit" className="guild-primary-action" disabled={isPending || (!isFree && settings.ownedFounderItem < 1)}>{isPending ? "กำลังสร้าง Guild..." : "สร้าง Guild"}<ArrowRight size={16} /></button></div>
    </form>
  );
}
