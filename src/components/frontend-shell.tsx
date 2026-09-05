"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Bell, CalendarDays, Home, MessageCircle, Search, Shield, ShoppingBag, Store, Trophy, UserRound, MapPin, Users } from "lucide-react";
import MessengerWidget from "@/components/messenger-widget";

const links = [
  { href: "/", label: "หน้าหลัก", icon: Home },
  { href: "/guilds", label: "Guild", icon: Shield },
  { href: "/groups", label: "ค้นหาก๊วน", icon: Search },
  { href: "/venues", label: "สนามแบด", icon: MapPin },
  { href: "/events", label: "กิจกรรม", icon: CalendarDays },
  { href: "/shop", label: "ร้านค้า", icon: ShoppingBag },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/community", label: "บอร์ดพูดคุย", icon: MessageCircle },
  { href: "/friends", label: "เพื่อน", icon: Users },
  { href: "/marketplace", label: "ตลาดมือสอง", icon: Store },
];

export default function FrontendShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return children;
  const home = pathname === "/";

  return (
    <div className="frontend-shell" data-arena-theme="rainbow-court" data-page={home ? "home" : "inner"}>
      <div className="frontend-background" aria-hidden="true" />
      <a className="frontend-skip-link" href="#arena-content">ข้ามไปเนื้อหา</a>
      {!home ? <header className="frontend-navigation">
        <Link className="frontend-brand" href="/" aria-label="Arena-Badminton หน้าหลัก"><span lang="en">Arena<span className="frontend-brand__sparkle" aria-hidden="true">✦</span></span><strong lang="en">Badminton</strong></Link>
        <nav className="frontend-navigation__links" aria-label="เมนูหลัก Arena">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? home : pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon size={17} aria-hidden="true" /><span lang={/^[A-Za-z]+$/.test(label) ? "en" : "th"}>{label}</span></Link>;
          })}
        </nav>
        <div className="frontend-navigation__actions"><Link href="/notifications" aria-label="การแจ้งเตือน"><Bell size={19} /></Link><Link href="/profile" aria-label="โปรไฟล์ของฉัน"><UserRound size={20} /></Link></div>
      </header> : null}
      <div id="arena-content" className="frontend-content" tabIndex={-1}>{children}</div>
      <MessengerWidget />
      {!home ? <footer className="frontend-footer"><span lang="en">✦ Arena-Badminton</span><span>เจอก๊วนที่ใช่ แล้วไปตีด้วยกัน</span><Link href="/organizer">สร้างก๊วนของคุณ ↗</Link></footer> : null}
    </div>
  );
}
