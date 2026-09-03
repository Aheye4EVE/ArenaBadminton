import type { getAuthenticatedProfile } from "@/lib/supabase-server";
import { groups as demoGroups, type Group } from "@/lib/demo-data";

type RecommendationContext = Awaited<ReturnType<typeof getAuthenticatedProfile>>;

type GroupRow = {
  id: string;
  owner_id: string;
  venue_id: string | null;
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
  latitude: number | string | null;
  longitude: number | string | null;
};

type UserLocation = {
  province: string;
  district: string;
  subdistrict: string;
  latitude: number | null;
  longitude: number | null;
};

type RankedGroup = {
  group: Group;
  organizerGroupCount: number;
  memberCount: number;
  locationMatchScore: number;
  distanceKm: number | null;
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

function fallbackGroups() {
  return demoGroups.filter((group) => group.status !== "เต็มแล้ว").slice(0, recommendationLimit);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedLocation(value: unknown) {
  return asString(value)
    .toLocaleLowerCase("th-TH")
    .replace(/จังหวัด|กรุงเทพฯ|อำเภอ|เขต|ตำบล|แขวง/g, "")
    .replace(/\s+/g, "");
}

function readUserLocation(profile: unknown): UserLocation {
  const profileRecord = (profile ?? {}) as Record<string, unknown>;
  const latitude = asNumber(profileRecord.latitude);
  const longitude = asNumber(profileRecord.longitude);

  return {
    province: normalizedLocation(profileRecord.province),
    district: normalizedLocation(profileRecord.district),
    subdistrict: normalizedLocation(profileRecord.subdistrict),
    latitude: latitude !== null && latitude >= -90 && latitude <= 90 ? latitude : null,
    longitude: longitude !== null && longitude >= -180 && longitude <= 180 ? longitude : null,
  };
}

function hasUserLocation(location: UserLocation) {
  return Boolean(
    location.province ||
      location.district ||
      location.subdistrict ||
      (location.latitude !== null && location.longitude !== null),
  );
}

function locationMatchScore(locationText: string, userLocation: UserLocation) {
  const haystack = normalizedLocation(locationText);
  if (!haystack) return 0;
  if (userLocation.subdistrict && haystack.includes(userLocation.subdistrict)) return 3;
  if (userLocation.district && haystack.includes(userLocation.district)) return 2;
  if (userLocation.province && haystack.includes(userLocation.province)) return 1;
  return 0;
}

function distanceInKm(
  latitude: number | null,
  longitude: number | null,
  userLocation: UserLocation,
) {
  if (
    latitude === null ||
    longitude === null ||
    userLocation.latitude === null ||
    userLocation.longitude === null
  ) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(latitude - userLocation.latitude);
  const longitudeDelta = toRadians(longitude - userLocation.longitude);
  const latitudeOne = toRadians(userLocation.latitude);
  const latitudeTwo = toRadians(latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitudeOne) * Math.cos(latitudeTwo);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
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

function compareProximity(left: RankedGroup, right: RankedGroup) {
  if (left.distanceKm !== null && right.distanceKm !== null) {
    const distanceDifference = left.distanceKm - right.distanceKm;
    if (Math.abs(distanceDifference) > 0.1) return distanceDifference;
  } else if (left.locationMatchScore !== right.locationMatchScore) {
    return right.locationMatchScore - left.locationMatchScore;
  }

  return 0;
}

export async function getRecommendedGroups(context: RecommendationContext): Promise<Group[]> {
  const { supabase, user, profile } = context;
  if (!supabase || !user) return fallbackGroups();

  const { data: groupData, error: groupError } = await supabase
    .from("groups")
    .select("id, owner_id, venue_id, title, location_text, starts_at, duration_minutes, capacity, min_level, max_level, play_type, status")
    .eq("status", "published")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(candidateLimit);

  if (groupError) return fallbackGroups();

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

  if (membersResult.error || organizersResult.error) return fallbackGroups();

  const memberCounts = new Map<string, number>();
  for (const member of (membersResult.data ?? []) as MemberRow[]) {
    memberCounts.set(member.group_id, (memberCounts.get(member.group_id) ?? 0) + 1);
  }

  const organizerCounts = new Map<string, number>();
  for (const organizerGroup of (organizersResult.data ?? []) as Array<{ owner_id: string }>) {
    organizerCounts.set(organizerGroup.owner_id, (organizerCounts.get(organizerGroup.owner_id) ?? 0) + 1);
  }

  const venueIds = userLocation.latitude !== null && userLocation.longitude !== null
    ? [...new Set(rows.map((row) => row.venue_id).filter((venueId): venueId is string => Boolean(venueId)))]
    : [];
  let venues: VenueRow[] = [];
  if (venueIds.length > 0) {
    const venuesResult = await supabase
      .from("venues")
      .select("id, latitude, longitude")
      .in("id", venueIds);
    if (!venuesResult.error) venues = (venuesResult.data ?? []) as VenueRow[];
  }
  const venueMap = new Map(venues.map((venue) => [venue.id, venue]));

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
      const venueLatitude = asNumber(venue?.latitude);
      const venueLongitude = asNumber(venue?.longitude);
      const distanceKm = distanceInKm(venueLatitude, venueLongitude, userLocation);
      const organizerGroupCount = organizerCounts.get(row.owner_id) ?? 0;
      const nearFullLimit = Math.max(1, Math.ceil(capacity * 0.15));

      return {
        group: {
          id: row.id,
          title: asString(row.title) || "ก๊วนแบดมินตัน",
          location: asString(row.location_text) || "ไม่ระบุสถานที่",
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
          ...(distanceKm !== null ? { distanceKm: Math.round(distanceKm * 10) / 10 } : {}),
        },
        organizerGroupCount,
        memberCount,
        locationMatchScore: locationMatchScore(row.location_text, userLocation),
        distanceKm,
        startsAtMs: startsAt.getTime(),
      };
    })
    .filter((item): item is RankedGroup => item !== null);

  const userHasLocation = hasUserLocation(userLocation);
  // Never recommend a full group. When a profile has location data, proximity
  // is the first ranking signal; organizer history and current occupancy then
  // break ties. Without a location, organizer history leads the ranking.
  ranked.sort((left, right) => {
    if (userHasLocation) {
      const proximityDifference = compareProximity(left, right);
      if (proximityDifference !== 0) return proximityDifference;
    }

    if (left.organizerGroupCount !== right.organizerGroupCount) {
      return right.organizerGroupCount - left.organizerGroupCount;
    }
    if (left.memberCount !== right.memberCount) return right.memberCount - left.memberCount;
    return left.startsAtMs - right.startsAtMs;
  });

  return ranked.slice(0, recommendationLimit).map((item, index) => ({
    ...item.group,
    accent: accents[index % accents.length],
  }));
}
