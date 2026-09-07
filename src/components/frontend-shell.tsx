"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import ArenaMenu from "@/components/arena-menu";
import AccountMenu from "@/components/account-menu";
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
        <Link className="frontend-brand" href="/" aria-label="Arena-Badminton หน้าหลัก"><Image src="/assets/Logo-N.png" alt="Arena-Badminton" width={1698} height={926} quality={100} priority /></Link>
        <div className="frontend-header__actions"><Link href="/notifications" aria-label="การแจ้งเตือน"><Bell size={19} /></Link><AccountMenu /></div>
      </header> : null}
      <div id="arena-content" className="frontend-content" tabIndex={-1}>{children}</div>
      <MessengerWidget />
      {!home ? <footer className="frontend-footer"><span lang="en">✦ Arena-Badminton</span><span>เจอก๊วนที่ใช่ แล้วไปตีด้วยกัน</span><Link href="/organizer">สร้างก๊วนของคุณ ↗</Link></footer> : null}
    </div>
  );
}
