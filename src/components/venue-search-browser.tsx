"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Filter,
  LocateFixed,
  MapPin,
  Navigation,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import ThaiAreaSelect from "@/components/thai-area-select";
import VenueMap from "@/components/venue-map";
import {
  formatDistanceKm,
  normalizeCoordinates,
  type GeoCoordinates,
} from "@/lib/geolocation";
import {
  areaLabel,
  type DirectoryFilters,
  type DirectoryVenue,
} from "@/lib/venue-directory";
import { safeMediaUrl } from "@/lib/safe-media-url";

export type VenueSearchFilters = DirectoryFilters;

function activeFilterCount(filters: VenueSearchFilters) {
  return [
    filters.q,
    filters.province,
    filters.district,
    filters.subdistrict,
    filters.activity !== "all" ? filters.activity : "",
    filters.sort !== "nearby" ? filters.sort : "",
  ].filter(Boolean).length;
}

function pageHref(filters: VenueSearchFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.province) params.set("province", filters.province);
  if (filters.district) params.set("district", filters.district);
  if (filters.subdistrict) params.set("subdistrict", filters.subdistrict);
  if (filters.activity !== "all") params.set("activity", filters.activity);
  if (filters.sort !== "area") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/venues?${query}` : "/venues";
}

function filterQuery(filters: VenueSearchFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.province) params.set("province", filters.province);
  if (filters.district) params.set("district", filters.district);
  if (filters.subdistrict) params.set("subdistrict", filters.subdistrict);
  if (filters.activity !== "all") params.set("activity", filters.activity);
  if (filters.sort !== "nearby") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

function areaPath(venue: DirectoryVenue) {
  return (
    [venue.subdistrict, venue.district, venue.province]
      .filter(Boolean)
      .join(" · ") || "ยังไม่ระบุพื้นที่"
  );
}

function googleMapsNavigationUrl(
  venue: DirectoryVenue,
  sourceUrl: string | null,
) {
  const coordinates = normalizeCoordinates(venue.latitude, venue.longitude);
  if (coordinates) {
    const destination = `${coordinates.latitude},${coordinates.longitude}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  }
  if (sourceUrl) return sourceUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue.name, venue.address, areaPath(venue)].filter(Boolean).join(", "))}`;
}

function fallbackVenueImage(venue: DirectoryVenue) {
  const hash = [...venue.id].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return hash % 2 === 0
    ? "/images/venues/court-fallback-neon.webp"
    : "/images/venues/court-fallback-wood.webp";
}

function VenueCard({ venue }: { venue: DirectoryVenue }) {
  const imageUrl =
    safeMediaUrl(venue.cover_image_url) ?? fallbackVenueImage(venue);
  const sourceUrl =
    typeof venue.source_url === "string" &&
    /^https?:\/\//u.test(venue.source_url)
      ? venue.source_url
      : null;
  const areaMatch = areaLabel(venue.area_score);
  const distanceLabel = formatDistanceKm(venue.distance_km);
  const navigationUrl = googleMapsNavigationUrl(venue, sourceUrl);

  return (
    <article className="venue-card venue-card--directory">
      <div className="venue-card__image">
        <img src={imageUrl} alt="" loading="lazy" />
        <div className="venue-card__image-topline">
          <span
            className={
              venue.open_groups > 0
                ? "directory-status directory-status--open"
                : "directory-status"
            }
          >
            {venue.open_groups > 0 ? <CheckCircle2 size={12} /> : null}
            {venue.open_groups > 0
              ? `${venue.open_groups} ก๊วนกำลังรับสมัคร`
              : "ยังไม่มีก๊วนเปิดรับ"}
          </span>
          <span className="discovery-rating">
            <Star size={13} fill="currentColor" /> {venue.rating.toFixed(1)}
          </span>
        </div>
        <small>
          <MapPin size={12} /> {areaMatch || "ทะเบียนสนาม"}
        </small>
      </div>
      <div className="venue-card--directory__body">
        <h2>
          <Link href={`/venues/${venue.id}`}>{venue.name}</Link>
        </h2>
        <div className="directory-card__area-line">
          <p>
            <MapPin size={14} /> {areaPath(venue)}
          </p>
          {distanceLabel ? (
            <span className="directory-distance">
              <LocateFixed size={12} /> ห่าง {distanceLabel}
            </span>
          ) : null}
        </div>
        <p className="venue-card__address">
          {venue.address || "ยังไม่มีข้อมูลที่อยู่"}
        </p>
        <div className="venue-card__facilities" aria-label="ข้อมูลสนาม">
          <span>🏸 สนามแบด</span>
          {venue.court_count !== null ? (
            <span>🏟️ {venue.court_count} คอร์ท</span>
          ) : null}
          {venue.latitude !== null && venue.longitude !== null ? (
            <span>📍 มีพิกัด</span>
          ) : null}
          <span>🔥 {venue.completed_90} ก๊วน / 90 วัน</span>
        </div>
        <div className="directory-card__links directory-card__links--three">
          <Link href={`/venues/${venue.id}`} className="discovery-card__link">
            รายละเอียด <ArrowRight size={14} />
          </Link>
          <a
            href={navigationUrl}
            target="_blank"
            rel="noreferrer"
            className="directory-navigation-link"
          >
            <Navigation size={13} /> นำทาง
          </a>
          <Link
            href={`/groups?create=1&venueId=${encodeURIComponent(venue.id)}`}
            className="directory-open-group-link"
          >
            ⚡ เปิดก๊วน
          </Link>
        </div>
      </div>
    </article>
  );
}

type VenueGpsState =
  | "idle"
  | "loading"
  | "ready"
  | "denied"
  | "unavailable"
  | "error";

function venueGpsErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED)
    return "ยังไม่ได้อนุญาต GPS · ใช้ตัวกรองพื้นที่แทน";
  if (error.code === error.POSITION_UNAVAILABLE)
    return "ระบุตำแหน่งไม่สำเร็จ · ใช้ตัวกรองพื้นที่แทน";
  if (error.code === error.TIMEOUT)
    return "ค้นหาตำแหน่งใช้เวลานานเกินไป · ใช้ตัวกรองพื้นที่แทน";
  return "ค้นหาตำแหน่งไม่สำเร็จ · ใช้ตัวกรองพื้นที่แทน";
}

export default function VenueSearchBrowser({
  venues,
  filters,
  totalCount,
  isLiveData = false,
  loadError,
  authRequired = false,
  profileArea,
  mapVenues,
}: {
  venues: DirectoryVenue[];
  mapVenues?: DirectoryVenue[];
  filters: VenueSearchFilters;
  totalCount: number;
  isLiveData?: boolean;
  loadError?: string;
  authRequired?: boolean;
  profileArea?: string;
}) {
  const currentFilterKey = filterQuery(filters);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [nearbyResult, setNearbyResult] = useState<{
    filterKey: string;
    items: DirectoryVenue[];
    total: number;
  } | null>(null);
  const [gpsState, setGpsState] = useState<VenueGpsState>("idle");
  const [gpsMessage, setGpsMessage] = useState("");
  const [gpsStateFilterKey, setGpsStateFilterKey] = useState(currentFilterKey);
  const nearbyRequestIdRef = useRef(0);
  const nearbyAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    nearbyRequestIdRef.current += 1;
    nearbyAbortRef.current?.abort();
  }, [currentFilterKey, totalCount, venues]);

  const fetchNearbyVenues = useCallback(
    async (coordinates: GeoCoordinates) => {
      const requestId = ++nearbyRequestIdRef.current;
      nearbyAbortRef.current?.abort();
      const controller = new AbortController();
      nearbyAbortRef.current = controller;
      setGpsStateFilterKey(currentFilterKey);
      setGpsState("loading");
      setGpsMessage("กำลังเรียงสนามจากตำแหน่งของคุณ...");

      try {
        const query = filterQuery({ ...filters, page: 1 });
        const response = await fetch(
          `/api/venues/search${query ? `?${query}` : ""}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
            body: JSON.stringify(coordinates),
          },
        );
        const payload = (await response.json()) as {
          items?: DirectoryVenue[];
          total?: number;
          error?: string;
        };
        if (!response.ok || !Array.isArray(payload.items))
          throw new Error(payload.error || "โหลดสนามใกล้คุณไม่สำเร็จ");
        if (requestId !== nearbyRequestIdRef.current) return;
        setNearbyResult({
          filterKey: currentFilterKey,
          items: payload.items,
          total:
            typeof payload.total === "number"
              ? payload.total
              : Number(payload.total) || 0,
        });
        setGpsState("ready");
        setGpsMessage("GPS เปิดอยู่ · เรียงสนามจากใกล้ที่สุด");
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        if (requestId !== nearbyRequestIdRef.current) return;
        setGpsState("error");
        setGpsMessage(
          "โหลดรายการตาม GPS ไม่สำเร็จ · แสดงผลตามตัวกรองพื้นที่แทน",
        );
      } finally {
        if (requestId === nearbyRequestIdRef.current)
          nearbyAbortRef.current = null;
      }
    },
    [currentFilterKey, filters],
  );

  const requestNearbyVenues = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsState("unavailable");
      setGpsMessage("เบราว์เซอร์นี้ไม่รองรับ GPS · ใช้ตัวกรองพื้นที่แทน");
      return;
    }
    setGpsStateFilterKey(currentFilterKey);
    setGpsState("loading");
    setGpsMessage("กำลังขอตำแหน่งปัจจุบัน...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = normalizeCoordinates(
          position.coords.latitude,
          position.coords.longitude,
        );
        if (!coordinates) {
          setGpsState("error");
          setGpsMessage("ข้อมูลตำแหน่งไม่สมบูรณ์ · ใช้ตัวกรองพื้นที่แทน");
          return;
        }
        void fetchNearbyVenues(coordinates);
      },
      (error) => {
        setGpsState(
          error.code === error.PERMISSION_DENIED ? "denied" : "error",
        );
        setGpsMessage(venueGpsErrorMessage(error));
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }, [currentFilterKey, fetchNearbyVenues]);

  useEffect(() => {
    if (authRequired || !isLiveData) return;
    const timer = window.setTimeout(() => requestNearbyVenues(), 320);
    return () => window.clearTimeout(timer);
  }, [authRequired, isLiveData, requestNearbyVenues]);

  useEffect(
    () => () => {
      nearbyRequestIdRef.current += 1;
      nearbyAbortRef.current?.abort();
    },
    [],
  );

  const currentNearbyResult =
    nearbyResult?.filterKey === currentFilterKey ? nearbyResult : null;
  const displayVenues = currentNearbyResult?.items ?? venues;
  const mapDisplayVenues =
    currentNearbyResult?.items ?? mapVenues ?? displayVenues;
  const displayTotal = currentNearbyResult?.total ?? totalCount;
  const currentGpsState =
    gpsStateFilterKey === currentFilterKey ? gpsState : "idle";
  const filterCount = activeFilterCount(filters);
  const pageSize = 24;
  const pageStart = (filters.page - 1) * pageSize;
  const displayPageVenues = displayVenues.slice(
    pageStart,
    pageStart + pageSize,
  );
  const pageCount = Math.max(1, Math.ceil(displayTotal / pageSize));
  const previousPage = filters.page > 1 ? filters.page - 1 : null;
  const nextPage = filters.page < pageCount ? filters.page + 1 : null;
  const locationSummary =
    currentGpsState === "loading"
      ? gpsMessage
      : currentGpsState === "ready"
        ? gpsMessage
        : gpsMessage ||
          (profileArea
            ? `พื้นที่ใน Profile: ${profileArea} · ใช้เป็นสำรองเมื่อ GPS ไม่พร้อม`
            : "กดปุ่มเพื่อเรียงสนามตาม GPS หรือเลือกพื้นที่ด้านล่าง");
  const locationButtonLabel =
    currentGpsState === "loading"
      ? "กำลังค้นหา..."
      : currentGpsState === "ready"
        ? "อัปเดตตำแหน่ง"
        : "สนามใกล้ฉัน";

  const analysisVenues =
    currentNearbyResult?.items ?? mapVenues ?? displayVenues;
  const hotCourts = [...analysisVenues]
    .sort(
      (left, right) =>
        right.completed_90 - left.completed_90 ||
        right.open_groups - left.open_groups,
    )
    .slice(0, 4);
  const nearbyGroups = analysisVenues
    .filter((venue) => venue.open_groups > 0)
    .sort((left, right) => right.open_groups - left.open_groups)
    .slice(0, 3);

  return (
    <main className="venue-discovery-page">
      <section className="venue-discovery-hero">
        <Image
          src="/images/venues/court-explorer-hero.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1200px"
        />
        <div className="venue-discovery-hero__scrim" />
        <div className="venue-discovery-hero__copy">
          <p>Find your court</p>
          <h1>สนามแบดใกล้คุณ</h1>
          <span>
            ค้นหาสนามจริงจาก 77 จังหวัด พร้อมเรียงตาม GPS พื้นที่
            และก๊วนที่กำลังเปิดรับ
          </span>
        </div>
        <div className="venue-discovery-hero__badge">
          {totalCount > 0 ? `${totalCount}+` : "529+"}
          <small>courts in Arena</small>
        </div>
      </section>
      <div className="venue-discovery-content">
        <div className="preview-section-grid discovery-section-grid">
          <section className="preview-panel preview-panel--wide discovery-main-panel">
            <form className="groups-filter-form" method="get">
              <div className="groups-searchbar">
                <div className="preview-search">
                  <Search size={17} />
                  <input
                    name="q"
                    defaultValue={filters.q}
                    placeholder="ค้นหาชื่อสนาม ที่อยู่ หรือพื้นที่"
                    aria-label="ค้นหาชื่อสนาม ที่อยู่ หรือพื้นที่"
                  />
                </div>
                <button type="submit" className="group-primary-action">
                  <Search size={16} /> ค้นหาสนาม
                </button>
              </div>

              <div className="groups-filter-toolbar">
                <div className="groups-quick-filters">
                  <label className="group-filter-control">
                    <span>กิจกรรมที่สนาม</span>
                    <div className="group-filter-select-wrap">
                      <select name="activity" defaultValue={filters.activity}>
                        <option value="all">ทุกสถานะกิจกรรม</option>
                        <option value="open">มีก๊วนเปิดรับ</option>
                        <option value="history">เคยจัดก๊วนใน 90 วัน</option>
                      </select>
                      <ChevronDown size={15} />
                    </div>
                  </label>
                  <label className="group-filter-control">
                    <span>เรียงลำดับ</span>
                    <div className="group-filter-select-wrap">
                      <select name="sort" defaultValue={filters.sort}>
                        <option value="nearby">ใกล้ฉัน (GPS)</option>
                        <option value="area">พื้นที่ของคุณก่อน</option>
                        <option value="popular">ก๊วนที่จัดบ่อย</option>
                        <option value="open">ก๊วนที่กำลังรับสมัคร</option>
                        <option value="name">ชื่อสนาม A–Z</option>
                      </select>
                      <ChevronDown size={15} />
                    </div>
                  </label>
                </div>

                <details
                  className="groups-advanced-filter"
                  open={Boolean(
                    filters.province || filters.district || filters.subdistrict,
                  )}
                >
                  <summary>
                    <SlidersHorizontal size={16} />
                    <span>ค้นหาแบบละเอียด</span>
                    <span>
                      {filterCount > 0
                        ? `${filterCount} ตัวกรอง`
                        : "จังหวัด / อำเภอ / ตำบล"}
                    </span>
                    <ChevronDown size={16} />
                  </summary>
                  <div className="groups-advanced-filter__body">
                    <ThaiAreaSelect
                      mode="search"
                      initialProvince={filters.province}
                      initialDistrict={filters.district}
                      initialSubdistrict={filters.subdistrict}
                    />
                    <p className="groups-filter-help">
                      <MapPin size={14} />
                      เมื่อเปิด GPS ระบบจะเรียงตามระยะทางเส้นตรงจากคุณ
                      หากไม่อนุญาตจะใช้จังหวัด → อำเภอ/เขต → ตำบล/แขวงจาก
                      Profile เป็นสำรอง
                    </p>
                    <div className="groups-filter-actions">
                      <Link href="/venues" className="group-secondary-action">
                        <RotateCcw size={15} /> ล้างตัวกรอง
                      </Link>
                      <button type="submit" className="group-primary-action">
                        <Filter size={15} /> ใช้ตัวกรอง
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </form>

            <div className="discovery-results-heading">
              <div>
                <p className="muted-label">Find your court</p>
                <h2>สนามแบดในระบบ</h2>
                <small>{locationSummary}</small>
              </div>
              <div className="discovery-results-heading__actions">
                <span>{displayTotal.toLocaleString("th-TH")} สนาม</span>
                {!authRequired && isLiveData ? (
                  <button
                    type="button"
                    className="discovery-location-button"
                    onClick={requestNearbyVenues}
                    disabled={currentGpsState === "loading"}
                  >
                    <LocateFixed size={14} /> {locationButtonLabel}
                  </button>
                ) : null}
              </div>
            </div>
            {!authRequired && !loadError ? (
              <div
                className="venue-view-switcher"
                role="group"
                aria-label="สลับมุมมองสนาม"
              >
                <button
                  type="button"
                  className={
                    viewMode === "grid"
                      ? "venue-view-switcher__button venue-view-switcher__button--active"
                      : "venue-view-switcher__button"
                  }
                  onClick={() => setViewMode("grid")}
                >
                  <span>📋</span> รายการการ์ด
                </button>
                <button
                  type="button"
                  className={
                    viewMode === "map"
                      ? "venue-view-switcher__button venue-view-switcher__button--active"
                      : "venue-view-switcher__button"
                  }
                  onClick={() => setViewMode("map")}
                >
                  <span>🗺️</span> แผนที่พิกัดจริง
                </button>
              </div>
            ) : null}
            {authRequired ? (
              <div className="discovery-empty discovery-empty--login">
                <span>🔐</span>
                <h2>เข้าสู่ระบบเพื่อค้นหาสนาม</h2>
                <p>
                  ระบบจะใช้ GPS เพื่อเรียงสนามใกล้คุณ หรือใช้จังหวัด อำเภอ/เขต
                  และตำบล/แขวงจาก Profile เป็นตัวสำรอง
                </p>
                <Link
                  href="/auth/login?next=/venues"
                  className="group-primary-action"
                >
                  เข้าสู่ระบบ
                </Link>
              </div>
            ) : loadError ? (
              <div className="discovery-error" role="alert">
                <strong>โหลดข้อมูลสนามไม่สำเร็จ</strong>
                <span>{loadError}</span>
                <Link href="/venues" className="group-secondary-action">
                  <RotateCcw size={15} /> ลองใหม่
                </Link>
              </div>
            ) : mapDisplayVenues.length > 0 ? (
              viewMode === "map" ? (
                <VenueMap venues={mapDisplayVenues} />
              ) : (
                <div className="venue-grid venue-grid--discovery venue-grid--directory">
                  {displayPageVenues.map((venue) => (
                    <VenueCard key={venue.id} venue={venue} />
                  ))}
                </div>
              )
            ) : (
              <div className="discovery-empty">
                <span>🗺️</span>
                <h2>
                  {isLiveData
                    ? "ยังไม่พบสนามตามตัวกรอง"
                    : "เข้าสู่ระบบเพื่อดูข้อมูลสนาม"}
                </h2>
                <p>
                  {isLiveData
                    ? "ลองเปลี่ยนชื่อสนามหรือพื้นที่ แล้วค้นหาอีกครั้ง"
                    : "รายชื่อสนามจะเชื่อมกับพื้นที่ใน Profile ของคุณ"}
                </p>
                <Link href="/venues" className="group-primary-action">
                  <RotateCcw size={15} /> เริ่มค้นหาใหม่
                </Link>
              </div>
            )}
            {!authRequired && !loadError && displayTotal > pageSize ? (
              <nav
                className="directory-pagination"
                aria-label="แบ่งหน้ารายการสนาม"
              >
                <span>
                  หน้า {filters.page} / {pageCount}
                </span>
                <div>
                  {previousPage ? (
                    <Link href={pageHref(filters, previousPage)}>
                      ← ก่อนหน้า
                    </Link>
                  ) : (
                    <span aria-disabled="true">← ก่อนหน้า</span>
                  )}
                  {nextPage ? (
                    <Link href={pageHref(filters, nextPage)}>ถัดไป →</Link>
                  ) : (
                    <span aria-disabled="true">ถัดไป →</span>
                  )}
                </div>
              </nav>
            ) : null}
          </section>

          <aside className="discovery-sidebar">
            <section className="venue-sidebar-widget">
              <div className="venue-sidebar-widget__heading">
                <div>
                  <p>HOT COURTS</p>
                  <h2>🔥 สนามยอดฮิตประจำสัปดาห์</h2>
                </div>
                <span>Top {hotCourts.length}</span>
              </div>
              {hotCourts.length > 0 ? (
                <div className="venue-hot-list">
                  {hotCourts.map((venue, index) => (
                    <Link
                      href={`/venues/${venue.id}`}
                      className="venue-hot-item"
                      key={venue.id}
                    >
                      <b>0{index + 1}</b>
                      <span>
                        <strong>{venue.name}</strong>
                        <small>{areaPath(venue)}</small>
                      </span>
                      <em>🔥 {venue.completed_90}</em>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="venue-sidebar-empty">
                  ยังไม่มีสถิติสนามในตัวกรองนี้
                </p>
              )}
            </section>
            <section className="venue-sidebar-widget">
              <div className="venue-sidebar-widget__heading">
                <div>
                  <p>NEARBY LIVE ACTION</p>
                  <h2>🏸 ก๊วนใกล้ตัวที่กำลังจะเริ่ม</h2>
                </div>
                <span>{nearbyGroups.length} ก๊วน</span>
              </div>
              {nearbyGroups.length > 0 ? (
                <div className="venue-hot-list">
                  {nearbyGroups.map((venue) => (
                    <Link
                      href={`/venues/${venue.id}`}
                      className="venue-hot-item venue-hot-item--live"
                      key={venue.id}
                    >
                      <span>
                        <strong>{venue.name}</strong>
                        <small>{areaPath(venue)}</small>
                      </span>
                      <em>🟢 {venue.open_groups} ก๊วน</em>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="venue-sidebar-empty">
                  ยังไม่มีก๊วนเปิดรับในรายการนี้
                </p>
              )}
              <Link href="/groups" className="venue-sidebar-widget__link">
                ดูก๊วนทั้งหมด <ArrowRight size={14} />
              </Link>
            </section>
            <section className="venue-suggest-widget">
              <p>มีสนามโปรดที่ยังไม่อยู่ในระบบ?</p>
              <strong>ช่วยเติมแผนที่ Arena ให้ครบขึ้น</strong>
              <Link
                href="/venues/suggest"
                className="venue-sidebar-widget__link"
              >
                + เสนอชื่อสนามใหม่ <ArrowRight size={14} />
              </Link>
            </section>
          </aside>
        </div>
      </div>
      <footer className="venue-discovery-footer">
        <Link href="/">Arena-Badminton</Link>
        <span>
          {isLiveData
            ? "ทะเบียนสนาม · Supabase"
            : "เข้าสู่ระบบเพื่อดูข้อมูลจริง"}
        </span>
      </footer>
    </main>
  );
}
