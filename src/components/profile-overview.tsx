import Link from "next/link";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Crown,
  MapPin,
  Pencil,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import type { HeaderProfileSummary, ProfileTrophy } from "@/types/profile";
import ProfileStatusFeed, { type ProfileStatus } from "@/components/profile-status-feed";
import ProfileMediaInlineEditor from "@/components/profile-media-inline-editor";
import { safeMediaUrl } from "@/lib/safe-media-url";

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function getProgressLabel(summary: HeaderProfileSummary) {
  if (summary.nextLevelExp === null) return `${formatNumber(summary.expTotal)} EXP`;
  return `${formatNumber(summary.expTotal)} / ${formatNumber(summary.nextLevelExp)} EXP`;
}

export default function ProfileOverview({ summary, province, trophies, statuses = [] }: { summary: HeaderProfileSummary; province: string | null; trophies: ProfileTrophy[]; statuses?: ProfileStatus[] }) {
  const location = province?.trim() || "ยังไม่ได้ระบุจังหวัด";
  const backgroundUrl = safeMediaUrl(summary.profileBackgroundUrl);

  return (
    <main className="profile-overview-page">
      <div className="profile-overview-shell">
        <div className="profile-overview-grid">
          <section className="profile-overview-card profile-overview-card--hero" aria-labelledby="profile-overview-name">
            <ProfileMediaInlineEditor kind="background" initialUrl={backgroundUrl} initialFocusX={summary.backgroundFocusX} initialFocusY={summary.backgroundFocusY} displayName={summary.displayName} />

            <div className="profile-overview-identity">
              <ProfileMediaInlineEditor kind="avatar" initialUrl={safeMediaUrl(summary.avatarUrl)} initialFocusX={summary.avatarFocusX} initialFocusY={summary.avatarFocusY} displayName={summary.displayName} />
              <div className="profile-overview-identity__copy">
                <div className="profile-overview-name-line">
                  <h2 id="profile-overview-name">{summary.displayName}</h2>
                  <Crown size={21} fill="#f7b74b" color="#f7a93b" aria-label="ผู้เล่นเด่น" />
                </div>
                <p className="profile-overview-handle">@{summary.handle.replace(/^@/, "")}</p>
                <p className="profile-overview-location"><MapPin size={13} /> {location}</p>
                <span className="profile-overview-title-pill">{summary.levelLabel}</span>
                <span className={`profile-overview-rank-pill profile-overview-rank-pill--${summary.skillRankColor}`}>Tier {summary.skillRankTier} · {summary.skillRankName}</span>
                {summary.bio ? <p className="profile-overview-bio">{summary.bio}</p> : null}
              </div>
              <div className="profile-overview-identity__links">
                <Link href="/profile/edit" className="profile-overview-edit"><Pencil size={15} /> แก้ไข Profile</Link>
                {summary.isAdmin ? <Link href="/admin" className="profile-overview-admin"><ShieldCheck size={15} /> Admin</Link> : null}
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
                <div><Users size={20} /><strong>{formatNumber(summary.friendCount)}</strong><span>เพื่อนที่ยืนยันแล้ว</span></div>
            </div>

            <div className="profile-overview-actions">
              <Link href="/groups" className="profile-overview-primary">ค้นหาก๊วนถัดไป <ArrowRight size={18} /></Link>
              <Link href="/profile/history" className="profile-overview-secondary"><Trophy size={15} /> ดูประวัติการเล่น <ArrowRight size={15} /></Link>
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
              <div className={`profile-overview-rank-summary profile-overview-rank-summary--${summary.skillRankColor}`}><span>ยศจาก Skill BP</span><strong>Tier {summary.skillRankTier} · {summary.skillRankName}</strong><small>ระบบปรับให้อัตโนมัติจาก BP ที่ยืนยันแล้ว</small></div>
              <Link href="/ranking" className="profile-overview-rank-line"><span>Ranking</span><strong>{summary.rank === null ? "กำลังคำนวณ" : `#${formatNumber(summary.rank)}`}</strong><ArrowRight size={15} /></Link>
            </section>

            <section className="profile-overview-card profile-overview-friends-card">
              <div className="profile-overview-card-heading"><div><p lang="en">Your circle</p><h2>เพื่อนของฉัน</h2></div><Users size={21} /></div>
              <Link href="/friends" className="profile-overview-friends-link"><span className="profile-overview-friends-link__icon"><Users size={25} /></span><span><strong>{formatNumber(summary.friendCount)} คน</strong><small>เพื่อนที่ยืนยันและคุยผ่าน Messenger ได้</small></span><ArrowRight size={17} /></Link>
              {summary.pendingFriendRequestCount > 0 ? <p className="profile-overview-pending-friends">มีคำขอใหม่ {formatNumber(summary.pendingFriendRequestCount)} รายการ</p> : null}
            </section>

            <section className="profile-overview-card profile-overview-trophy-card">
              <div className="profile-overview-card-heading"><div><h2>Trophy ของฉัน</h2></div><Trophy size={21} /></div>
              {trophies.length > 0 ? <div className="profile-overview-trophy-list">{trophies.map((trophy) => <article className={`profile-overview-trophy-item profile-overview-trophy-item--${trophy.rarityTier}`} key={trophy.id}><div className="profile-overview-trophy-item__icon" aria-hidden="true">{trophy.icon}</div><div><strong>{trophy.title}</strong><span>{trophy.description || "Achievement จาก Arena"}</span><small>{trophy.rarityTier} · {trophy.sourceType}</small></div></article>)}</div> : <div className="profile-overview-empty-trophy"><div><Trophy size={27} /></div><strong>เริ่มสะสม Trophy ชิ้นแรก</strong><span>รับ Badge จากก๊วนและการแข่งขันที่คุณเข้าร่วม</span></div>}
            </section>
          </aside>
        </div>

        <ProfileStatusFeed statuses={statuses} />

        <footer className="profile-overview-footer"><span>© Arena-Badminton</span><span>Level up together · Production Arena</span></footer>
      </div>
    </main>
  );
}
