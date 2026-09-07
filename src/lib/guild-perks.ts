export type GuildPerk = {
  level: number;
  icon: string;
  title: string;
  description: string;
};

export const GUILD_PERKS: GuildPerk[] = [
  { level: 2, icon: "📌", title: "กระดานข่าวปักหมุด", description: "ปักประกาศสำคัญของ Guild ให้สมาชิกเห็นได้ง่าย" },
  { level: 5, icon: "⚡", title: "โบนัส Guild EXP +5%", description: "สมาชิกได้รับโบนัส EXP เมื่อจบแมตช์ของ Guild พร้อมสล็อตสมาชิกเพิ่มฟรี 4 คน" },
  { level: 10, icon: "🌈", title: "กรอบอวาตาร์ Neon Guild", description: "ปลดล็อกกรอบโปรไฟล์นีออนประจำ Guild และโบนัส EXP +10%" },
  { level: 20, icon: "🏆", title: "Tournament ทางการของ Guild", description: "สร้างทัวร์นาเมนต์ทางการและใช้ป้ายฉายาหน้าชื่อของ Guild" },
];

export function guildPerkState(level: number, expTotal: number) {
  const safeLevel = Math.max(1, Math.min(99, Math.trunc(level)));
  const safeExp = Math.max(0, Number(expTotal) || 0);
  const unlocked = GUILD_PERKS.filter((perk) => perk.level <= safeLevel);
  const next = GUILD_PERKS.find((perk) => perk.level > safeLevel) ?? null;
  const currentLevelProgress = safeLevel >= 99 ? 1 : Math.min(0.999, Math.max(0, (safeExp % 1000) / 1000));
  const currentRank = safeLevel + currentLevelProgress;
  const progress = next
    ? Math.round(Math.min(100, Math.max(0, ((currentRank - safeLevel) / Math.max(1, next.level - safeLevel)) * 100)))
    : 100;

  return { unlocked, next, progress };
}
