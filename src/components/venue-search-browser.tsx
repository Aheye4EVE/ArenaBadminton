import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Filter,
  MapPin,
  Navigation,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import ThaiAreaSelect from "@/components/thai-area-select";
import { PreviewHeader } from "@/components/preview-page";
import type { Court } from "@/lib/demo-data";
import VenueMap from "@/components/venue-map";

export type VenueSearchFilters = {
  q: string;
  province: string;
  district: string;
  subdistrict: string;
  availability: "all" | "available";
  rating: "all" | "4" | "4.5";
  courtCount: "all" | "5plus" | "10plus";
  sort: "rating" | "distance" | "name";
};

function activeFilterCount(filters: VenueSearchFilters) {
  return [
    filters.q,
    filters.province,
    filters.district,
    filters.subdistrict,
    filters.availability !== "all" ? filters.availability : "",
    filters.rating !== "all" ? filters.rating : "",
    filters.courtCount !== "all" ? filters.courtCount : "",
    filters.sort !== "rating" ? filters.sort : "",
  ].filter(Boolean).length;
}

function availabilityLabel(value: Court["availability"]) {
  return value === "available" ? "มีคิวว่าง" : "ควรเช็กคิวก่อน";
}

function VenueCard({ court }: { court: Court }) {
  return (
    <article id={court.id} className="venue-card venue-card--discovery">
      <div className="venue-card__image" aria-hidden="true">
        {court.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={court.imageUrl} alt="" />
          </>
        ) : <span>{court.image}</span>}
        <small><MapPin size={12} /> {court.province}</small>
      </div>
      <div>
        <div className="discovery-card__topline">
          <span className={court.availability === "available" ? "discovery-status discovery-status--available" : "discovery-status"}>
            {court.availability === "available" ? <CheckCircle2 size={12} /> : null} {availabilityLabel(court.availability)}
          </span>
          <span className="discovery-rating"><Star size={13} fill="currentColor" /> {court.rating}</span>
        </div>
        <h2>{court.name}</h2>
        <p><MapPin size={14} /> {court.subdistrict} · {court.district}</p>
        <p className="venue-card__address">{court.address} · {court.province}</p>
        <div className="venue-card__stats">
          <span><Navigation size={13} /> {court.distance}</span>
          <span>🏟️ {court.courtCount} คอร์ท</span>
        </div>
        <Link href={`/venues/${court.id}`} className="discovery-card__link">ดูรายละเอียดสนาม <ArrowRight size={14} /></Link>
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
}: {
  venues: Court[];
  filters: VenueSearchFilters;
  totalCount: number;
  isLiveData?: boolean;
  loadError?: string;
}) {
  const filterCount = activeFilterCount(filters);

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
                  <label className="group-filter-control"><span>สถานะสนาม</span><div className="group-filter-select-wrap"><select name="availability" defaultValue={filters.availability}><option value="all">ทุกสถานะสนาม</option><option value="available">มีคิวว่าง</option></select><ChevronDown size={15} /></div></label>
                  <label className="group-filter-control"><span>คะแนนรีวิว</span><div className="group-filter-select-wrap"><select name="rating" defaultValue={filters.rating}><option value="all">ทุกคะแนน</option><option value="4">4.0 ดาวขึ้นไป</option><option value="4.5">4.5 ดาวขึ้นไป</option></select><ChevronDown size={15} /></div></label>
                  <label className="group-filter-control"><span>จำนวนคอร์ท</span><div className="group-filter-select-wrap"><select name="courtCount" defaultValue={filters.courtCount}><option value="all">ทุกขนาดสนาม</option><option value="5plus">อย่างน้อย 5 คอร์ท</option><option value="10plus">อย่างน้อย 10 คอร์ท</option></select><ChevronDown size={15} /></div></label>
                </div>

                <details className="groups-advanced-filter" open={Boolean(filters.province || filters.district || filters.subdistrict || filters.sort !== "rating")}>
                  <summary><SlidersHorizontal size={16} /><span>ค้นหาแบบละเอียด</span><span>{filterCount > 0 ? `${filterCount} ตัวกรอง` : "จังหวัด / อำเภอ / ตำบล"}</span><ChevronDown size={16} /></summary>
                  <div className="groups-advanced-filter__body">
                    <ThaiAreaSelect mode="search" initialProvince={filters.province} initialDistrict={filters.district} initialSubdistrict={filters.subdistrict} />
                    <p className="groups-filter-help"><MapPin size={14} />เลือกพื้นที่เพื่อค้นหาสนามใกล้คุณ ระบบจะเปิดเขตและตำบลตามจังหวัดที่เลือก</p>
                    <div className="groups-secondary-filter-grid groups-secondary-filter-grid--two">
                      <label className="group-filter-control"><span>เรียงลำดับ</span><div className="group-filter-select-wrap"><select name="sort" defaultValue={filters.sort}><option value="rating">คะแนนสูงสุด</option><option value="distance">ระยะทางใกล้สุด</option><option value="name">ชื่อสนาม A–Z</option></select><ChevronDown size={15} /></div></label>
                    </div>
                    <div className="groups-filter-actions"><Link href="/venues" className="group-secondary-action"><RotateCcw size={15} /> ล้างตัวกรอง</Link><button type="submit" className="group-primary-action"><Filter size={15} /> ใช้ตัวกรอง</button></div>
                  </div>
                </details>
              </div>
            </form>

            <div className="discovery-results-heading"><div><p className="muted-label">Find your court</p><h2>สนามแบดที่ตรงกับคุณ</h2></div><span>{totalCount} สนาม</span></div>
            {loadError ? <div className="discovery-error" role="alert"><strong>โหลดข้อมูลสนามไม่สำเร็จ</strong><span>{loadError}</span><Link href="/venues" className="group-secondary-action"><RotateCcw size={15} /> ลองใหม่</Link></div> : venues.length > 0 ? <div className="venue-grid venue-grid--discovery">{venues.map((court) => <VenueCard key={court.id} court={court} />)}</div> : <div className="discovery-empty"><span>🗺️</span><h2>{isLiveData ? "ยังไม่มีสนามที่เปิดให้ค้นหา" : "ยังไม่พบสนามตามตัวกรอง"}</h2><p>{isLiveData ? "เมื่อมีสนามในระบบ สนามจะแสดงที่หน้านี้" : "ลองเปลี่ยนพื้นที่ คะแนน หรือจำนวนคอร์ท แล้วค้นหาอีกครั้ง"}</p><Link href="/venues" className="group-primary-action"><RotateCcw size={15} /> เริ่มค้นหาใหม่</Link></div>}
          </section>

          <aside className="discovery-sidebar">
            <VenueMap venues={venues} />
            <section className="preview-panel preview-panel--soft discovery-tip-card"><p className="muted-label">Court guide</p><h2>เลือกสนามให้เหมาะกับคุณ</h2><ul><li><span>01</span>เช็กระยะทางและเวลาเดินทาง</li><li><span>02</span>ดูจำนวนคอร์ทก่อนชวนเพื่อน</li><li><span>03</span>กดเช็กคิวกับสนามอีกครั้งก่อนจอง</li></ul></section>
          </aside>
        </div>
      </div>
      <footer className="preview-footer"><Link href="/">Arena-Badminton</Link><span>{isLiveData ? "Live data · Supabase" : "Guest preview · เข้าสู่ระบบเพื่อดูข้อมูลจริง"}</span></footer>
    </main>
  );
}
