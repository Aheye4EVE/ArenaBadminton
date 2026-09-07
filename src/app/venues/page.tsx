import type { Metadata } from "next";
import VenueSearchBrowser from "@/components/venue-search-browser";
import { directoryFilters, searchVenues } from "@/lib/venue-directory";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "สนามแบด | Arena-Badminton" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function toUrlSearchParams(input: SearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string") params.set(key, first);
  }
  return params;
}

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = directoryFilters(toUrlSearchParams(await searchParams));
  const context = await getAuthenticatedProfile();
  const profileArea = context.profile
    ? [
        context.profile.subdistrict,
        context.profile.district,
        context.profile.province,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  if (!context.supabase || !context.user) {
    return (
      <VenueSearchBrowser
        venues={[]}
        filters={filters}
        totalCount={0}
        authRequired
        profileArea={profileArea}
      />
    );
  }

  let result: {
    items: Awaited<ReturnType<typeof searchVenues>>["items"];
    total: number;
  } | null = null;
  try {
    result = await searchVenues(context.supabase, { ...filters, page: 1 }, 600);
  } catch {
    // Keep the directory shell visible and report the data failure in the UI.
  }
  const pageStart = (filters.page - 1) * 24;
  const pageItems = result?.items.slice(pageStart, pageStart + 24) ?? [];
  return result ? (
    <VenueSearchBrowser
      venues={pageItems}
      mapVenues={result.items}
      filters={filters}
      totalCount={result.total}
      isLiveData
      profileArea={profileArea}
    />
  ) : (
    <VenueSearchBrowser
      venues={[]}
      mapVenues={[]}
      filters={filters}
      totalCount={0}
      isLiveData
      profileArea={profileArea}
      loadError="ระบบค้นหาสนามขัดข้องชั่วคราว"
    />
  );
}
