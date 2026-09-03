import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfileCompletionForm from "@/components/profile-completion-form";
import { updateProfile } from "@/app/profile/actions";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "แก้ไข Profile | Arena-Badminton",
  description: "แก้ไขข้อมูลโปรไฟล์ ที่อยู่ และรูปโปรไฟล์ของคุณ",
};

export const dynamic = "force-dynamic";

function getMetadataText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getIdentityError(value: string | undefined) {
  return value === "auth_callback_failed" ? "เชื่อม Provider ไม่สำเร็จ หรือบัญชีนี้อาจถูกเชื่อมกับผู้ใช้อื่นแล้ว" : undefined;
}

export default async function ProfileEditPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) redirect("/auth/login?message=auth_required");
  if (!profile?.profile_completed_at) redirect("/profile/setup");

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const connectedProviders = (user.identities ?? []).map((identity) => identity.provider);
  const params = await searchParams;

  return (
    <ProfileCompletionForm
      email={user.email ?? (getMetadataText(metadata?.email) || "ไม่พบอีเมลจาก Provider")}
      initialValues={{
        displayName: profile.display_name,
        handle: profile.handle,
        bio: profile.bio,
        lineContactId: profile.line_contact_id,
        addressLine: profile.address_line,
        province: profile.province,
        district: profile.district,
        subdistrict: profile.subdistrict,
        postalCode: profile.postal_code,
        latitude: profile.latitude,
        longitude: profile.longitude,
        avatarUrl: profile.avatar_url,
      }}
      mode="edit"
      action={updateProfile}
      connectedProviders={connectedProviders}
      identityError={getIdentityError(params.error)}
    />
  );
}
