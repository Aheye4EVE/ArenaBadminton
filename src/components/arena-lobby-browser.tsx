"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Search,
  Shuffle,
  Sparkles,
  UserRound,
  Users,
  Wifi,
} from "lucide-react";
import { PlayerInspectModal } from "@/components/player-inspect-modal";
import { usePlayerPresence } from "@/hooks/use-player-presence";
import type { OnlinePlayerItem } from "@/lib/player-summary";

type LobbyFilter = "all" | "online" | "recent";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function shuffleIds(players: OnlinePlayerItem[]) {
  const ids = players.map((player) => player.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
  }
  return ids;
}

function lastSeenLabel(player: OnlinePlayerItem, isOnline: boolean) {
  if (isOnline) return "ออนไลน์อยู่ตอนนี้";
  if (player.secondsAgo < 60) return "ออนไลน์ล่าสุด เมื่อสักครู่";
  if (player.secondsAgo < 3600) {
    return `ออนไลน์ล่าสุด ${Math.max(1, Math.floor(player.secondsAgo / 60))} นาทีที่แล้ว`;
  }
  if (player.secondsAgo < 86400) {
    return `ออนไลน์ล่าสุด ${Math.max(1, Math.floor(player.secondsAgo / 3600))} ชม. ที่แล้ว`;
  }

  const date = new Date(player.updatedAt);
  if (!Number.isNaN(date.getTime())) {
    return `ออนไลน์ล่าสุด ${new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    }).format(date)}`;
  }
  return "ยังไม่มีข้อมูลเวลาออนไลน์";
}

export default function ArenaLobbyBrowser({
  initialPlayers,
  currentUserId,
  isAuthenticated,
}: {
  initialPlayers: OnlinePlayerItem[];
  currentUserId: string | null;
  isAuthenticated: boolean;
}) {
  const presence = usePlayerPresence(currentUserId, isAuthenticated, {
    scope: "all",
    initialPlayers,
  });
  const { isOnline } = presence;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LobbyFilter>("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);

  const orderedPlayers = useMemo(() => {
    if (!manualOrder) return presence.players;
    const playerMap = new Map(presence.players.map((player) => [player.id, player]));
    const known = manualOrder.flatMap((id) => {
      const player = playerMap.get(id);
      return player ? [player] : [];
    });
    const knownIds = new Set(known.map((player) => player.id));
    return [...known, ...presence.players.filter((player) => !knownIds.has(player.id))];
  }, [manualOrder, presence.players]);

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orderedPlayers.filter((player) => {
      const playerIsOnline = isOnline(player);
      const matchesFilter = filter === "all"
        || (filter === "online" && playerIsOnline)
        || (filter === "recent" && player.secondsAgo <= 86400);
      const searchable = `${player.displayName} ${player.handle} ${player.skillRankName}`.toLowerCase();
      return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [filter, isOnline, orderedPlayers, query]);

  const onlineCount = orderedPlayers.filter((player) => isOnline(player)).length;

  return (
    <main className="arena-lobby-page">
      <section className="arena-lobby-hero">
        <div className="arena-lobby-hero__copy">
          <Link href="/" className="arena-lobby-backlink">
            <ArrowLeft size={14} /> กลับหน้าหลัก
          </Link>
          <p className="arena-lobby-eyebrow"><Sparkles size={14} /> ARENA LOBBY</p>
          <h1>ผู้เล่นในสนามตอนนี้</h1>
          <p className="arena-lobby-hero__description">
            แวะมาทักทาย ส่อง Arena Pass และหาเพื่อนร่วมก๊วนที่พร้อมลงสนามไปด้วยกัน
          </p>
        </div>
        <div className="arena-lobby-hero__orb" aria-hidden="true">
          <Wifi size={54} />
          <span>PLAY<br />TOGETHER</span>
        </div>
        <div className="arena-lobby-hero__stats" aria-label="สถิติผู้เล่นใน Lobby">
          <div>
            <strong>{onlineCount}</strong>
            <span><span className="online-status-dot online-status-dot--live" /> ออนไลน์อยู่</span>
          </div>
          <div>
            <strong>{orderedPlayers.length}</strong>
            <span><Users size={13} /> ผู้เล่นทั้งหมด</span>
          </div>
        </div>
      </section>

      <section className="arena-lobby-toolbar" aria-label="ตัวกรอง Arena Lobby">
        <label className="arena-lobby-search">
          <Search size={17} />
          <span className="sr-only">ค้นหาผู้เล่น</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อผู้เล่นหรือ Handle..."
          />
        </label>
        <div className="arena-lobby-toolbar__actions">
          <div className="arena-lobby-filters" role="tablist" aria-label="สถานะผู้เล่น">
            {([
              ["all", "ทั้งหมด"],
              ["online", "ออนไลน์อยู่"],
              ["recent", "วันนี้"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                className={cx(filter === value && "arena-lobby-filter--active")}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="arena-lobby-shuffle"
            onClick={() => setManualOrder(shuffleIds(presence.players))}
            title="สุ่มลำดับผู้เล่นใหม่"
          >
            <Shuffle size={15} /> <span>สุ่มลำดับ</span>
          </button>
          <button
            type="button"
            className="arena-lobby-refresh"
            onClick={() => void presence.refresh()}
            aria-label="รีเฟรชรายชื่อผู้เล่น"
          >
            <Clock3 size={15} /> รีเฟรช
          </button>
        </div>
      </section>

      <section className="arena-lobby-list-section" aria-labelledby="arena-lobby-list-title">
        <div className="arena-lobby-list-heading">
          <div>
            <p className="arena-lobby-eyebrow">DISCOVER YOUR PEOPLE</p>
            <h2 id="arena-lobby-list-title">ผู้เล่นทั้งหมดใน Arena</h2>
          </div>
          <span>{filteredPlayers.length} จาก {orderedPlayers.length} คน</span>
        </div>

        {presence.isLoading && orderedPlayers.length === 0 ? (
          <div className="arena-lobby-grid" aria-label="กำลังโหลดผู้เล่น">
            {Array.from({ length: 8 }, (_, index) => <span key={index} className="arena-lobby-skeleton" />)}
          </div>
        ) : filteredPlayers.length > 0 ? (
          <motion.div layout className="arena-lobby-grid">
            <AnimatePresence mode="popLayout">
              {filteredPlayers.map((player) => {
                const playerIsOnline = isOnline(player);
                return (
                  <motion.button
                    layout
                    key={player.id}
                    type="button"
                    className={cx("arena-lobby-player-card", playerIsOnline && "arena-lobby-player-card--online")}
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 360, damping: 27, mass: 0.7 }}
                    onClick={() => setSelectedPlayerId(player.id)}
                    aria-label={`เปิด Arena Pass ของ ${player.displayName}`}
                  >
                    <div className="arena-lobby-player-card__topline">
                      <span className={cx("arena-lobby-player-card__status", playerIsOnline && "arena-lobby-player-card__status--online")}>
                        <span className="online-status-dot" /> {playerIsOnline ? "ONLINE" : "RECENTLY ACTIVE"}
                      </span>
                      <span className="arena-lobby-player-card__level">Lv.{player.level}</span>
                    </div>
                    <div className="arena-lobby-player-card__identity">
                      <div className="arena-lobby-player-card__avatar">
                        {player.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={player.avatarUrl}
                            alt=""
                            draggable={false}
                            style={{ objectPosition: `${player.avatarFocusX}% ${player.avatarFocusY}%` }}
                          />
                        ) : <UserRound size={30} />}
                        <span className={cx("arena-lobby-player-card__avatar-dot", playerIsOnline && "arena-lobby-player-card__avatar-dot--online")} />
                      </div>
                      <div>
                        <h3>{player.displayName}</h3>
                        <p>@{player.handle.replace(/^@/, "")}</p>
                      </div>
                    </div>
                    <div className="arena-lobby-player-card__meta">
                      <span>{player.skillRankName}</span>
                      <span>{lastSeenLabel(player, playerIsOnline)}</span>
                    </div>
                    <span className="arena-lobby-player-card__cta">ส่อง Arena Pass <ArrowRight size={14} /></span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="arena-lobby-empty">
            <Users size={34} />
            <h3>ไม่พบผู้เล่นจากตัวกรองนี้</h3>
            <p>ลองเปลี่ยนคำค้นหาหรือกลับไปดูผู้เล่นทั้งหมดใน Arena</p>
            <button type="button" onClick={() => { setQuery(""); setFilter("all"); }}>ล้างตัวกรอง</button>
          </div>
        )}
      </section>

      <section className="arena-lobby-footer-card">
        <div>
          <p className="arena-lobby-eyebrow">ARENA PASS</p>
          <h2>เจอผู้เล่นที่ใช่แล้วหรือยัง?</h2>
          <p>กดที่การ์ดเพื่อดูโปรไฟล์แบบเต็มและส่งคำขอเป็นเพื่อนได้เลย</p>
        </div>
        <Link href="/groups" className="arena-lobby-footer-card__link">ค้นหาก๊วน <ArrowRight size={15} /></Link>
      </section>

      <PlayerInspectModal
        playerId={selectedPlayerId}
        isAuthenticated={isAuthenticated}
        onClose={() => setSelectedPlayerId(null)}
      />
    </main>
  );
}
