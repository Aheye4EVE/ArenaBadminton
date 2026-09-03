import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AdminTrophyPanel, { type AdminTrophyItem } from "@/components/admin-trophy-panel";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Admin Trophy | Arena-Badminton" };
export const dynamic = "force-dynamic";

export default async function AdminTrophiesPage() {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_user_admin");
  if (adminError || isAdmin !== true) notFound();

  const { data: rows, error } = await supabase
    .from("shop_items")
    .select("id, name, icon, rarity_tier")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return <AdminTrophyPanel items={[]} loadError="โหลด Item Catalog ไม่สำเร็จ แต่ยังกรอก Trophy แบบไม่ผูก Item ได้" />;

  const items: AdminTrophyItem[] = (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    rarityTier: row.rarity_tier,
  }));

  return <AdminTrophyPanel items={items} />;
}
