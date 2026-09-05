import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="route-state">
      <div className="route-state__orb route-state__orb--blue" aria-hidden="true"><SearchX size={28} /></div>
      <p className="section-eyebrow section-eyebrow--purple">404 · Court not found</p>
      <h1>ยังหาแมตช์หน้านี้ไม่เจอ</h1>
      <p>ลิงก์อาจหมดอายุ หรือหน้านี้ยังไม่เปิดใช้งาน</p>
      <Link href="/" className="primary-action"><ArrowLeft size={17} /> กลับไปหน้าแรก</Link>
    </main>
  );
}
