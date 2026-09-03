import type { Metadata } from "next";
import ArenaHome from "@/components/arena-home";
import { getRecommendedGroups } from "@/lib/group-recommendations";
import { getAuthenticatedProfile, getAuthenticatedProfileSummary } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Arena-Badminton | หาก๊วนง่าย นัดตีสะดวก",
  description: "พื้นที่รวมก๊วน สนาม กิจกรรม และ Community สำหรับคนรักแบดมินตัน",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authContext = await getAuthenticatedProfile();
  const [summaryContext, recommendedGroups] = await Promise.all([
    getAuthenticatedProfileSummary(authContext),
    getRecommendedGroups(authContext),
  ]);
  return <ArenaHome account={summaryContext.summary} isAuthenticated={Boolean(authContext.user)} recommendedGroups={recommendedGroups} />;
}
