import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Filter,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trophy,
  Users,
} from "lucide-react";
import ThaiAreaSelect from "@/components/thai-area-select";
import { PreviewHeader } from "@/components/preview-page";
import type { Event } from "@/lib/demo-data";

export type EventSearchFilters = {
  q: string;
  province: string;
  district: string;
  subdistrict: string;
  date: "all" | "upcoming" | "thisMonth" | "weekend";
  eventType: "all" | "tournament" | "friendly" | "training" | "challenge";
  format: "all" | "singles" | "doubles" | "team";
  sort: "soonest" | "newest";
};

function activeFilterCount(filters: EventSearchFilters) {
  return [
    filters.q,
    filters.province,
    filters.district,
    filters.subdistrict,
    filters.date !== "all" ? filters.date : "",
    filters.eventType !== "all" ? filters.eventType : "",
    filters.format !== "all" ? filters.format : "",
    filters.sort !== "soonest" ? filters.sort : "",
  ].filter(Boolean).length;
}

function typeLabel(value: Event["eventType"]) {
  return ({ tournament: "Tournament", friendly: "Friendly", training: "Training", challenge: "Challenge" } as const)[value];
}

function formatLabel(value: Event["format"]) {
  return ({ singles: "เดี่ยว", doubles: "คู่", team: "ทีม" } as const)[value];
}

function EventCard({ event }: { event: Event }) {
  const percent = Math.min(100, Math.round((event.registered / event.capacity) * 100));

  return (
    <article id={event.id} className="event-large-row event-large-row--discovery">
      <div className={`event-large-row__art event-large-row__art--${event.color}`} aria-hidden="true"><span>{event.image}</span><small><MapPin size={12} /> {event.province}</small></div>
      <div>
        <div className="discovery-card__topline"><span className="discovery-type"><Trophy size={12} /> {typeLabel(event.eventType)}</span><span className="discovery-card__status"><CheckCircle2 size={12} /> เปิดรับสมัคร</span></div>
        <h3>{event.title}</h3>
        <p>{event.category}</p>
        <div className="event-discovery-meta"><span><CalendarDays size={13} /> {event.dateLabel}</span><span><MapPin size={13} /> {event.venue} · {event.district}</span><span><Users size={13} /> {formatLabel(event.format)} · {event.registered}/{event.capacity} คน</span></div>
        <div className="event-discovery-progress"><span><small>จำนวนผู้สมัคร</small><b>{percent}%</b></span><div><i style={{ width: `${percent}%` }} /></div></div>
      </div>
      <Link href={`/events#${event.id}`} className="secondary-action">ดูรายละเอียด <ArrowRight size={14} /></Link>
    </article>
  );
}

export default function EventSearchBrowser({
  events,
  filters,
  totalCount,
}: {
  events: Event[];
  filters: EventSearchFilters;
  totalCount: number;
}) {
  const filterCount = activeFilterCount(filters);

  return (
    <main className="preview-page discovery-page">
      <PreviewHeader kind="events" />
      <div className="preview-content">
        <div className="preview-section-grid discovery-section-grid">
          <section className="preview-panel preview-panel--wide discovery-main-panel">
            <form className="groups-filter-form" method="get">
              <div className="groups-searchbar">
                <div className="preview-search"><Search size={17} /><input name="q" defaultValue={filters.q} placeholder="ค้นหาชื่องาน สนาม หรือคำที่เกี่ยวข้อง" aria-label="ค้นหาชื่องาน สนาม หรือคำที่เกี่ยวข้อง" /></div>
                <button type="submit" className="group-primary-action"><Search size={16} /> ค้นหากิจกรรม</button>
              </div>

              <div className="groups-filter-toolbar">
                <div className="groups-quick-filters">
                  <label className="group-filter-control"><span>ช่วงเวลา</span><div className="group-filter-select-wrap"><select name="date" defaultValue={filters.date}><option value="all">ทุกช่วงเวลา</option><option value="upcoming">กิจกรรมที่กำลังจะมา</option><option value="thisMonth">ภายในเดือนนี้</option><option value="weekend">สุดสัปดาห์</option></select><ChevronDown size={15} /></div></label>
                  <label className="group-filter-control"><span>ประเภทกิจกรรม</span><div className="group-filter-select-wrap"><select name="eventType" defaultValue={filters.eventType}><option value="all">ทุกประเภทกิจกรรม</option><option value="tournament">Tournament</option><option value="friendly">Friendly</option><option value="training">Training</option><option value="challenge">Challenge</option></select><ChevronDown size={15} /></div></label>
                  <label className="group-filter-control"><span>รูปแบบการแข่งขัน</span><div className="group-filter-select-wrap"><select name="format" defaultValue={filters.format}><option value="all">ทุกรูปแบบ</option><option value="singles">ประเภทเดี่ยว</option><option value="doubles">ประเภทคู่</option><option value="team">ประเภททีม</option></select><ChevronDown size={15} /></div></label>
                </div>

                <details className="groups-advanced-filter" open={Boolean(filters.province || filters.district || filters.subdistrict || filters.sort !== "soonest")}>
                  <summary><SlidersHorizontal size={16} /><span>ค้นหาแบบละเอียด</span><span>{filterCount > 0 ? `${filterCount} ตัวกรอง` : "จังหวัด / อำเภอ / ตำบล"}</span><ChevronDown size={16} /></summary>
                  <div className="groups-advanced-filter__body">
                    <ThaiAreaSelect mode="search" initialProvince={filters.province} initialDistrict={filters.district} initialSubdistrict={filters.subdistrict} />
                    <p className="groups-filter-help"><MapPin size={14} />เลือกพื้นที่เพื่อดูกิจกรรมใกล้คุณ ระบบจะเปิดเขตและตำบลตามจังหวัดที่เลือก</p>
                    <div className="groups-secondary-filter-grid groups-secondary-filter-grid--two">
                      <label className="group-filter-control"><span>เรียงลำดับ</span><div className="group-filter-select-wrap"><select name="sort" defaultValue={filters.sort}><option value="soonest">เริ่มเร็วสุด</option><option value="newest">ประกาศล่าสุด</option></select><ChevronDown size={15} /></div></label>
                    </div>
                    <div className="groups-filter-actions"><Link href="/events" className="group-secondary-action"><RotateCcw size={15} /> ล้างตัวกรอง</Link><button type="submit" className="group-primary-action"><Filter size={15} /> ใช้ตัวกรอง</button></div>
                  </div>
                </details>
              </div>
            </form>

            <div className="discovery-results-heading"><div><p className="muted-label">Play more, feel more</p><h2>กิจกรรมที่ตรงกับคุณ</h2></div><span>{totalCount} กิจกรรม</span></div>
            {events.length > 0 ? <div className="preview-list event-discovery-list">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <div className="discovery-empty"><span>🎯</span><h2>ยังไม่พบกิจกรรมตามตัวกรอง</h2><p>ลองเปลี่ยนพื้นที่ ช่วงเวลา หรือประเภทการแข่งขัน แล้วค้นหาอีกครั้ง</p><Link href="/events" className="group-primary-action"><RotateCcw size={15} /> เริ่มค้นหาใหม่</Link></div>}
          </section>

          <aside className="discovery-sidebar">
            <section className="preview-panel preview-panel--soft discovery-event-guide"><p className="muted-label">Event guide</p><h2>เลือกกิจกรรมในสไตล์คุณ</h2><div className="type-pills"><span>🏆 Tournament</span><span>🤝 Friendly</span><span>🎯 Challenge</span><span>💪 Training</span></div></section>
            <section className="preview-panel preview-panel--soft discovery-tip-card"><p className="muted-label">Before you play</p><h2>ก่อนกดสมัคร</h2><ul><li><span>01</span>เช็กวัน เวลา และพื้นที่</li><li><span>02</span>ดูรูปแบบการแข่งขัน</li><li><span>03</span>ตรวจจำนวนที่นั่งที่เหลือ</li></ul></section>
          </aside>
        </div>
      </div>
      <footer className="preview-footer"><Link href="/">Arena-Badminton</Link><span>Local Preview · Supabase/R2 integration boundary ready</span></footer>
    </main>
  );
}
