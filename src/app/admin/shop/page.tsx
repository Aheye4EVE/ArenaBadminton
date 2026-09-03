import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import AdminShopPanel, { type AdminShopItem } from "@/components/admin-shop-panel";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Admin Shop | Arena-Badminton" };
export const dynamic = "force-dynamic";

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default async function AdminShopPage() {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_user_admin");
  if (adminError || isAdmin !== true) notFound();

  const { data: rawItems, error: itemError } = await supabase
    .from("shop_items")
    .select("id, slug, name, description, item_type, rarity_tier, icon, effect_type, effect_value, price_gems, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (itemError) return <AdminShopPanel items={[]} creditRequestKey={randomUUID()} loadError="โหลด Catalog ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" />;

  const items: AdminShopItem[] = (rawItems ?? []).map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    itemType: item.item_type,
    rarityTier: item.rarity_tier,
    icon: item.icon,
    effectType: item.effect_type,
    effectValue: numberValue(item.effect_value),
    priceGems: numberValue(item.price_gems),
    isActive: Boolean(item.is_active),
    sortOrder: numberValue(item.sort_order),
  }));

  return <AdminShopPanel items={items} creditRequestKey={randomUUID()} />;
}
