import type { SupabaseClient } from "@supabase/supabase-js";
import { type Group } from "@/lib/demo-data";
import { shouldShowQaData } from "@/lib/config";
import { haversineDistanceKm, normalizeCoordinates, type GeoCoordinates } from "@/lib/geolocation";

export type RecommendationContext = {
  supabase: SupabaseClient | null;
  user?: unknown | null;
  profile?: unknown | null;
};

type GroupRow = {
  id: string;
  owner_id: string;
  venue_id: string | null;
  guild_id: string | null;
  title: string;
  location_text: string;
  starts_at: string;
  duration_minutes: number | string;
  capacity: number | string;
  min_level: number | string;
  max_level: number | string;
  play_type: string;
  status: string;
};

type MemberRow = {
  group_id: string;
  membership_status: string;
};

type VenueRow = {
  id: string;
  name: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
};

type UserLocation = {
  province: string;
  district: string;
  subdistrict: string;
  coordinates: GeoCoordinates | null;
};

export type RecommendationOptions = {
  coordinates?: GeoCoordinates | null;
};

type RankedGroup = {
  group: Group;
  organizerGroupCount: number;
  memberCount: number;
  locationMatchScore: number;
  distanceKm: number | null;
  guildPriority: number;
  startsAtMs: number;
};

const recommendationLimit = 5;
const candidateLimit = 100;
const organizerStatuses = ["published", "full", "completed"];
const accents = ["pink", "blue", "mint"] as const;
const avatarSets = [
  ["🧑🏻‍🦱", "👩🏻", "🧑🏽", "👩🏼‍🦰"],
  ["👩🏽", "🧑🏻", "👩🏻‍🦱", "🧑🏽‍🦰"],
  ["🧑🏼", "👩🏽‍🦱", "🧑🏻‍🦰", "👩🏻"],
];

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedLocation(value: unknown) {
  const trimmed = asString(value).split(/\s*[—–-]\s*/u, 1)[0] ?? "";
  if (/กรุงเทพ(?:มหานคร|ฯ)?/u.test(trimmed)) return "กรุงเทพมหานคร";
  return trimmed
    .toLocaleLowerCase("th-TH")
    .replace(/จังหวัด|อำเภอ|เขต|ตำบล|แขวง/g, "")
    .replace(/\s+/g, "");
}

function readUserLocation(profile: unknown): UserLocation {
  const profileRecord = (profile ?? {}) as Record<string, unknown>;
  return {
    province: normalizedLocation(profileRecord.province),
    district: normalizedLocation(profileRecord.district),
    subdistrict: normalizedLocation(profileRecord.subdistrict),
    coordinates: normalizeCoordinates(profileRecord.latitude, profileRecord.longitude),
  };
}

function hasUserLocation(location: UserLocation) {
  return Boolean(
    location.province ||
      location.district ||
      location.subdistrict,
  );
}

function getLocationMatchScore(locationText: string, userLocation: UserLocation) {
  const haystack = normalizedLocation(locationText);
  if (!haystack) return 0;
  if (userLocation.province && !haystack.includes(userLocation.province)) return 0;
  if (userLocation.subdistrict && haystack.includes(userLocation.subdistrict)) return 3;
  if (userLocation.district && haystack.includes(userLocation.district)) return 2;
  if (userLocation.province && haystack.includes(userLocation.province)) return 1;
  return 0;
}

function formatDate(startsAt: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(startsAt);
}

function formatTime(startsAt: Date, durationMinutes: number) {
  const endAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const formatter = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${formatter.format(startsAt)}–${formatter.format(endAt)}`;
}

function levelLabel(minLevel: number, maxLevel: number): Group["level"] {
  if (maxLevel <= 20) return "มือใหม่";
  if (minLevel >= 51) return "มือสูง";
  return "มือกลาง";
}

function stableAvatarSet(id: string) {
  const hash = [...id].reduce((total, character) => total + character.charCodeAt(0), 0);
  return avatarSets[hash % avatarSets.length];
}

export async function getRecommendedGroups(context: RecommendationContext, options: RecommendationOptions = {}): Promise<Group[]> {
  const { supabase, profile } = context;
  if (!supabase) return [];

  let groupQuery = supabase
    .from("groups")
    .select("id, owner_id, venue_id, guild_id, title, location_text, starts_at, duration_minutes, capacity, min_level, max_level, play_type, status")
    .eq("status", "published")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(candidateLimit);
  if (!shouldShowQaData()) groupQuery = groupQuery.not("title", "like", "[QA ONLY]%");
  const { data: groupData, error: groupError } = await groupQuery;

  if (groupError) return [];

  const rows = (groupData ?? []) as GroupRow[];
  if (rows.length === 0) return [];

  const groupIds = rows.map((row) => row.id);
  const ownerIds = [...new Set(rows.map((row) => row.owner_id))];
  const userLocation = readUserLocation(profile);

  const [membersResult, organizersResult] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id, membership_status")
      .in("group_id", groupIds)
      .eq("membership_status", "registered"),
    supabase
      .from("groups")
      .select("owner_id")
      .in("owner_id", ownerIds)
      .in("status", organizerStatuses),
  ]);

  const memberCounts = new Map<string, number>();
  if (!membersResult.error) {
    for (const member of (membersResult.data ?? []) as MemberRow[]) {
      memberCounts.set(member.group_id, (memberCounts.get(member.group_id) ?? 0) + 1);
    }
  }

  const organizerCounts = new Map<string, number>();
  if (!organizersResult.error) {
    for (const organizerGroup of (organizersResult.data ?? []) as Array<{ owner_id: string }>) {
      organizerCounts.set(organizerGroup.owner_id, (organizerCounts.get(organizerGroup.owner_id) ?? 0) + 1);
    }
  }

  const venueIds = [...new Set(rows.map((row) => row.venue_id).filter((venueId): venueId is string => Boolean(venueId)))];
  let venues: VenueRow[] = [];
  if (venueIds.length > 0) {
    const venuesResult = await supabase
      .from("venues")
      .select("id, name, province, district, subdistrict, latitude, longitude")
      .in("id", venueIds);
    if (!venuesResult.error) venues = (venuesResult.data ?? []) as VenueRow[];
  }
  const venueMap = new Map(venues.map((venue) => [venue.id, venue]));
  const requestedCoordinates = options.coordinates
    ? normalizeCoordinates(options.coordinates.latitude, options.coordinates.longitude)
    : null;
  const userCoordinates = requestedCoordinates ?? userLocation.coordinates;

  const ranked = rows
    .map((row, index): RankedGroup | null => {
      const capacity = Math.max(1, asNumber(row.capacity) ?? 1);
      const memberCount = Math.max(0, memberCounts.get(row.id) ?? 0);
      if (memberCount >= capacity) return null;

      const startsAt = new Date(row.starts_at);
      if (Number.isNaN(startsAt.getTime())) return null;

      const durationMinutes = Math.max(30, asNumber(row.duration_minutes) ?? 120);
      const minLevel = Math.min(99, Math.max(1, asNumber(row.min_level) ?? 1));
      const maxLevel = Math.min(99, Math.max(minLevel, asNumber(row.max_level) ?? 99));
      const venue = row.venue_id ? venueMap.get(row.venue_id) : undefined;
      const venueProvince = normalizedLocation(venue?.province);
      const venueDistrict = normalizedLocation(venue?.district);
      const venueSubdistrict = normalizedLocation(venue?.subdistrict);
      const locationMatchScore = venue
        ? venueProvince && userLocation.province && venueProvince === userLocation.province
          ? venueDistrict && userLocation.district && venueDistrict === userLocation.district
            ? venueSubdistrict && userLocation.subdistrict && venueSubdistrict === userLocation.subdistrict ? 3 : 2
            : 1
          : 0
        : getLocationMatchScore(row.location_text, userLocation);
      const venueCoordinates = normalizeCoordinates(venue?.latitude, venue?.longitude);
      const distanceKm = userCoordinates && venueCoordinates
        ? haversineDistanceKm(userCoordinates, venueCoordinates)
        : null;
      const organizerGroupCount = organizerCounts.get(row.owner_id) ?? 0;
      const nearFullLimit = Math.max(1, Math.ceil(capacity * 0.15));

      return {
        group: {
          id: row.id,
          title: asString(row.title) || "ก๊วนแบดมินตัน",
          location: asString(row.location_text) || "ไม่ระบุสถานที่",
          venueName: asString(venue?.name) || undefined,
          dateLabel: formatDate(startsAt),
          timeLabel: formatTime(startsAt, durationMinutes),
          level: levelLabel(minLevel, maxLevel),
          members: memberCount,
          capacity,
          status: capacity - memberCount <= nearFullLimit ? "ใกล้เต็ม" : "กำลังรับสมัคร",
          accent: accents[index % accents.length],
          avatars: stableAvatarSet(row.id),
          detailHref: `/groups/${row.id}`,
          organizerGroupCount,
          distanceKm: distanceKm ?? undefined,
        },
        organizerGroupCount,
        memberCount,
        locationMatchScore,
        distanceKm,
        guildPriority: row.guild_id ? 1 : 0,
        startsAtMs: startsAt.getTime(),
      };
    })
    .filter((item): item is RankedGroup => item !== null);

  const userHasLocation = hasUserLocation(userLocation);
  const userHasGps = userCoordinates !== null;
  // Never recommend a full group. GPS is the primary signal when available;
  // the profile's administrative area is the safe fallback when it is not.
  ranked.sort((left, right) => {
    if (userHasGps) {
      if (left.distanceKm === null && right.distanceKm !== null) return 1;
      if (left.distanceKm !== null && right.distanceKm === null) return -1;
      if (left.distanceKm !== null && right.distanceKm !== null) {
        const distanceDifference = left.distanceKm - right.distanceKm;
        if (distanceDifference !== 0) return distanceDifference;
      } else if (left.locationMatchScore !== right.locationMatchScore) {
        return right.locationMatchScore - left.locationMatchScore;
      }
    } else if (userHasLocation && left.locationMatchScore !== right.locationMatchScore) {
      return right.locationMatchScore - left.locationMatchScore;
    }

    if (left.organizerGroupCount !== right.organizerGroupCount) {
      return right.organizerGroupCount - left.organizerGroupCount;
    }
    if (left.guildPriority !== right.guildPriority) return right.guildPriority - left.guildPriority;
    if (left.memberCount !== right.memberCount) return right.memberCount - left.memberCount;
    return left.startsAtMs - right.startsAtMs;
  });

  return ranked.slice(0, recommendationLimit).map((item, index) => ({
    ...item.group,
    accent: accents[index % accents.length],
  }));
}
