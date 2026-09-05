import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MarketplaceBrowser, { type MarketplaceFilters, type MarketplaceListing } from "@/components/marketplace-browser";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { safeMediaUrl } from "@/lib/safe-media-url";

export const metadata: Metadata = { title: "ตลาดมือสอง | Arena-Badminton" };
export const dynamic = "force-dynamic";
type SearchParams = Record<string, string | string[] | undefined>;
function first(params: SearchParams, key: string) { const value = params[key]; return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function clean(value: string, max = 120) { return value.trim().replace(/\s+/g, " ").slice(0, max); }
function numberValue(value: unknown, fallback = 0) { const n = typeof value === "number" ? value : Number(value); return Number.isFinite(n) ? n : fallback; }
const categories = ["all", "racket", "shoes", "bag", "apparel", "equipment", "other"];
const sorts = ["newest", "price_asc", "price_desc"];

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters: MarketplaceFilters = { q: clean(first(params, "q")), province: clean(first(params, "province"), 80), district: clean(first(params, "district"), 80), subdistrict: clean(first(params, "subdistrict"), 80), category: categories.includes(first(params, "category")) ? first(params, "category") : "all", sort: sorts.includes(first(params, "sort")) ? first(params, "sort") : "newest" };
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required&next=/marketplace");
  const { data } = await supabase.from("marketplace_listings").select("id, seller_id, title, description, category, condition_grade, price, province, district, subdistrict, image_url, status, created_at").in("status", ["active", "reserved"]).order("created_at", { ascending: false }).limit(300);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const sellerIds = [...new Set(rows.map((row) => typeof row.seller_id === "string" ? row.seller_id : "").filter(Boolean))];
  const { data: sellerRows } = sellerIds.length > 0 ? await supabase.from("public_profile_directory").select("id, display_name, handle, level").in("id", sellerIds) : { data: [] as Array<Record<string, unknown>> };
  const sellerMap = new Map(((sellerRows ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), row]));
  const listings = rows.map((row): MarketplaceListing => { const seller = sellerMap.get(String(row.seller_id)); return { id: String(row.id), title: String(row.title), description: typeof row.description === "string" ? row.description : "", category: String(row.category), conditionGrade: String(row.condition_grade), price: Math.max(0, numberValue(row.price)), province: typeof row.province === "string" ? row.province : null, district: typeof row.district === "string" ? row.district : null, subdistrict: typeof row.subdistrict === "string" ? row.subdistrict : null, imageUrl: safeMediaUrl(row.image_url), status: String(row.status), createdAt: String(row.created_at), sellerName: typeof seller?.display_name === "string" ? seller.display_name : "ผู้ขาย Arena", sellerHandle: typeof seller?.handle === "string" ? seller.handle : "arena_seller", sellerLevel: Math.max(1, Math.min(99, numberValue(seller?.level, 1))) }; }).filter((listing) => { const q = filters.q.toLowerCase(); return (!q || [listing.title, listing.description, listing.sellerName, listing.sellerHandle].some((value) => value.toLowerCase().includes(q))) && (!filters.province || listing.province === filters.province) && (!filters.district || listing.district === filters.district) && (!filters.subdistrict || listing.subdistrict === filters.subdistrict) && (filters.category === "all" || listing.category === filters.category); }).sort((a, b) => filters.sort === "price_asc" ? a.price - b.price : filters.sort === "price_desc" ? b.price - a.price : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return <MarketplaceBrowser listings={listings} filters={filters} totalCount={listings.length} />;
}
