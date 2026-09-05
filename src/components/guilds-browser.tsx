"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, ChevronDown, Crown, Filter, MapPin, RotateCcw, Search, Shield, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import { joinGuildAction, type GuildActionState } from "@/app/guilds/actions";
import ThaiAreaSelect from "@/components/thai-area-select";

export type GuildSearchFilters = { q: string; province: string; district: string; subdistrict: string };

export type GuildCardData = {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  province: string | null;
  district: string | null;
  level: number;
  expTotal: number;
  maxMembers: number;
  memberCount: number;
  joinPolicy: string;
  ownerName: string;
};

function GuildLogo({ url, name, large = false }: { url: string | null; name: string; large?: boolean }) {
  return <span className={`guild-card__logo ${large ? "guild-card__logo--large" : ""}`}>{url ? <img src={url} alt={`Logo ${name}`} /> : <Shield size={large ? 32 : 25} />}</span>;
}

function joinLabel(policy: string, isFull: boolean) {
  if (isFull) return "สมาชิกเต็มแล้ว";
  return policy === "request" ? "ส่งคำขอ" : policy === "invite_only" ? "เฉพาะคำเชิญ" : "เข้าร่วม Guild";
}

function GuildJoinButton({ guildId, policy, disabled, isFull }: { guildId: string; policy: string; disabled: boolean; isFull: boolean }) {
  const [state, action, isPending] = useActionState<GuildActionState, FormData>(joinGuildAction, {});
  return <div className="guild-card__join"><form action={action}><input type="hidden" name="guildId" value={guildId} /><button type="submit" className="guild-primary-action guild-primary-action--compact" disabled={disabled || isPending || policy === "invite_only" || isFull}>{isPending ? "กำลังเข้าร่วม..." : joinLabel(policy, isFull)}{!isFull ? <ArrowRight size={15} /> : null}</button></form>{state.error ? <small className="guild-form-feedback guild-form-feedback--error" role="alert">{state.error}</small> : null}{state.message ? <small className="guild-form-feedback" role="status">{state.message}</small> : null}</div>;
}

function GuildCard({ guild, currentGuildId }: { guild: GuildCardData; currentGuildId: string | null }) {
  const isMine = currentGuildId === guild.id;
  const isFull = guild.memberCount >= guild.maxMembers;
  const progress = Math.min(100, Math.round((guild.memberCount / guild.maxMembers) * 100));
  return <article className="guild-card"><div className="guild-card__topline"><GuildLogo url={guild.logoUrl} name={guild.name} /><span className="guild-card__level"><Crown size={14} /> Lv.{guild.level}</span></div><Link href={`/guilds/${guild.id}`} className="guild-card__title-link"><h2>{guild.name}</h2><ArrowRight size={17} /></Link><p className="guild-card__description">{guild.description || "Guild สำหรับคนรักแบดที่อยากเติบโตไปด้วยกัน"}</p><div className="guild-card__meta"><span><MapPin size={14} /> {[guild.district, guild.province].filter(Boolean).join(" · ") || "ไม่ระบุพื้นที่"}</span><span><Users size={14} /> {guild.memberCount}/{guild.maxMembers}</span></div><div className="guild-card__progress" aria-label={`สมาชิก ${progress}%`}><span style={{ width: `${progress}%` }} /></div><div className="guild-card__footer"><small>Master · {guild.ownerName}</small>{isMine ? <Link href={`/guilds/${guild.id}`} className="guild-card__mine"><Sparkles size={14} /> Guild ของคุณ</Link> : <GuildJoinButton guildId={guild.id} policy={guild.joinPolicy} disabled={Boolean(currentGuildId)} isFull={isFull} />}</div></article>;
}

export default function GuildsBrowser({ guilds, currentGuildId, canCreate, creationLabel, filters }: { guilds: GuildCardData[]; currentGuildId: string | null; canCreate: boolean; creationLabel: string; filters: GuildSearchFilters }) {
  const filterCount = [filters.q, filters.province, filters.district, filters.subdistrict].filter(Boolean).length;
  return <main className="guilds-page"><div className="guilds-shell"><header className="guilds-topbar"><Link href="/" className="guilds-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link><nav aria-label="เมนู Guild"><Link href="/">หน้าหลัก</Link><Link className="guilds-nav__active" href="/guilds">Guild</Link><Link href="/groups">ก๊วน</Link><Link href="/profile">Profile</Link></nav><Link href={canCreate ? "/guilds/create" : currentGuildId ? `/guilds/${currentGuildId}` : "/guilds"} className="guilds-user-action">{canCreate ? "สร้าง Guild" : "Guild ของฉัน"}<ArrowRight size={15} /></Link></header><section className="guilds-hero"><div><p lang="en">Arena Guilds</p><h1>รวมทีม สร้างตำนานในสนาม</h1><span>Guild คือบ้านของนักแบดที่อยากชวนเพื่อนลงก๊วน เติบโต และสะสม EXP ไปด้วยกัน</span></div><div className="guilds-hero__art" aria-hidden="true">🛡️<i>✦</i>🏸</div></section><form className="guilds-search-form" method="get"><div className="guilds-searchbar"><div className="guilds-searchbar__input"><Search size={17} /><input name="q" defaultValue={filters.q} placeholder="ค้นหาชื่อ Guild หรือคำอธิบาย" aria-label="ค้นหาชื่อ Guild หรือคำอธิบาย" /></div><button type="submit" className="guild-primary-action"><Search size={16} /> ค้นหา Guild</button></div><details className="guilds-advanced-filter" open={Boolean(filters.province || filters.district || filters.subdistrict)}><summary><SlidersHorizontal size={16} /><span>ค้นหาแบบละเอียด</span><span>{filterCount > 0 ? `${filterCount} ตัวกรอง` : "จังหวัด / อำเภอ / ตำบล"}</span><ChevronDown size={16} /></summary><div className="guilds-advanced-filter__body"><ThaiAreaSelect mode="search" initialProvince={filters.province} initialDistrict={filters.district} initialSubdistrict={filters.subdistrict} /><div className="guilds-filter-actions"><Link href="/guilds" className="guild-secondary-action"><RotateCcw size={15} /> ล้างตัวกรอง</Link><button type="submit" className="guild-primary-action"><Filter size={15} /> ใช้ตัวกรอง</button></div></div></details></form><section className="guilds-toolbar"><div><p lang="en">Guild directory</p><h2>ค้นหา Guild ที่ใช่สำหรับคุณ</h2></div><span>{guilds.length} Guild</span></section>{currentGuildId ? <aside className="guilds-member-notice"><Sparkles size={17} /><span>คุณมี Guild ที่ใช้งานอยู่แล้ว ระบบจะให้เข้าร่วมได้ทีละ 1 Guild เพื่อให้สังกัดและ Contribution ชัดเจน</span><Link href={`/guilds/${currentGuildId}`}>เปิด Guild ของฉัน <ArrowRight size={14} /></Link></aside> : <aside className="guilds-member-notice"><Shield size={17} /><span>{creationLabel}</span>{canCreate ? <Link href="/guilds/create">เริ่มสร้าง Guild <ArrowRight size={14} /></Link> : null}</aside>}<section className="guilds-grid">{guilds.length > 0 ? guilds.map((guild) => <GuildCard key={guild.id} guild={guild} currentGuildId={currentGuildId} />) : <div className="guilds-empty"><Shield size={30} /><strong>ยังไม่มี Guild ที่เปิดให้ค้นหา</strong><span>สร้าง Guild แรกของคุณ แล้วชวนเพื่อนมาร่วมทีมได้เลย</span>{canCreate ? <Link href="/guilds/create" className="guild-primary-action">สร้าง Guild แรก <ArrowRight size={16} /></Link> : null}</div>}</section><footer className="guilds-footer"><Link href="/">Arena-Badminton</Link><span>Guild · Member system · RPG progression</span></footer></div></main>;
}
