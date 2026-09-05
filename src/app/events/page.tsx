import type { Metadata } from "next";
import EventSearchBrowser, { type EventSearchFilters } from "@/components/event-search-browser";
import { events, type Event } from "@/lib/demo-data";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { shouldShowQaData } from "@/lib/config";
import { matchesLocationFilters, matchesSearchTerms, searchTerms } from "@/lib/search-utils";

export const metadata: Metadata = { title: "กิจกรรม | Arena-Badminton" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const dateFilters = ["all", "upcoming", "thisMonth", "weekend"] as const;
const eventTypeFilters = ["all", "tournament", "friendly", "training", "challenge"] as const;
const formatFilters = ["all", "singles", "doubles", "team"] as const;
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

function parseFilters(params: SearchParams): EventSearchFilters {
  return {
    q: cleanSearchValue(firstParam(params, "q")),
    province: cleanSearchValue(firstParam(params, "province")),
    district: cleanSearchValue(firstParam(params, "district")),
    subdistrict: cleanSearchValue(firstParam(params, "subdistrict")),
    date: allowedValue(firstParam(params, "date"), dateFilters, "all"),
    eventType: allowedValue(firstParam(params, "eventType"), eventTypeFilters, "all"),
    format: allowedValue(firstParam(params, "format"), formatFilters, "all"),
    sort: allowedValue(firstParam(params, "sort"), sortFilters, "soonest"),
  };
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

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function matchesDate(eventDate: string, filter: EventSearchFilters["date"]) {
  if (filter === "all") return true;
  const today = bangkokDateKey();
  const eventKey = eventDate.slice(0, 10);
  if (filter === "upcoming") return eventKey >= today;
  if (filter === "thisMonth") return eventKey.slice(0, 7) === today.slice(0, 7);
  const todayDate = new Date(`${today}T00:00:00Z`);
  const daysUntilSaturday = (6 - todayDate.getUTCDay() + 7) % 7;
  const weekendStart = addDays(today, daysUntilSaturday);
  return eventKey >= weekendStart && eventKey < addDays(weekendStart, 2);
}

function liveDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "วันเวลาไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", year: "2-digit" }).format(date);
}

type LiveVenueRow = {
  id: string;
  name: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
};

function mapLiveTournaments(
  rows: Array<Record<string, unknown>>,
  entryCounts: Map<string, number>,
  venueMap: Map<string, LiveVenueRow>,
): Event[] {
  return rows.map((row, index) => {
    const id = typeof row.id === "string" ? row.id : `live-${index}`;
    const format = row.format === "doubles" || row.format === "team" ? row.format : "singles";
    const maxEntries = Number(row.max_entries);
    const venue = typeof row.venue_id === "string" ? venueMap.get(row.venue_id) : undefined;
    return {
      id: `tournament-${id}`,
      title: typeof row.title === "string" ? row.title : "Arena Tournament",
      category: typeof row.description === "string" && row.description.trim() ? row.description : "การแข่งขันจาก Community Arena",
      eventType: "tournament",
      format,
      dateLabel: liveDateLabel(typeof row.starts_at === "string" ? row.starts_at : ""),
      startsAt: typeof row.starts_at === "string" ? row.starts_at : new Date().toISOString(),
      venue: venue?.name ?? "สนามที่ผู้จัดกำหนด",
      province: venue?.province ?? "",
      district: venue?.district ?? "",
      subdistrict: venue?.subdistrict ?? "",
      capacity: Number.isFinite(maxEntries) && maxEntries > 0 ? maxEntries : 8,
      registered: entryCounts.get(id) ?? 0,
      image: "🏆",
      color: (["peach", "lavender", "mint"] as const)[index % 3],
    };
  });
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const { supabase, user } = await getAuthenticatedProfile();
  let eventSource = events;

  if (supabase && user) {
    let tournamentQuery = supabase
      .from("tournaments")
      .select("id, title, description, starts_at, format, max_entries, venue_id")
      .eq("status", "published")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(50);
    if (!shouldShowQaData()) tournamentQuery = tournamentQuery.not("title", "like", "[QA ONLY]%");
    const { data: tournamentRows, error: tournamentError } = await tournamentQuery;
    if (tournamentError) {
      eventSource = [];
    }
    const rows = (tournamentRows ?? []) as Array<Record<string, unknown>>;
    const tournamentIds = rows.map((row) => typeof row.id === "string" ? row.id : "").filter(Boolean);
    const venueIds = [...new Set(rows.map((row) => typeof row.venue_id === "string" ? row.venue_id : "").filter(Boolean))];
    const { data: venueRows } = venueIds.length > 0
      ? await supabase.from("venues").select("id, name, province, district, subdistrict").in("id", venueIds)
      : { data: [] };
    const venueMap = new Map<string, LiveVenueRow>(
      ((venueRows ?? []) as LiveVenueRow[]).map((venue) => [venue.id, venue]),
    );
    const { data: entryRows } = tournamentIds.length > 0
      ? await supabase.from("tournament_entries").select("tournament_id").in("tournament_id", tournamentIds).in("entry_status", ["registered", "winner"])
      : { data: [] };
    const entryCounts = new Map<string, number>();
    for (const row of (entryRows ?? []) as Array<Record<string, unknown>>) {
      const id = typeof row.tournament_id === "string" ? row.tournament_id : "";
      if (id) entryCounts.set(id, (entryCounts.get(id) ?? 0) + 1);
    }
    if (!tournamentError) eventSource = mapLiveTournaments(rows, entryCounts, venueMap);
  }

  const terms = searchTerms(filters.q);
  const filteredEvents = eventSource
    .filter((event) => {
      const matchesQuery = matchesSearchTerms([event.title, event.category, event.venue, event.province, event.district, event.subdistrict], terms);
      const matchesLocation = matchesLocationFilters(filters, {
        province: event.province,
        district: event.district,
        subdistrict: event.subdistrict,
        searchable: [event.venue],
      });
      const matchesType = filters.eventType === "all" || event.eventType === filters.eventType;
      const matchesFormat = filters.format === "all" || event.format === filters.format;
      return matchesQuery && matchesLocation && matchesDate(event.startsAt, filters.date) && matchesType && matchesFormat;
    })
    .sort((left, right) => filters.sort === "newest"
      ? right.startsAt.localeCompare(left.startsAt)
      : left.startsAt.localeCompare(right.startsAt));

  return <EventSearchBrowser events={filteredEvents} filters={filters} totalCount={filteredEvents.length} />;
}
