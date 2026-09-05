import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import CreateGuildForm from "@/components/create-guild-form";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "สร้าง Guild | Arena-Badminton" };
export const dynamic = "force-dynamic";

export default async function CreateGuildPage() {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const settingsResult = await supabase.rpc("get_guild_creation_settings");
  const settings = Array.isArray(settingsResult.data) ? settingsResult.data[0] : settingsResult.data;
  const founderItemSlug = settings?.founder_item_slug ?? "guild-founding-contract";
  const [itemResult, membershipResult] = await Promise.all([
    supabase.from("shop_items").select("id, slug").eq("slug", founderItemSlug).maybeSingle(),
    supabase.from("guild_members").select("guild_id").eq("user_id", user.id).eq("membership_status", "active").maybeSingle(),
  ]);
  if (membershipResult.data?.guild_id) redirect(`/guilds/${membershipResult.data.guild_id}`);

  const itemId = itemResult.data?.id;
  const inventoryResult = itemId ? await supabase.from("user_item_inventory").select("quantity").eq("user_id", user.id).eq("item_id", itemId).maybeSingle() : { data: null };
  const ownedFounderItem = Number(inventoryResult.data?.quantity ?? 0);
  const freeUntil = settings?.free_until ?? null;
  const isFree = settings?.is_free === true || settings?.creation_mode === "free";

  return <main className="guild-create-page"><div className="guild-create-shell"><header className="guilds-topbar"><Link href="/guilds" className="guilds-back"><ArrowLeft size={17} /> Guild Directory</Link><Link href="/" className="guilds-brand" aria-label="กลับหน้าหลัก Arena-Badminton"><span>Arena</span><em>-Badminton</em></Link><span className="guilds-user-action"><Shield size={15} /> Guild Foundry</span></header><div className="guild-create-layout"><section><CreateGuildForm settings={{ creationMode: settings?.creation_mode === "free" ? "free" : "item", isFree, founderItemSlug, freeUntil, maxMembersCap: Number(settings?.max_members_cap ?? 256), ownedFounderItem }} /></section><aside className="guild-create-aside"><div className="guild-create-aside__crest">🛡️</div><p lang="en">Your Guild, your rules</p><h1>บ้านของทีม<br />เริ่มจากตรงนี้</h1><ul><li><span>01</span>เริ่มต้นด้วยสมาชิกสูงสุด 32 คน</li><li><span>02</span>เชื่อมก๊วนให้เป็นกิจกรรมของ Guild</li><li><span>03</span>ทุก Match ที่ยืนยันผล สะสม Guild EXP ให้ทีม</li><li><span>04</span>เลื่อนตำแหน่งสมาชิกและประกาศข่าวสารได้</li></ul><Link href="/shop" className="guild-secondary-action">ดู Guild Items <ArrowLeft size={15} /></Link></aside></div></div></main>;
}
