"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, CheckCircle2, Clock3, Shield, UserRound } from "lucide-react";
import { acceptGuildInviteAction, type GuildActionState } from "@/app/guilds/actions";

type GuildInviteAcceptProps = {
  token: string;
  guildName: string | null;
  status: string | null;
  expiresAt: string | null;
  authRequired?: boolean;
  loginHref: string;
  profileIncomplete?: boolean;
};

function isExpired(value: string | null) {
  if (!value) return true;
  const timestamp = new Date(value).getTime();
  return !Number.isFinite(timestamp) || timestamp <= Date.now();
}

export default function GuildInviteAccept({ token, guildName, status, expiresAt, authRequired = false, loginHref, profileIncomplete = false }: GuildInviteAcceptProps) {
  const [state, action, isPending] = useActionState<GuildActionState, FormData>(acceptGuildInviteAction, {});
  const invalid = !guildName || status !== "pending" || isExpired(expiresAt);
  const accepted = Boolean(state.guildId);

  return <main className="guild-invite-page"><div className="guild-invite-shell"><Link href="/" className="guilds-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link><section className="guild-invite-card"><div className="guild-invite-card__crest" aria-hidden="true"><Shield size={42} /></div><p lang="en">Guild Invitation</p><h1>{accepted ? "ยินดีต้อนรับเข้าสู่ Guild" : "คุณได้รับคำเชิญเข้า Guild"}</h1>{accepted ? <><strong className="guild-invite-card__guild-name">เข้าร่วม {guildName ?? "Arena Guild"} เรียบร้อยแล้ว</strong><Link href={`/guilds/${state.guildId}`} className="guild-primary-action">เปิดหน้า Guild <ArrowRight size={16} /></Link></> : authRequired ? <><span>เข้าสู่ระบบบัญชี Arena ก่อนรับคำเชิญนี้</span><Link href={loginHref} className="guild-primary-action">เข้าสู่ระบบ <ArrowRight size={16} /></Link></> : profileIncomplete ? <><span>กรอก Profile ให้ครบก่อนเข้าร่วม Guild</span><Link href="/profile/setup" className="guild-primary-action">ตั้งค่า Profile <ArrowRight size={16} /></Link></> : invalid ? <><span>ลิงก์นี้หมดอายุ ถูกใช้ไปแล้ว หรือไม่ใช่คำเชิญของบัญชีนี้</span><Link href="/guilds" className="guild-secondary-action">กลับ Guild Directory</Link></> : <><strong className="guild-invite-card__guild-name">{guildName}</strong><span><Clock3 size={16} /> คำเชิญนี้ใช้ได้ถึง {new Date(expiresAt as string).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" })}</span><form action={action}><input type="hidden" name="inviteToken" value={token} /><button type="submit" className="guild-primary-action" disabled={isPending}>{isPending ? "กำลังเข้าร่วม..." : "รับคำเชิญและเข้าร่วม Guild"}<ArrowRight size={16} /></button></form></>}{state.error ? <p className="guild-form-feedback guild-form-feedback--error" role="alert">{state.error}</p> : null}{state.message && !accepted ? <p className="guild-form-feedback" role="status"><CheckCircle2 size={16} /> {state.message}</p> : null}</section><footer className="guilds-footer"><Link href="/guilds"><UserRound size={14} /> Guild Directory</Link><span>Invitation is protected by account ownership</span></footer></div></main>;
}
