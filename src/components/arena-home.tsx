"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Dumbbell,
  Eye,
  Filter,
  LocateFixed,
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
import { formatDistanceKm, normalizeCoordinates, type GeoCoordinates } from "@/lib/geolocation";
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
  const distanceLabel = formatDistanceKm(group.distanceKm);
  const locationLabel = group.venueName && group.location && group.location !== group.venueName
    ? `${group.venueName} · ${group.location}`
    : group.venueName || group.location;
  return (
    <motion.article whileHover={{ y: -3 }} className="group-row">
      <div className={cx("group-rank", `group-rank--${group.accent}`)}>
        {group.accent === "pink" ? "✦" : group.accent === "blue" ? "♛" : "✚"}
      </div>
      <div className="group-row__body">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 lang={/[A-Za-z]/.test(group.title) ? "en" : "th"} className="group-row__title">{group.title}</h3>
            <p className="group-row__meta group-row__venue-meta">
              <MapPin size={13} /> <span>{locationLabel}</span>
              {distanceLabel ? <span className="group-distance-badge"><LocateFixed size={12} /> ห่าง {distanceLabel}</span> : null}
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

type GroupGpsState = "idle" | "loading" | "ready" | "denied" | "unavailable" | "error";

function groupGpsErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return "ยังไม่ได้อนุญาต GPS · ใช้พื้นที่ใน Profile เป็นสำรอง";
  if (error.code === error.POSITION_UNAVAILABLE) return "ระบุตำแหน่งไม่สำเร็จ · ใช้พื้นที่ใน Profile เป็นสำรอง";
  if (error.code === error.TIMEOUT) return "ค้นหาตำแหน่งใช้เวลานานเกินไป · ลองใหม่ได้อีกครั้ง";
  return "ค้นหาตำแหน่งไม่สำเร็จ · ใช้พื้นที่ใน Profile เป็นสำรอง";
}

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

function HomeSkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="home-skeleton-list" aria-busy="true" aria-label="กำลังโหลดข้อมูล">
      {Array.from({ length: count }, (_, index) => (
        <div className="home-skeleton-card" key={index} aria-hidden="true">
          <span className="home-skeleton-card__icon" />
          <span className="home-skeleton-card__body">
            <span className="home-skeleton-card__line home-skeleton-card__line--wide" />
            <span className="home-skeleton-card__line home-skeleton-card__line--medium" />
            <span className="home-skeleton-card__line home-skeleton-card__line--short" />
          </span>
          <span className="home-skeleton-card__badge" />
        </div>
      ))}
    </div>
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
  publicDataPending = false,
}: {
  account: HeaderProfileSummary | null;
  isAuthenticated: boolean;
  recommendedGroups?: Group[];
  featuredEvents?: Event[];
  featuredCourts?: Court[];
  featuredMarketplaceListings?: HomepageMarketplaceListing[];
  marketplaceSortMode?: "views" | "latest";
  homeDataErrors?: {
    groups?: boolean;
    events: boolean;
    venues: boolean;
    marketplace: boolean;
  };
  isLiveData?: boolean;
  publicDataPending?: boolean;
}) {
  const router = useRouter();
  const [searchType, setSearchType] = useState("ก๊วน");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ทั้งหมด");
  const [gpsGroups, setGpsGroups] = useState<Group[] | null>(null);
  const [groupGpsState, setGroupGpsState] = useState<GroupGpsState>("idle");
  const [groupGpsMessage, setGroupGpsMessage] = useState("");
  const [fetchedProfileGroups, setFetchedProfileGroups] = useState<Group[] | null>(null);
  const [profileGroupsFetched, setProfileGroupsFetched] = useState(Boolean(recommendedGroups));
  const [sessionAuthenticated, setSessionAuthenticated] = useState(isAuthenticated);
  const groupRequestIdRef = useRef(0);
  const groupAbortRef = useRef<AbortController | null>(null);
  const selectedSkill = activeFilter === "มือใหม่" ? "beginner" : activeFilter === "มือกลาง" ? "intermediate" : activeFilter === "มือสูง" ? "advanced" : "all";
  const profileGroups = fetchedProfileGroups ?? recommendedGroups ?? null;
  const profileGroupsLoading = !recommendedGroups && !profileGroupsFetched;
  const homepageGroups = gpsGroups ?? profileGroups ?? (isLiveData ? [] : groups);
  const homepageEvents = publicDataPending ? [] : isLiveData ? (featuredEvents ?? []) : demoEvents;
  const homepageCourts = publicDataPending ? [] : isLiveData ? (featuredCourts ?? []) : demoCourts;
  const homepageMarketplaceListings = publicDataPending ? [] : isLiveData ? (featuredMarketplaceListings ?? []) : [];
  const marketplaceUsesViews = marketplaceSortMode !== "latest";

  useEffect(() => {
    let cancelled = false;

    const refreshGroups = async () => {
      try {
        const response = await fetch("/api/groups/recommended", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = await response.json() as { items?: Group[] };
        if (cancelled) return;
        if (Array.isArray(payload?.items)) {
          setFetchedProfileGroups(payload.items);
          setProfileGroupsFetched(true);
        }
      } catch {
        if (cancelled) return;
        setProfileGroupsFetched(true);
      }
    };

    if (!recommendedGroups && !profileGroupsFetched) {
      void refreshGroups();
    }

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void refreshGroups();
      }
    }, 30_000);

    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void refreshGroups();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [profileGroupsFetched, recommendedGroups]);

  const handleSessionResolved = useCallback(({ isAuthenticated: nextIsAuthenticated }: { isAuthenticated: boolean }) => {
    setSessionAuthenticated(nextIsAuthenticated);
  }, []);

  const fetchGpsGroups = useCallback(async (coordinates: GeoCoordinates) => {
    const requestId = ++groupRequestIdRef.current;
    groupAbortRef.current?.abort();
    const controller = new AbortController();
    groupAbortRef.current = controller;
    setGroupGpsState("loading");
    setGroupGpsMessage("กำลังเรียงก๊วนตามสนามที่ใกล้คุณ...");

    try {
      const response = await fetch("/api/groups/recommended", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify(coordinates),
      });
      const payload = await response.json() as { items?: Group[]; error?: string };
      if (!response.ok || !Array.isArray(payload.items)) throw new Error(payload.error || "โหลดก๊วนใกล้คุณไม่สำเร็จ");
      if (requestId !== groupRequestIdRef.current) return;
      setGpsGroups(payload.items);
      setGroupGpsState("ready");
      setGroupGpsMessage("GPS เปิดอยู่ · เรียงจากสนามที่ใกล้ที่สุด");
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (requestId !== groupRequestIdRef.current) return;
      setGroupGpsState("error");
      setGroupGpsMessage("โหลดก๊วนตาม GPS ไม่สำเร็จ · แสดงตามลำดับเวลาล่าสุด");
    } finally {
      if (requestId === groupRequestIdRef.current) groupAbortRef.current = null;
    }
  }, []);

  const requestGroupGps = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGroupGpsState("unavailable");
      setGroupGpsMessage("เบราว์เซอร์นี้ไม่รองรับ GPS");
      return;
    }

    setGroupGpsState("loading");
    setGroupGpsMessage("กำลังขอตำแหน่งปัจจุบัน...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = normalizeCoordinates(position.coords.latitude, position.coords.longitude);
        if (!coordinates) {
          setGroupGpsState("error");
          setGroupGpsMessage("ข้อมูลตำแหน่งไม่สมบูรณ์");
          return;
        }
        void fetchGpsGroups(coordinates);
      },
      (error) => {
        setGroupGpsState(error.code === error.PERMISSION_DENIED ? "denied" : "error");
        setGroupGpsMessage(groupGpsErrorMessage(error));
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }, [fetchGpsGroups]);

  useEffect(() => () => {
    groupRequestIdRef.current += 1;
    groupAbortRef.current?.abort();
  }, []);

  const profileGpsIsActive = !gpsGroups && (profileGroups ?? []).some((group) => Number.isFinite(group.distanceKm));
  const groupLocationLabel = groupGpsState === "loading"
    ? groupGpsMessage
    : groupGpsState === "ready"
      ? groupGpsMessage
      : profileGroupsLoading
        ? "กำลังโหลดก๊วนแนะนำ..."
        : profileGpsIsActive
        ? "ใช้พิกัดใน Profile เป็นค่าเริ่มต้น"
        : groupGpsMessage || (sessionAuthenticated ? "ใช้พื้นที่ใน Profile เป็นสำรอง · กดเพื่อใช้ GPS" : "ก๊วนแนะนำล่าสุด · กดเพื่อใช้ GPS ค้นหาก๊วนใกล้คุณ");
  const groupGpsButtonLabel = groupGpsState === "loading" ? "กำลังค้นหา..." : groupGpsState === "ready" ? "อัปเดตตำแหน่ง" : "ก๊วนใกล้ฉัน";

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
      <div className="arena-page">
      <section className="hero-stage">
        <div className="hero-container relative z-10 mx-auto max-w-[1540px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
          <header className="arena-header flex items-center gap-3">
            <ArenaMenu />

            <Link href="/" className="brand-lockup" aria-label="Arena Badminton หน้าหลัก">
              <Image src="/assets/Logo-N.png" alt="Arena-Badminton" width={1698} height={926} quality={100} priority />
            </Link>

            <div className="header-actions">
              <AccountMenu account={account} isAuthenticated={isAuthenticated} onSessionResolved={handleSessionResolved} />
            </div>
          </header>

          <div className="hero-copy">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="hero-kicker"
            >
              <Image src="/assets/arena-title-mascot-new1.png" alt="" width={1916} height={821} quality={100} priority />
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="hero-title"
              aria-label="Arena-Badminton"
            >
              <Image src="/assets/arena-title-mascot-new1.png" alt="Arena-Badminton" width={1916} height={821} quality={100} priority />
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
                  <div className="group-recommendation-toolbar" aria-live="polite">
                    <span className="group-recommendation-location"><MapPin size={13} /> {groupLocationLabel}</span>
                    <button type="button" className="group-location-button" onClick={requestGroupGps} disabled={groupGpsState === "loading"}>
                      <LocateFixed size={13} /> {groupGpsButtonLabel}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {homeDataErrors?.groups ? (
                      <div className="empty-card" role="alert">
                        <Sparkles size={21} />
                        <p>โหลดข้อมูลก๊วนแนะนำจริงไม่สำเร็จ ลองเปิดหน้าก๊วนอีกครั้ง</p>
                        <Link href="/groups" className="section-link">เปิดหน้าก๊วน <ArrowRight size={14} /></Link>
                      </div>
                    ) : profileGroupsLoading || groupGpsState === "loading" ? (
                      <HomeSkeletonCards />
                    ) : (
                      <motion.div className="home-live-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.24 }}>
                        {visibleGroups.slice(0, 5).map((group) => <GroupCard key={group.id} group={group} onJoin={(selectedGroup) => router.push(selectedGroup.detailHref ?? "/groups")} />)}
                        {visibleGroups.length === 0 ? (
                          <div className="empty-card">
                            <Sparkles size={21} />
                            <p>{query || activeFilter !== "ทั้งหมด" ? "ยังไม่พบก๊วนจากตัวกรองนี้" : isLiveData ? "ยังไม่มีก๊วนที่เปิดรับสมัครในขณะนี้" : "ยังไม่พบก๊วน"}</p>
                            <Link href="/groups?create=1" className="section-link">สร้างก๊วนใหม่ <ArrowRight size={14} /></Link>
                          </div>
                        ) : null}
                      </motion.div>
                    )}
                  </div>
                </section>

                <section className="dashboard-card dashboard-card--lavender dashboard-card--events">
                  <SectionHeading title="Event & Tournament" href="/events" tone="purple" />
                  <div className="space-y-2">
                    {publicDataPending ? <HomeSkeletonCards count={3} /> : <motion.div className="home-live-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.24 }}>
                      {homeDataErrors?.events ? <div className="empty-card" role="alert"><Sparkles size={21} /><p>โหลดข้อมูลกิจกรรมจริงไม่สำเร็จ ลองเปิดหน้ากิจกรรมอีกครั้ง</p><Link href="/events" className="section-link">เปิดกิจกรรม <ArrowRight size={14} /></Link></div> : homepageEvents.length > 0 ? homepageEvents.map((event) => <EventCard key={event.id} event={event} />) : <div className="empty-card"><Sparkles size={21} /><p>{isLiveData ? "ยังไม่มีกิจกรรมที่เปิดรับสมัครในขณะนี้" : "ยังไม่พบกิจกรรม"}</p></div>}
                    </motion.div>}
                  </div>
                </section>

                <section className="dashboard-card dashboard-card--mint dashboard-card--venues">
                  <SectionHeading title="สนามแบดแนะนำ" href="/venues" tone="mint" />
                  <div className="space-y-2">
                    {publicDataPending ? <HomeSkeletonCards count={3} /> : <motion.div className="home-live-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.24 }}>
                      {homeDataErrors?.venues ? <div className="empty-card" role="alert"><Sparkles size={21} /><p>โหลดข้อมูลสนามจริงไม่สำเร็จ ลองเปิดหน้าสนามอีกครั้ง</p><Link href="/venues" className="section-link">เปิดสนาม <ArrowRight size={14} /></Link></div> : homepageCourts.length > 0 ? homepageCourts.map((court, index) => <CourtCard key={court.id} court={court} index={index} />) : <div className="empty-card"><Sparkles size={21} /><p>{isLiveData ? "ยังไม่มีสนามที่เปิดให้ค้นหา" : "ยังไม่พบสนาม"}</p></div>}
                    </motion.div>}
                  </div>
                </section>

                <section className="dashboard-card dashboard-card--marketplace">
                  <SectionHeading title="สินค้ามือสอง" href="/marketplace" tone="purple" />
                  <p className="marketplace-home-sort-note"><Eye size={13} /> {marketplaceUsesViews ? "เรียงจากยอดเข้าชมสูงสุด · รายการที่ยังไม่ขาย" : "รายการที่ยังไม่ขาย · เรียงตามรายการล่าสุด"}</p>
                  <div className="marketplace-home-list">
                    {publicDataPending ? <HomeSkeletonCards count={3} /> : <motion.div className="home-live-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.24 }}>
                      {homeDataErrors?.marketplace ? <div className="empty-card" role="alert"><PackageSearch size={21} /><p>โหลดข้อมูลตลาดมือสองไม่สำเร็จ</p><Link href="/marketplace" className="section-link">เปิดตลาดมือสอง <ArrowRight size={14} /></Link></div> : homepageMarketplaceListings.length > 0 ? homepageMarketplaceListings.map((listing) => <MarketplaceHomeRow key={listing.id} listing={listing} showViewCount={marketplaceUsesViews} />) : <div className="empty-card"><PackageSearch size={21} /><p>{isLiveData ? "ยังไม่มีสินค้าในตลาดมือสองในขณะนี้" : "เข้าสู่ตลาดมือสองเพื่อดูสินค้าจาก Community"}</p><Link href="/marketplace" className="section-link">เปิดตลาดมือสอง <ArrowRight size={14} /></Link></div>}
                    </motion.div>}
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
