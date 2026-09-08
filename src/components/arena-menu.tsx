"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Home, MapPinned, MessageCircle, Search, Shield, ShoppingCart, Store, Trophy, Users, X } from "lucide-react";
import { navItems } from "@/lib/demo-data";

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

const menuPanelVariants = {
  closed: { opacity: 0, scale: 0.85, y: -10 },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 420, damping: 25, mass: 0.8 },
  },
};

const menuListVariants = {
  closed: {},
  open: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } },
};

const menuItemVariants = {
  closed: { opacity: 0, y: 8 },
  open: { opacity: 1, y: 0, transition: { duration: 0.18 } },
};

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
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) closeMenu();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("a")?.focus()));

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [closeMenu, open]);

  return (
    <div className="arena-menu" ref={menuRef}>
      <motion.button
        ref={triggerRef}
        type="button"
        className={cx("arena-menu__trigger", open && "arena-menu__trigger--open")}
        aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
        aria-expanded={open}
        aria-controls="arena-menu-panel"
        onClick={() => setOpen((current) => !current)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
      >
        <AnimatePresence initial={false} mode="wait">
          {open ? (
            <motion.span key="close" className="arena-menu__trigger-icon" initial={{ opacity: 0, rotate: -180, scale: 0.65 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 180, scale: 0.65 }} transition={{ duration: 0.24 }}>
              <X size={23} strokeWidth={2.2} aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span key="shuttle" className="arena-menu__trigger-icon" initial={{ opacity: 0, rotate: -180, scale: 0.65 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 180, scale: 0.65 }} transition={{ duration: 0.24 }}>
              <Image src="/assets/arena-shuttle-menu.webp" alt="" width={40} height={40} aria-hidden="true" priority />
            </motion.span>
          )}
        </AnimatePresence>
        <span className="arena-menu__label" lang="en">Menu</span>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button type="button" className="arena-menu__backdrop" aria-label="ปิดเมนู" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={closeMenu} />
            <motion.nav
              ref={panelRef}
              id="arena-menu-panel"
              className="arena-menu__panel"
              aria-label="เมนูหลัก Arena"
              variants={menuPanelVariants}
              initial="closed"
              animate="open"
              exit="closed"
              style={{ transformOrigin: "top left" }}
            >
              <motion.div className="arena-menu__items" variants={menuListVariants} initial="closed" animate="open">
                {navItems.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <motion.div key={item.href + item.label} variants={menuItemVariants}>
                      <Link href={item.href} aria-current={active ? "page" : undefined} onClick={closeMenu}>
                        <NavIcon name={item.icon} />
                        <span lang={/^[A-Za-z]+$/.test(item.label) ? "en" : "th"}>{item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
