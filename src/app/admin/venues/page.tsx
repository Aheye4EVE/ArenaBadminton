import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AdminVenueSuggestionsPanel, { type AdminVenueSuggestion } from "@/components/admin-venue-suggestions-panel";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Venue Registry Admin | Arena-Badminton" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
function firstParam(params: SearchParams, key: string) { const value = params[key]; return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function AdminVenuesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_user_admin");
  if (adminError || isAdmin !== true) notFound();
  const { data, error } = await supabase.from("venue_suggestions").select("id, name, province, district, subdistrict, address, source_url, created_at").eq("status", "pending").order("created_at", { ascending: true }).limit(100);
  const suggestions: AdminVenueSuggestion[] = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({ id: String(row.id), name: String(row.name), province: String(row.province), district: typeof row.district === "string" ? row.district : null, subdistrict: typeof row.subdistrict === "string" ? row.subdistrict : null, address: typeof row.address === "string" ? row.address : null, sourceUrl: typeof row.source_url === "string" ? row.source_url : null, createdAt: String(row.created_at) }));
  const params = await searchParams;
  return <AdminVenueSuggestionsPanel suggestions={suggestions} error={error ? "load" : firstParam(params, "error") || undefined} updated={firstParam(params, "updated") === "1"} />;
}
