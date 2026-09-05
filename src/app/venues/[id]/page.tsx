import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import VenueDetail, { type VenueDetailData, type VenueReviewData } from "@/components/venue-detail";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { safeMediaUrl } from "@/lib/safe-media-url";

export const metadata: Metadata = { title: "รายละเอียดสนาม | Arena-Badminton" };
export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function numberValue(value: unknown, fallback = 0) { const n = typeof value === "number" ? value : Number(value); return Number.isFinite(n) ? n : fallback; }

export default async function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect(`/auth/login?message=auth_required&next=/venues/${id}`);
  const { data: venue } = await supabase.from("venues").select("id, name, address, province, district, subdistrict, court_count, rating, availability, latitude, longitude, cover_image_url, status").eq("id", id).eq("status", "active").maybeSingle();
  if (!venue) notFound();
  const [{ data: reviewRows }, { data: reviewerProfiles }] = await Promise.all([
    supabase.from("venue_reviews").select("id, user_id, rating, body, created_at").eq("venue_id", id).eq("status", "published").order("created_at", { ascending: false }).limit(100),
    supabase.from("venue_reviews").select("user_id").eq("venue_id", id).eq("status", "published"),
  ]);
  const reviewerIds = [...new Set(((reviewerProfiles ?? []) as Array<{ user_id: string }>).map((row) => row.user_id))];
  const { data: profiles } = reviewerIds.length > 0 ? await supabase.from("public_profile_directory").select("id, display_name, handle, avatar_url").in("id", reviewerIds) : { data: [] as Array<Record<string, unknown>> };
  const profileMap = new Map(((profiles ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), row]));
  const reviews: VenueReviewData[] = ((reviewRows ?? []) as Array<Record<string, unknown>>).flatMap((row) => { const reviewer = profileMap.get(String(row.user_id)); if (!reviewer) return []; return [{ id: String(row.id), rating: numberValue(row.rating), body: typeof row.body === "string" ? row.body : "", createdAt: String(row.created_at), userId: String(row.user_id), displayName: typeof reviewer.display_name === "string" ? reviewer.display_name : "ผู้เล่น Arena", handle: typeof reviewer.handle === "string" ? reviewer.handle : "arena_player", avatarUrl: safeMediaUrl(reviewer.avatar_url) }]; });
  const mine = reviews.find((review) => review.userId === user.id);
  const detail: VenueDetailData = { id: String(venue.id), name: String(venue.name), address: typeof venue.address === "string" ? venue.address : "ยังไม่มีข้อมูลที่อยู่", province: venue.province, district: venue.district, subdistrict: venue.subdistrict, courtCount: Math.max(1, numberValue(venue.court_count, 1)), rating: Math.max(0, Math.min(5, numberValue(venue.rating))), availability: venue.availability === "waitlist" ? "waitlist" : "available", latitude: venue.latitude === null ? null : numberValue(venue.latitude), longitude: venue.longitude === null ? null : numberValue(venue.longitude), coverImageUrl: safeMediaUrl(venue.cover_image_url) };
  return <VenueDetail venue={detail} reviews={reviews} initialReview={mine ? { rating: mine.rating, body: mine.body } : null} signedIn={Boolean(profile?.profile_completed_at)} />;
}
