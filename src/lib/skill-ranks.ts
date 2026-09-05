export type SkillRankDefinition = {
  tier: number;
  name: string;
  minBp: number;
  color: string;
};

// The database seed is the source of truth in production. This fallback keeps
// the profile readable during a rolling deploy or if an older database has not
// received the rank migration yet.
export const FALLBACK_SKILL_RANKS: SkillRankDefinition[] = [
  { tier: 1, name: "มือใหม่", minBp: 1000, color: "slate" },
  { tier: 2, name: "มือสมัครเล่น", minBp: 1100, color: "green" },
  { tier: 3, name: "มือกลาง", minBp: 1250, color: "blue" },
  { tier: 4, name: "มือกลางค่อนเก่ง", minBp: 1450, color: "indigo" },
  { tier: 5, name: "มือดี", minBp: 1700, color: "purple" },
  { tier: 6, name: "มือสูง", minBp: 2000, color: "pink" },
  { tier: 7, name: "มือแข่งขัน", minBp: 2350, color: "orange" },
  { tier: 8, name: "มือแข่งขันชั้นนำ", minBp: 2750, color: "red" },
  { tier: 9, name: "มืออาชีพ", minBp: 3200, color: "gold" },
  { tier: 10, name: "ตำนานสนาม", minBp: 3800, color: "rainbow" },
];

export function getSkillRank(bp: number, definitions: SkillRankDefinition[] = FALLBACK_SKILL_RANKS) {
  const sorted = [...definitions].sort((left, right) => left.minBp - right.minBp);
  return [...sorted].reverse().find((definition) => bp >= definition.minBp) ?? sorted[0] ?? FALLBACK_SKILL_RANKS[0];
}
