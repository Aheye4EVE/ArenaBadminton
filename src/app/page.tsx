import type { Metadata } from "next";
import { Suspense } from "react";
import ArenaHome from "@/components/arena-home";
import { getHomepagePublicData } from "@/lib/home-data";

export const metadata: Metadata = {
  title: "Arena-Badminton | หาก๊วนง่าย นัดตีสะดวก",
  description: "พื้นที่รวมก๊วน สนาม กิจกรรม และ Community สำหรับคนรักแบดมินตัน",
};

export const revalidate = 60;

async function CachedHome() {
  const homepageLiveData = await getHomepagePublicData();

  return <ArenaHome
    account={null}
    isAuthenticated={false}
    recommendedGroups={homepageLiveData?.featuredGroups}
    featuredEvents={homepageLiveData?.featuredEvents}
    featuredCourts={homepageLiveData?.featuredCourts}
    featuredMarketplaceListings={homepageLiveData?.featuredMarketplaceListings}
    marketplaceSortMode={homepageLiveData?.marketplaceSortMode}
    homeDataErrors={homepageLiveData?.errors}
    isLiveData={Boolean(homepageLiveData)}
  />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<ArenaHome account={null} isAuthenticated={false} publicDataPending />}>
      <CachedHome />
    </Suspense>
  );
}
