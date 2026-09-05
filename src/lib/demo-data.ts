export type Group = {
  id: string;
  title: string;
  location: string;
  dateLabel: string;
  timeLabel: string;
  level: "มือใหม่" | "มือกลาง" | "มือสูง";
  members: number;
  capacity: number;
  status: "กำลังรับสมัคร" | "ใกล้เต็ม" | "เต็มแล้ว";
  accent: "pink" | "blue" | "mint";
  avatars: string[];
  detailHref?: string;
  organizerGroupCount?: number;
  distanceKm?: number;
};

export type Event = {
  id: string;
  title: string;
  category: string;
  eventType: "tournament" | "friendly" | "training" | "challenge";
  format: "singles" | "doubles" | "team";
  dateLabel: string;
  startsAt: string;
  venue: string;
  province: string;
  district: string;
  subdistrict: string;
  capacity: number;
  registered: number;
  image: string;
  color: "peach" | "lavender" | "mint";
};

export type Court = {
  id: string;
  name: string;
  district: string;
  province: string;
  subdistrict: string;
  address: string;
  courtCount: number;
  availability: "available" | "waitlist";
  distance: string;
  distanceKm: number;
  rating: string;
  image: string;
  imageUrl?: string | null;
  latitude: number;
  longitude: number;
};

export type RankingEntry = {
  rank: number;
  name: string;
  handle: string;
  level: number;
  bp: number;
  avatar: string;
  trend: "up" | "same" | "down";
};

export const groups: Group[] = [
  {
    id: "smash-hard-club",
    title: "Smash Hard Club",
    location: "นนทบุรี",
    dateLabel: "เสาร์ 18 พ.ค.",
    timeLabel: "18:00–21:00",
    level: "มือกลาง",
    members: 18,
    capacity: 25,
    status: "กำลังรับสมัคร",
    accent: "blue",
    avatars: ["🧑🏻‍🦱", "👩🏻", "🧑🏽", "👩🏼‍🦰"],
  },
  {
    id: "bad-friends-forever",
    title: "Bad Friends Forever",
    location: "กรุงเทพมหานคร",
    dateLabel: "อาทิตย์ 19 พ.ค.",
    timeLabel: "10:00–13:00",
    level: "มือใหม่",
    members: 20,
    capacity: 30,
    status: "กำลังรับสมัคร",
    accent: "mint",
    avatars: ["👩🏽", "🧑🏻", "👩🏻‍🦱", "🧑🏽‍🦰"],
  },
  {
    id: "ตีแบดหลังเลิกงาน",
    title: "ตีแบดหลังเลิกงาน",
    location: "ลาดพร้าว",
    dateLabel: "พุธ 22 พ.ค.",
    timeLabel: "19:30–22:30",
    level: "มือกลาง",
    members: 24,
    capacity: 30,
    status: "ใกล้เต็ม",
    accent: "pink",
    avatars: ["🧑🏼", "👩🏽‍🦱", "🧑🏻‍🦰", "👩🏻"],
  },
];

export const events: Event[] = [
  {
    id: "arena-cup-2024",
    title: "Arena Cup 2026",
    category: "ประเภท: ชายเดี่ยว, หญิงเดี่ยว",
    eventType: "tournament",
    format: "singles",
    dateLabel: "25 ก.ย. 69",
    startsAt: "2026-09-25T09:00:00+07:00",
    venue: "Impact Arena",
    province: "นนทบุรี",
    district: "ปากเกร็ด",
    subdistrict: "บ้านใหม่",
    capacity: 64,
    registered: 42,
    image: "🏆",
    color: "peach",
  },
  {
    id: "friendly-match-day",
    title: "Friendly Match Day",
    category: "ประเภท: ชายเดี่ยว, หญิงเดี่ยว",
    eventType: "friendly",
    format: "doubles",
    dateLabel: "15 ต.ค. 69",
    startsAt: "2026-10-15T13:00:00+07:00",
    venue: "Badminton Club 88",
    province: "กรุงเทพมหานคร",
    district: "เขตลาดพร้าว",
    subdistrict: "ลาดพร้าว",
    capacity: 32,
    registered: 18,
    image: "🏸",
    color: "lavender",
  },
  {
    id: "arena-league-3",
    title: "Arena League #3",
    category: "ประเภท: ทีม 3 คน",
    eventType: "tournament",
    format: "team",
    dateLabel: "8 พ.ย. 69",
    startsAt: "2026-11-08T10:00:00+07:00",
    venue: "Thanayapura Sport",
    province: "ภูเก็ต",
    district: "ถลาง",
    subdistrict: "ศรีสุนทร",
    capacity: 12,
    registered: 7,
    image: "🥇",
    color: "mint",
  },
];

export const courts: Court[] = [
  {
    id: "hub-badminton",
    name: "The Hub Badminton",
    district: "นนทบุรี",
    province: "นนทบุรี",
    subdistrict: "บางกระสอ",
    address: "ถนนติวานนท์ · เมืองนนทบุรี",
    courtCount: 12,
    availability: "available",
    distance: "5.1 km",
    distanceKm: 5.1,
    rating: "4.6",
    image: "🏟️",
    latitude: 13.8627,
    longitude: 100.5145,
  },
  {
    id: "88-badminton",
    name: "88 Badminton Court",
    district: "เขตลาดพร้าว",
    province: "กรุงเทพมหานคร",
    subdistrict: "ลาดพร้าว",
    address: "ถนนลาดพร้าว · เขตลาดพร้าว",
    courtCount: 8,
    availability: "available",
    distance: "2.5 km",
    distanceKm: 2.5,
    rating: "4.8",
    image: "🏸",
    latitude: 13.8054,
    longitude: 100.607,
  },
  {
    id: "smash-arena",
    name: "Smash Arena",
    district: "ปทุมธานี",
    province: "ปทุมธานี",
    subdistrict: "คลองหนึ่ง",
    address: "ถนนพหลโยธิน · คลองหลวง",
    courtCount: 10,
    availability: "available",
    distance: "7.3 km",
    distanceKm: 7.3,
    rating: "4.7",
    image: "✨",
    latitude: 13.9602,
    longitude: 100.5863,
  },
];

export const ranking: RankingEntry[] = [
  { rank: 1, name: "ต้นตบโหด", handle: "@tonsmash", level: 48, bp: 1480, avatar: "🧑🏻‍🦱", trend: "up" },
  { rank: 2, name: "May Rally", handle: "@mayrally", level: 42, bp: 1398, avatar: "👩🏻", trend: "same" },
  { rank: 3, name: "ลูกขนไก่สีรุ้ง", handle: "@rainbowbird", level: 39, bp: 1320, avatar: "👩🏽‍🦱", trend: "up" },
  { rank: 4, name: "BadBuddy", handle: "@badbuddy", level: 27, bp: 1246, avatar: "🧑🏻", trend: "up" },
  { rank: 5, name: "Net Ninja", handle: "@netninja", level: 31, bp: 1195, avatar: "🧑🏽", trend: "down" },
];

export type PartnerBrand = {
  name: string;
  slug: string;
  logo: string;
  alt: string;
};

export const brands: PartnerBrand[] = [
  { name: "YONEX", slug: "yonex", logo: "/assets/brands/yonex.svg", alt: "YONEX" },
  { name: "VICTOR", slug: "victor", logo: "/assets/brands/victor.svg", alt: "VICTOR" },
  { name: "LI-NING", slug: "li-ning", logo: "/assets/brands/li-ning.svg", alt: "LI-NING" },
  { name: "FZ FORZA", slug: "fz-forza", logo: "/assets/brands/fz-forza.png", alt: "FZ FORZA" },
  { name: "ALPSPORT", slug: "alp-sport", logo: "/assets/brands/alp-sport.jpg", alt: "ALPSPORT" },
  { name: "VSE", slug: "vse", logo: "/assets/brands/vse.png", alt: "VSE" },
];

export const shopItems = [
  { id: "exp-booster", name: "EXP Booster +10%", description: "เพิ่ม EXP จากการแข่งขันที่ยืนยันแล้ว", price: 49, icon: "⚡", tone: "pink" },
  { id: "rainbow-title", name: "Rainbow Rally Badge", description: "Badge สำหรับแสดงบน Profile", price: 99, icon: "🌈", tone: "purple" },
  { id: "shuttle-buddy", name: "Shuttle Buddy", description: "ของสะสมสำหรับหน้า Trophy", price: 79, icon: "🏸", tone: "blue" },
];

export const navItems = [
  { label: "หน้าหลัก", href: "/", icon: "home" },
  { label: "Guild", href: "/guilds", icon: "shield" },
  { label: "ค้นหาก๊วน", href: "/groups", icon: "search" },
  { label: "สนามแบด", href: "/venues", icon: "map" },
  { label: "กิจกรรม", href: "/events", icon: "calendar" },
  { label: "ร้านค้า", href: "/shop", icon: "shopping-cart" },
  { label: "ตลาดมือสอง", href: "/marketplace", icon: "store" },
  { label: "Ranking", href: "/ranking", icon: "trophy" },
  { label: "บอร์ดพูดคุย", href: "/community", icon: "message" },
  { label: "เพื่อน", href: "/friends", icon: "users" },
];
