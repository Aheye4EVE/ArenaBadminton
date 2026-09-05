import type { Metadata } from "next";
import ArenaHome from "@/components/arena-home";
import { getRecommendedGroups } from "@/lib/group-recommendations";
import { getHomepageLiveData } from "@/lib/home-data";
import { getAuthenticatedProfile, getAuthenticatedProfileSummary } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Arena-Badminton | หาก๊วนง่าย นัดตีสะดวก",
  description: "พื้นที่รวมก๊วน สนาม กิจกรรม และ Community สำหรับคนรักแบดมินตัน",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authContext = await getAuthenticatedProfile();
  const [summaryContext, recommendedGroups, homepageLiveData] = await Promise.all([
    getAuthenticatedProfileSummary(authContext),
    getRecommendedGroups(authContext),
    getHomepageLiveData(authContext),
  ]);
  return <ArenaHome
    account={summaryContext.summary}
    isAuthenticated={Boolean(authContext.user)}
    recommendedGroups={recommendedGroups}
    featuredEvents={homepageLiveData?.featuredEvents}
    featuredCourts={homepageLiveData?.featuredCourts}
    communityStats={homepageLiveData?.communityStats}
    homeDataErrors={homepageLiveData?.errors}
    isLiveData={Boolean(homepageLiveData)}
  />;
}
