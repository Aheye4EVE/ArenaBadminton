import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import MarketplaceDetail from "@/components/marketplace-detail";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { safeMediaUrl } from "@/lib/safe-media-url";

export const metadata: Metadata = { title: "รายการสินค้า | Arena-Badminton" };
export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export default async function MarketplaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect(`/auth/login?message=auth_required&next=/marketplace/${id}`);
  const { data: row } = await supabase.from("marketplace_listings").select("id, seller_id, title, description, category, condition_grade, price, province, district, subdistrict, image_url, status, created_at").eq("id", id).maybeSingle();
  if (!row) notFound();
  const [{ data: seller }, { data: orders }] = await Promise.all([
    supabase.from("public_profile_directory").select("id, display_name, handle, avatar_url, level").eq("id", row.seller_id).maybeSingle(),
    supabase.from("marketplace_orders").select("id, buyer_id, seller_id, status, message, created_at, updated_at").eq("listing_id", id).order("created_at", { ascending: false }),
  ]);
  const orderRows = (orders ?? []) as Array<Record<string, unknown>>;
  const peopleIds = [...new Set(orderRows.flatMap((order) => [String(order.buyer_id), String(order.seller_id)]))].filter(Boolean);
  const { data: people } = peopleIds.length > 0 ? await supabase.from("public_profile_directory").select("id, display_name, handle").in("id", peopleIds) : { data: [] as Array<Record<string, unknown>> };
  const peopleMap = new Map(((people ?? []) as Array<Record<string, unknown>>).map((person) => [String(person.id), person]));
  return <MarketplaceDetail listing={{ id: String(row.id), sellerId: String(row.seller_id), title: String(row.title), description: typeof row.description === "string" ? row.description : "", category: String(row.category), conditionGrade: String(row.condition_grade), price: Number(row.price), province: row.province, district: row.district, subdistrict: row.subdistrict, imageUrl: safeMediaUrl(row.image_url), status: String(row.status), sellerName: typeof seller?.display_name === "string" ? seller.display_name : "ผู้ขาย Arena", sellerHandle: typeof seller?.handle === "string" ? seller.handle : "arena_seller", sellerLevel: Number(seller?.level ?? 1), sellerAvatarUrl: safeMediaUrl(seller?.avatar_url) }} orders={orderRows.map((order) => ({ id: String(order.id), buyerId: String(order.buyer_id), sellerId: String(order.seller_id), status: String(order.status), message: typeof order.message === "string" ? order.message : "", createdAt: String(order.created_at), buyerName: typeof peopleMap.get(String(order.buyer_id))?.display_name === "string" ? peopleMap.get(String(order.buyer_id))?.display_name as string : "ผู้ซื้อ Arena" }))} currentUserId={user.id} />;
}
