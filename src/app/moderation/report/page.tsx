import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ModerationReportForm from "@/components/moderation-report-form";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "รายงานเนื้อหา | Arena-Badminton" };
export const dynamic = "force-dynamic";
const targets = ["post", "comment", "group", "match", "profile", "tournament", "venue", "venue_review", "guild", "marketplace_listing"];
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
export default async function ModerationReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, profile } = await getAuthenticatedProfile();
  if (!user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");
  const params = await searchParams;
  const targetType = first(params.targetType);
  const targetId = first(params.targetId);
  if (!targets.includes(targetType) || !/^[0-9a-f-]{36}$/i.test(targetId)) redirect("/community");
  const returnTo = first(params.returnTo);
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo.slice(0, 300) : "/community";
  return <ModerationReportForm targetType={targetType} targetId={targetId} returnTo={safeReturnTo} />;
}
