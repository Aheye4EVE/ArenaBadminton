import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, MapPin, ShieldAlert, X } from "lucide-react";
import { reviewVenueSuggestionAction } from "@/app/admin/venues/actions";

export type AdminVenueSuggestion = {
  id: string;
  name: string;
  province: string;
  district: string | null;
  subdistrict: string | null;
  address: string | null;
  sourceUrl: string | null;
  createdAt: string;
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "เมื่อสักครู่" : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(date);
}

export default function AdminVenueSuggestionsPanel({ suggestions, error, updated }: { suggestions: AdminVenueSuggestion[]; error?: string; updated?: boolean }) {
  return <main className="admin-venue-page"><div className="admin-venue-shell"><header className="admin-venue-topbar"><Link href="/admin" className="admin-venue-back"><ArrowLeft size={16} /> Admin Hub</Link><Link href="/" className="admin-hub-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link><span className="admin-hub-role"><MapPin size={15} /> Venue Registry</span></header><section className="admin-venue-hero"><div><p lang="en">Venue Registry</p><h1>ตรวจสอบข้อเสนอสนาม</h1><span>อนุมัติเฉพาะชื่อและพื้นที่ที่ตรวจสอบจากแหล่งข้อมูลสาธารณะได้ ระบบจะสร้างทะเบียนสนามโดยไม่เติม GPS จำนวนคอร์ท หรือคิวว่างให้เอง</span></div><div aria-hidden="true">🏸</div></section>{updated ? <p className="admin-venue-feedback">บันทึกการตรวจสอบแล้ว</p> : null}{error ? <p className="admin-venue-feedback admin-venue-feedback--error">ดำเนินการไม่สำเร็จ กรุณาตรวจสอบรายการอีกครั้ง</p> : null}<section className="admin-venue-list"><div className="admin-venue-list__heading"><div><p>Pending review</p><h2>ข้อเสนอที่รอตรวจสอบ</h2></div><span>{suggestions.length} รายการ</span></div>{suggestions.length > 0 ? suggestions.map((suggestion) => <article className="admin-venue-row" key={suggestion.id}><div className="admin-venue-row__icon"><MapPin size={19} /></div><div className="admin-venue-row__body"><strong>{suggestion.name}</strong><span>{[suggestion.subdistrict, suggestion.district, suggestion.province].filter(Boolean).join(" · ")}</span><p>{suggestion.address || "ไม่ได้ระบุที่อยู่"}</p><small>ส่งเมื่อ {dateLabel(suggestion.createdAt)} · {suggestion.sourceUrl ? <a href={suggestion.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={12} /> แหล่งข้อมูล</a> : "ไม่มีลิงก์แหล่งข้อมูล"}</small></div><div className="admin-venue-row__actions"><form action={reviewVenueSuggestionAction}><input type="hidden" name="suggestionId" value={suggestion.id} /><input type="hidden" name="decision" value="approved" /><button type="submit" className="admin-venue-approve"><Check size={14} /> อนุมัติ</button></form><form action={reviewVenueSuggestionAction}><input type="hidden" name="suggestionId" value={suggestion.id} /><input type="hidden" name="decision" value="rejected" /><button type="submit" className="admin-venue-reject"><X size={14} /> ปฏิเสธ</button></form></div></article>) : <div className="admin-venue-empty"><ShieldAlert size={27} /><strong>ไม่มีข้อเสนอที่รอตรวจสอบ</strong><span>เมื่อ Community ส่งชื่อสนาม รายการจะเข้าคิวนี้</span></div>}</section><footer className="admin-venue-footer"><Link href="/venues">เปิดหน้าทะเบียนสนาม</Link><Link href="/admin">กลับ Admin Hub</Link></footer></div></main>;
}
