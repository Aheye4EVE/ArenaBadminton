import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, ShieldCheck } from "lucide-react";
import VenueSuggestionForm from "@/components/venue-suggestion-form";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "เสนอชื่อสนาม | Arena-Badminton" };
export const dynamic = "force-dynamic";

export default async function VenueSuggestionPage() {
  const { user } = await getAuthenticatedProfile();
  if (!user) redirect("/auth/login?message=auth_required&next=/venues/suggest");
  return <main className="venue-suggest-page"><div className="venue-suggest-shell"><header className="groups-topbar"><Link href="/venues" className="groups-back"><MapPin size={17} /> กลับหน้าสนาม</Link><Link href="/" className="groups-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link><span className="organizer-user-chip">ทะเบียน Community</span></header><section className="venue-suggest-hero"><div><p lang="en">Community venue registry</p><h1>สนามที่ยังไม่มีในระบบ?</h1><span>ส่งชื่อสนามและพื้นที่จากข้อมูลสาธารณะให้ทีมงานตรวจสอบก่อนนำเข้า ทะเบียนนี้จะถูกใช้ร่วมกับหน้า Profile, ก๊วน และกิจกรรม</span></div><div aria-hidden="true">🏸</div></section><section className="venue-suggest-panel"><div className="venue-suggest-panel__heading"><div><p>Suggest a venue</p><h2>เพิ่มข้อมูลสนามจากแหล่งอ้างอิง</h2></div><ShieldCheck size={23} /></div><p className="venue-suggest-note">กรอกเฉพาะข้อมูลที่ตรวจสอบได้ ไม่ต้องระบุ GPS จำนวนคอร์ท หรือสถานะคิว หากไม่มีแหล่งข้อมูลที่ยืนยันได้</p><VenueSuggestionForm /></section><footer className="venue-detail-footer"><Link href="/venues">กลับรายการสนาม</Link><span>ทุกข้อเสนอจะอยู่ในสถานะรอตรวจสอบก่อนเผยแพร่</span></footer></div></main>;
}
