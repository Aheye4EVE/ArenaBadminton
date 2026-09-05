import Link from "next/link";
import { ArrowRight, Award, ChevronDown, ChevronRight, Filter, RotateCcw, TrendingUp, Trophy } from "lucide-react";
import { PreviewHeader } from "@/components/preview-page";
import ThaiAreaSelect from "@/components/thai-area-select";

export type RankingEntry = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  level: number;
  bp: number;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  rank: number;
};

export type RankingFilters = {
  q: string;
  province: string;
  district: string;
  subdistrict: string;
  sort: "bp" | "win_rate" | "matches";
};

function formatNumber(value: number) {
  return value.toLocaleString("th-TH");
}

function RankingAvatar({ entry }: { entry: RankingEntry }) {
  if (entry.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="ranking-avatar ranking-avatar--image" src={entry.avatarUrl} alt={`รูปโปรไฟล์ของ ${entry.name}`} />;
  }
  return <span className="ranking-avatar" aria-hidden="true">🏸</span>;
}

export default function RankingBrowser({ entries, totalPlayers, currentUserId, filters, loadError }: { entries: RankingEntry[]; totalPlayers: number; currentUserId: string | null; filters: RankingFilters; loadError?: string }) {
  const currentEntry = currentUserId ? entries.find((entry) => entry.id === currentUserId) : null;

  return <main className="preview-page ranking-live-page">
    <PreviewHeader kind="ranking" live />
    <div className="preview-content">
      <div className="preview-section-grid">
        <section className="preview-panel preview-panel--wide">
          <div className="ranking-hero"><div className="ranking-hero__medal">🏆</div><div><p>Season 01 · Community Ranking</p><h2>ไต่แรงก์ไปด้วยกัน</h2><span>Skill BP ของคุณเริ่มต้นที่ 1,000 และระบบจะปรับตามผลแข่งที่ยืนยันแล้ว</span></div></div>
          <form className="ranking-filter-form" method="get"><div className="ranking-filter-search"><label><span>ค้นหาผู้เล่น</span><input name="q" defaultValue={filters.q} placeholder="ชื่อ หรือ TAGNAME" /></label><label><span>เรียงตาม</span><div className="ranking-select-wrap"><select name="sort" defaultValue={filters.sort}><option value="bp">BP สูงสุด</option><option value="win_rate">อัตราชนะ</option><option value="matches">จำนวนแมตช์</option></select><ChevronDown size={15} /></div></label></div><ThaiAreaSelect mode="search" initialProvince={filters.province} initialDistrict={filters.district} initialSubdistrict={filters.subdistrict} /><div className="ranking-filter-actions"><Link href="/ranking" className="secondary-action"><RotateCcw size={14} /> ล้าง</Link><button type="submit" className="group-primary-action"><Filter size={14} /> ใช้ตัวกรอง</button></div></form>
          {loadError ? <div className="discovery-error" role="alert"><strong>โหลด Ranking ไม่สำเร็จ</strong><span>{loadError}</span><Link href="/ranking" className="secondary-action">ลองใหม่ <ArrowRight size={14} /></Link></div> : entries.length > 0 ? <div className="ranking-table" aria-label="ตารางจัดอันดับผู้เล่น"><div className="ranking-table__legend"><span>Player</span><span>Record</span><span>BP</span></div>{entries.map((entry) => <div key={entry.id} className={`ranking-row ${entry.id === currentUserId ? "ranking-row--you" : ""}`}><strong className="ranking-row__rank">{entry.rank}</strong><RankingAvatar entry={entry} /><span className="ranking-row__name"><b>{entry.name}</b><small>@{entry.handle.replace(/^@/, "")} · Lv.{entry.level}</small><small>{[entry.subdistrict, entry.district, entry.province].filter(Boolean).join(" · ") || "ไม่ระบุพื้นที่"}</small></span><span className="ranking-row__record"><b>{entry.winRate.toFixed(1)}%</b><small>{entry.wins}W · {entry.losses}L · {entry.matchesPlayed} แมตช์</small></span><span className="ranking-trend"><TrendingUp size={14} /></span><strong className="ranking-row__bp">{formatNumber(entry.bp)} BP</strong><ChevronRight size={15} /></div>)}</div> : <div className="ranking-live-empty"><Trophy size={28} /><strong>ยังไม่มีข้อมูล Ranking ตามตัวกรองนี้</strong><span>ลองเปลี่ยนพื้นที่หรือเรียงลำดับใหม่</span></div>}
        </section>
        <aside className="preview-panel preview-panel--soft">
          <div className="your-rank"><p>อันดับของคุณ</p><strong>{currentEntry ? `#${formatNumber(currentEntry.rank)}` : "—"}</strong><span>จากผู้เล่น {formatNumber(totalPlayers)} คน</span><div className="bp-progress"><span style={{ width: currentEntry ? `${Math.min(100, Math.max(4, 100 - (currentEntry.rank / Math.max(1, totalPlayers)) * 100))}%` : "0%" }} /></div><small>{currentEntry ? `${formatNumber(currentEntry.bp)} BP · อันดับจากข้อมูลล่าสุด` : "เข้าสู่ระบบและทำโปรไฟล์ให้ครบเพื่อดูอันดับของคุณ"}</small></div>
          <Link href="/profile" className="secondary-action">ดูสถิติของฉัน <ArrowRight size={15} /></Link>
          <div className="ranking-live-rule"><Award size={18} /><div><strong>กติกา Ranking</strong><span>ระบบเรียง BP ก่อน แล้วใช้จำนวนแมตช์และอัตราชนะเป็นตัวตัดสินกรณีคะแนนใกล้กัน</span></div></div>
        </aside>
      </div>
    </div>
    <footer className="preview-footer"><Link href="/">Arena-Badminton</Link><span>Live Ranking · Supabase public profile view</span></footer>
  </main>;
}
