import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GroupsBrowser, { type GroupListItem, type GroupSearchFilters } from "@/components/groups-browser";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "ค้นหาก๊วน | Arena-Badminton" };
export const dynamic = "force-dynamic";

type GroupRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  location_text: string;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  min_level: number;
  max_level: number;
  play_type: string;
  entry_fee: string | number;
  status: string;
  created_at: string;
};

type MembershipRow = {
  group_id: string;
  user_id: string;
  membership_status: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

const playTypes = ["all", "open", "friendly", "training", "tournament"] as const;
const skillFilters = ["all", "beginner", "intermediate", "advanced"] as const;
const dateFilters = ["all", "today", "tomorrow", "weekend", "next7"] as const;
const availabilityFilters = ["all", "available"] as const;
const feeFilters = ["all", "free", "paid"] as const;
const sortFilters = ["soonest", "newest"] as const;

function firstParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function cleanSearchValue(value: string, maxLength = 80) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function allowedValue<T extends readonly string[]>(value: string, allowed: T, fallback: T[number]): T[number] {
  return (allowed as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

function parseFilters(params: SearchParams): GroupSearchFilters {
  return {
    q: cleanSearchValue(firstParam(params, "q")),
    province: cleanSearchValue(firstParam(params, "province")),
    district: cleanSearchValue(firstParam(params, "district")),
    subdistrict: cleanSearchValue(firstParam(params, "subdistrict")),
    playType: allowedValue(firstParam(params, "playType"), playTypes, "all"),
    skill: allowedValue(firstParam(params, "skill"), skillFilters, "all"),
    date: allowedValue(firstParam(params, "date"), dateFilters, "all"),
    availability: allowedValue(firstParam(params, "availability"), availabilityFilters, "all"),
    fee: allowedValue(firstParam(params, "fee"), feeFilters, "all"),
    sort: allowedValue(firstParam(params, "sort"), sortFilters, "soonest"),
  };
}

function safeSearchTerm(value: string) {
  return value.replace(/[\u0000-\u001F\u007F\\*%,().'"=_:<>|&?]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function searchTerms(value: string) {
  return safeSearchTerm(value).split(/\s+/).filter(Boolean).slice(0, 6);
}

function bangkokDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

function bangkokDayStart(offset: number) {
  const date = new Date(`${bangkokDateKey()}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString();
}

function dateWindow(filter: GroupSearchFilters["date"]) {
  if (filter === "all") return null;
  if (filter === "today") return { from: bangkokDayStart(0), to: bangkokDayStart(1) };
  if (filter === "tomorrow") return { from: bangkokDayStart(1), to: bangkokDayStart(2) };
  if (filter === "next7") return { from: bangkokDayStart(0), to: bangkokDayStart(7) };

  const weekday = new Date(`${bangkokDateKey()}T12:00:00+07:00`).getUTCDay();
  if (weekday === 6) return { from: bangkokDayStart(0), to: bangkokDayStart(2) };
  if (weekday === 0) return { from: bangkokDayStart(0), to: bangkokDayStart(1) };
  const saturdayOffset = 6 - weekday;
  return { from: bangkokDayStart(saturdayOffset), to: bangkokDayStart(saturdayOffset + 2) };
}

function skillWindow(filter: GroupSearchFilters["skill"]) {
  if (filter === "all") return null;
  return ({
    beginner: { min: 1, max: 20 },
    intermediate: { min: 21, max: 50 },
    advanced: { min: 51, max: 99 },
  } as const)[filter];
}

export default async function GroupsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const filters = parseFilters(await searchParams);
  let groupsQuery = supabase
    .from("groups")
    .select(
      "id, owner_id, title, description, location_text, starts_at, duration_minutes, capacity, min_level, max_level, play_type, entry_fee, status, created_at",
      { count: "exact" },
    )
    .in("status", filters.availability === "available" ? ["published"] : ["published", "full"]);

  const searchConditions = searchTerms(filters.q)
    .flatMap((searchTerm) => [
      `title.ilike.*${searchTerm}*`,
      `location_text.ilike.*${searchTerm}*`,
      `description.ilike.*${searchTerm}*`,
    ])
    .join(",");
  if (searchConditions) groupsQuery = groupsQuery.or(searchConditions);

  for (const area of [filters.province, filters.district, filters.subdistrict]) {
    const areaTerms = searchTerms(area);
    if (areaTerms.length === 1) groupsQuery = groupsQuery.ilike("location_text", `%${areaTerms[0]}%`);
    if (areaTerms.length > 1) groupsQuery = groupsQuery.ilikeAllOf("location_text", areaTerms.map((term) => `%${term}%`));
  }

  if (filters.playType !== "all") groupsQuery = groupsQuery.eq("play_type", filters.playType);
  if (filters.fee === "free") groupsQuery = groupsQuery.eq("entry_fee", 0);
  if (filters.fee === "paid") groupsQuery = groupsQuery.gt("entry_fee", 0);

  const skill = skillWindow(filters.skill);
  if (skill) {
    groupsQuery = groupsQuery.lte("min_level", skill.max).gte("max_level", skill.min);
  }

  const dates = dateWindow(filters.date);
  if (dates) groupsQuery = groupsQuery.gte("starts_at", dates.from).lt("starts_at", dates.to);

  groupsQuery = groupsQuery.order(filters.sort === "newest" ? "created_at" : "starts_at", { ascending: filters.sort !== "newest" });
  const { data, error, count } = await groupsQuery.limit(100);

  const rows = (data ?? []) as GroupRow[];
  const groupIds = rows.map((row) => row.id);

  let memberships: MembershipRow[] = [];
  if (groupIds.length > 0) {
    const membershipResult = await supabase
      .from("group_members")
      .select("group_id, user_id, membership_status")
      .in("group_id", groupIds);
    memberships = (membershipResult.data ?? []) as MembershipRow[];
  }

  const groups: GroupListItem[] = rows.map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    locationText: row.location_text,
    startsAt: row.starts_at,
    durationMinutes: Number(row.duration_minutes),
    capacity: Number(row.capacity),
    minLevel: Number(row.min_level),
    maxLevel: Number(row.max_level),
    playType: row.play_type,
    entryFee: row.entry_fee,
    status: row.status,
    registeredCount: memberships.filter((member) => member.group_id === row.id && member.membership_status === "registered").length,
    membershipStatus: memberships.find((member) => member.group_id === row.id && member.user_id === user.id)?.membership_status ?? null,
  }));

  return (
    <GroupsBrowser
      groups={groups}
      filters={filters}
      totalCount={count ?? groups.length}
      currentUserId={user.id}
      loadError={error ? "โหลดรายการก๊วนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : undefined}
    />
  );
}
