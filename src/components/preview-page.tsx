import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Gem,
  Gift,
  Heart,
  MapPin,
  Medal,
  Plus,
  Search,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { courts, events, groups, ranking, shopItems } from "@/lib/demo-data";

export type PreviewKind = "groups" | "organizer" | "shop" | "ranking" | "profile" | "events" | "venues" | "community" | "messages";

const pageContent: Record<PreviewKind, { eyebrow: string; title: string; description: string; icon: string }> = {
  groups: { eyebrow: "Discover your people", title: "ก๊วนของฉัน & ก๊วนใกล้คุณ", description: "เลือกก๊วนที่ใช่ แล้วออกไปตีด้วยกัน", icon: "🏸" },
  organizer: { eyebrow: "Organizer Hub", title: "สร้างก๊วนของคุณ", description: "กำหนดสนาม เวลา ระดับฝีมือ และรางวัลได้ในที่เดียว", icon: "✨" },
  shop: { eyebrow: "Collect more, play more", title: "ร้านค้า Arena", description: "เติมสีสันให้การตีแบดด้วย Item และ Trophy", icon: "💎" },
  ranking: { eyebrow: "Battle Board", title: "Ranking & Skill BP", description: "ติดตามพัฒนาการและสนามประลองของ Community", icon: "🏆" },
  profile: { eyebrow: "Your Arena identity", title: "โปรไฟล์ของ BadBuddy", description: "Level, BP, Trophy และประวัติการเล่นของคุณ", icon: "🧑🏻" },
  events: { eyebrow: "Play more, feel more", title: "กิจกรรม & ทัวร์นาเมนต์", description: "แมตช์สนุก ๆ และการแข่งขันที่รอคุณอยู่", icon: "🎯" },
  venues: { eyebrow: "Find your court", title: "สนามแบดใกล้คุณ", description: "ค้นหาสนาม เช็กคิว และวางแผนการตี", icon: "📍" },
  community: { eyebrow: "Arena Community", title: "คอมมูนิตี้คนรักแบด", description: "ชวนเพื่อน แชร์โมเมนต์ และหา Partner คู่ใหม่", icon: "💬" },
  messages: { eyebrow: "Stay connected", title: "บอร์ดพูดคุย", description: "คุยกับก๊วนและเพื่อนนักแบดใน Arena", icon: "💌" },
};

export function PreviewHeader({ kind, live = false }: { kind: PreviewKind; live?: boolean }) {
  const content = pageContent[kind];
  return (
    <header className="preview-header">
      <div className="preview-header__topline">
        <Link href="/" className="preview-back"><ArrowLeft size={17} /> กลับหน้าหลัก</Link>
        <Link href="/" className="preview-brand"><span lang="en">Arena</span><span lang="en">-Badminton</span></Link>
        <div className="preview-user"><span>{live ? "🏸" : "🧑🏻"}</span> <span lang="en">{live ? "Arena Live" : "Guest Preview"}</span> <small lang="en">{live ? "Supabase" : "เข้าสู่ระบบ"}</small></div>
      </div>
      <div className="preview-heading">
        <div className="preview-heading__icon" aria-hidden="true">{content.icon}</div>
        <div>
          <p lang={/[A-Za-z]/.test(content.eyebrow) ? "en" : "th"}>{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <span>{content.description}</span>
        </div>
      </div>
    </header>
  );
}

function GroupsView() {
  return (
    <div className="preview-section-grid">
      <section className="preview-panel preview-panel--wide">
        <div className="preview-panel__toolbar"><div className="preview-search"><Search size={17} /><input placeholder="ค้นหาชื่อก๊วนหรือจังหวัด" /></div><button className="preview-filter"><BarChart3 size={16} /> ระดับฝีมือ</button><button className="primary-action"><Plus size={16} /> สร้างก๊วน</button></div>
        <div className="preview-list preview-list--groups">{groups.map((group) => <article key={group.id} className="preview-list-card"><div className={`preview-color-dot preview-color-dot--${group.accent}`} /><div className="preview-list-card__body"><h2>{group.title}</h2><p><MapPin size={14} /> {group.location} · {group.dateLabel} · {group.timeLabel}</p><div className="preview-list-card__bottom"><span>{group.level}</span><strong>{group.members}/{group.capacity} คน</strong><small>{group.status}</small></div></div><ArrowRight size={18} /></article>)}</div>
      </section>
      <aside className="preview-panel preview-panel--soft"><h2>ก๊วนของฉัน</h2><div className="profile-stat"><Users size={19} /><span><b>3</b><small>ก๊วนที่เข้าร่วม</small></span></div><div className="profile-stat"><CalendarDays size={19} /><span><b>2</b><small>นัดหมายสัปดาห์นี้</small></span></div><div className="preview-callout"><SparkleIcon /> <span>สร้างก๊วนแรกของคุณ แล้วชวนเพื่อนมาสนุกกัน</span></div><Link href="/organizer" className="secondary-action">ไปที่ Organizer Hub <ArrowRight size={15} /></Link></aside>
    </div>
  );
}

function OrganizerView() {
  return (
    <div className="preview-section-grid">
      <section className="preview-panel preview-panel--wide organizer-panel"><div className="wizard-steps"><span className="wizard-step wizard-step--active">1 <small>รายละเอียดก๊วน</small></span><span>2 <small>รางวัล</small></span><span>3 <small>ตรวจสอบ</small></span></div><div className="form-heading"><p>เริ่มจากรายละเอียดพื้นฐาน</p><h2>ก๊วนนี้จะจัดขึ้นที่ไหน?</h2></div><div className="form-grid"><label><span>ชื่อก๊วน</span><input defaultValue="ตีแบดหลังเลิกงาน" /></label><label><span>สถานที่ / สนาม</span><input placeholder="ค้นหาสนามแบด" /></label><label><span>วันที่</span><input placeholder="เลือกวันที่" /></label><label><span>เวลาเริ่มต้น</span><input placeholder="19:30" /></label><label><span>จำนวนชั่วโมง</span><select defaultValue="3 ชั่วโมง"><option>2 ชั่วโมง</option><option>3 ชั่วโมง</option><option>4 ชั่วโมง</option></select></label><label><span>รับผู้เล่นระดับ</span><select defaultValue="มือใหม่ - มือกลาง"><option>มือใหม่ - มือกลาง</option><option>มือกลาง</option><option>มือกลาง - มือสูง</option></select></label></div><div className="organizer-note"><CheckCircle2 size={18} /><span>ผู้จัดสามารถกำหนด EXP และเลือก Reward Item จากกองรางวัลของตัวเองได้ ระบบจะคำนวณ BP หลังผลแข่งได้รับการยืนยัน</span></div><button className="primary-action primary-action--large">บันทึกและไปต่อ <ArrowRight size={17} /></button></section>
      <aside className="preview-panel preview-panel--soft"><div className="organizer-balance"><span>Reward Pool ของคุณ</span><strong><Gem size={21} /> 1,000,000 <small>EXP</small></strong><strong><Medal size={20} /> 10,000 <small>BP Reward</small></strong></div><div className="preview-divider" /><h2>กติกาที่ใช้</h2><ul className="rule-list"><li><CheckCircle2 size={15} /> BP Floor 1,000</li><li><CheckCircle2 size={15} /> ผลแข่งต้องยืนยัน</li><li><CheckCircle2 size={15} /> Reward ถูกล็อกก่อนเริ่ม</li><li><CheckCircle2 size={15} /> แก้ไขย้อนหลังมี Audit Log</li></ul></aside>
    </div>
  );
}

function ShopView() {
  return <div className="preview-shop"><div className="shop-balance-card"><div><p>ยอด Diamond</p><strong><Gem size={22} /> 250</strong></div><Link href="/profile" className="shop-balance-card__link">ดู Inventory <ArrowRight size={15} /></Link></div><div className="shop-grid">{shopItems.map((item) => <article key={item.id} className={`shop-item shop-item--${item.tone}`}><div className="shop-item__art" aria-hidden="true">{item.icon}</div><div className="shop-item__content"><span className="shop-item__tag">ITEM</span><h2>{item.name}</h2><p>{item.description}</p><div className="shop-item__footer"><strong><Gem size={16} /> {item.price}</strong><button type="button" className="primary-action">ซื้อ Item</button></div></div></article>)}</div><div className="shop-note"><Gift size={19} /><span>EXP Booster จะเพิ่มโบนัสหลังการแข่งขันถูกยืนยัน ส่วน Badge ที่ซื้อจะอยู่ใน Inventory/Trophy ตามประเภทของ Item</span></div></div>;
}

function RankingView() {
  return <div className="preview-section-grid"><section className="preview-panel preview-panel--wide"><div className="ranking-hero"><div className="ranking-hero__medal">🏆</div><div><p>Season 01 · Community Ranking</p><h2>ไต่แรงก์ไปด้วยกัน</h2><span>Skill BP ของคุณเริ่มต้นที่ 1,000 และระบบจะปรับตามผลแข่งที่ยืนยันแล้ว</span></div></div><div className="ranking-table">{ranking.map((entry) => <div key={entry.handle} className={`ranking-row ${entry.handle === "@badbuddy" ? "ranking-row--you" : ""}`}><strong className="ranking-row__rank">{entry.rank}</strong><span className="ranking-avatar">{entry.avatar}</span><span className="ranking-row__name"><b>{entry.name}</b><small>{entry.handle} · Lv.{entry.level}</small></span><span className="ranking-trend">{entry.trend === "up" ? "↗" : entry.trend === "down" ? "↘" : "—"}</span><strong className="ranking-row__bp">{entry.bp.toLocaleString()} BP</strong></div>)}</div></section><aside className="preview-panel preview-panel--soft"><div className="your-rank"><p>อันดับของคุณ</p><strong>#24</strong><span>จากผู้เล่น 12,345 คน</span><div className="bp-progress"><span style={{ width: "68%" }} /></div><small>อีก 52 BP จะขึ้น Top 20</small></div><Link href="/profile" className="secondary-action">ดูสถิติของฉัน <ArrowRight size={15} /></Link></aside></div>;
}

function ProfileView() {
  return <div className="profile-layout"><section className="preview-panel profile-card"><div className="profile-card__cover" /><div className="profile-card__identity"><span className="profile-large-avatar">🧑🏻</span><div><h2>BadBuddy</h2><p>@badbuddy · กรุงเทพฯ</p></div><button type="button" className="secondary-action">แก้ไข Profile</button></div><div className="profile-level"><div><span>Level 25</span><strong>6,420 <small>/ 8,000 EXP</small></strong></div><div className="level-progress"><span style={{ width: "80%" }} /></div></div><div className="profile-metrics"><div><Trophy size={19} /><b>1,246</b><small>Skill BP</small></div><div><Medal size={19} /><b>18</b><small>Trophy</small></div><div><Heart size={19} /><b>32</b><small>ก๊วนที่เข้าร่วม</small></div></div></section><section className="preview-panel trophy-panel"><div className="preview-panel__title"><h2>Trophy ของฉัน</h2><Link href="/shop">ดูทั้งหมด <ArrowRight size={14} /></Link></div><div className="trophy-grid"><span>🥇<small>First Win</small></span><span>🔥<small>Hot Streak</small></span><span>🌈<small>Rally Star</small></span><span>🏸<small>Active</small></span></div></section></div>;
}

function EventsView() {
  return <div className="preview-section-grid"><section className="preview-panel preview-panel--wide"><div className="preview-panel__title"><div><p className="muted-label">Upcoming matches</p><h2>กิจกรรมที่กำลังจะมา</h2></div><button className="preview-filter"><CalendarDays size={16} /> เดือนนี้</button></div><div className="preview-list">{events.map((event) => <article key={event.id} className="event-large-row"><div className={`event-large-row__art event-large-row__art--${event.color}`}>{event.image}</div><div><span>{event.category}</span><h3>{event.title}</h3><p><CalendarDays size={14} /> {event.dateLabel} <MapPin size={14} /> {event.venue}</p></div><button className="secondary-action">ดูรายละเอียด <ArrowRight size={14} /></button></article>)}</div></section><aside className="preview-panel preview-panel--soft"><h2>ประเภทกิจกรรม</h2><div className="type-pills"><span>🏆 Tournament</span><span>🤝 Friendly</span><span>🎯 Challenge</span><span>💪 Training</span></div></aside></div>;
}

function VenuesView() {
  return <div className="preview-section-grid"><section className="preview-panel preview-panel--wide"><div className="preview-panel__toolbar"><div className="preview-search"><Search size={17} /><input placeholder="ค้นหาสนามหรือเขต" /></div><button className="preview-filter"><MapPin size={16} /> ใกล้ฉัน</button></div><div className="venue-grid">{courts.map((court) => <article key={court.id} className="venue-card"><div className="venue-card__image">{court.image}</div><div><h2>{court.name}</h2><p><MapPin size={14} /> {court.district}</p><div><span><NavigationIcon /> {court.distance}</span><span className="rating"><Star size={13} fill="currentColor" /> {court.rating}</span></div></div></article>)}</div></section><aside className="preview-panel preview-panel--soft map-placeholder"><div className="map-placeholder__grid" /><MapPin size={29} /><strong>แผนที่สนาม</strong><span>เชื่อม Map Provider ในขั้นต่อไป</span></aside></div>;
}

function CommunityView({ messages = false }: { messages?: boolean }) {
  return <div className="community-layout"><section className="preview-panel preview-panel--wide"><div className="post-composer"><span>🧑🏻</span><div>แชร์เรื่องราวการตีแบดวันนี้...</div><button className="secondary-action"><Plus size={15} /> สร้างโพสต์</button></div>{["วันนี้ตีได้ 3 เกมติดเลย! ใครว่างเสาร์นี้มาร่วมก๊วนกันนะ 🏸", "สนามใหม่พื้นดีมาก ใครอยู่แถวนนทบุรีลองไปเล่นกันครับ", "กำลังหาคู่ผสมสำหรับ Arena League #3 มีใครสนใจบ้าง?"].slice(0, messages ? 2 : 3).map((post, index) => <article key={post} className="post-card"><div className="post-card__header"><span className="post-avatar">{index === 1 ? "👩🏻" : "🧑🏻"}</span><div><strong>{index === 1 ? "May Rally" : "BadBuddy"}</strong><small>วันนี้ · {index + 2} ชม.</small></div><button className="post-more">•••</button></div><p>{post}</p><div className="post-actions"><button><Heart size={16} /> {12 + index * 7}</button><button><MessageCircleIcon /> {3 + index}</button><button><Gift size={16} /> ส่ง Trophy</button></div></article>)}</section><aside className="preview-panel preview-panel--soft"><h2>{messages ? "ห้องสนทนาของฉัน" : "Community Highlights"}</h2><div className="highlight"><span>🔥</span><div><strong>ตีแบดหลังเลิกงาน</strong><small>กำลังคุยกัน 12 คน</small></div></div><div className="highlight"><span>🏆</span><div><strong>Arena Cup 2024</strong><small>เปิดรับสมัครแล้ว</small></div></div><Link href="/groups" className="secondary-action">ค้นหาก๊วนเพิ่ม <ArrowRight size={15} /></Link></aside></div>;
}

function SparkleIcon() { return <span className="mini-icon">✦</span>; }
function NavigationIcon() { return <span aria-hidden="true">↗</span>; }
function MessageCircleIcon() { return <span aria-hidden="true">◌</span>; }

export default function PreviewPage({ kind }: { kind: PreviewKind }) {
  return <main className="preview-page"><PreviewHeader kind={kind} /><div className="preview-content">{kind === "groups" ? <GroupsView /> : kind === "organizer" ? <OrganizerView /> : kind === "shop" ? <ShopView /> : kind === "ranking" ? <RankingView /> : kind === "profile" ? <ProfileView /> : kind === "events" ? <EventsView /> : kind === "venues" ? <VenuesView /> : <CommunityView messages={kind === "messages"} />}</div><footer className="preview-footer"><Link href="/">Arena-Badminton</Link><span>Guest preview · เข้าสู่ระบบเพื่อดูข้อมูลจริง</span></footer></main>;
}
