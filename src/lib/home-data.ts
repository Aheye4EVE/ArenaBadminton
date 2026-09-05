import type { AuthenticatedProfileContext } from "@/lib/supabase-server";
import { shouldShowQaData } from "@/lib/config";
import type { Court, Event } from "@/lib/demo-data";
import { safeMediaUrl } from "@/lib/safe-media-url";

export type HomepageStats = {
  members: number | null;
  groups: number | null;
  matches: number | null;
  venues: number | null;
};

export type HomepageLiveData = {
  featuredEvents: Event[];
  featuredCourts: Court[];
  communityStats: HomepageStats;
  errors: {
    events: boolean;
    venues: boolean;
    stats: boolean;
  };
};

type LiveVenueRow = {
  id: string;
  name: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  cover_image_url: string | null;
  court_count: number | string;
  rating: number | string | null;
  availability: string | null;
};

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

function validCoordinate(value: number | null, min: number, max: number) {
  return value !== null && value >= min && value <= max ? value : null;
}

function distanceInKm(
  latitude: number | null,
  longitude: number | null,
  userLatitude: number | null,
  userLongitude: number | null,
) {
  if (latitude === null || longitude === null || userLatitude === null || userLongitude === null) return null;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(latitude - userLatitude);
  const longitudeDelta = toRadians(longitude - userLongitude);
  const latitudeOne = toRadians(userLatitude);
  const latitudeTwo = toRadians(latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitudeOne) * Math.cos(latitudeTwo);
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "วันเวลาไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(date);
}

function mapVenue(row: LiveVenueRow, userLatitude: number | null, userLongitude: number | null): Court {
  const name = cleanText(row.name, 160) || "สนามแบดมินตัน";
  const province = cleanText(row.province, 80);
  const district = cleanText(row.district, 80);
  const subdistrict = cleanText(row.subdistrict, 80);
  const address = cleanText(row.address, 240) || "ยังไม่มีข้อมูลที่อยู่";
  const latitude = validCoordinate(asNumber(row.latitude), -90, 90);
  const longitude = validCoordinate(asNumber(row.longitude), -180, 180);
  const distanceKm = distanceInKm(latitude, longitude, userLatitude, userLongitude);
  const rating = Math.min(5, Math.max(0, asNumber(row.rating) ?? 0));

  return {
    id: row.id,
    name,
    district,
    province,
    subdistrict,
    address,
    courtCount: Math.max(1, Math.round(asNumber(row.court_count) ?? 1)),
    availability: row.availability === "waitlist" ? "waitlist" : "available",
    distance: distanceKm === null ? "ยังไม่ระบุระยะทาง" : `${distanceKm.toFixed(1)} km`,
    distanceKm: distanceKm ?? Number.MAX_SAFE_INTEGER,
    rating: rating.toFixed(1),
    image: "🏟️",
    imageUrl: safeMediaUrl(row.cover_image_url),
    latitude: latitude ?? 0,
    longitude: longitude ?? 0,
  };
}

function mapEvent(row: Record<string, unknown>, venue?: LiveVenueRow, index = 0): Event {
  const startsAt = typeof row.starts_at === "string" ? row.starts_at : new Date().toISOString();
  const maxEntries = asNumber(row.max_entries);
  const format = row.format === "doubles" || row.format === "team" ? row.format : "singles";
  return {
    id: `tournament-${typeof row.id === "string" ? row.id : `live-${index}`}`,
    title: cleanText(row.title, 160) || "Arena Tournament",
    category: cleanText(row.description, 160) || "การแข่งขันจาก Community Arena",
    eventType: "tournament",
    format,
    dateLabel: formatDate(startsAt),
    startsAt,
    venue: cleanText(venue?.name, 160) || "สนามที่ผู้จัดกำหนด",
    province: cleanText(venue?.province, 80),
    district: cleanText(venue?.district, 80),
    subdistrict: cleanText(venue?.subdistrict, 80),
    capacity: maxEntries !== null && maxEntries > 0 ? maxEntries : 8,
    registered: 0,
    image: "🏆",
    color: (["peach", "lavender", "mint"] as const)[index % 3],
  };
}

function countValue(result: { count?: number | null; error?: unknown }) {
  return result.error ? null : result.count ?? 0;
}

export async function getHomepageLiveData(context: AuthenticatedProfileContext): Promise<HomepageLiveData | null> {
  const { supabase, user, profile } = context;
  if (!supabase || !user) return null;

  const userLatitude = validCoordinate(asNumber(profile?.latitude), -90, 90);
  const userLongitude = validCoordinate(asNumber(profile?.longitude), -180, 180);

  let tournamentsQuery = supabase
    .from("tournaments")
    .select("id, title, description, starts_at, format, max_entries, venue_id")
    .eq("status", "published")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(6);
  if (!shouldShowQaData()) tournamentsQuery = tournamentsQuery.not("title", "like", "[QA ONLY]%");

  let venuesQuery = supabase
    .from("venues")
    .select("id, name, province, district, subdistrict, address, latitude, longitude, cover_image_url, court_count, rating, availability")
    .eq("status", "active")
    .order("rating", { ascending: false })
    .limit(50);
  if (!shouldShowQaData()) venuesQuery = venuesQuery.not("name", "like", "[QA ONLY]%");

  const [tournamentsResult, venuesResult, membersResult, groupsResult, matchesResult, venueCountResult] = await Promise.all([
    tournamentsQuery,
    venuesQuery,
    supabase.from("public_profile_directory").select("id", { count: "exact", head: true }),
    supabase.from("groups").select("id", { count: "exact", head: true }).in("status", ["published", "full", "completed"]).not("title", "like", "[QA ONLY]%"),
    supabase.from("matches").select("id", { count: "exact", head: true }).neq("status", "cancelled"),
    supabase.from("venues").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const tournamentRows = (tournamentsResult.data ?? []) as Array<Record<string, unknown>>;
  const venueRows = (venuesResult.data ?? []) as LiveVenueRow[];
  const venueMap = new Map(venueRows.map((venue) => [venue.id, venue]));

  let featuredEvents: Event[] = [];
  let eventsError = Boolean(tournamentsResult.error);
  if (!eventsError && tournamentRows.length > 0) {
    const tournamentIds = tournamentRows.map((row) => typeof row.id === "string" ? row.id : "").filter(Boolean);
    const { data: entryRows, error: entryError } = tournamentIds.length > 0
      ? await supabase.from("tournament_entries").select("tournament_id").in("tournament_id", tournamentIds).in("entry_status", ["registered", "winner"])
      : { data: [], error: null };
    eventsError = Boolean(entryError);
    const entryCounts = new Map<string, number>();
    for (const row of (entryRows ?? []) as Array<Record<string, unknown>>) {
      const id = typeof row.tournament_id === "string" ? row.tournament_id : "";
      if (id) entryCounts.set(id, (entryCounts.get(id) ?? 0) + 1);
    }
    featuredEvents = tournamentRows.slice(0, 3).map((row, index) => {
      const event = mapEvent(row, typeof row.venue_id === "string" ? venueMap.get(row.venue_id) : undefined, index);
      const sourceId = typeof row.id === "string" ? row.id : "";
      return { ...event, registered: entryCounts.get(sourceId) ?? 0 };
    });
  }

  const mappedVenues = !venuesResult.error
    ? venueRows.map((row) => mapVenue(row, userLatitude, userLongitude))
    : [];
  const hasUserCoordinates = userLatitude !== null && userLongitude !== null;
  mappedVenues.sort((left, right) => {
    if (hasUserCoordinates && left.distanceKm !== right.distanceKm) return left.distanceKm - right.distanceKm;
    return Number(right.rating) - Number(left.rating);
  });

  return {
    featuredEvents,
    featuredCourts: mappedVenues.slice(0, 3),
    communityStats: {
      members: countValue(membersResult),
      groups: countValue(groupsResult),
      matches: countValue(matchesResult),
      venues: countValue(venueCountResult),
    },
    errors: {
      events: eventsError,
      venues: Boolean(venuesResult.error),
      stats: Boolean(membersResult.error || groupsResult.error || matchesResult.error || venueCountResult.error),
    },
  };
}
