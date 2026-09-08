"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
  UserRound,
  Zap,
  Swords,
  MessageCircle,
} from "lucide-react";
import type {
  HeaderProfileSummary,
  ProfileFriend,
  ProfileRecentMatch,
  ProfileTrophy,
} from "@/types/profile";
import ProfileStatusFeed, {
  type ProfileStatus,
} from "@/components/profile-status-feed";
import ProfileMediaInlineEditor from "@/components/profile-media-inline-editor";
import { PlayerInspectModal } from "@/components/player-inspect-modal";
import { safeMediaUrl } from "@/lib/safe-media-url";

type ProfileTab = "overview" | "trophies" | "lounge";

const tabs: Array<{
  id: ProfileTab;
  label: string;
  eyebrow: string;
  icon: typeof Users;
}> = [
  {
    id: "overview",
    label: "ภาพรวม & สถิติ",
    eyebrow: "Overview / Stats",
    icon: Zap,
  },
  {
    id: "trophies",
    label: "ถ้วยรางวัล",
    eyebrow: "Trophies & Badges",
    icon: Trophy,
  },
  {
    id: "lounge",
    label: "กระดานสถานะ",
    eyebrow: "Lounge & Feed",
    icon: MessageCircle,
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function getProgressLabel(summary: HeaderProfileSummary) {
  if (summary.nextLevelExp === null)
    return `${formatNumber(summary.expTotal)} EXP`;
  return `${formatNumber(summary.expTotal)} / ${formatNumber(summary.nextLevelExp)} EXP`;
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  note,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone: string;
  note?: string;
}) {
  return (
    <article className={`profile-bento-stat profile-bento-stat--${tone}`}>
      <span className="profile-bento-stat__icon">
        <Icon size={19} />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {note ? <small>{note}</small> : null}
      </div>
    </article>
  );
}

function formatMatchDate(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "เวลาไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatSignedNumber(value: number) {
  const formatted = formatNumber(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return "0";
}

function RecentMatchesCard({
  matches,
}: {
  matches: ProfileRecentMatch[];
}) {
  return (
    <section
      className="profile-overview-card profile-recent-matches-card"
      aria-labelledby="profile-recent-matches-title"
    >
      <div className="profile-overview-card-heading profile-recent-matches-heading">
        <div>
          <p lang="en">MATCH HISTORY</p>
          <h2 id="profile-recent-matches-title">
            <Trophy size={19} /> ประวัติการแข่งขัน
          </h2>
        </div>
        <div className="profile-recent-matches-heading__meta">
          <span>{matches.length > 0 ? `${matches.length} ครั้งล่าสุด` : "ยังไม่มีรายการ"}</span>
          <Link href="/profile/history" className="profile-history-view-all">
            ดูทั้งหมด <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="profile-recent-match-list">
          {matches.map((match) => {
            const won = match.result === "Victory";
            return (
              <article
                className={`profile-recent-match-row profile-recent-match-row--${won ? "win" : "loss"}`}
                key={match.id}
              >
                <span className="profile-recent-match-row__icon" aria-hidden="true">
                  {won ? <Trophy size={17} /> : <Swords size={17} />}
                </span>
                <div className="profile-recent-match-row__copy">
                  <strong>{match.groupTitle}</strong>
                  <span>
                    {match.matchNumber === null
                      ? "การแข่งขันที่ยืนยันแล้ว"
                      : `Match #${formatNumber(match.matchNumber)}`}
                  </span>
                  <small>{formatMatchDate(match.date)}</small>
                </div>
                <div className="profile-recent-match-row__result">
                  <b>{match.result}</b>
                  <strong>{match.score}</strong>
                  <small>
                    EXP {formatSignedNumber(match.exp)} · BP {formatSignedNumber(match.bp)}
                  </small>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="profile-recent-matches-empty">
          <div className="profile-recent-matches-empty__icon" aria-hidden="true">
            <Trophy size={22} />
          </div>
          <strong>ยังไม่มีประวัติการแข่งขัน</strong>
          <span>ผลการแข่งขันที่ยืนยันแล้วจะแสดงที่นี่</span>
        </div>
      )}
    </section>
  );
}

function TrophiesPanel({ trophies }: { trophies: ProfileTrophy[] }) {
  return (
    <section
      className="profile-overview-card profile-trophies-panel"
      aria-labelledby="profile-trophies-title"
    >
      <div className="profile-overview-card-heading">
        <div>
          <p lang="en">HALL OF FAME</p>
          <h2 id="profile-trophies-title">
            <Trophy size={19} /> ทำเนียบถ้วยรางวัล
          </h2>
        </div>
        <span className="profile-panel-count">{trophies.length} Badge</span>
      </div>
      {trophies.length > 0 ? (
        <div className="profile-trophy-showcase">
          {trophies.map((trophy) => (
            <motion.article
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className={`profile-overview-trophy-item profile-overview-trophy-item--${trophy.rarityTier}`}
              key={trophy.id}
            >
              <div
                className="profile-overview-trophy-item__icon"
                aria-hidden="true"
              >
                {trophy.icon}
              </div>
              <div>
                <strong>{trophy.title}</strong>
                <span>{trophy.description || "Achievement จาก Arena"}</span>
                <small>
                  {trophy.rarityTier} · {trophy.sourceType}
                </small>
              </div>
            </motion.article>
          ))}
        </div>
      ) : (
        <div className="profile-trophy-empty">
          <div className="profile-trophy-empty__chest" aria-hidden="true">
            🎁
          </div>
          <strong>ตู้ถ้วยรางวัลยังรอคุณอยู่</strong>
          <span>เข้าร่วมก๊วนและการแข่งขันเพื่อปลดล็อก Badge แรก</span>
        </div>
      )}
    </section>
  );
}

export default function ProfileOverview({
  summary,
  province,
  trophies,
  statuses = [],
  friends = [],
  recentMatches = [],
}: {
  summary: HeaderProfileSummary;
  province: string | null;
  trophies: ProfileTrophy[];
  statuses?: ProfileStatus[];
  friends?: ProfileFriend[];
  recentMatches?: ProfileRecentMatch[];
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const location = province?.trim() || "ยังไม่ได้ระบุจังหวัด";
  const backgroundUrl = safeMediaUrl(summary.profileBackgroundUrl);
  const winRate =
    summary.stats.matchesPlayed > 0
      ? (summary.stats.wins / summary.stats.matchesPlayed) * 100
      : 0;

  return (
    <main className="profile-overview-page">
      <div className="profile-overview-shell">
        <section
          className="profile-overview-card profile-overview-card--hero profile-player-pass"
          aria-labelledby="profile-overview-name"
        >
          <div className="profile-overview-cover profile-overview-cover--arcade">
            <ProfileMediaInlineEditor
              kind="background"
              initialUrl={backgroundUrl}
              initialFocusX={summary.backgroundFocusX}
              initialFocusY={summary.backgroundFocusY}
              displayName={summary.displayName}
            />
            <div className="profile-overview-cover__scrim" />
          </div>
          <div className="profile-overview-identity">
            <ProfileMediaInlineEditor
              kind="avatar"
              initialUrl={safeMediaUrl(summary.avatarUrl)}
              initialFocusX={summary.avatarFocusX}
              initialFocusY={summary.avatarFocusY}
              displayName={summary.displayName}
            />
            <div className="profile-overview-identity__copy">
              <div className="profile-overview-name-line">
                <div>
                  <h2 id="profile-overview-name">{summary.displayName}</h2>
                  <p className="profile-overview-handle">
                    @{summary.handle.replace(/^@/, "")}
                  </p>
                </div>
                <Crown
                  size={21}
                  fill="#f7b74b"
                  color="#f7a93b"
                  aria-label="ผู้เล่นเด่น"
                />
              </div>
              <p className="profile-overview-location">
                <MapPin size={13} /> {location}
              </p>
              <div className="profile-overview-badge-row">
                <span className="profile-overview-title-pill">
                  {summary.levelLabel}
                </span>
                <span
                  className={`profile-overview-rank-pill profile-overview-rank-pill--${summary.skillRankColor}`}
                >
                  Tier {summary.skillRankTier} · {summary.skillRankName}
                </span>
              </div>
              {summary.bio ? (
                <p className="profile-overview-bio">{summary.bio}</p>
              ) : null}
            </div>
            <div className="profile-overview-identity__links">
              <Link href="/profile/edit" className="profile-overview-edit">
                <Pencil size={15} /> แก้ไข Profile
              </Link>
              {summary.isAdmin ? (
                <Link href="/admin" className="profile-overview-admin">
                  <ShieldCheck size={15} /> Admin
                </Link>
              ) : null}
            </div>
          </div>
          <div className="profile-overview-level-block">
            <div className="profile-overview-level-row">
              <span>Level {summary.level}</span>
              <strong>{getProgressLabel(summary)}</strong>
            </div>
            <div
              className="profile-overview-progress"
              role="progressbar"
              aria-label="ความคืบหน้า EXP"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={summary.levelProgress}
            >
              <span style={{ width: `${summary.levelProgress}%` }} />
            </div>
            <div className="profile-overview-progress-note">
              <span>
                {summary.nextLevelExp === null
                  ? "Level สูงสุดแล้ว"
                  : `อีก ${formatNumber(Math.max(0, summary.nextLevelExp - summary.expTotal))} EXP เพื่อขึ้น Level ถัดไป`}
              </span>
              <span>{summary.levelProgress}%</span>
            </div>
          </div>
        </section>

        <nav className="profile-tabs" aria-label="ส่วนต่างๆ ของ Profile">
          {tabs.map(({ id, label, eyebrow, icon: Icon }) => (
            <button
              type="button"
              role="tab"
              key={id}
              id={`profile-tab-${id}`}
              className={
                activeTab === id
                  ? "profile-tab profile-tab--active"
                  : "profile-tab"
              }
              aria-selected={activeTab === id}
              aria-controls={`profile-tab-panel-${id}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={17} />
              <span>
                <small>{eyebrow}</small>
                <strong>{label}</strong>
              </span>
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            id={`profile-tab-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`profile-tab-${activeTab}`}
            className="profile-tab-panel"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {activeTab === "overview" ? (
              <>
                <div className="profile-overview-content-grid">
                <section className="profile-overview-card profile-battle-card">
                  <div className="profile-overview-card-heading">
                    <div>
                      <p lang="en">BATTLE STATS</p>
                      <h2>
                        <Swords size={19} /> ข้อมูลพลังและการเล่น
                      </h2>
                    </div>
                    <span className="verified-badge">
                      <ShieldCheck size={13} /> Verified Stats
                    </span>
                  </div>
                  <div className="profile-bento-stat-grid">
                    <StatTile
                      icon={Award}
                      label="Skill BP"
                      value={formatNumber(summary.skillBp)}
                      tone="lavender"
                      note={`Tier ${summary.skillRankTier}`}
                    />
                    <StatTile
                      icon={Users}
                      label="เพื่อนร่วมก๊วน"
                      value={formatNumber(summary.friendCount)}
                      tone="mint"
                      note={
                        summary.pendingFriendRequestCount > 0
                          ? `คำขอใหม่ ${summary.pendingFriendRequestCount}`
                          : "ยืนยันแล้ว"
                      }
                    />
                    <StatTile
                      icon={Swords}
                      label="แมตช์ที่แข่งขัน"
                      value={formatNumber(summary.stats.matchesPlayed)}
                      tone="peach"
                      note={`${summary.stats.wins}W · ${summary.stats.losses}L`}
                    />
                    <StatTile
                      icon={Trophy}
                      label="ชนะแล้ว"
                      value={formatNumber(summary.stats.wins)}
                      tone="gold"
                      note={`Win Rate ${winRate.toFixed(0)}%`}
                    />
                  </div>
                  <div className="profile-overview-rank-line">
                    <span>Rank ใน Arena</span>
                    <strong>
                      {summary.rank === null
                        ? "กำลังคำนวณ"
                        : `#${formatNumber(summary.rank)}`}
                    </strong>
                    <ArrowRight size={15} />
                  </div>
                </section>
                <section className="profile-overview-card profile-circle-card">
                  <div className="profile-overview-card-heading">
                    <div>
                      <p lang="en">MY CIRCLE</p>
                      <h2>
                        <Users size={19} /> เพื่อนร่วมก๊วน
                      </h2>
                    </div>
                    <span className="profile-panel-count">
                      {formatNumber(summary.friendCount)} คน
                    </span>
                  </div>
                  {friends.length > 0 ? (
                    <div
                      className="profile-circle-avatar-rail"
                      aria-label="เพื่อนร่วมก๊วน แตะ Avatar เพื่อเปิด Arena Pass"
                    >
                      {friends.slice(0, 10).map((friend) => (
                        <button
                          type="button"
                          className="profile-circle-avatar"
                          key={friend.id}
                          title={`เปิด Arena Pass ของ ${friend.displayName}`}
                          aria-label={`เปิด Arena Pass ของ ${friend.displayName}`}
                          onClick={() => setSelectedFriendId(friend.id)}
                        >
                          <span className="profile-circle-avatar__ring">
                            {friend.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={friend.avatarUrl}
                                alt=""
                                draggable={false}
                                style={{
                                  objectPosition: `${friend.avatarFocusX}% ${friend.avatarFocusY}%`,
                                }}
                              />
                            ) : (
                              <UserRound size={21} aria-hidden="true" />
                            )}
                          </span>
                          <span className="sr-only">{friend.displayName}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="profile-circle-empty">
                      <Users size={20} />
                      <span>ยังไม่มีเพื่อนใน Circle</span>
                    </div>
                  )}
                  <div className="profile-circle-footer">
                    <span>แตะ Avatar เพื่อส่อง Arena Pass</span>
                    <Link href="/friends" className="profile-circle-view-all">
                      ดูทั้งหมด <ArrowRight size={15} />
                    </Link>
                  </div>
                  {summary.pendingFriendRequestCount > 0 ? (
                    <p className="profile-overview-pending-friends">
                      มีคำขอใหม่{" "}
                      {formatNumber(summary.pendingFriendRequestCount)} รายการ
                    </p>
                  ) : null}
                  <div className="profile-circle-note">
                    <CalendarDays size={16} /> ก๊วนที่สร้าง{" "}
                    {formatNumber(summary.stats.createdGroups)} · เข้าร่วม{" "}
                    {formatNumber(summary.stats.joinedGroups)}
                  </div>
                </section>
                </div>
                <RecentMatchesCard matches={recentMatches.slice(0, 5)} />
              </>
            ) : activeTab === "trophies" ? (
              <TrophiesPanel trophies={trophies} />
            ) : (
              <ProfileStatusFeed statuses={statuses} />
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="profile-overview-footer">
          <span>© Arena-Badminton</span>
          <span>Level up together · Rainbow Court</span>
        </footer>
      </div>
      <PlayerInspectModal
        playerId={selectedFriendId}
        isAuthenticated
        onClose={() => setSelectedFriendId(null)}
      />
    </main>
  );
}
