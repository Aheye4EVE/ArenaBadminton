"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Home, MapPinned, MessageCircle, Search, Shield, ShoppingCart, Store, Trophy, Users, X } from "lucide-react";
import { navItems } from "@/lib/demo-data";

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

function NavIcon({ name }: { name: string }) {
  const props = { size: 18, strokeWidth: 2.15 };
  switch (name) {
    case "home":
      return <Home {...props} />;
    case "shield":
      return <Shield {...props} />;
    case "search":
      return <Search {...props} />;
    case "map":
      return <MapPinned {...props} />;
    case "calendar":
      return <CalendarDays {...props} />;
    case "shopping-cart":
      return <ShoppingCart {...props} />;
    case "trophy":
      return <Trophy {...props} />;
    case "message":
      return <MessageCircle {...props} />;
    case "store":
      return <Store {...props} />;
    case "users":
      return <Users {...props} />;
    default:
      return <Store {...props} />;
  }
}

export default function ArenaMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("a")?.focus());

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return (
    <div className="arena-menu" ref={menuRef}>
      <button
        type="button"
        className={cx("arena-menu__trigger", open && "arena-menu__trigger--open")}
        aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
        aria-expanded={open}
        aria-controls="arena-menu-panel"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={23} strokeWidth={2.2} aria-hidden="true" /> : <Image src="/assets/arena-shuttle-menu.png" alt="" width={40} height={40} aria-hidden="true" priority />}
      </button>

      {open ? (
        <>
          <button type="button" className="arena-menu__backdrop" aria-label="ปิดเมนู" onClick={() => setOpen(false)} />
          <nav ref={panelRef} id="arena-menu-panel" className="arena-menu__panel" aria-label="เมนูหลัก Arena">
            {navItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href + item.label} href={item.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
                  <NavIcon name={item.icon} />
                  <span lang={/^[A-Za-z]+$/.test(item.label) ? "en" : "th"}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </>
      ) : null}
    </div>
  );
}
