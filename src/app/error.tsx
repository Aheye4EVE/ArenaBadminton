"use client";

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="route-state">
      <div className="route-state__orb route-state__orb--error" aria-hidden="true"><TriangleAlert size={28} /></div>
      <p className="section-eyebrow section-eyebrow--pink">Arena-Badminton</p>
      <h1>สนามนี้สะดุดนิดหน่อย</h1>
      <p>ลองโหลดหน้านี้อีกครั้ง หรือกลับไปค้นหาก๊วนจากหน้าแรก</p>
      <div className="route-state__actions">
        <button type="button" className="primary-action" onClick={() => reset()}><RotateCcw size={17} /> ลองอีกครั้ง</button>
        <Link href="/" className="secondary-action">กลับหน้าหลัก</Link>
      </div>
    </main>
  );
}
