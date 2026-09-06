import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Filter,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import ThaiAreaSelect from "@/components/thai-area-select";
import { PreviewHeader } from "@/components/preview-page";
import { areaLabel, type DirectoryFilters, type DirectoryVenue } from "@/lib/venue-directory";
import { safeMediaUrl } from "@/lib/safe-media-url";

export type VenueSearchFilters = DirectoryFilters;

function activeFilterCount(filters: VenueSearchFilters) {
  return [
    filters.q,
    filters.province,
    filters.district,
    filters.subdistrict,
    filters.activity !== "all" ? filters.activity : "",
    filters.sort !== "area" ? filters.sort : "",
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

function areaPath(venue: DirectoryVenue) {
  return [venue.subdistrict, venue.district, venue.province].filter(Boolean).join(" · ") || "ยังไม่ระบุพื้นที่";
}

function VenueCard({ venue }: { venue: DirectoryVenue }) {
  const imageUrl = safeMediaUrl(venue.cover_image_url);
  const sourceUrl = typeof venue.source_url === "string" && /^https?:\/\//u.test(venue.source_url) ? venue.source_url : null;
  const areaMatch = areaLabel(venue.area_score);

  return (
    <article className="venue-card venue-card--directory">
      <div className="venue-card__image" aria-hidden="true">
        {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <span>🏸</span>}
        <small><MapPin size={12} /> {areaMatch || "ทะเบียนสนาม"}</small>
      </div>
      <div className="venue-card--directory__body">
        <div className="directory-card__topline">
          <span className={venue.open_groups > 0 ? "directory-status directory-status--open" : "directory-status"}>
            {venue.open_groups > 0 ? <CheckCircle2 size={12} /> : null}
            {venue.open_groups > 0 ? `${venue.open_groups} ก๊วนกำลังรับสมัคร` : "ยังไม่มีก๊วนเปิดรับ"}
          </span>
          <span className="discovery-rating"><Star size={13} fill="currentColor" /> {venue.rating.toFixed(1)}</span>
        </div>
        <h2><Link href={`/venues/${venue.id}`}>{venue.name}</Link></h2>
        <p><MapPin size={14} /> {areaPath(venue)}</p>
        <p className="venue-card__address">{venue.address || "ยังไม่มีข้อมูลที่อยู่"}</p>
        <div className="venue-card__stats">
          <span>🏸 {venue.completed_90} ก๊วนใน 90 วัน</span>
          {venue.court_count !== null ? <span>🏟️ {venue.court_count} คอร์ท</span> : <span>ยังไม่ระบุจำนวนคอร์ท</span>}
        </div>
        <div className="directory-card__links">
          <Link href={`/venues/${venue.id}`} className="discovery-card__link">ดูรายละเอียด <ArrowRight size={14} /></Link>
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" className="directory-source-link">แหล่งข้อมูล ↗</a> : null}
        </div>
      </div>
    </article>
  );
}

export default function VenueSearchBrowser({
  venues,
  filters,
  totalCount,
  isLiveData = false,
  loadError,
  authRequired = false,
  profileArea,
}: {
  venues: DirectoryVenue[];
  filters: VenueSearchFilters;
  totalCount: number;
  isLiveData?: boolean;
  loadError?: string;
  authRequired?: boolean;
  profileArea?: string;
}) {
  const filterCount = activeFilterCount(filters);
  const pageSize = 24;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const previousPage = filters.page > 1 ? filters.page - 1 : null;
  const nextPage = filters.page < pageCount ? filters.page + 1 : null;

  return (
    <main className="preview-page discovery-page">
      <PreviewHeader kind="venues" live={isLiveData} />
      <div className="preview-content">
        <div className="preview-section-grid discovery-section-grid">
          <section className="preview-panel preview-panel--wide discovery-main-panel">
            <form className="groups-filter-form" method="get">
              <div className="groups-searchbar">
                <div className="preview-search"><Search size={17} /><input name="q" defaultValue={filters.q} placeholder="ค้นหาชื่อสนาม ที่อยู่ หรือพื้นที่" aria-label="ค้นหาชื่อสนาม ที่อยู่ หรือพื้นที่" /></div>
                <button type="submit" className="group-primary-action"><Search size={16} /> ค้นหาสนาม</button>
              </div>

              <div className="groups-filter-toolbar">
                <div className="groups-quick-filters">
                  <label className="group-filter-control"><span>กิจกรรมที่สนาม</span><div className="group-filter-select-wrap"><select name="activity" defaultValue={filters.activity}><option value="all">ทุกสถานะกิจกรรม</option><option value="open">มีก๊วนเปิดรับ</option><option value="history">เคยจัดก๊วนใน 90 วัน</option></select><ChevronDown size={15} /></div></label>
                  <label className="group-filter-control"><span>เรียงลำดับ</span><div className="group-filter-select-wrap"><select name="sort" defaultValue={filters.sort}><option value="area">พื้นที่ของคุณก่อน</option><option value="popular">ก๊วนที่จัดบ่อย</option><option value="open">ก๊วนที่กำลังรับสมัคร</option><option value="name">ชื่อสนาม A–Z</option></select><ChevronDown size={15} /></div></label>
                </div>

                <details className="groups-advanced-filter" open={Boolean(filters.province || filters.district || filters.subdistrict)}>
                  <summary><SlidersHorizontal size={16} /><span>ค้นหาแบบละเอียด</span><span>{filterCount > 0 ? `${filterCount} ตัวกรอง` : "จังหวัด / อำเภอ / ตำบล"}</span><ChevronDown size={16} /></summary>
                  <div className="groups-advanced-filter__body">
                    <ThaiAreaSelect mode="search" initialProvince={filters.province} initialDistrict={filters.district} initialSubdistrict={filters.subdistrict} />
                    <p className="groups-filter-help"><MapPin size={14} />ระบบจับคู่พื้นที่ตามจังหวัด → อำเภอ/เขต → ตำบล/แขวงจาก Profile ของคุณ ไม่คำนวณระยะทาง GPS</p>
                    <div className="groups-filter-actions"><Link href="/venues" className="group-secondary-action"><RotateCcw size={15} /> ล้างตัวกรอง</Link><button type="submit" className="group-primary-action"><Filter size={15} /> ใช้ตัวกรอง</button></div>
                  </div>
                </details>
              </div>
            </form>

            <div className="discovery-results-heading"><div><p className="muted-label">Find your court</p><h2>สนามแบดในระบบ</h2><small>{profileArea ? `พื้นที่ใน Profile: ${profileArea}` : "เลือกพื้นที่ใน Profile เพื่อจัดลำดับสนามตามพื้นที่"}</small></div><span>{totalCount.toLocaleString("th-TH")} สนาม</span></div>
            {authRequired ? <div className="discovery-empty discovery-empty--login"><span>🔐</span><h2>เข้าสู่ระบบเพื่อค้นหาสนาม</h2><p>ระบบจะใช้จังหวัด อำเภอ/เขต และตำบล/แขวงจาก Profile เพื่อจัดลำดับให้คุณ โดยไม่ต้องใช้ GPS</p><Link href="/auth/login?next=/venues" className="group-primary-action">เข้าสู่ระบบ</Link></div> : loadError ? <div className="discovery-error" role="alert"><strong>โหลดข้อมูลสนามไม่สำเร็จ</strong><span>{loadError}</span><Link href="/venues" className="group-secondary-action"><RotateCcw size={15} /> ลองใหม่</Link></div> : venues.length > 0 ? <div className="venue-grid venue-grid--discovery venue-grid--directory">{venues.map((venue) => <VenueCard key={venue.id} venue={venue} />)}</div> : <div className="discovery-empty"><span>🗺️</span><h2>{isLiveData ? "ยังไม่พบสนามตามตัวกรอง" : "เข้าสู่ระบบเพื่อดูข้อมูลสนาม"}</h2><p>{isLiveData ? "ลองเปลี่ยนชื่อสนามหรือพื้นที่ แล้วค้นหาอีกครั้ง" : "รายชื่อสนามจะเชื่อมกับพื้นที่ใน Profile ของคุณ"}</p><Link href="/venues" className="group-primary-action"><RotateCcw size={15} /> เริ่มค้นหาใหม่</Link></div>}
            {!authRequired && !loadError && totalCount > pageSize ? <nav className="directory-pagination" aria-label="แบ่งหน้ารายการสนาม"><span>หน้า {filters.page} / {pageCount}</span><div>{previousPage ? <Link href={pageHref(filters, previousPage)}>← ก่อนหน้า</Link> : <span aria-disabled="true">← ก่อนหน้า</span>}{nextPage ? <Link href={pageHref(filters, nextPage)}>ถัดไป →</Link> : <span aria-disabled="true">ถัดไป →</span>}</div></nav> : null}
          </section>

          <aside className="discovery-sidebar">
            <section className="preview-panel preview-panel--soft discovery-tip-card"><p className="muted-label">Area directory</p><h2>ระบบสนามที่พร้อมต่อยอด</h2><ul><li><span>01</span>ค้นหาจากชื่อและที่อยู่สาธารณะ</li><li><span>02</span>จัดลำดับตามพื้นที่ใน Profile</li><li><span>03</span>ผูกสนามเดียวกันกับหลายก๊วนและกิจกรรม</li></ul><Link href="/venues/suggest" className="section-link">เสนอชื่อสนามที่ยังไม่มี <ArrowRight size={14} /></Link></section>
            <section className="preview-panel preview-panel--soft discovery-tip-card discovery-tip-card--notice"><p>ข้อมูลจำนวนคอร์ท คิวว่าง และคะแนนจะแสดงเฉพาะเมื่อมีข้อมูลที่ยืนยันได้ ระบบจะไม่เดาพิกัดหรือสถานะจากชื่อสนาม</p></section>
          </aside>
        </div>
      </div>
      <footer className="preview-footer"><Link href="/">Arena-Badminton</Link><span>{isLiveData ? "ทะเบียนสนาม · Supabase" : "เข้าสู่ระบบเพื่อดูข้อมูลจริง"}</span></footer>
    </main>
  );
}
