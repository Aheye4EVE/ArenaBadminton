import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CalendarDays,
  Crown,
  Gem,
  LogOut,
  MapPin,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import type { HeaderProfileSummary, ProfileTrophy } from "@/types/profile";

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function getProgressLabel(summary: HeaderProfileSummary) {
  if (summary.nextLevelExp === null) return `${formatNumber(summary.expTotal)} EXP`;
  return `${formatNumber(summary.expTotal)} / ${formatNumber(summary.nextLevelExp)} EXP`;
}

function ProfileAvatar({ summary, size = "large" }: { summary: HeaderProfileSummary; size?: "large" | "small" }) {
  if (summary.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`profile-overview-avatar profile-overview-avatar--${size}`} src={summary.avatarUrl} alt={`รูปโปรไฟล์ของ ${summary.displayName}`} />;
  }

  return (
    <span className={`profile-overview-avatar profile-overview-avatar--${size}`} aria-label={`รูปโปรไฟล์ของ ${summary.displayName}`} role="img">
      <UserRound size={size === "large" ? 40 : 20} strokeWidth={1.8} />
    </span>
  );
}

export default function ProfileOverview({ summary, province, trophies }: { summary: HeaderProfileSummary; province: string | null; trophies: ProfileTrophy[] }) {
  const location = province?.trim() || "ยังไม่ได้ระบุจังหวัด";

  return (
    <main className="profile-overview-page">
      <div className="profile-overview-shell">
        <header className="profile-overview-topbar">
          <Link href="/" className="profile-overview-brand" aria-label="กลับหน้าหลัก Arena-Badminton">
            <span className="profile-overview-brand__word">Arena</span>
            <span className="profile-overview-brand__sub">-Badminton</span>
          </Link>

          <nav className="profile-overview-nav" aria-label="เมนูโปรไฟล์">
            <Link href="/groups"><Users size={15} /> ก๊วน</Link>
            <Link href="/events"><CalendarDays size={15} /> กิจกรรม</Link>
            <Link href="/shop"><Gem size={15} /> ร้านค้า</Link>
          </nav>

          <form action={signOut}>
            <button type="submit" className="profile-overview-signout"><LogOut size={16} /> ออกจากระบบ</button>
          </form>
        </header>

        <div className="profile-overview-heading">
          <div>
            <p lang="en">Your Arena identity</p>
            <h1>โปรไฟล์ของฉัน</h1>
            <span>เก็บทุกแมตช์ ทุก Level และทุกความทรงจำไว้ในสนามเดียว</span>
          </div>
          <Link href="/" className="profile-overview-back"><ArrowLeft size={16} /> กลับหน้าหลัก</Link>
        </div>

        <div className="profile-overview-grid">
          <section className="profile-overview-card profile-overview-card--hero" aria-labelledby="profile-overview-name">
            <div className="profile-overview-cover" aria-hidden="true" />

            <div className="profile-overview-identity">
              <ProfileAvatar summary={summary} />
              <div className="profile-overview-identity__copy">
                <div className="profile-overview-name-line">
                  <h2 id="profile-overview-name">{summary.displayName}</h2>
                  <Crown size={21} fill="#f7b74b" color="#f7a93b" aria-label="ผู้เล่นเด่น" />
                </div>
                <p><MapPin size={13} /> @{summary.handle.replace(/^@/, "")} · {location}</p>
                <span className="profile-overview-title-pill">{summary.levelLabel}</span>
              </div>
            </div>

            <div className="profile-overview-level-block">
              <div className="profile-overview-level-row">
                <span>Level {summary.level}</span>
                <strong>{getProgressLabel(summary)}</strong>
              </div>
              <div className="profile-overview-progress" role="progressbar" aria-label="ความคืบหน้า EXP" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.levelProgress}>
                <span style={{ width: `${summary.levelProgress}%` }} />
              </div>
              <div className="profile-overview-progress-note">
                <span>{summary.nextLevelExp === null ? "Level สูงสุดแล้ว" : `อีก ${formatNumber(Math.max(0, summary.nextLevelExp - summary.expTotal))} EXP เพื่อขึ้น Level ถัดไป`}</span>
                <span>{summary.levelProgress}%</span>
              </div>
            </div>

            <div className="profile-overview-metrics">
              <div><Users size={20} /><strong>{formatNumber(summary.stats.createdGroups)}</strong><span>ก๊วนที่สร้าง</span></div>
              <div><CalendarDays size={20} /><strong>{formatNumber(summary.stats.joinedGroups)}</strong><span>ก๊วนที่เข้าร่วม</span></div>
              <div><Trophy size={20} /><strong>{formatNumber(summary.stats.matchesPlayed)}</strong><span>แมตช์ที่แข่ง</span></div>
            </div>

            <div className="profile-overview-actions">
              <Link href="/groups" className="profile-overview-primary">ค้นหาก๊วนถัดไป <ArrowRight size={18} /></Link>
              <span><ShieldCheck size={15} /> ข้อมูลนี้มาจากการแข่งขันที่ยืนยันแล้ว</span>
            </div>
          </section>

          <aside className="profile-overview-side">
            <section className="profile-overview-card profile-overview-score-card">
              <div className="profile-overview-card-heading"><div><p lang="en">Arena snapshot</p><h2>สถานะการเล่นของคุณ</h2></div><Zap size={21} /></div>
              <div className="profile-overview-score-grid">
                <div className="profile-overview-score profile-overview-score--bp"><span><Award size={17} /> Skill BP</span><strong>{formatNumber(summary.skillBp)}</strong><small>ค่าต่ำสุด 1,000 BP</small></div>
                <div className="profile-overview-score profile-overview-score--wins"><span><Trophy size={17} /> ชนะแล้ว</span><strong>{formatNumber(summary.stats.wins)}</strong><small>จาก {formatNumber(summary.stats.matchesPlayed)} แมตช์</small></div>
              </div>
              <div className="profile-overview-rank-line"><span>Ranking</span><strong>{summary.rank === null ? "กำลังคำนวณ" : `#${formatNumber(summary.rank)}`}</strong></div>
            </section>

            <section className="profile-overview-card profile-overview-trophy-card">
              <div className="profile-overview-card-heading"><div><p lang="en">Your collection</p><h2>Trophy ของฉัน</h2></div><Trophy size={21} /></div>
              {trophies.length > 0 ? <div className="profile-overview-trophy-list">{trophies.map((trophy) => <article className={`profile-overview-trophy-item profile-overview-trophy-item--${trophy.rarityTier}`} key={trophy.id}><div className="profile-overview-trophy-item__icon" aria-hidden="true">{trophy.icon}</div><div><strong>{trophy.title}</strong><span>{trophy.description || "Achievement จาก Arena"}</span><small>{trophy.rarityTier} · {trophy.sourceType}</small></div></article>)}</div> : <div className="profile-overview-empty-trophy"><div><Trophy size={27} /></div><strong>เริ่มสะสม Trophy ชิ้นแรก</strong><span>รับ Badge จากก๊วนและการแข่งขันที่คุณเข้าร่วม</span></div>}
              <Link href="/shop" className="profile-overview-secondary">ไปที่ร้านค้า Item <ArrowRight size={15} /></Link>
            </section>

            <section className="profile-overview-card profile-overview-next-card">
              <p lang="en">Make your next move</p>
              <h2>พร้อมลงสนามหรือยัง?</h2>
              <div className="profile-overview-next-links">
                <Link href="/events"><CalendarDays size={16} /> ดูกิจกรรมใกล้คุณ <ArrowRight size={14} /></Link>
                <Link href="/organizer"><Users size={16} /> สร้างก๊วนของคุณ <ArrowRight size={14} /></Link>
              </div>
            </section>
          </aside>
        </div>

        <footer className="profile-overview-footer"><span>© Arena-Badminton</span><span>Level up together · Local preview</span></footer>
      </div>
    </main>
  );
}
