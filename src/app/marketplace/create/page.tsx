import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MarketplaceCreateForm from "@/components/marketplace-create-form";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "ลงขายสินค้า | Arena-Badminton" };
export const dynamic = "force-dynamic";
export default async function MarketplaceCreatePage() {
  const { user, profile } = await getAuthenticatedProfile();
  if (!user) redirect("/auth/login?message=auth_required&next=/marketplace/create");
  if (!profile?.profile_completed_at) redirect("/profile/setup");
  return <main className="marketplace-create-page"><div className="marketplace-create-shell"><header className="groups-topbar"><Link href="/marketplace" className="groups-back"><ArrowLeft size={17} /> กลับตลาดมือสอง</Link><Link href="/" className="groups-brand"><span>Arena</span><em>-Badminton</em></Link><Link href="/profile" className="organizer-user-chip">Profile</Link></header><MarketplaceCreateForm /></div></main>;
}
