"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Bell, UserRound } from "lucide-react";
import ArenaMenu from "@/components/arena-menu";
import MessengerWidget from "@/components/messenger-widget";

export default function FrontendShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return children;
  const home = pathname === "/";

  return (
    <div className="frontend-shell" data-arena-theme="rainbow-court" data-page={home ? "home" : "inner"}>
      <div className="frontend-background" aria-hidden="true" />
      <a className="frontend-skip-link" href="#arena-content">ข้ามไปเนื้อหา</a>
      {!home ? <header className="frontend-header">
        <ArenaMenu key={pathname} />
        <Link className="frontend-brand" href="/" aria-label="Arena-Badminton หน้าหลัก"><span lang="en">Arena<span className="frontend-brand__sparkle" aria-hidden="true">✦</span></span><strong lang="en">Badminton</strong></Link>
        <div className="frontend-header__actions"><Link href="/notifications" aria-label="การแจ้งเตือน"><Bell size={19} /></Link><Link href="/profile" aria-label="โปรไฟล์ของฉัน"><UserRound size={20} /></Link></div>
      </header> : null}
      <div id="arena-content" className="frontend-content" tabIndex={-1}>{children}</div>
      <MessengerWidget />
      {!home ? <footer className="frontend-footer"><span lang="en">✦ Arena-Badminton</span><span>เจอก๊วนที่ใช่ แล้วไปตีด้วยกัน</span><Link href="/organizer">สร้างก๊วนของคุณ ↗</Link></footer> : null}
    </div>
  );
}
