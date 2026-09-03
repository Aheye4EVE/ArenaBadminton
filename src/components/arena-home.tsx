"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  Filter,
  Gem,
  Gift,
  Home,
  MapPin,
  MapPinned,
  Medal,
  Menu,
  MessageCircle,
  Navigation,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { brands, courts, events, groups, navItems, type Group } from "@/lib/demo-data";
import AccountMenu from "@/components/account-menu";
import ThaiAreaSelect from "@/components/thai-area-select";
import type { HeaderProfileSummary } from "@/types/profile";

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const props = { size, strokeWidth: 2.15 };
  switch (name) {
    case "home":
      return <Home {...props} />;
    case "users":
      return <Users {...props} />;
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
    default:
      return <Sparkles {...props} />;
  }
}

function AvatarStack({ avatars }: { avatars: string[] }) {
  return (
    <div className="flex items-center">
      {avatars.map((avatar, index) => (
        <span
          key={`${avatar}-${index}`}
          className={cx(
            "avatar-bubble",
            index > 0 && "-ml-2",
            index % 2 === 0 ? "avatar-bubble--warm" : "avatar-bubble--cool",
          )}
          aria-hidden="true"
        >
          {avatar}
        </span>
      ))}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  href,
  tone = "purple",
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  tone?: "purple" | "pink" | "mint";
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p lang={/[A-Za-z]/.test(eyebrow) ? "en" : "th"} className={cx("section-eyebrow", `section-eyebrow--${tone}`)}>{eyebrow}</p> : null}
        <h2 className="section-title">{title}</h2>
      </div>
      {href ? (
        <Link className="section-link" href={href}>
          ดูทั้งหมด <ArrowRight size={15} />
        </Link>
      ) : null}
    </div>
  );
}

function GroupCard({
  group,
  onJoin,
}: {
  group: Group;
  onJoin: (group: Group) => void;
}) {
  const percent = Math.min(100, Math.round((group.members / group.capacity) * 100));
  return (
    <motion.article whileHover={{ y: -3 }} className="group-row">
      <div className={cx("group-rank", `group-rank--${group.accent}`)}>
        {group.accent === "pink" ? "✦" : group.accent === "blue" ? "♛" : "✚"}
      </div>
      <div className="group-row__body">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 lang={/[A-Za-z]/.test(group.title) ? "en" : "th"} className="group-row__title">{group.title}</h3>
            <p className="group-row__meta">
              <MapPin size={13} /> {group.location}
            </p>
            <p className="group-row__meta">
              <CalendarDays size={13} /> {group.dateLabel} · {group.timeLabel}
            </p>
          </div>
          <button
            type="button"
            className={cx("status-pill", group.status === "ใกล้เต็ม" ? "status-pill--pink" : "status-pill--blue")}
            onClick={() => onJoin(group)}
          >
            {group.status}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <AvatarStack avatars={group.avatars} />
            <span className="group-row__members">{group.members}/{group.capacity} คน</span>
            {group.organizerGroupCount !== undefined ? <span className="group-row__members">ผู้จัดจัดแล้ว {group.organizerGroupCount} ก๊วน</span> : null}
          </div>
          <span className="group-row__level">{group.level}</span>
        </div>
        <div className="progress-track mt-2" aria-label={`รับสมาชิกแล้ว ${percent}%`}>
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>
    </motion.article>
  );
}

function EventCard({ event }: { event: (typeof events)[number] }) {
  return (
    <Link href={`/events#${event.id}`} className="event-row">
      <div className={cx("event-art", `event-art--${event.color}`)} aria-hidden="true">
        <span>{event.image}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 lang="en" className="event-row__title">{event.title}</h3>
        <p className="event-row__meta">{event.category}</p>
        <div className="event-row__details">
          <span><CalendarDays size={13} /> {event.dateLabel}</span>
          <span><MapPin size={13} /> {event.venue}</span>
        </div>
      </div>
      <ArrowRight className="event-row__arrow" size={17} />
    </Link>
  );
}

function CourtCard({ court, index }: { court: (typeof courts)[number]; index: number }) {
  return (
    <Link href={`/venues#${court.id}`} className="court-row">
      <span className="court-row__number">{index + 1}</span>
      <div className="court-photo" aria-hidden="true">
        <span>{court.image}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 lang="en" className="court-row__title">{court.name}</h3>
        <p className="court-row__meta"><MapPin size={13} /> {court.district}</p>
        <div className="court-row__details">
          <span><Navigation size={12} /> {court.distance}</span>
          <span className="rating"><Star size={12} fill="currentColor" /> {court.rating}</span>
        </div>
      </div>
    </Link>
  );
}

export default function ArenaHome({
  account,
  isAuthenticated,
  recommendedGroups,
}: {
  account: HeaderProfileSummary | null;
  isAuthenticated: boolean;
  recommendedGroups?: Group[];
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchType, setSearchType] = useState("ก๊วน");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ทั้งหมด");
  const [notice, setNotice] = useState<string | null>(null);
  const selectedSkill = activeFilter === "มือใหม่" ? "beginner" : activeFilter === "มือกลาง" ? "intermediate" : activeFilter === "มือสูง" ? "advanced" : "all";
  const homepageGroups = recommendedGroups ?? groups;

  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return homepageGroups.filter((group) => {
      const matchesQuery = !normalized || `${group.title} ${group.location} ${group.level}`.toLowerCase().includes(normalized);
      const matchesFilter = activeFilter === "ทั้งหมด" || group.level === activeFilter;
      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, homepageGroups, query]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3200);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const keys = searchType === "ก๊วน"
      ? ["q", "province", "district", "subdistrict", "date", "skill", "playType"]
      : searchType === "สนามแบด"
        ? ["q", "province", "district", "subdistrict", "availability", "rating"]
        : ["q", "province", "district", "subdistrict", "date", "eventType", "format"];
    for (const key of keys) {
      const value = String(formData.get(key) ?? "").trim();
      if (value && value !== "all") params.set(key, value);
    }
    const targetPath = searchType === "สนามแบด" ? "/venues" : searchType === "กิจกรรม" ? "/events" : "/groups";
    const queryString = params.toString();
    router.push(`${targetPath}${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <div className="arena-page">
      <section className="hero-stage">
        <Image
          src="/assets/hero-scene.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-scene"
        />
        <div className="hero-scene-overlay" />
        <div className="hero-glow hero-glow--left" />
        <div className="hero-glow hero-glow--right" />

        <div className="relative z-10 mx-auto max-w-[1540px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
          <header className="arena-header flex items-center gap-3">
            <button
              type="button"
              className="menu-button"
              aria-label={mobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={23} />}
            </button>

            <Link href="/" className="brand-lockup" aria-label="Arena Badminton หน้าหลัก">
              <span className="brand-lockup__word">Arena</span>
              <span className="brand-lockup__sub">Badminton</span>
              <span className="brand-lockup__tag"><span className="font-english" lang="en">Community</span> การตีแบดที่เต็มครบทุกครอส</span>
            </Link>

            <nav className="desktop-nav" aria-label="เมนูหลัก">
              {navItems.map((item, index) => (
                <Link key={item.href + item.label} href={item.href} className={cx("desktop-nav__item", index === 0 && "desktop-nav__item--active")}>
                  <NavIcon name={item.icon} size={17} />
                  <span lang={item.label === "Ranking" ? "en" : "th"}>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="header-actions">
              <Link href="/notifications" className="icon-action" aria-label="การแจ้งเตือน">
                <Bell size={19} />
                {account && account.unreadNotificationCount > 0 ? <span className="notification-dot">{Math.min(99, account.unreadNotificationCount)}</span> : null}
              </Link>
              <Link href="/shop" className="gem-balance" aria-label={account ? `ยอด Diamond ${account.gemsBalance}` : "ยอด Diamond ต้องเข้าสู่ระบบก่อน"}>
                <Gem size={18} fill="currentColor" /> <span>{account ? account.gemsBalance.toLocaleString("th-TH") : "—"}</span>
              </Link>
              <AccountMenu account={account} isAuthenticated={isAuthenticated} />
            </div>
          </header>

          <AnimatePresence>
            {mobileMenuOpen ? (
              <motion.nav
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mobile-menu"
                aria-label="เมนูมือถือ"
              >
                {navItems.map((item) => (
                  <Link key={item.href + item.label} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <NavIcon name={item.icon} size={17} /> {item.label}
                  </Link>
                ))}
              </motion.nav>
            ) : null}
          </AnimatePresence>

          <div className="hero-copy">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="hero-kicker"
            >
              <span>♡</span> <span lang="en">Find your game</span> <span>♡</span>
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="hero-title"
            >
              Arena-Badminton
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="hero-subtitle"
            >
              หาก๊วนง่าย นัดตีสะดวก เพื่อนใหม่เพียบ!
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.22 }}
              className="search-shell"
            >
              <div className="search-tabs" role="tablist" aria-label="ประเภทการค้นหา">
                {["ก๊วน", "สนามแบด", "กิจกรรม"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={searchType === tab}
                    className={cx("search-tab", searchType === tab && "search-tab--active")}
                    onClick={() => setSearchType(tab)}
                  >
                    {tab === "ก๊วน" ? <Users size={17} /> : tab === "สนามแบด" ? <MapPin size={17} /> : <BarChart3 size={17} />}
                    {tab}
                  </button>
                ))}
              </div>
              <form className={cx("search-form", "search-form--with-area", searchType === "สนามแบด" && "search-form--venue", searchType === "กิจกรรม" && "search-form--event")} onSubmit={submitSearch}>
                <ThaiAreaSelect mode="home" />
                {searchType === "ก๊วน" ? (
                  <>
                    <label className="search-field">
                      <CalendarDays size={18} />
                      <span className="sr-only">วันที่</span>
                      <select name="date" defaultValue="all" aria-label="เลือกวันที่">
                        <option value="all">วันที่</option>
                        <option value="today">วันนี้</option>
                        <option value="tomorrow">พรุ่งนี้</option>
                        <option value="weekend">สุดสัปดาห์นี้</option>
                      </select>
                      <ChevronDown size={15} />
                    </label>
                    <label className="search-field">
                      <BarChart3 size={18} />
                      <span className="sr-only">ระดับฝีมือ</span>
                      <select name="skill" value={selectedSkill} onChange={(event) => setActiveFilter(({ beginner: "มือใหม่", intermediate: "มือกลาง", advanced: "มือสูง" } as Record<string, string>)[event.target.value] ?? "ทั้งหมด")} aria-label="เลือกระดับฝีมือ">
                        <option value="all">ระดับฝีมือ</option>
                        <option value="beginner">มือใหม่</option>
                        <option value="intermediate">มือกลาง</option>
                        <option value="advanced">มือสูง</option>
                      </select>
                      <ChevronDown size={15} />
                    </label>
                    <label className="search-field search-field--wide">
                      <Dumbbell size={18} />
                      <span className="sr-only">ประเภทการเล่น</span>
                      <select name="playType" defaultValue="all" aria-label="เลือกประเภทก๊วน">
                        <option value="all">ประเภทก๊วน</option>
                        <option value="open">Open</option>
                        <option value="friendly">Friendly</option>
                        <option value="training">Training</option>
                        <option value="tournament">Tournament</option>
                      </select>
                      <ChevronDown size={15} />
                    </label>
                  </>
                ) : searchType === "สนามแบด" ? (
                  <>
                    <label className="search-field">
                      <MapPin size={18} />
                      <span className="sr-only">สถานะสนาม</span>
                      <select name="availability" defaultValue="all" aria-label="เลือกสถานะสนาม">
                        <option value="all">ทุกสถานะสนาม</option>
                        <option value="available">มีคิวว่าง</option>
                      </select>
                      <ChevronDown size={15} />
                    </label>
                    <label className="search-field">
                      <Star size={18} />
                      <span className="sr-only">คะแนนสนาม</span>
                      <select name="rating" defaultValue="all" aria-label="เลือกคะแนนสนาม">
                        <option value="all">ทุกคะแนน</option>
                        <option value="4">4.0 ดาวขึ้นไป</option>
                        <option value="4.5">4.5 ดาวขึ้นไป</option>
                      </select>
                      <ChevronDown size={15} />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="search-field">
                      <CalendarDays size={18} />
                      <span className="sr-only">ช่วงเวลากิจกรรม</span>
                      <select name="date" defaultValue="all" aria-label="เลือกช่วงเวลากิจกรรม">
                        <option value="all">ทุกช่วงเวลา</option>
                        <option value="upcoming">กิจกรรมที่กำลังจะมา</option>
                        <option value="thisMonth">ภายในเดือนนี้</option>
                        <option value="weekend">สุดสัปดาห์</option>
                      </select>
                      <ChevronDown size={15} />
                    </label>
                    <label className="search-field search-field--wide">
                      <Trophy size={18} />
                      <span className="sr-only">ประเภทกิจกรรม</span>
                      <select name="eventType" defaultValue="all" aria-label="เลือกประเภทกิจกรรม">
                        <option value="all">ทุกประเภทกิจกรรม</option>
                        <option value="tournament">Tournament</option>
                        <option value="friendly">Friendly</option>
                        <option value="training">Training</option>
                        <option value="challenge">Challenge</option>
                      </select>
                      <ChevronDown size={15} />
                    </label>
                  </>
                )}
                <label className="search-input">
                  <Search size={18} />
                  <span className="sr-only">คำค้นหา</span>
                  <input name="q" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`ค้นหา${searchType}`} />
                </label>
                <button type="submit" className="search-submit">
                  <Search size={18} /> <span>ค้นหา{searchType}</span>
                </button>
              </form>
              <Link href={searchType === "สนามแบด" ? "/venues" : searchType === "กิจกรรม" ? "/events" : "/groups"} className="search-advanced-link">
                <Filter size={14} /> {searchType === "สนามแบด" ? "ค้นหาแบบละเอียด: จังหวัด · อำเภอ/เขต · ตำบล/แขวง · คะแนน" : searchType === "กิจกรรม" ? "ค้นหาแบบละเอียด: จังหวัด · อำเภอ/เขต · ตำบล/แขวง · ประเภทกิจกรรม" : "ค้นหาแบบละเอียด: จังหวัด · อำเภอ/เขต · ตำบล/แขวง"} <ArrowRight size={14} />
              </Link>
            </motion.div>
          </div>

        </div>
      </section>

      <main className="dashboard-area">
        <div className="mx-auto max-w-[1540px] px-4 sm:px-6 lg:px-8">
          <section className="partner-strip" aria-label="Partner Brands">
            <span className="partner-strip__label" lang="en">Partner Brands</span>
            <div className="partner-strip__brands">
              {brands.map((brand) => (
                <span key={brand.name} className={cx("partner-brand", `partner-brand--${brand.slug}`)}>
                  <Image src={brand.logo} alt={brand.alt} width={150} height={44} className="partner-brand__logo" />
                </span>
              ))}
            </div>
            <button type="button" className="partner-strip__more" onClick={() => showNotice("กำลังเปิดรายชื่อ Partner ทั้งหมด")}>ดูทั้งหมด <ArrowRight size={15} /></button>
          </section>

          <section className="dashboard-layout">
            <div className="dashboard-main">
              <div className="dashboard-columns">
                <section className="dashboard-card dashboard-card--pink">
                  <SectionHeading eyebrow="ชุมชนของเรา" title="ก๊วนแนะนำ" href="/groups" tone="pink" />
                  <div className="space-y-2">
                    {visibleGroups.slice(0, 5).map((group) => <GroupCard key={group.id} group={group} onJoin={(selectedGroup) => selectedGroup.detailHref ? router.push(selectedGroup.detailHref) : showNotice(`เปิดรายละเอียดก๊วน ${selectedGroup.title}`)} />)}
                    {visibleGroups.length === 0 ? <div className="empty-card"><Sparkles size={21} /><p>ยังไม่พบก๊วนจากตัวกรองนี้</p></div> : null}
                  </div>
                </section>

                <section className="dashboard-card dashboard-card--lavender">
                  <SectionHeading eyebrow="Play more, feel more" title="กิจกรรม & ทัวร์นาเมนต์" href="/events" tone="purple" />
                  <div className="space-y-2">
                    {events.map((event) => <EventCard key={event.id} event={event} />)}
                  </div>
                </section>

                <section className="dashboard-card dashboard-card--mint">
                  <SectionHeading eyebrow="Find your court" title="สนามแบดแนะนำ" href="/venues" tone="mint" />
                  <div className="space-y-2">
                    {courts.map((court, index) => <CourtCard key={court.id} court={court} index={index} />)}
                  </div>
                </section>
              </div>

              <section className="feature-actions">
                <Link href="/organizer" className="feature-action">
                  <span className="feature-action__icon feature-action__icon--purple"><Users size={21} /></span>
                  <span><strong>สร้างก๊วนของคุณ</strong><small>นัดเพื่อนง่าย ได้โต๊ะทันที</small></span>
                  <ArrowRight size={17} />
                </Link>
                <Link href="/venues" className="feature-action">
                  <span className="feature-action__icon feature-action__icon--pink"><CalendarDays size={21} /></span>
                  <span><strong>เช็กสนามว่าง</strong><small>จองง่าย ไม่พลาดคิว</small></span>
                  <ArrowRight size={17} />
                </Link>
                <Link href="/community" className="feature-action">
                  <span className="feature-action__icon feature-action__icon--blue"><UserRound size={21} /></span>
                  <span><strong>หาคู่ตี & เพิ่มเพื่อน</strong><small>ขยายสังคมคนรักแบด</small></span>
                  <ArrowRight size={17} />
                </Link>
                <Link href="/shop" className="feature-action">
                  <span className="feature-action__icon feature-action__icon--yellow"><Gift size={21} /></span>
                  <span><strong>สะสมแต้ม & แลกรางวัล</strong><small>เล่นสนุก ได้ของรางวัล</small></span>
                  <ArrowRight size={17} />
                </Link>
              </section>
            </div>

            <aside className="dashboard-rail">
              <section className="download-card">
                <div>
                  <p className="download-card__eyebrow">Arena in your pocket</p>
                  <h2>โหลดแอป<br /><span className="font-english" lang="en">Arena-Badminton</span></h2>
                  <p>สะดวกครบ จบในแอปเดียว!</p>
                  <div className="store-badges"><span>▶ Google Play</span><span>● App Store</span></div>
                </div>
                <div className="phone-mock" aria-hidden="true"><div className="phone-mock__screen"><span>🏸</span><strong lang="en">Arena</strong><small lang="en">Badminton</small></div></div>
              </section>

              <section className="community-card">
                <div className="community-card__heading"><h2 lang="en">Community</h2><Sparkles size={17} /></div>
                <div className="community-stats">
                  <div><Users size={18} /><strong>สมาชิกทั้งหมด</strong><b>12,345 คน</b></div>
                  <div><Users size={18} /><strong>ก๊วนทั้งหมด</strong><b>1,234 ก๊วน</b></div>
                  <div><Medal size={18} /><strong>แบดที่จัดแล้ว</strong><b>8,765 แมตช์</b></div>
                  <div><MapPin size={18} /><strong>สนามในระบบ</strong><b>452 สนาม</b></div>
                </div>
              </section>

              <Link href="/messages" className="chat-card">
                <span className="chat-card__icon"><MessageCircle size={22} /></span>
                <span><strong>บอร์ดพูดคุย</strong><small>คุยเรื่องแบดกับเพื่อน ๆ</small></span>
                <ArrowRight size={18} />
              </Link>

              <section className="join-card">
                <div className="join-card__bubble">ชวนเพื่อน<br />มาตีแบดกัน!</div>
                <div className="join-card__art" aria-hidden="true">🐰🏸</div>
                <Link href="/community" className="join-card__button">มารวมก๊วน <ArrowRight size={15} /></Link>
              </section>
            </aside>
          </section>
        </div>
      </main>

      <nav className="mobile-bottom-nav" aria-label="เมนูหลักมือถือ">
        <Link href="/" className="mobile-bottom-nav__item mobile-bottom-nav__item--active"><Home size={19} /><span>หน้าหลัก</span></Link>
        <Link href="/groups" className="mobile-bottom-nav__item"><Search size={19} /><span>ค้นหา</span></Link>
        <Link href="/organizer" className="mobile-bottom-nav__create"><Plus size={22} /></Link>
        <Link href="/ranking" className="mobile-bottom-nav__item"><Trophy size={19} /><span lang="en">Ranking</span></Link>
        <Link href="/profile" className="mobile-bottom-nav__item"><UserRound size={19} /><span lang="en">Profile</span></Link>
      </nav>

      <AnimatePresence>
        {notice ? (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} className="toast" role="status">
            <CheckCircle2 size={18} /> {notice}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
