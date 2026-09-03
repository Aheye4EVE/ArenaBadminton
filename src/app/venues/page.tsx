import type { Metadata } from "next";
import VenueSearchBrowser, { type VenueSearchFilters } from "@/components/venue-search-browser";
import { courts } from "@/lib/demo-data";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { shouldShowQaData } from "@/lib/config";

export const metadata: Metadata = { title: "สนามแบด | Arena-Badminton" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const availabilityFilters = ["all", "available"] as const;
const ratingFilters = ["all", "4", "4.5"] as const;
const courtCountFilters = ["all", "5plus", "10plus"] as const;
const sortFilters = ["rating", "distance", "name"] as const;

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

function parseFilters(params: SearchParams): VenueSearchFilters {
  return {
    q: cleanSearchValue(firstParam(params, "q")),
    province: cleanSearchValue(firstParam(params, "province")),
    district: cleanSearchValue(firstParam(params, "district")),
    subdistrict: cleanSearchValue(firstParam(params, "subdistrict")),
    availability: allowedValue(firstParam(params, "availability"), availabilityFilters, "all"),
    rating: allowedValue(firstParam(params, "rating"), ratingFilters, "all"),
    courtCount: allowedValue(firstParam(params, "courtCount"), courtCountFilters, "all"),
    sort: allowedValue(firstParam(params, "sort"), sortFilters, "rating"),
  };
}

function searchTerms(value: string) {
  return value.toLocaleLowerCase("th-TH").split(/\s+/).filter(Boolean);
}

type LiveVenueRow = {
  id: string;
  name: string;
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

function inferProvince(address: string, district: string) {
  const haystack = address + " " + district;
  if (haystack.includes("กรุงเทพมหานคร") || district.includes("เขต")) return "กรุงเทพมหานคร";
  if (haystack.includes("นนทบุรี")) return "นนทบุรี";
  if (haystack.includes("ปทุมธานี")) return "ปทุมธานี";
  return "";
}

function inferSubdistrict(address: string) {
  const match = address.match(/(?:แขวง|ตำบล)\s*([^\s·,]+)/);
  return match?.[1] ?? "";
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

function mapLiveVenue(
  row: LiveVenueRow,
  userLatitude: number | null,
  userLongitude: number | null,
) {
  const address = cleanSearchValue(row.address ?? "", 240);
  const district = cleanSearchValue(row.district ?? "", 80);
  const province = cleanSearchValue(row.province ?? "", 80) || inferProvince(address, district);
  const subdistrict = cleanSearchValue(row.subdistrict ?? "", 80) || inferSubdistrict(address);
  const latitude = asNumber(row.latitude);
  const longitude = asNumber(row.longitude);
  const distanceKm = distanceInKm(latitude, longitude, userLatitude, userLongitude);
  const rating = Math.max(0, Math.min(5, asNumber(row.rating) ?? 0));

  return {
    id: row.id,
    name: cleanSearchValue(row.name, 160) || "สนามแบดมินตัน",
    district,
    province,
    subdistrict,
    address: address || "ยังไม่มีข้อมูลที่อยู่",
    courtCount: Math.max(1, Math.round(asNumber(row.court_count) ?? 1)),
    availability: row.availability === "waitlist" ? "waitlist" as const : "available" as const,
    distance: distanceKm === null ? "ยังไม่ระบุระยะทาง" : distanceKm.toFixed(1) + " km",
    distanceKm: distanceKm ?? Number.MAX_SAFE_INTEGER,
    rating: rating.toFixed(1),
    image: "🏟️",
    imageUrl: typeof row.cover_image_url === "string" && row.cover_image_url.trim() ? row.cover_image_url : null,
    latitude: latitude ?? 0,
    longitude: longitude ?? 0,
  };
}

export default async function VenuesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const terms = searchTerms(filters.q);
  const profileContext = await getAuthenticatedProfile();
  let sourceVenues = courts;

  if (profileContext.supabase && profileContext.user) {
    let venuesQuery = profileContext.supabase
      .from("venues")
      .select("id, name, province, district, subdistrict, address, latitude, longitude, cover_image_url, court_count, rating, availability")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!shouldShowQaData()) venuesQuery = venuesQuery.not("name", "like", "[QA ONLY]%");
    const { data, error } = await venuesQuery;

    if (!error && data && data.length > 0) {
      const userLatitude = asNumber(profileContext.profile?.latitude);
      const userLongitude = asNumber(profileContext.profile?.longitude);
      sourceVenues = (data as LiveVenueRow[]).map((row) => mapLiveVenue(row, userLatitude, userLongitude));
    }
  }

  const filteredVenues = sourceVenues
    .filter((court) => {
      const haystack = [court.name, court.province, court.district, court.subdistrict, court.address].join(" ").toLocaleLowerCase("th-TH");
      const matchesQuery = terms.length === 0 || terms.every((term) => haystack.includes(term));
      const matchesProvince = !filters.province || court.province === filters.province;
      const matchesDistrict = !filters.district || court.district === filters.district;
      const matchesSubdistrict = !filters.subdistrict || court.subdistrict === filters.subdistrict;
      const matchesAvailability = filters.availability === "all" || court.availability === filters.availability;
      const matchesRating = filters.rating === "all" || Number(court.rating) >= Number(filters.rating);
      const matchesCourtCount = filters.courtCount === "all"
        || filters.courtCount === "5plus" && court.courtCount >= 5
        || filters.courtCount === "10plus" && court.courtCount >= 10;
      return matchesQuery && matchesProvince && matchesDistrict && matchesSubdistrict && matchesAvailability && matchesRating && matchesCourtCount;
    })
    .sort((left, right) => {
      if (filters.sort === "distance") return left.distanceKm - right.distanceKm;
      if (filters.sort === "name") return left.name.localeCompare(right.name, "th");
      return Number(right.rating) - Number(left.rating);
    });

  return <VenueSearchBrowser venues={filteredVenues} filters={filters} totalCount={filteredVenues.length} />;
}
