"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Dumbbell,
  Eye,
  Filter,
  MapPin,
  Navigation,
  PackageSearch,
  Search,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { courts as demoCourts, events as demoEvents, groups, type Court, type Event, type Group } from "@/lib/demo-data";
import ArenaMenu from "@/components/arena-menu";
import AccountMenu from "@/components/account-menu";
import ThaiAreaSelect from "@/components/thai-area-select";
import type { HomepageMarketplaceListing } from "@/lib/home-data";
import type { HeaderProfileSummary } from "@/types/profile";

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

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
        <h2 lang={/[A-Za-z]/.test(title) ? "en" : "th"} className="section-title">{title}</h2>
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

function EventCard({ event }: { event: Event }) {
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

function CourtCard({ court, index }: { court: Court; index: number }) {
  return (
    <Link href={`/venues#${court.id}`} className="court-row">
      <span className="court-row__number">{index + 1}</span>
      <div className="court-photo">
        {court.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={court.imageUrl} alt="" loading="lazy" />
        ) : <span aria-hidden="true">{court.image}</span>}
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

const marketplaceCategoryLabels: Record<string, string> = { racket: "ไม้แบด", shoes: "รองเท้า", bag: "กระเป๋า", apparel: "เสื้อผ้า", equipment: "อุปกรณ์", other: "อื่น ๆ" };
const marketplaceConditionLabels: Record<string, string> = { new: "ของใหม่", like_new: "เหมือนใหม่", good: "สภาพดี", fair: "มีร่องรอย", for_parts: "ขายตามสภาพ" };

function MarketplaceHomeRow({ listing, showViewCount }: { listing: HomepageMarketplaceListing; showViewCount: boolean }) {
  return (
    <Link href={`/marketplace/${listing.id}`} className="marketplace-home-item">
      <span className="marketplace-home-item__image" aria-hidden="true">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.imageUrl} alt="" loading="lazy" />
        ) : <PackageSearch size={22} />}
      </span>
      <span className="marketplace-home-item__body">
        <strong>{listing.title}</strong>
        <small>{showViewCount ? <><Eye size={12} /> {listing.viewCount.toLocaleString("th-TH")} ครั้ง · </> : null}{marketplaceCategoryLabels[listing.category] ?? listing.category}</small>
        <span className="marketplace-home-item__price">฿{listing.price.toLocaleString("th-TH", { maximumFractionDigits: 2 })}</span>
      </span>
      <span className={cx("marketplace-home-item__status", listing.status === "reserved" && "marketplace-home-item__status--reserved")}>
        {listing.status === "reserved" ? "มีคนจอง" : marketplaceConditionLabels[listing.conditionGrade] ?? listing.conditionGrade}
      </span>
      <ArrowRight className="marketplace-home-item__arrow" size={16} aria-hidden="true" />
    </Link>
  );
}

export default function ArenaHome({
  account,
  isAuthenticated,
  recommendedGroups,
  featuredEvents,
  featuredCourts,
  featuredMarketplaceListings,
  marketplaceSortMode,
  homeDataErrors,
  isLiveData = false,
}: {
  account: HeaderProfileSummary | null;
  isAuthenticated: boolean;
  recommendedGroups?: Group[];
  featuredEvents?: Event[];
  featuredCourts?: Court[];
  featuredMarketplaceListings?: HomepageMarketplaceListing[];
  marketplaceSortMode?: "views" | "latest";
  homeDataErrors?: {
    events: boolean;
    venues: boolean;
    marketplace: boolean;
  };
  isLiveData?: boolean;
}) {
  const router = useRouter();
  const [searchType, setSearchType] = useState("ก๊วน");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ทั้งหมด");
  const selectedSkill = activeFilter === "มือใหม่" ? "beginner" : activeFilter === "มือกลาง" ? "intermediate" : activeFilter === "มือสูง" ? "advanced" : "all";
  const homepageGroups = recommendedGroups ?? groups;
  const homepageEvents = isLiveData ? (featuredEvents ?? []) : demoEvents;
  const homepageCourts = isLiveData ? (featuredCourts ?? []) : demoCourts;
  const homepageMarketplaceListings = isLiveData ? (featuredMarketplaceListings ?? []) : [];
  const marketplaceUsesViews = marketplaceSortMode !== "latest";

  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return homepageGroups.filter((group) => {
      const matchesQuery = !normalized || `${group.title} ${group.location} ${group.level}`.toLowerCase().includes(normalized);
      const matchesFilter = activeFilter === "ทั้งหมด" || group.level === activeFilter;
      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, homepageGroups, query]);

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
    <div className={cx("arena-page", (account || isAuthenticated) && "arena-page--with-profile-card")}>
      <section className="hero-stage">
        <div className="hero-container relative z-10 mx-auto max-w-[1540px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
          <header className="arena-header flex items-center gap-3">
            <ArenaMenu />

            <Link href="/" className="brand-lockup" aria-label="Arena Badminton หน้าหลัก">
              <Image src="/assets/arena-logo.png" alt="Arena-Badminton" width={1466} height={799} priority />
            </Link>

            <div className="header-actions">
              <AccountMenu account={account} isAuthenticated={isAuthenticated} />
            </div>
          </header>

          <div className="hero-copy">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="hero-kicker"
            >
              <Image src="/assets/hero-find-your-game.png" alt="Find your game" width={2048} height={768} priority />
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="hero-title"
              aria-label="Arena-Badminton"
            >
              <Image src="/assets/arena-title-mascot.png" alt="Arena-Badminton" width={2135} height={736} priority />
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
          <section className="dashboard-layout">
            <div className="dashboard-main">
              <div className="dashboard-columns">
                <section className="dashboard-card dashboard-card--pink dashboard-card--groups">
                  <SectionHeading title="ก๊วนแนะนำ" href="/groups" tone="pink" />
                  <div className="space-y-2">
                    {visibleGroups.slice(0, 5).map((group) => <GroupCard key={group.id} group={group} onJoin={(selectedGroup) => router.push(selectedGroup.detailHref ?? "/groups")} />)}
                    {visibleGroups.length === 0 ? <div className="empty-card"><Sparkles size={21} /><p>ยังไม่พบก๊วนจากตัวกรองนี้</p></div> : null}
                  </div>
                </section>

                <section className="dashboard-card dashboard-card--lavender dashboard-card--events">
                  <SectionHeading title="Event & Tournament" href="/events" tone="purple" />
                  <div className="space-y-2">
                    {homeDataErrors?.events ? <div className="empty-card" role="alert"><Sparkles size={21} /><p>โหลดข้อมูลกิจกรรมจริงไม่สำเร็จ ลองเปิดหน้ากิจกรรมอีกครั้ง</p><Link href="/events" className="section-link">เปิดกิจกรรม <ArrowRight size={14} /></Link></div> : homepageEvents.length > 0 ? homepageEvents.map((event) => <EventCard key={event.id} event={event} />) : <div className="empty-card"><Sparkles size={21} /><p>{isLiveData ? "ยังไม่มีกิจกรรมที่เปิดรับสมัคร" : "ยังไม่พบกิจกรรม"}</p></div>}
                  </div>
                </section>

                <section className="dashboard-card dashboard-card--mint dashboard-card--venues">
                  <SectionHeading title="สนามแบดแนะนำ" href="/venues" tone="mint" />
                  <div className="space-y-2">
                    {homeDataErrors?.venues ? <div className="empty-card" role="alert"><Sparkles size={21} /><p>โหลดข้อมูลสนามจริงไม่สำเร็จ ลองเปิดหน้าสนามอีกครั้ง</p><Link href="/venues" className="section-link">เปิดสนาม <ArrowRight size={14} /></Link></div> : homepageCourts.length > 0 ? homepageCourts.map((court, index) => <CourtCard key={court.id} court={court} index={index} />) : <div className="empty-card"><Sparkles size={21} /><p>{isLiveData ? "ยังไม่มีสนามที่เปิดให้ค้นหา" : "ยังไม่พบสนาม"}</p></div>}
                  </div>
                </section>

                <section className="dashboard-card dashboard-card--marketplace">
                  <SectionHeading title="สินค้ามือสอง" href="/marketplace" tone="purple" />
                  <p className="marketplace-home-sort-note"><Eye size={13} /> {marketplaceUsesViews ? "เรียงจากยอดเข้าชมสูงสุด · รายการที่ยังไม่ขาย" : "รายการที่ยังไม่ขาย · เรียงตามรายการล่าสุด"}</p>
                  <div className="marketplace-home-list">
                    {homeDataErrors?.marketplace ? <div className="empty-card" role="alert"><PackageSearch size={21} /><p>โหลดข้อมูลตลาดมือสองไม่สำเร็จ</p><Link href="/marketplace" className="section-link">เปิดตลาดมือสอง <ArrowRight size={14} /></Link></div> : homepageMarketplaceListings.length > 0 ? homepageMarketplaceListings.map((listing) => <MarketplaceHomeRow key={listing.id} listing={listing} showViewCount={marketplaceUsesViews} />) : <div className="empty-card"><PackageSearch size={21} /><p>{isLiveData ? "ยังไม่มีสินค้าที่เปิดขาย" : "เข้าสู่ตลาดมือสองเพื่อดูสินค้าจาก Community"}</p><Link href="/marketplace" className="section-link">เปิดตลาดมือสอง <ArrowRight size={14} /></Link></div>}
                  </div>
                </section>
              </div>

            </div>
          </section>
        </div>
      </main>

    </div>
  );
}
