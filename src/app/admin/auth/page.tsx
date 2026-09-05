import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AdminAuthSettingsPanel from "@/components/admin-auth-settings-panel";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Admin Auth | Arena-Badminton" };
export const dynamic = "force-dynamic";

export default async function AdminAuthPage() {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_user_admin");
  if (adminError || isAdmin !== true) notFound();

  const { data } = await supabase.from("email_verification_settings").select("email_verification_required, updated_at").eq("id", "default").maybeSingle();
  return <AdminAuthSettingsPanel required={data?.email_verification_required !== false} updatedAt={typeof data?.updated_at === "string" ? data.updated_at : null} />;
}
