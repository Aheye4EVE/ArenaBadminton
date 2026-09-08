"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Crown,
  MessageSquare,
  Sparkles,
  Trophy,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
  Clock,
} from "lucide-react";
import type { PlayerPublicSummary } from "@/lib/player-summary";
import { AvatarPreview } from "@/components/avatar-preview";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function formatNumber(value: number | undefined | null) {
  return new Intl.NumberFormat("th-TH").format(Math.max(0, Number(value) || 0));
}

export function PlayerInspectModal({
  playerId,
  onClose,
  isAuthenticated,
}: {
  playerId: string | null;
  onClose: () => void;
  isAuthenticated?: boolean;
}) {
  const [player, setPlayer] = useState<PlayerPublicSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [friendActionPending, setFriendActionPending] = useState(false);
  const [friendStatus, setFriendStatus] = useState<string>("none");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) {
      return;
    }

    let active = true;
    const request = window.setTimeout(() => {
      setLoading(true);
      setFeedbackMessage(null);

      fetch(`/api/players/${playerId}/summary`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!active) return;
          if (data?.player) {
            setPlayer(data.player);
            setFriendStatus(data.player.friendshipStatus);
          } else {
            setPlayer(null);
          }
        })
        .catch(() => {
          if (active) setPlayer(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(request);
    };
  }, [playerId]);

  const handleAddFriend = async () => {
    if (!isAuthenticated) {
      setFeedbackMessage("กรุณาเข้าสู่ระบบก่อนเพิ่มเพื่อน");
      return;
    }
    if (!player) return;

    setFriendActionPending(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: player.id }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setFriendStatus("pending_sent");
        setFeedbackMessage("ส่งคำขอเป็นเพื่อนเรียบร้อยแล้ว");
      } else {
        setFeedbackMessage(result.error || "ไม่สามารถส่งคำขอได้");
      }
    } catch {
      setFeedbackMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setFriendActionPending(false);
    }
  };

  if (!playerId) return null;

  const bgUrl = player?.profileBackgroundUrl || "/assets/hero-scene.png";

  return (
    <AnimatePresence>
      <div
        className="player-inspect-backdrop"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="account-profile account-profile--arcade player-inspect-card"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-inspect-title"
        >
          {loading ? (
            <div className="player-inspect-loading">
              <Sparkles className="animate-spin text-purple-400" size={28} />
              <p>กำลังเปิด Arena Pass...</p>
            </div>
          ) : player ? (
            <>
              {/* Cover Banner */}
              <div className="account-profile__cover-container">
                <div className="account-profile__mini-cover">
                  <img
                    src={bgUrl}
                    alt=""
                    style={{
                      objectPosition: `${player.backgroundFocusX}% ${player.backgroundFocusY}%`,
                    }}
                  />
                  <div className="account-profile__mini-cover-gradient" />
                </div>

                <div className="account-profile__topline">
                  <div className="account-profile__pass-badge">
                    <Sparkles size={12} />
                    <span>ARENA PASS</span>
                  </div>
                  <button
                    type="button"
                    className="account-card-close account-card-close--cover"
                    onClick={onClose}
                    aria-label="ปิด"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Player Identity */}
              <div className="account-profile__identity-wrap">
                <div className="account-profile__avatar-box">
                  <AvatarPreview
                    avatarUrl={player.avatarUrl}
                    displayName={player.displayName}
                  >
                    <div className="account-avatar account-avatar--large">
                      {player.avatarUrl ? (
                        <img
                          src={player.avatarUrl}
                          alt={player.displayName}
                          draggable={false}
                          style={{
                            objectPosition: `${player.avatarFocusX}% ${player.avatarFocusY}%`,
                          }}
                        />
                      ) : (
                        <span>{player.displayName.charAt(0)}</span>
                      )}
                    </div>
                  </AvatarPreview>
                </div>

                <div className="account-profile__user-info">
                  <div className="account-profile__name-line">
                    <h2 id="player-inspect-title">{player.displayName}</h2>
                    <Crown size={15} className="text-amber-400 fill-amber-400" />
                  </div>
                  <p className="account-profile__handle">
                    @{player.handle.replace(/^@/, "")}
                  </p>
                  <div className="account-profile__badges-row">
                    <span
                      className={`account-profile__rank-pill account-profile__rank-pill--${player.skillRankColor}`}
                    >
                      Tier {player.skillRankTier} · {player.skillRankName}
                    </span>
                    {player.guild ? (
                      <span className="account-profile__guild-pill">
                        🛡️ {player.guild.name} (Lv.{player.guild.level})
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Bio if exists */}
              {player.bio ? (
                <p className="player-inspect-bio">{player.bio}</p>
              ) : null}

              {/* Level & EXP Section */}
              <div className="account-profile__exp-section">
                <div className="account-profile__exp-labels">
                  <span>
                    Lv.{player.level} {player.levelLabel}
                  </span>
                  <strong>
                    {player.nextLevelExp
                      ? `${formatNumber(player.expTotal)} / ${formatNumber(player.nextLevelExp)} EXP`
                      : `${formatNumber(player.expTotal)} EXP (Max)`}
                  </strong>
                </div>
                <div
                  className="account-profile__exp-track"
                  role="progressbar"
                  aria-valuenow={player.levelProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${player.levelProgress}%` }} />
                </div>
              </div>

              {/* Bento Matrix: Stats */}
              <div className="account-profile__bento-matrix">
                <div className="account-profile__bento-box account-profile__bento-box--combat">
                  <div className="account-profile__bento-header">
                    <Trophy size={13} />
                    <span>สถิติการแข่ง</span>
                    <small className="ml-auto text-pink-600 font-bold">
                      {player.stats.winRate.toFixed(0)}% Win
                    </small>
                  </div>
                  <div className="account-profile__bento-body">
                    <div className="account-profile__bento-stat">
                      <small>ชนะ / แพ้</small>
                      <strong>
                        {player.stats.wins}W - {player.stats.losses}L
                      </strong>
                    </div>
                    <div className="account-profile__bento-stat">
                      <small>Skill BP</small>
                      <strong className="text-purple-600">
                        {formatNumber(player.skillBp)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="account-profile__bento-box account-profile__bento-box--activity">
                  <div className="account-profile__bento-header">
                    <Users size={13} />
                    <span>ก๊วน &amp; เพื่อน</span>
                  </div>
                  <div className="account-profile__bento-body">
                    <div className="account-profile__bento-stat">
                      <small>สร้างก๊วน</small>
                      <strong>{formatNumber(player.stats.createdGroups)}</strong>
                    </div>
                    <div className="account-profile__bento-stat">
                      <small>เพื่อนทั้งหมด</small>
                      <strong>{formatNumber(player.friendCount)} คน</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback Alert */}
              {feedbackMessage ? (
                <div
                  className={cx(
                    "player-inspect-alert",
                    feedbackMessage.includes("เรียบร้อย")
                      ? "player-inspect-alert--success"
                      : "player-inspect-alert--warning"
                  )}
                >
                  {feedbackMessage}
                </div>
              ) : null}

              {/* Interaction Buttons Grid */}
              <div className="account-profile__capsules-grid player-inspect-actions">
                {friendStatus === "self" ? (
                  <Link
                    href="/profile"
                    className="account-profile__capsule-btn account-profile__capsule-btn--primary col-span-2"
                    onClick={onClose}
                  >
                    <UserRound size={15} />
                    <span>นี่คือโปรไฟล์ของคุณ</span>
                  </Link>
                ) : friendStatus === "friends" ? (
                  <>
                    <Link
                      href="/messages"
                      className="account-profile__capsule-btn account-profile__capsule-btn--primary"
                      onClick={onClose}
                    >
                      <MessageSquare size={15} />
                      <span>ส่งข้อความ</span>
                    </Link>
                    <span className="account-profile__capsule-btn text-emerald-600 border-emerald-300">
                      <UserCheck size={15} />
                      <span>เป็นเพื่อนแล้ว</span>
                    </span>
                  </>
                ) : friendStatus === "pending_sent" ? (
                  <span className="account-profile__capsule-btn text-purple-600 border-purple-300 col-span-2">
                    <Clock size={15} />
                    <span>ส่งคำขอแล้ว (กำลังรอการตอบรับ)</span>
                  </span>
                ) : friendStatus === "pending_received" ? (
                  <Link
                    href="/friends"
                    className="account-profile__capsule-btn account-profile__capsule-btn--primary col-span-2"
                    onClick={onClose}
                  >
                    <UserPlus size={15} />
                    <span>ตอบรับคำขอเป็นเพื่อนในหน้าเพื่อน</span>
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={friendActionPending}
                      onClick={handleAddFriend}
                      className="account-profile__capsule-btn account-profile__capsule-btn--primary player-inspect-add-btn"
                    >
                      <UserPlus size={15} />
                      <span>
                        {friendActionPending ? "กำลังส่งคำขอ..." : "+ เพิ่มเพื่อน"}
                      </span>
                    </button>
                    <Link
                      href={isAuthenticated ? "/friends" : "/auth/login"}
                      className="account-profile__capsule-btn"
                      onClick={onClose}
                    >
                      <Users size={15} />
                      <span>{isAuthenticated ? "ดูรายชื่อเพื่อน" : "เข้าสู่ระบบ"}</span>
                    </Link>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="player-inspect-error">
              <p>ไม่พบข้อมูลผู้เล่น</p>
              <button
                type="button"
                className="account-profile__capsule-btn mt-4"
                onClick={onClose}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
