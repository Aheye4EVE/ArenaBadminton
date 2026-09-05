import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfileCompletionForm from "@/components/profile-completion-form";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "ตั้งค่า Profile | Arena-Badminton",
  description: "กรอกข้อมูลโปรไฟล์เพื่อเริ่มค้นหาก๊วนและสนามแบดใกล้คุณ",
};

export const dynamic = "force-dynamic";

function getMetadataText(value: unknown) {
  return typeof value === "string" ? value : "";
}

export default async function ProfileSetupPage() {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (profile?.profile_completed_at) redirect("/");

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const initialValues = {
    displayName: profile?.display_name ?? getMetadataText(metadata?.full_name ?? metadata?.name),
    handle: profile?.handle ?? "",
    bio: profile?.bio ?? "",
    addressLine: profile?.address_line ?? "",
    province: profile?.province ?? "",
    district: profile?.district ?? "",
    subdistrict: profile?.subdistrict ?? "",
    postalCode: profile?.postal_code ?? "",
    latitude: profile?.latitude ?? "",
    longitude: profile?.longitude ?? "",
    avatarUrl: profile?.avatar_url ?? null,
    avatarFocusX: profile?.avatar_focus_x ?? 50,
    avatarFocusY: profile?.avatar_focus_y ?? 50,
    profileBackgroundUrl: profile?.profile_background_url ?? null,
    backgroundFocusX: profile?.profile_background_focus_x ?? 50,
    backgroundFocusY: profile?.profile_background_focus_y ?? 50,
  };

  return <ProfileCompletionForm email={user.email ?? "ไม่พบอีเมลจาก Provider"} initialValues={initialValues} />;
}
