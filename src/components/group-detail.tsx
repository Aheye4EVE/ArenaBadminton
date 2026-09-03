import Link from "next/link";
import { ArrowLeft, BarChart3, CalendarDays, Clock3, Coins, MapPin, ShieldCheck, Swords, Users } from "lucide-react";
import GroupMembershipActions from "@/components/group-membership-actions";

type GroupDetailData = {
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
};

type PublicMember = {
  user_id: string;
  membership_status: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  level: number;
};

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "full",
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
  return `${dateFormatter.format(date)} เวลา ${timeFormatter.format(date)} น.`;
}

function durationLabel(minutes: number) {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} ชั่วโมง`;
}

function levelLabel(group: GroupDetailData) {
  return group.minLevel === group.maxLevel ? `Level ${group.minLevel}` : `Level ${group.minLevel}–${group.maxLevel}`;
}

function playTypeLabel(value: string) {
  return ({ open: "Open", friendly: "Friendly", tournament: "Tournament", training: "Training" } as Record<string, string>)[value] ?? value;
}

function feeLabel(value: string | number) {
  const fee = Number(value);
  return fee > 0 ? `${fee.toLocaleString("th-TH")} บาท` : "เข้าร่วมฟรี";
}

function memberStatusLabel(status: string) {
  return status === "waitlisted" ? "คิวรอ" : status === "registered" ? "ยืนยันที่นั่ง" : status;
}

export default function GroupDetail({ group, members, membershipStatus, currentUserId }: { group: GroupDetailData; members: PublicMember[]; membershipStatus: string | null; currentUserId: string }) {
  const registeredCount = members.filter((member) => member.membership_status === "registered").length;
  const waitlistedMembers = members.filter((member) => member.membership_status === "waitlisted");
  const isOwner = group.ownerId === currentUserId;
  const isFull = group.status === "full" || registeredCount >= group.capacity;

  return (
    <main className="groups-page group-detail-page">
      <div className="groups-shell">
        <header className="groups-topbar">
          <Link href="/groups" className="groups-back"><ArrowLeft size={17} /> ก๊วนทั้งหมด</Link>
          <Link href="/" className="groups-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link>
          <Link href="/profile" className="organizer-user-chip">Profile</Link>
        </header>

        <div className="group-detail-layout">
          <section className="group-detail-main">
            <div className="group-detail-hero"><div className="group-detail-hero__emoji">🏸</div><div><div className="group-detail-tags"><span className={isFull ? "group-status-tag group-status-tag--full" : "group-status-tag"}>{isFull ? "เต็มแล้ว · รับคิว" : "เปิดรับสมาชิก"}</span><span className="group-type-tag">{playTypeLabel(group.playType)}</span></div><h1>{group.title}</h1><p>{group.description ?? "ชวนเพื่อนใหม่มาเจอกันในสนามเดียวกัน"}</p></div></div>

            <div className="group-detail-info-grid"><div><MapPin size={20} /><span><small>สถานที่ / สนาม</small><strong>{group.locationText}</strong></span></div><div><CalendarDays size={20} /><span><small>วันและเวลา</small><strong>{groupDate(group.startsAt)}</strong></span></div><div><Clock3 size={20} /><span><small>ระยะเวลา</small><strong>{durationLabel(group.durationMinutes)}</strong></span></div><div><BarChart3 size={20} /><span><small>ระดับที่รับ</small><strong>{levelLabel(group)}</strong></span></div><div><Coins size={20} /><span><small>ค่าเข้าร่วม</small><strong>{feeLabel(group.entryFee)}</strong></span></div><div><Users size={20} /><span><small>ที่นั่ง</small><strong>{registeredCount}/{group.capacity} คน</strong></span></div></div>

            <section className="group-detail-section"><div className="group-detail-section__heading"><div><p lang="en">Member list</p><h2>สมาชิกก๊วน</h2></div><span>{registeredCount} ที่นั่ง · {waitlistedMembers.length} คิวรอ</span></div><div className="group-member-list">{members.length > 0 ? members.map((member) => <div className="group-member-row" key={`${member.user_id}-${member.membership_status}`}><span className="group-member-avatar">{member.avatar_url ? "👤" : "🧑🏻"}</span><span><strong>{member.display_name}</strong><small>@{member.handle} · Level {member.level}</small></span><em className={member.membership_status === "waitlisted" ? "group-member-row__wait" : ""}>{memberStatusLabel(member.membership_status)}</em></div>) : <div className="group-members-empty">ยังไม่มีข้อมูลสมาชิกเพิ่มเติม</div>}</div></section>

            <div className="group-detail-safety"><ShieldCheck size={19} /><span>ระบบจะยืนยันที่นั่งและคิวรอด้วย transaction เดียว ป้องกันการรับสมาชิกเกินจำนวนที่ผู้จัดกำหนด</span></div>
          </section>

          <aside className="group-detail-sidebar"><section className="group-join-panel"><div className="group-join-panel__count"><span>ที่นั่งที่ยืนยันแล้ว</span><strong>{registeredCount}<small> / {group.capacity}</small></strong><div className="group-capacity__track"><span style={{ width: `${Math.min(100, Math.round((registeredCount / group.capacity) * 100))}%` }} /></div></div><GroupMembershipActions groupId={group.id} groupStatus={group.status} membershipStatus={membershipStatus} isOwner={isOwner} /></section>{isOwner && group.status !== "cancelled" && group.status !== "completed" ? <Link href={`/groups/${group.id}/matches/new`} className="group-primary-action group-match-action"><Swords size={16} /> จัดแมตช์ในก๊วน</Link> : null}<Link href="/matches" className="group-secondary-action group-match-action"><Swords size={15} /> ดูแมตช์ของฉัน</Link><section className="groups-side-card"><h2>สิ่งที่ควรรู้</h2><ul className="groups-rules"><li><span>01</span><p>ผู้จัดเป็นสมาชิกก๊วนโดยอัตโนมัติ</p></li><li><span>02</span><p>สมาชิกออกจากก๊วนเองได้ก่อนกิจกรรม</p></li><li><span>03</span><p>เมื่อเต็มจะรับสมาชิกเข้าคิวรอ</p></li></ul></section><Link href="/groups" className="group-secondary-action group-detail-back"><ArrowLeft size={15} /> ดูก๊วนอื่น</Link></aside>
        </div>
      </div>
    </main>
  );
}
