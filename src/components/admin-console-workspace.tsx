"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Award,
  LayoutDashboard,
  MailCheck,
  MapPin,
  ShieldCheck,
  Store,
  Swords,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export type AdminSectionId =
  | "users"
  | "guilds"
  | "shop"
  | "bp-rules"
  | "trophies"
  | "moderation"
  | "venues"
  | "auth";

export type AdminConsoleSection = {
  id: AdminSectionId;
  content: ReactNode;
};

type AdminMenuItem = {
  id: AdminSectionId;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "pink" | "purple" | "mint" | "gold";
};

const ADMIN_MENU: AdminMenuItem[] = [
  {
    id: "users",
    eyebrow: "Member Directory",
    title: "จัดการผู้ใช้งาน",
    description: "สมาชิก · Profile · Gems",
    icon: UserCog,
    tone: "pink",
  },
  {
    id: "guilds",
    eyebrow: "Guild Control",
    title: "ตั้งค่า Guild",
    description: "กติกาการสร้างและเพดานสมาชิก",
    icon: Users,
    tone: "purple",
  },
  {
    id: "shop",
    eyebrow: "Catalog & Wallet",
    title: "จัดการ Shop & Gems",
    description: "Catalog · Item · Wallet",
    icon: Store,
    tone: "pink",
  },
  {
    id: "bp-rules",
    eyebrow: "Battle Rules",
    title: "ตั้งค่ากติกา Skill BP",
    description: "กติกา BP และ Settlement",
    icon: Swords,
    tone: "purple",
  },
  {
    id: "trophies",
    eyebrow: "Achievement Control",
    title: "แจก Trophy ให้ผู้เล่น",
    description: "มอบรางวัลผ่าน RPC",
    icon: Award,
    tone: "gold",
  },
  {
    id: "moderation",
    eyebrow: "Safety Queue",
    title: "ตรวจสอบ Report",
    description: "Community · สนาม · Guild",
    icon: AlertTriangle,
    tone: "gold",
  },
  {
    id: "venues",
    eyebrow: "Venue Registry",
    title: "ตรวจสอบทะเบียนสนาม",
    description: "คิวข้อเสนอจาก Community",
    icon: MapPin,
    tone: "mint",
  },
  {
    id: "auth",
    eyebrow: "Member Access",
    title: "ยืนยัน Email",
    description: "นโยบายการสมัครสมาชิก",
    icon: MailCheck,
    tone: "pink",
  },
];

const menuMotion = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
};

export default function AdminConsoleWorkspace({ sections }: { sections: AdminConsoleSection[] }) {
  const [activeId, setActiveId] = useState<AdminSectionId>(sections[0]?.id ?? "users");
  const activeSection = sections.find((section) => section.id === activeId) ?? sections[0];
  const activeItem = ADMIN_MENU.find((item) => item.id === activeSection?.id) ?? ADMIN_MENU[0];

  if (!activeSection) return null;

  return (
    <section className="admin-console-workspace" aria-label="Admin Console Workspace">
      <aside className="admin-console-workspace__sidebar">
        <div className="admin-console-workspace__sidebar-heading">
          <span className="admin-console-workspace__sidebar-icon"><LayoutDashboard size={18} /></span>
          <div>
            <p lang="en">Admin Console</p>
            <h1>เมนู Admin</h1>
          </div>
        </div>

        <nav className="admin-console-workspace__nav" aria-label="เมนูจัดการระบบ" role="tablist" aria-orientation="vertical">
          {ADMIN_MENU.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.id === activeSection.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`admin-workspace-panel-${item.id}`}
                className={`admin-console-workspace__nav-item admin-console-workspace__nav-item--${item.tone}`}
                data-active={isActive ? "true" : "false"}
                onClick={() => setActiveId(item.id)}
                {...menuMotion}
                transition={{ duration: 0.18, delay: index * 0.025 }}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.985 }}
              >
                <span className="admin-console-workspace__nav-icon"><Icon size={17} /></span>
                <span className="admin-console-workspace__nav-copy">
                  <small lang="en">{item.eyebrow}</small>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </span>
                <span className="admin-console-workspace__nav-index">{String(index + 1).padStart(2, "0")}</span>
              </motion.button>
            );
          })}
        </nav>

        <div className="admin-console-workspace__sidebar-status">
          <ShieldCheck size={15} />
          <span>สิทธิ์ Admin ตรวจซ้ำผ่าน Supabase RPC + RLS</span>
        </div>
      </aside>

      <div className="admin-console-workspace__content">
        <header className="admin-console-workspace__content-heading">
          <div>
            <p lang="en">Workspace · {activeItem.eyebrow}</p>
            <h2>{activeItem.title}</h2>
            <span>เลือกเมนูทางซ้ายเพื่อเปิดพื้นที่ทำงาน โดยไม่ต้องเปลี่ยนหน้า</span>
          </div>
          <span className="admin-console-workspace__live-pill"><span /> LIVE WORKSPACE</span>
        </header>

        <div
          id={`admin-workspace-panel-${activeSection.id}`}
          className="admin-console-workspace__panel"
          role="tabpanel"
          aria-label={activeItem.title}
          tabIndex={0}
        >
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={activeSection.id}
              className="admin-console-workspace__panel-transition"
              initial={{ opacity: 0, y: 14, scale: 0.992 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.992 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {activeSection.content}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
