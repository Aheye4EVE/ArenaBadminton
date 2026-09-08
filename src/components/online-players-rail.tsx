"use client";

import { motion } from "motion/react";
import { Sparkles, Users, Wifi, ChevronRight } from "lucide-react";
import type { OnlinePlayerItem } from "@/lib/player-summary";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function formatTimeAgo(secondsAgo: number, isLiveOnline: boolean): { text: string; isOnline: boolean } {
  if (isLiveOnline || secondsAgo < 60) {
    return { text: "ออนไลน์อยู่", isOnline: true };
  }
  if (secondsAgo < 120) {
    return { text: "1 นาทีที่แล้ว", isOnline: false };
  }
  if (secondsAgo < 3600) {
    return { text: `${Math.floor(secondsAgo / 60)} นาทีที่แล้ว`, isOnline: false };
  }
  if (secondsAgo < 86400) {
    return { text: `${Math.floor(secondsAgo / 3600)} ชม. ที่แล้ว`, isOnline: false };
  }
  return { text: "วันนี้", isOnline: false };
}

export function OnlinePlayersRail({
  players,
  liveOnlineIds,
  isLoading,
  onSelectPlayer,
  variant = "sidebar",
}: {
  players: OnlinePlayerItem[];
  liveOnlineIds: Set<string>;
  isLoading: boolean;
  onSelectPlayer: (playerId: string) => void;
  variant?: "sidebar" | "horizontal";
}) {
  const onlineCount = players.filter(
    (p) => liveOnlineIds.has(p.id) || p.secondsAgo < 60
  ).length;

  if (variant === "horizontal") {
    return (
      <section className="online-rail-mobile" aria-label="ผู้เล่นที่กำลังออนไลน์">
        <div className="online-rail-mobile__header">
          <div className="online-rail-mobile__title">
            <span className="online-rail-mobile__badge">
              <Sparkles size={11} /> LOBBY
            </span>
            <h3>ผู้เล่นออนไลน์</h3>
          </div>
          <span className="online-rail-mobile__count">
            <span className="online-status-dot online-status-dot--live" />
            {onlineCount > 0 ? `${onlineCount} คนออนไลน์` : `${players.length} ผู้เล่น`}
          </span>
        </div>

        <div className="online-rail-mobile__track">
          {isLoading ? (
            <div className="online-rail-mobile__loading">
              <span className="online-rail-skeleton-card" />
              <span className="online-rail-skeleton-card" />
              <span className="online-rail-skeleton-card" />
            </div>
          ) : players.length === 0 ? (
            <div className="online-rail-empty">
              <p>ยังไม่มีผู้เล่นในล็อบบี้ขณะนี้</p>
            </div>
          ) : (
            players.map((player) => {
              const isLive = liveOnlineIds.has(player.id) || player.secondsAgo < 60;
              const { text: timeText, isOnline } = formatTimeAgo(player.secondsAgo, isLive);

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onSelectPlayer(player.id)}
                  className="online-chip-mobile"
                  title={`คลิกเพื่อดู Arena Pass ของ ${player.displayName}`}
                >
                  <div className="online-chip-mobile__avatar-wrap">
                    <div className="online-chip-mobile__avatar">
                      {player.avatarUrl ? (
                        <img
                          src={player.avatarUrl}
                          alt={player.displayName}
                          style={{
                            objectPosition: `${player.avatarFocusX}% ${player.avatarFocusY}%`,
                          }}
                        />
                      ) : (
                        <span>{player.displayName.charAt(0)}</span>
                      )}
                    </div>
                    <span
                      className={cx(
                        "online-chip-mobile__dot",
                        isOnline && "online-chip-mobile__dot--online"
                      )}
                    />
                    <span className="online-chip-mobile__level">
                      Lv.{player.level}
                    </span>
                  </div>

                  <span className="online-chip-mobile__name">
                    {player.displayName}
                  </span>
                  <span
                    className={cx(
                      "online-chip-mobile__status",
                      isOnline && "online-chip-mobile__status--live"
                    )}
                  >
                    {timeText}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>
    );
  }

  // Desktop Sidebar Variant
  return (
    <aside className="online-players-sidebar" aria-label="Arena Lobby ผู้เล่นออนไลน์">
      <div className="online-players-sidebar__header">
        <div className="online-players-sidebar__tag">
          <Sparkles size={13} className="text-pink-400" />
          <span>ARENA LOBBY</span>
        </div>
        <div className="online-players-sidebar__live-badge">
          <span className="online-status-dot online-status-dot--live" />
          <span>{onlineCount > 0 ? `${onlineCount} คนออนไลน์` : `${players.length} ล่าสุด`}</span>
        </div>
      </div>

      <div className="online-players-sidebar__subhead">
        <p>คลิกที่การ์ดเพื่อส่อง <strong>Arena Pass</strong> และเพิ่มเพื่อน</p>
      </div>

      <div className="online-players-sidebar__list">
        {isLoading ? (
          <div className="online-players-sidebar__loading">
            <span className="online-sidebar-skeleton" />
            <span className="online-sidebar-skeleton" />
            <span className="online-sidebar-skeleton" />
          </div>
        ) : players.length === 0 ? (
          <div className="online-sidebar-empty">
            <Users size={22} className="text-purple-400 opacity-60" />
            <p>ยังไม่มีประวัติผู้เล่นออนไลน์ในล็อบบี้</p>
          </div>
        ) : (
          players.map((player) => {
            const isLive = liveOnlineIds.has(player.id) || player.secondsAgo < 60;
            const { text: timeText, isOnline } = formatTimeAgo(player.secondsAgo, isLive);

            return (
              <motion.button
                key={player.id}
                type="button"
                whileHover={{ x: 4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectPlayer(player.id)}
                className={cx(
                  "online-player-card",
                  isOnline && "online-player-card--active"
                )}
                title={`คลิกเพื่อดู Arena Pass ของ ${player.displayName}`}
              >
                <div className="online-player-card__avatar-wrap">
                  <div className="online-player-card__avatar">
                    {player.avatarUrl ? (
                      <img
                        src={player.avatarUrl}
                        alt={player.displayName}
                        style={{
                          objectPosition: `${player.avatarFocusX}% ${player.avatarFocusY}%`,
                        }}
                      />
                    ) : (
                      <span>{player.displayName.charAt(0)}</span>
                    )}
                  </div>
                  <span
                    className={cx(
                      "online-player-card__dot",
                      isOnline && "online-player-card__dot--online"
                    )}
                  />
                </div>

                <div className="online-player-card__info">
                  <div className="online-player-card__name-row">
                    <strong className="online-player-card__name">
                      {player.displayName}
                    </strong>
                    <span className="online-player-card__level">
                      Lv.{player.level}
                    </span>
                  </div>
                  <div className="online-player-card__details">
                    <span
                      className={cx(
                        "online-player-card__time",
                        isOnline && "online-player-card__time--online"
                      )}
                    >
                      {timeText}
                    </span>
                    <span className="online-player-card__rank">
                      {player.skillRankName}
                    </span>
                  </div>
                </div>

                <div className="online-player-card__action">
                  <span className="online-player-card__inspect-pill">
                    ส่อง Pass
                    <ChevronRight size={12} />
                  </span>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </aside>
  );
}
