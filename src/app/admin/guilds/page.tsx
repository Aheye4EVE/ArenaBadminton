import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AdminGuildSettingsPanel from "@/components/admin-guild-settings-panel";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Admin Guild | Arena-Badminton" };
export const dynamic = "force-dynamic";

export default async function AdminGuildsPage() {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_user_admin");
  if (adminError || isAdmin !== true) notFound();
  const [settingsResult, guildCountResult] = await Promise.all([
    supabase.rpc("get_guild_creation_settings"),
    supabase.from("guilds").select("id", { count: "exact", head: true }),
  ]);
  const settings = Array.isArray(settingsResult.data) ? settingsResult.data[0] : settingsResult.data;
  return <AdminGuildSettingsPanel settings={{ creationMode: settings?.creation_mode === "free" ? "free" : "item", freeUntil: settings?.free_until ?? null, founderItemSlug: settings?.founder_item_slug ?? "guild-founding-contract", maxMembersCap: Number(settings?.max_members_cap ?? 256) }} guildCount={guildCountResult.count ?? 0} />;
}
