"use client";

import Link from "next/link";
import { ArrowRight, Crown, Medal, Shield, Trophy, Users } from "lucide-react";
import type { GuildRankingEntry } from "@/lib/guild-ranking";

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}
function levelProgress(entry: GuildRankingEntry) {
  const target = Math.max(1000, (entry.level + 1) * 1000);
  return Math.min(100, Math.round((entry.expTotal / target) * 100));
}
function area(entry: GuildRankingEntry) {
  return (
    [entry.province, entry.district].filter(Boolean).join(" · ") ||
    "ไม่ระบุพื้นที่"
  );
}

function GuildLogo({
  entry,
  large = false,
}: {
  entry: GuildRankingEntry;
  large?: boolean;
}) {
  return (
    <span
      className={
        large
          ? "guild-ranking-logo guild-ranking-logo--large"
          : "guild-ranking-logo"
      }
    >
      {entry.logoUrl ? (
        <img src={entry.logoUrl} alt={`Logo ${entry.name}`} />
      ) : (
        <Shield size={large ? 30 : 21} />
      )}
    </span>
  );
}

function PodiumCard({
  entry,
  rank,
}: {
  entry: GuildRankingEntry;
  rank: 1 | 2 | 3;
}) {
  return (
    <Link
      href={`/guilds/${entry.id}`}
      className={`guild-podium-card guild-podium-card--${rank}`}
    >
      <span className="guild-podium-card__rank">
        {rank === 1 ? <Crown size={20} /> : <Medal size={19} />} #{rank}
      </span>
      <GuildLogo entry={entry} large />
      <strong>{entry.name}</strong>
      <small>
        Lv.{entry.level} · {formatNumber(entry.expTotal)} EXP
      </small>
      <span className="guild-podium-card__area">{area(entry)}</span>
    </Link>
  );
}

export default function GuildRankingBrowser({
  entries,
  province,
  scope,
}: {
  entries: GuildRankingEntry[];
  province: string | null;
  scope: "national" | "province";
}) {
  const top = entries.slice(0, 3);
  const rest = entries.slice(3);
  return (
    <main className="guild-ranking-page">
      <div className="guild-ranking-shell">
        <header className="guild-ranking-hero">
          <div>
            <p lang="en">Guild Power Board</p>
            <h1>Guild Ranking · ศึกแห่งเกียรติยศ</h1>
            <span>
              สะสม Guild EXP จากแมตช์และภารกิจ แล้วพาทีมไต่ขึ้นสู่ Top Guild ของ
              Arena
            </span>
          </div>
          <Trophy size={70} />
        </header>
        <nav
          className="guild-ranking-filters"
          aria-label="ตัวกรอง Guild Ranking"
        >
          <Link
            href="/guilds/ranking"
            className={
              scope === "national"
                ? "guild-ranking-filter guild-ranking-filter--active"
                : "guild-ranking-filter"
            }
          >
            🌏 กิลด์ทั่วประเทศ
          </Link>
          <Link
            href="/guilds/ranking?scope=province"
            className={
              scope === "province"
                ? "guild-ranking-filter guild-ranking-filter--active"
                : "guild-ranking-filter"
            }
          >
            📍 {province ? `กิลด์ใน${province}` : "กิลด์ในจังหวัดของคุณ"}
          </Link>
        </nav>
        {top.length > 0 ? (
          <section className="guild-podium" aria-label="Guild อันดับสูงสุด">
            {top[1] ? <PodiumCard entry={top[1]} rank={2} /> : null}
            {top[0] ? <PodiumCard entry={top[0]} rank={1} /> : null}
            {top[2] ? <PodiumCard entry={top[2]} rank={3} /> : null}
          </section>
        ) : (
          <section className="guild-ranking-empty">
            <Trophy size={31} />
            <strong>ยังไม่มี Guild ใน Ranking นี้</strong>
            <span>สร้างทีมแล้วสะสม EXP เพื่อขึ้นกระดานอันดับ</span>
            <Link href="/guilds" className="guild-primary-action">
              ค้นหา Guild <ArrowRight size={15} />
            </Link>
          </section>
        )}
        <section className="guild-leaderboard">
          <div className="guild-leaderboard__heading">
            <div>
              <p lang="en">Leaderboard</p>
              <h2>อันดับ Guild ทั้งหมด</h2>
            </div>
            <span>{formatNumber(entries.length)} Guild</span>
          </div>
          {rest.length > 0 ? (
            <div className="guild-leaderboard__list">
              {rest.map((entry, index) => {
                const rank = index + 4;
                const progress = levelProgress(entry);
                return (
                  <article className="guild-leaderboard-row" key={entry.id}>
                    <strong className="guild-leaderboard-row__rank">
                      #{rank}
                    </strong>
                    <GuildLogo entry={entry} />
                    <div className="guild-leaderboard-row__identity">
                      <Link href={`/guilds/${entry.id}`}>{entry.name}</Link>
                      <small>{area(entry)}</small>
                    </div>
                    <div className="guild-leaderboard-row__level">
                      <span>
                        Lv.{entry.level} · {formatNumber(entry.expTotal)} EXP
                      </span>
                      <div>
                        <span style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <span className="guild-leaderboard-row__members">
                      <Users size={14} /> {entry.memberCount}/{entry.maxMembers}
                    </span>
                    <Link
                      href={`/guilds/${entry.id}`}
                      className="guild-leaderboard-row__open"
                      aria-label={`เปิด ${entry.name}`}
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="guild-ranking-subempty">
              Top 3 คือข้อมูลทั้งหมดในตัวกรองนี้ · ชวนเพื่อนสร้าง Guild
              เพิ่มได้เลย
            </p>
          )}
        </section>
        <footer className="guilds-footer">
          <Link href="/guilds">← กลับ Guild Directory</Link>
          <span>Ranking cache · อัปเดตทุก 60 วินาที</span>
        </footer>
      </div>
    </main>
  );
}
