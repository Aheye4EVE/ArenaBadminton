"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Crown,
  LockKeyhole,
  MapPin,
  Megaphone,
  MessageCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import {
  joinGuildAction,
  leaveGuildAction,
  reviewGuildJoinRequestAction,
} from "@/app/guilds/actions";
import GuildChat, {
  type GuildChatMemberData,
  type GuildChatMessageData,
} from "@/components/guild-chat";
import AccountMenu from "@/components/account-menu";
import GuildQuestPanel, {
  type GuildQuestData,
} from "@/components/guild-quest-panel";
import { guildPerkState, type GuildPerk } from "@/lib/guild-perks";

export type GuildMemberData = {
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  level: number;
  role: string;
  contributionExp: number;
};
export type GuildAnnouncementData = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
};
export type GuildJoinRequestData = {
  id: string;
  userId: string;
  displayName: string;
  handle: string;
  level: number;
  createdAt: string;
};
export type GuildData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  visibility: string;
  joinPolicy: string;
  level: number;
  expTotal: number;
  maxMembers: number;
  ownerName: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "เมื่อสักครู่"
    : new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeZone: "Asia/Bangkok",
      }).format(date);
}
function roleLabel(role: string) {
  return (
    (
      {
        guild_master: "Guild Master",
        officer: "Officer",
        recruiter: "Recruiter",
        member: "Member",
      } as Record<string, string>
    )[role] ?? role
  );
}

function GuildLogo({ guild }: { guild: GuildData }) {
  return (
    <span className="guild-detail__logo">
      {guild.logoUrl ? (
        <img src={guild.logoUrl} alt={`Logo ${guild.name}`} />
      ) : (
        <Shield size={42} />
      )}
    </span>
  );
}

function JoinControl({
  guildId,
  joinPolicy,
  isFull,
}: {
  guildId: string;
  joinPolicy: string;
  isFull: boolean;
}) {
  const [state, action, isPending] = useActionState(joinGuildAction, {});
  if (isFull)
    return (
      <p className="guild-detail__locked">
        <Users size={16} /> Guild นี้มีสมาชิกเต็มแล้ว
      </p>
    );
  if (joinPolicy === "invite_only")
    return (
      <p className="guild-detail__locked">
        <ShieldCheck size={16} /> Guild นี้รับสมาชิกผ่านคำเชิญเท่านั้น
      </p>
    );
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="guildId" value={guildId} />
        <button
          className="guild-primary-action"
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? "กำลังส่งคำขอ..."
            : joinPolicy === "request"
              ? "ส่งคำขอเข้าร่วม"
              : "เข้าร่วม Guild"}
          <ArrowRight size={16} />
        </button>
      </form>
      {state.error ? (
        <p
          className="guild-form-feedback guild-form-feedback--error"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="guild-form-feedback" role="status">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

function LeaveControl({ guildId }: { guildId: string }) {
  const [state, action, isPending] = useActionState(leaveGuildAction, {});
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="guildId" value={guildId} />
        <button
          className="guild-danger-action"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "กำลังออก..." : "ออกจาก Guild"}
          <UserMinus size={15} />
        </button>
      </form>
      {state.error ? (
        <p
          className="guild-form-feedback guild-form-feedback--error"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="guild-form-feedback" role="status">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

function RequestReview({
  request,
  guildId,
}: {
  request: GuildJoinRequestData;
  guildId: string;
}) {
  const [state, action, isPending] = useActionState(
    reviewGuildJoinRequestAction,
    {},
  );
  return (
    <div className="guild-request-row">
      <div>
        <strong>{request.displayName}</strong>
        <small>
          @{request.handle} · Level {request.level} ·{" "}
          {formatDate(request.createdAt)}
        </small>
      </div>
      <div className="guild-request-row__actions">
        <form action={action}>
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="guildId" value={guildId} />
          <input type="hidden" name="decision" value="approve" />
          <button
            type="submit"
            aria-label={`อนุมัติ ${request.displayName}`}
            disabled={isPending}
          >
            <Check size={15} />
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="guildId" value={guildId} />
          <input type="hidden" name="decision" value="reject" />
          <button
            type="submit"
            aria-label={`ปฏิเสธ ${request.displayName}`}
            disabled={isPending}
          >
            <X size={15} />
          </button>
        </form>
      </div>
      {state.error ? (
        <small className="guild-form-feedback guild-form-feedback--error">
          {state.error}
        </small>
      ) : null}
    </div>
  );
}

function PerkCard({ perk, unlocked }: { perk: GuildPerk; unlocked: boolean }) {
  return (
    <article
      className={`guild-perk-card ${unlocked ? "guild-perk-card--active" : "guild-perk-card--locked"}`}
    >
      <span className="guild-perk-card__icon" aria-hidden="true">
        {perk.icon}
      </span>
      <div>
        <strong>{perk.title}</strong>
        <p>{perk.description}</p>
      </div>
      <span className="guild-perk-card__level">Lv.{perk.level}</span>
    </article>
  );
}

function GuildPerks({ level, expTotal }: { level: number; expTotal: number }) {
  const { unlocked, next, progress } = guildPerkState(level, expTotal);
  return (
    <section className="guild-detail-panel guild-perks-panel">
      <div className="guild-detail-panel__heading">
        <div>
          <p lang="en">Guild Perks &amp; Buffs</p>
          <h2>
            <Sparkles size={19} /> สิทธิประโยชน์ของ Guild
          </h2>
        </div>
        <span>
          {unlocked.length}/{4} ปลดล็อกแล้ว
        </span>
      </div>
      <div className="guild-perks-list">
        {unlocked.length > 0 ? (
          unlocked.map((perk) => (
            <PerkCard key={perk.level} perk={perk} unlocked />
          ))
        ) : (
          <div className="guild-perks-empty">
            <Sparkles size={19} /> เริ่มสะสม Guild EXP เพื่อปลดล็อก Perk แรกที่
            Level 2
          </div>
        )}
      </div>
      {next ? (
        <div className="guild-perks-next">
          <div>
            <span>Perk ถัดไป · Level {next.level}</span>
            <strong>
              {next.icon} {next.title}
            </strong>
          </div>
          <b>{progress}%</b>
          <div className="guild-perks-next__track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div className="guild-perks-next guild-perks-next--max">
          <Trophy size={17} /> Guild นี้ปลดล็อก Perk ครบทุกระดับแล้ว
        </div>
      )}
    </section>
  );
}

export default function GuildDetail({
  guild,
  members,
  announcements,
  quests,
  questItems,
  requests,
  membership,
  pendingRequest,
  currentUserId,
  chatConversationId,
  chatMessages = [],
  chatMembers = [],
}: {
  guild: GuildData;
  members: GuildMemberData[];
  announcements: GuildAnnouncementData[];
  quests: GuildQuestData[];
  questItems: Array<{ id: string; name: string; icon: string }>;
  requests: GuildJoinRequestData[];
  membership: { role: string; membershipStatus: string } | null;
  pendingRequest: boolean;
  currentUserId: string;
  chatConversationId?: string | null;
  chatMessages?: GuildChatMessageData[];
  chatMembers?: GuildChatMemberData[];
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "chat">("overview");
  useEffect(() => {
    if (window.location.hash !== "#guild-chat") return;
    const timer = window.setTimeout(() => setActiveTab("chat"), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const isMember = membership?.membershipStatus === "active";
  const isManager =
    isMember && ["guild_master", "officer"].includes(membership.role);
  const memberProgress = Math.min(
    100,
    Math.round((members.length / Math.max(1, guild.maxMembers)) * 100),
  );
  const nextExp = Math.max(1, guild.level * 1000);
  const expProgress =
    guild.level >= 99
      ? 100
      : Math.min(100, Math.round(((guild.expTotal % 1000) / 1000) * 100));
  const isFull = members.length >= guild.maxMembers;
  const areaLabel =
    [guild.district, guild.province].filter(Boolean).join(" · ") ||
    "ทั่วประเทศ";

  return (
    <main className="guild-detail-page">
      <div className="guild-detail-shell">
        <header className="guilds-topbar">
          <Link href="/guilds" className="guilds-back">
            <ArrowLeft size={17} /> Guild Directory
          </Link>
          <Link
            href="/"
            className="guilds-brand"
            aria-label="กลับหน้าหลัก Arena-Badminton"
          >
            <span>Arena</span>
            <em>-Badminton</em>
          </Link>
          <div className="guilds-user-action guilds-user-action--account">
            <AccountMenu />
          </div>
        </header>

        <section className="guild-detail-hero guild-detail-hero--cover">
          <div className="guild-detail-cover">
            {guild.coverUrl ? (
              <img src={guild.coverUrl} alt="" />
            ) : (
              <div className="guild-detail-cover__fallback" />
            )}
            <div className="guild-detail-cover__scrim" />
          </div>
          <div className="guild-detail-hero__content">
            <div className="guild-detail-hero__identity">
              <GuildLogo guild={guild} />
              <div className="guild-detail-hero__copy">
                <div className="guild-detail-tags">
                  <span>
                    <Crown size={14} /> Level {guild.level}
                  </span>
                  <span>
                    {guild.visibility === "private" ? "Private" : "Public"}
                  </span>
                  <span>
                    {guild.joinPolicy === "request"
                      ? "รับคำขอ"
                      : guild.joinPolicy === "invite_only"
                        ? "Invite only"
                        : "Open"}
                  </span>
                </div>
                <h1>{guild.name}</h1>
                <p>
                  {guild.description ||
                    "Guild สำหรับคนรักแบดที่อยากเติบโตไปด้วยกัน"}
                </p>
                <small>Guild Master · {guild.ownerName}</small>
              </div>
            </div>
            <div className="guild-detail-hero__actions">
              {isManager ? (
                <Link
                  href={`/guilds/${guild.id}/manage`}
                  className="guild-secondary-action"
                >
                  <ShieldCheck size={15} /> จัดการ Guild
                </Link>
              ) : null}
              {isMember ? (
                membership.role === "guild_master" ? (
                  <p className="guild-detail__locked">
                    <Crown size={15} /> คุณคือ Guild Master
                  </p>
                ) : (
                  <LeaveControl guildId={guild.id} />
                )
              ) : pendingRequest ? (
                <p className="guild-detail__locked">
                  <CalendarDays size={15} /> รอการอนุมัติ
                </p>
              ) : (
                <JoinControl
                  guildId={guild.id}
                  joinPolicy={guild.joinPolicy}
                  isFull={isFull}
                />
              )}
            </div>
          </div>
        </section>

        <nav className="guild-detail-tabs" aria-label="Guild sections">
          <button
            type="button"
            className={
              activeTab === "overview"
                ? "guild-detail-tab guild-detail-tab--active"
                : "guild-detail-tab"
            }
            onClick={() => setActiveTab("overview")}
          >
            <ShieldCheck size={16} /> ภาพรวม Guild
          </button>
          <button
            type="button"
            className={
              activeTab === "chat"
                ? "guild-detail-tab guild-detail-tab--active"
                : "guild-detail-tab"
            }
            onClick={() => setActiveTab("chat")}
          >
            <MessageCircle size={16} /> ห้องแชท Guild{" "}
            {isMember ? (
              <span className="guild-detail-tab__live">Live</span>
            ) : null}
          </button>
        </nav>

        {activeTab === "chat" ? (
          isMember && chatConversationId ? (
            <GuildChat
              guildId={guild.id}
              conversationId={chatConversationId}
              currentUserId={currentUserId}
              initialMessages={chatMessages}
              members={chatMembers}
            />
          ) : (
            <section className="guild-chat-locked">
              <LockKeyhole size={28} />
              <h2>ห้องแชทสำหรับสมาชิก Guild</h2>
              <p>
                เข้าร่วม Guild ก่อน แล้วคุณจะได้คุยกับสมาชิกที่ active
                อยู่ในห้องเดียวกัน
              </p>
              <button
                type="button"
                className="guild-primary-action"
                onClick={() => setActiveTab("overview")}
              >
                กลับไปดู Guild
              </button>
            </section>
          )
        ) : (
          <>
            <section className="guild-detail-stats">
              <div>
                <Crown size={18} />
                <span>
                  <small>Guild Level</small>
                  <strong>{guild.level}</strong>
                </span>
              </div>
              <div>
                <Sparkles size={18} />
                <span>
                  <small>Guild EXP</small>
                  <strong>{formatNumber(guild.expTotal)}</strong>
                </span>
              </div>
              <div>
                <Users size={18} />
                <span>
                  <small>สมาชิก</small>
                  <strong>
                    {members.length}/{guild.maxMembers}
                  </strong>
                </span>
              </div>
              <div>
                <MapPin size={18} />
                <span>
                  <small>พื้นที่หลัก</small>
                  <strong>{areaLabel}</strong>
                </span>
              </div>
            </section>
            <section className="guild-detail-progress">
              <div>
                <span>Guild EXP ถึง Level {Math.min(99, guild.level + 1)}</span>
                <strong>
                  {expProgress}% · {formatNumber(nextExp)} EXP
                </strong>
              </div>
              <div className="guild-detail-progress__track">
                <span style={{ width: `${expProgress}%` }} />
              </div>
              <div>
                <span>Member capacity</span>
                <strong>{memberProgress}% ใช้งานแล้ว</strong>
              </div>
              <div className="guild-detail-progress__track guild-detail-progress__track--members">
                <span style={{ width: `${memberProgress}%` }} />
              </div>
            </section>
            <GuildPerks level={guild.level} expTotal={guild.expTotal} />
            <GuildQuestPanel
              guildId={guild.id}
              quests={quests}
              items={questItems}
              isManager={isManager}
            />
            <div className="guild-detail-columns">
              <section className="guild-detail-panel">
                <div className="guild-detail-panel__heading">
                  <div>
                    <p lang="en">Guild Bulletin</p>
                    <h2>
                      <Megaphone size={19} /> ประกาศของ Guild
                    </h2>
                  </div>
                  <span>{announcements.length} รายการ</span>
                </div>
                {announcements.length > 0 ? (
                  <div className="guild-announcement-list">
                    {announcements.map((announcement) => (
                      <article
                        key={announcement.id}
                        className="guild-announcement"
                      >
                        <div className="guild-announcement__topline">
                          <strong>{announcement.title}</strong>
                          {announcement.isPinned ? <span>ปักหมุด</span> : null}
                        </div>
                        <p>{announcement.body}</p>
                        <small>{formatDate(announcement.createdAt)}</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="guild-detail-empty">
                    <Megaphone size={25} />
                    <span>ยังไม่มีประกาศจาก Guild</span>
                  </div>
                )}
              </section>
              <section className="guild-detail-panel">
                <div className="guild-detail-panel__heading">
                  <div>
                    <p lang="en">Roster</p>
                    <h2>
                      <Users size={19} /> สมาชิก Guild
                    </h2>
                  </div>
                  <span>{members.length} คน</span>
                </div>
                <div className="guild-member-grid">
                  {members.map((member) => (
                    <div className="guild-member-card" key={member.userId}>
                      <span className="guild-member-card__avatar">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt="" />
                        ) : (
                          <Users size={17} />
                        )}
                      </span>
                      <span>
                        <strong>{member.displayName}</strong>
                        <small>
                          @{member.handle} · Lv.{member.level}
                        </small>
                      </span>
                      <em>
                        {roleLabel(member.role)}
                        <small>
                          {formatNumber(member.contributionExp)} Guild EXP
                        </small>
                      </em>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            {isManager ? (
              <section className="guild-detail-panel guild-requests-panel">
                <div className="guild-detail-panel__heading">
                  <div>
                    <p lang="en">Join requests</p>
                    <h2>
                      <Users size={19} /> คำขอเข้าร่วมที่รออยู่
                    </h2>
                  </div>
                  <span>{requests.length} คำขอ</span>
                </div>
                {requests.length > 0 ? (
                  <div className="guild-request-list">
                    {requests.map((request) => (
                      <RequestReview
                        key={request.id}
                        request={request}
                        guildId={guild.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="guild-detail-empty">
                    <Shield size={25} />
                    <span>ยังไม่มีคำขอใหม่</span>
                  </div>
                )}
              </section>
            ) : null}
          </>
        )}

        <footer className="guilds-footer">
          <Link href="/guilds">
            <ArrowLeft size={14} /> Guild Directory
          </Link>
          <Link
            href={`/moderation/report?targetType=guild&targetId=${guild.id}&returnTo=/guilds/${guild.id}`}
            className="venue-review-report"
          >
            <ShieldAlert size={13} /> รายงาน Guild
          </Link>
          <span>
            Guild EXP จาก Match ที่ยืนยันผลแล้ว · {formatNumber(guild.expTotal)}{" "}
            EXP
          </span>
        </footer>
      </div>
    </main>
  );
}
