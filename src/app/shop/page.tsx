import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import ShopBrowser, { type ShopCatalogItem, type ShopInventoryItem } from "@/components/shop-browser";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "ร้านค้า | Arena-Badminton" };

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default async function ShopPage() {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const [{ data: rawItems }, { data: rawWallet }, { data: rawInventory }] = await Promise.all([
    supabase
      .from("shop_items")
      .select("id, slug, name, description, item_type, rarity_tier, icon, effect_type, effect_value, price_gems")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("user_wallets").select("gems_balance").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("user_item_inventory")
      .select("id, item_id, quantity, is_equipped, acquired_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  const items: ShopCatalogItem[] = (rawItems ?? []).map((item) => ({
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
  }));

  const itemById = new Map(items.map((item) => [item.id, item]));
  const inventory: ShopInventoryItem[] = (rawInventory ?? [])
    .map((row) => {
      const item = itemById.get(row.item_id);
      if (!item) return null;
      return {
        ...item,
        inventoryId: row.id,
        quantity: numberValue(row.quantity),
        isEquipped: Boolean(row.is_equipped),
        acquiredAt: row.acquired_at,
      };
    })
    .filter((item): item is ShopInventoryItem => item !== null);

  const purchaseKeys = Object.fromEntries(items.map((item) => [item.id, randomUUID()]));
  return <ShopBrowser items={items} inventory={inventory} gemsBalance={numberValue(rawWallet?.gems_balance)} purchaseKeys={purchaseKeys} />;
}
