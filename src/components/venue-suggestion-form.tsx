"use client";

import { useActionState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";
import ThaiAreaSelect from "@/components/thai-area-select";
import { submitVenueSuggestionAction, type VenueSuggestionState } from "@/app/venues/suggest/actions";

function errorFor(state: VenueSuggestionState, field: string) {
  return state.fieldErrors?.[field]?.[0];
}

export default function VenueSuggestionForm() {
  const [state, action, pending] = useActionState(submitVenueSuggestionAction, {});
  return (
    <form action={action} className="venue-suggestion-form" noValidate>
      <label className={errorFor(state, "name") ? "venue-suggestion-field venue-suggestion-field--error" : "venue-suggestion-field"}><span>ชื่อสนามแบดมินตัน <b>*</b></span><input name="name" maxLength={160} placeholder="เช่น สนามแบดมินตัน..." required />{errorFor(state, "name") ? <small>{errorFor(state, "name")}</small> : null}</label>
      <ThaiAreaSelect mode="form" provinceError={errorFor(state, "province")} districtError={errorFor(state, "district")} subdistrictError={errorFor(state, "subdistrict")} />
      <label className="venue-suggestion-field"><span><MapPin size={15} /> ที่อยู่หรือจุดสังเกต</span><textarea name="address" maxLength={500} rows={4} placeholder="อ้างอิงจากข้อมูลสาธารณะ เช่น ถนน อาคาร หรือหมู่บ้าน" />{errorFor(state, "address") ? <small>{errorFor(state, "address")}</small> : null}</label>
      <label className={errorFor(state, "sourceUrl") ? "venue-suggestion-field venue-suggestion-field--error" : "venue-suggestion-field"}><span><ExternalLink size={15} /> ลิงก์แหล่งข้อมูล <small>(ถ้ามี)</small></span><input type="url" name="sourceUrl" maxLength={2_000} placeholder="https://..." />{errorFor(state, "sourceUrl") ? <small>{errorFor(state, "sourceUrl")}</small> : null}</label>
      {state.error ? <p className="venue-suggestion-feedback venue-suggestion-feedback--error" role="alert">{state.error}</p> : null}
      {state.message ? <p className="venue-suggestion-feedback" role="status"><CheckCircle2 size={16} />{state.message}</p> : null}
      <div className="venue-suggestion-actions"><Link href="/venues" className="group-secondary-action"><ArrowLeft size={15} /> กลับหน้าสนาม</Link><button type="submit" className="group-primary-action" disabled={pending}>{pending ? "กำลังส่งข้อมูล..." : "ส่งเสนอชื่อสนาม"}</button></div>
    </form>
  );
}
