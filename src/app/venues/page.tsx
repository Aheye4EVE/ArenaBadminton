import type { Metadata } from "next";
import VenueSearchBrowser, { type VenueSearchFilters } from "@/components/venue-search-browser";
import { courts } from "@/lib/demo-data";

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

export default async function VenuesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const terms = searchTerms(filters.q);
  const filteredVenues = courts
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
