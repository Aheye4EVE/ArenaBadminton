"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CheckCircle2, ChevronRight, Crosshair, LogOut, MapPin, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { completeProfile, type ProfileActionState } from "@/app/profile/setup/actions";

type ProfileValues = {
  displayName?: string | null;
  lineContactId?: string | null;
  addressLine?: string | null;
  province?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  postalCode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

function errorFor(state: ProfileActionState, field: string) {
  return state.fieldErrors?.[field]?.[0];
}

function coordinateValue(value: ProfileValues["latitude"]) {
  return value === null || value === undefined ? "" : String(value);
}

export default function ProfileCompletionForm({ email, initialValues }: { email: string; initialValues?: ProfileValues }) {
  const [state, formAction, isPending] = useActionState(completeProfile, {});
  const [latitude, setLatitude] = useState(coordinateValue(initialValues?.latitude));
  const [longitude, setLongitude] = useState(coordinateValue(initialValues?.longitude));
  const [locationStatus, setLocationStatus] = useState("");

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง");
      return;
    }

    setLocationStatus("กำลังขอตำแหน่งจากอุปกรณ์...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocationStatus("บันทึกพิกัดปัจจุบันแล้ว");
      },
      () => setLocationStatus("ไม่สามารถอ่านตำแหน่งได้ กรอกที่อยู่ต่อได้โดยไม่ใช้ GPS"),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  };

  return (
    <main className="profile-setup-page">
      <div className="profile-setup-shell">
        <header className="profile-setup-topbar">
          <Link href="/" className="auth-brand" aria-label="กลับหน้าหลัก Arena-Badminton">
            <span className="auth-brand__word">Arena</span>
            <span className="auth-brand__sub">-Badminton</span>
          </Link>
          <form action={signOut}>
            <button type="submit" className="profile-signout"><LogOut size={16} /> ออกจากระบบ</button>
          </form>
        </header>

        <section className="profile-setup-card" aria-labelledby="profile-setup-title">
          <div className="profile-setup-progress"><span className="profile-setup-progress__active">1</span><span /><span>2</span><span /><span>3</span></div>
          <div className="profile-setup-heading">
            <div className="profile-setup-heading__icon" aria-hidden="true">🧑🏻</div>
            <div>
              <p lang="en">Your Arena identity</p>
              <h1 id="profile-setup-title">ขอรู้จักคุณมากขึ้นหน่อย</h1>
              <span>ข้อมูลนี้ช่วยให้เราหาก๊วนและสนามแบดใกล้คุณได้แม่นยำขึ้น</span>
            </div>
          </div>

          {state.error ? <div className="profile-feedback profile-feedback--error" role="alert">{state.error}</div> : null}

          <form className="profile-setup-form" action={formAction}>
            <section className="profile-form-section">
              <div className="profile-form-section__heading"><span>01</span><div><h2>ข้อมูลโปรไฟล์</h2><p>ชื่อที่จะแสดงให้เพื่อน ๆ ใน Arena เห็น</p></div></div>
              <div className="profile-form-grid profile-form-grid--identity">
                <label className={errorFor(state, "displayName") ? "profile-field profile-field--error" : "profile-field"}>
                  <span>ชื่อ <b>*</b></span>
                  <input name="displayName" defaultValue={initialValues?.displayName ?? ""} placeholder="เช่น BadBuddy" autoComplete="name" required />
                  {errorFor(state, "displayName") ? <small>{errorFor(state, "displayName")}</small> : null}
                </label>
                <label className="profile-field">
                  <span>Email</span>
                  <input value={email} readOnly aria-describedby="email-note" />
                  <small id="email-note">อ้างอิงจากบัญชีที่ใช้สมัคร ไม่สามารถแก้จากหน้านี้</small>
                </label>
                <label className={errorFor(state, "lineContactId") ? "profile-field profile-field--error" : "profile-field"}>
                  <span>LINE ID สำหรับติดต่อ <b>*</b></span>
                  <input name="lineContactId" defaultValue={initialValues?.lineContactId ?? ""} placeholder="LINE ID ที่เพื่อนใช้ค้นหาคุณ" autoComplete="off" required />
                  {errorFor(state, "lineContactId") ? <small>{errorFor(state, "lineContactId")}</small> : <small>ใช้สำหรับติดต่อเรื่องก๊วนและการแข่งขัน</small>}
                </label>
              </div>
            </section>

            <section className="profile-form-section">
              <div className="profile-form-section__heading"><span>02</span><div><h2>พื้นที่ของคุณ</h2><p>ใช้จัดอันดับสนามใกล้เคียงและแนะนำก๊วนตามจังหวัด</p></div></div>
              <div className="profile-form-grid profile-form-grid--address">
                <label className={errorFor(state, "addressLine") ? "profile-field profile-field--error profile-field--full" : "profile-field profile-field--full"}>
                  <span>ที่อยู่ <b>*</b></span>
                  <input name="addressLine" defaultValue={initialValues?.addressLine ?? ""} placeholder="บ้านเลขที่ ซอย ถนน อาคาร" autoComplete="street-address" required />
                  {errorFor(state, "addressLine") ? <small>{errorFor(state, "addressLine")}</small> : null}
                </label>
                <label className={errorFor(state, "province") ? "profile-field profile-field--error" : "profile-field"}>
                  <span>จังหวัด <b>*</b></span>
                  <input name="province" defaultValue={initialValues?.province ?? ""} placeholder="เช่น กรุงเทพมหานคร" autoComplete="address-level1" required />
                  {errorFor(state, "province") ? <small>{errorFor(state, "province")}</small> : null}
                </label>
                <label className={errorFor(state, "district") ? "profile-field profile-field--error" : "profile-field"}>
                  <span>อำเภอ / เขต <b>*</b></span>
                  <input name="district" defaultValue={initialValues?.district ?? ""} placeholder="เช่น บางเขน" autoComplete="address-level2" required />
                  {errorFor(state, "district") ? <small>{errorFor(state, "district")}</small> : null}
                </label>
                <label className={errorFor(state, "subdistrict") ? "profile-field profile-field--error" : "profile-field"}>
                  <span>ตำบล / แขวง <b>*</b></span>
                  <input name="subdistrict" defaultValue={initialValues?.subdistrict ?? ""} placeholder="เช่น อนุสาวรีย์" autoComplete="address-level3" required />
                  {errorFor(state, "subdistrict") ? <small>{errorFor(state, "subdistrict")}</small> : null}
                </label>
                <label className={errorFor(state, "postalCode") ? "profile-field profile-field--error" : "profile-field"}>
                  <span>รหัสไปรษณีย์ <b>*</b></span>
                  <input name="postalCode" defaultValue={initialValues?.postalCode ?? ""} placeholder="10220" inputMode="numeric" autoComplete="postal-code" maxLength={5} required />
                  {errorFor(state, "postalCode") ? <small>{errorFor(state, "postalCode")}</small> : null}
                </label>
              </div>

              <div className="profile-location-panel">
                <div className="profile-location-panel__icon"><MapPin size={21} /></div>
                <div><strong>เพิ่มตำแหน่ง GPS ของคุณ</strong><p>ช่วยคำนวณระยะทางไปสนามแบดได้แม่นขึ้น พิกัดจะไม่แสดงเป็นที่อยู่สาธารณะ</p>{locationStatus ? <small className={locationStatus.includes("แล้ว") ? "profile-location-status profile-location-status--success" : "profile-location-status"}>{locationStatus}</small> : null}</div>
                <button type="button" className="location-button" onClick={captureLocation}><Crosshair size={16} /> ใช้ตำแหน่งปัจจุบัน</button>
              </div>
              <input type="hidden" name="latitude" value={latitude} readOnly />
              <input type="hidden" name="longitude" value={longitude} readOnly />
              {errorFor(state, "latitude") ? <p className="profile-field-error">{errorFor(state, "latitude")}</p> : null}
            </section>

            <div className="profile-privacy-note"><ShieldCheck size={18} /><span>ข้อมูลโปรไฟล์ใช้สำหรับการแนะนำก๊วนและสนามเท่านั้น คุณสามารถแก้ไขข้อมูลภายหลังได้</span></div>
            <div className="profile-setup-actions"><button type="submit" className="profile-submit" disabled={isPending}>{isPending ? "กำลังบันทึก..." : "บันทึกโปรไฟล์และเข้าสู่ Arena"} {!isPending ? <ChevronRight size={18} /> : null}</button><span><CheckCircle2 size={15} /> BP เริ่มต้น 1,000 · Level 1</span></div>
          </form>
        </section>
      </div>
    </main>
  );
}
