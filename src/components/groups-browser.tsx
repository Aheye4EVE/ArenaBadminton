import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock3,
  Filter,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import GroupMembershipActions from "@/components/group-membership-actions";
import ThaiAreaSelect from "@/components/thai-area-select";

export type GroupListItem = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  locationText: string;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  minLevel: number;
  maxLevel: number;
  playType: string;
  entryFee: string | number;
  status: string;
  registeredCount: number;
  membershipStatus: string | null;
};

export type GroupSearchFilters = {
  q: string;
  province: string;
  district: string;
  subdistrict: string;
  playType: "all" | "open" | "friendly" | "training" | "tournament";
  skill: "all" | "beginner" | "intermediate" | "advanced";
  date: "all" | "today" | "tomorrow" | "weekend" | "next7";
  availability: "all" | "available";
  fee: "all" | "free" | "paid";
  sort: "soonest" | "newest";
};

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeZone: "Asia/Bangkok",
});
const timeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

function groupDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ยังไม่ระบุวันเวลา";
  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)} น.`;
}

function levelLabel(group: GroupListItem) {
  return group.minLevel === group.maxLevel ? `Level ${group.minLevel}` : `Level ${group.minLevel}–${group.maxLevel}`;
}

function durationLabel(minutes: number) {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} ชม.`;
}

function playTypeLabel(playType: string) {
  return ({ open: "Open", friendly: "Friendly", tournament: "Tournament", training: "Training" } as Record<string, string>)[playType] ?? playType;
}

function feeLabel(value: string | number) {
  const fee = Number(value);
  return fee > 0 ? `${fee.toLocaleString("th-TH")} บาท` : "เข้าร่วมฟรี";
}

function activeFilterCount(filters: GroupSearchFilters) {
  return [
    filters.q,
    filters.province,
    filters.district,
    filters.subdistrict,
    filters.playType !== "all" ? filters.playType : "",
    filters.skill !== "all" ? filters.skill : "",
    filters.date !== "all" ? filters.date : "",
    filters.availability !== "all" ? filters.availability : "",
    filters.fee !== "all" ? filters.fee : "",
    filters.sort !== "soonest" ? filters.sort : "",
  ].filter(Boolean).length;
}

function GroupCard({ group, currentUserId }: { group: GroupListItem; currentUserId: string }) {
  const isFull = group.status === "full" || group.registeredCount >= group.capacity;
  const percent = Math.min(100, Math.round((group.registeredCount / group.capacity) * 100));

  return (
    <article className="group-live-card">
      <div className={isFull ? "group-live-card__accent group-live-card__accent--full" : "group-live-card__accent"} />
      <div className="group-live-card__body">
        <div className="group-live-card__topline">
          <span className={isFull ? "group-status-tag group-status-tag--full" : "group-status-tag"}>{isFull ? "เต็มแล้ว · รับคิว" : "เปิดรับสมาชิก"}</span>
          <span className="group-type-tag">{playTypeLabel(group.playType)}</span>
        </div>
        <Link href={`/groups/${group.id}`} className="group-live-card__title"><h2>{group.title}</h2><ArrowRight size={18} /></Link>
        {group.description ? <p className="group-live-card__description">{group.description}</p> : null}
        <div className="group-live-card__details">
          <span><MapPin size={15} /> {group.locationText}</span>
          <span><CalendarDays size={15} /> {groupDate(group.startsAt)}</span>
          <span><Clock3 size={15} /> {durationLabel(group.durationMinutes)}</span>
        </div>
        <div className="group-live-card__meta"><span><BarChart3 size={15} /> {levelLabel(group)}</span><span><Users size={15} /> {feeLabel(group.entryFee)}</span></div>
        <div className="group-capacity"><div className="group-capacity__label"><span>สมาชิกในก๊วน</span><strong>{group.registeredCount}/{group.capacity} คน</strong></div><div className="group-capacity__track"><span style={{ width: `${percent}%` }} /></div></div>
        <GroupMembershipActions groupId={group.id} groupStatus={group.status} membershipStatus={group.membershipStatus} isOwner={group.ownerId === currentUserId} />
      </div>
    </article>
  );
}

export default function GroupsBrowser({
  groups,
  filters,
  totalCount,
  currentUserId,
  loadError,
}: {
  groups: GroupListItem[];
  filters: GroupSearchFilters;
  totalCount: number;
  currentUserId: string;
  loadError?: string;
}) {
  const filterCount = activeFilterCount(filters);

  return (
    <main className="groups-page">
      <div className="groups-shell">
        <header className="groups-topbar">
          <Link href="/" className="groups-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link>
          <nav className="groups-nav" aria-label="เมนูหน้าก๊วน"><Link href="/">หน้าหลัก</Link><Link className="groups-nav__active" href="/groups">ก๊วน</Link><Link href="/profile">Profile</Link></nav>
          <Link href="/organizer" className="group-primary-action"><Plus size={17} /> สร้างก๊วน</Link>
        </header>

        <section className="groups-hero">
          <div><p lang="en">Discover your people</p><h1>ก๊วนที่ใช่ กำลังรอคุณอยู่</h1><span>เลือกสนาม เลือกระดับ แล้วออกไปตีด้วยกันในแบบของคุณ</span></div><div className="groups-hero__art" aria-hidden="true">🏸<i>✦</i><b>✨</b></div>
        </section>

        <div className="groups-layout">
          <section className="groups-main-panel">
            <form className="groups-filter-form" method="get">
              <div className="groups-searchbar">
                <div className="groups-searchbar__input"><Search size={18} /><input name="q" defaultValue={filters.q} placeholder="ค้นหาชื่อก๊วน สนาม หรือคำที่เกี่ยวข้อง" aria-label="ค้นหาชื่อก๊วน สนาม หรือสถานที่" /></div>
                <button type="submit" className="group-primary-action"><Search size={16} /> ค้นหาก๊วน</button>
              </div>

              <div className="groups-filter-toolbar">
                <div className="groups-quick-filters">
                  <label className="group-filter-control"><span>ระดับฝีมือ</span><select name="skill" defaultValue={filters.skill}><option value="all">ทุกระดับ</option><option value="beginner">มือใหม่ · Lv.1–20</option><option value="intermediate">มือกลาง · Lv.21–50</option><option value="advanced">มือสูง · Lv.51–99</option></select></label>
                  <label className="group-filter-control"><span>วันและช่วงเวลา</span><select name="date" defaultValue={filters.date}><option value="all">ทุกวัน</option><option value="today">วันนี้</option><option value="tomorrow">พรุ่งนี้</option><option value="weekend">สุดสัปดาห์</option><option value="next7">7 วันข้างหน้า</option></select></label>
                  <label className="group-filter-control"><span>ประเภทการเล่น</span><select name="playType" defaultValue={filters.playType}><option value="all">ทุกประเภท</option><option value="open">Open</option><option value="friendly">Friendly</option><option value="training">Training</option><option value="tournament">Tournament</option></select></label>
                </div>

                <details className="groups-advanced-filter" open={Boolean(filters.province || filters.district || filters.subdistrict || filters.availability !== "all" || filters.fee !== "all" || filters.sort !== "soonest")}>
                  <summary><SlidersHorizontal size={16} /><span>ค้นหาแบบละเอียด</span><span>{filterCount > 0 ? `${filterCount} ตัวกรอง` : "พื้นที่ / ค่าใช้จ่าย / ที่ว่าง"}</span><ChevronDown size={16} /></summary>
                  <div className="groups-advanced-filter__body">
                    <ThaiAreaSelect mode="search" initialProvince={filters.province} initialDistrict={filters.district} initialSubdistrict={filters.subdistrict} />
                    <p className="groups-filter-help"><MapPin size={14} />เลือกจังหวัด แล้วระบบจะเปิดเฉพาะเขต/อำเภอและแขวง/ตำบลที่อยู่ในพื้นที่นั้นให้โดยอัตโนมัติ</p>
                    <div className="groups-secondary-filter-grid">
                      <label className="group-filter-control"><span>ที่ว่าง</span><select name="availability" defaultValue={filters.availability}><option value="all">ทุกสถานะ</option><option value="available">เฉพาะก๊วนที่ยังมีที่ว่าง</option></select></label>
                      <label className="group-filter-control"><span>ค่าใช้จ่าย</span><select name="fee" defaultValue={filters.fee}><option value="all">ทุกค่าใช้จ่าย</option><option value="free">เข้าร่วมฟรี</option><option value="paid">มีค่าใช้จ่าย</option></select></label>
                      <label className="group-filter-control"><span>เรียงลำดับ</span><select name="sort" defaultValue={filters.sort}><option value="soonest">เริ่มเร็วสุด</option><option value="newest">สร้างล่าสุด</option></select></label>
                    </div>
                    <div className="groups-filter-actions"><Link href="/groups" className="group-secondary-action"><RotateCcw size={15} /> ล้างตัวกรอง</Link><button type="submit" className="group-primary-action"><Filter size={15} /> ใช้ตัวกรอง</button></div>
                  </div>
                </details>
              </div>
            </form>
            {loadError ? <div className="group-feedback group-feedback--error" role="alert">{loadError}</div> : null}
            <div className="groups-results-heading"><div><p lang="en">Open games</p><h2>ก๊วนเปิดรับตอนนี้</h2></div><span>{totalCount > groups.length ? `แสดง ${groups.length} จาก ${totalCount} ก๊วน` : `${totalCount} ก๊วน`}</span></div>
            {groups.length > 0 ? <div className="groups-live-list">{groups.map((group) => <GroupCard key={group.id} group={group} currentUserId={currentUserId} />)}</div> : <div className="groups-empty"><span>🌤️</span><h2>ยังไม่มีก๊วนตรงกับตัวกรอง</h2><p>ลองปรับพื้นที่ ระดับ หรือช่วงเวลา หรือเป็นคนแรกที่สร้างก๊วนในพื้นที่ของคุณ</p><Link href="/organizer" className="group-primary-action"><Plus size={16} /> สร้างก๊วนใหม่</Link></div>}
          </section>

          <aside className="groups-sidebar">
            <section className="groups-side-card groups-side-card--create"><span className="groups-side-card__icon">✨</span><p lang="en">Organizer Hub</p><h2>มีสนามในใจแล้วใช่ไหม?</h2><span>สร้างก๊วนของคุณเอง กำหนดเวลาและระดับฝีมือได้อิสระ</span><Link href="/organizer" className="group-secondary-action">เริ่มสร้างก๊วน <ArrowRight size={15} /></Link></section>
            <section className="groups-side-card"><h2>กติกาการเข้าร่วม</h2><ul className="groups-rules"><li><span>01</span><p>เช็กระดับและเวลาให้ตรงกับคุณ</p></li><li><span>02</span><p>กดเข้าร่วมเพื่อจองที่นั่ง</p></li><li><span>03</span><p>ถ้าเต็ม ระบบจะเข้าคิวรอให้อัตโนมัติ</p></li></ul></section>
            <section className="groups-side-card groups-side-card--tip"><Sparkles size={19} /><p>ทุกก๊วนที่ไปแข่งจริงจะต่อยอดเป็น EXP และ BP ใน Phase การแข่งขัน</p></section>
          </aside>
        </div>
      </div>
    </main>
  );
}
