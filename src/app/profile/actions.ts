"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { parseProfileForm, type ProfileActionState } from "@/lib/profile-validation";
import { resolveAvatarUpdate } from "@/lib/r2-upload";

export async function updateProfile(_previousState: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const parsed = parseProfileForm(formData);
  if (!parsed.success) return parsed.state;

  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" };
  if (!profile?.profile_completed_at) return { error: "กรุณาตั้งค่า Profile ให้ครบก่อนแก้ไขข้อมูล" };

  const avatar = resolveAvatarUpdate(formData, user.id);
  if (avatar.error) return { error: avatar.error };

  const profileUpdate: Record<string, unknown> = {
    display_name: parsed.data.displayName,
    bio: parsed.data.bio,
    line_contact_id: parsed.data.lineContactId,
    address_line: parsed.data.addressLine,
    province: parsed.data.province,
    district: parsed.data.district,
    subdistrict: parsed.data.subdistrict,
    postal_code: parsed.data.postalCode,
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
    location_updated_at: parsed.data.latitude !== undefined ? new Date().toISOString() : null,
  };

  if (avatar.value !== undefined) profileUpdate.avatar_url = avatar.value;

  const { error } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
  if (error) return { error: "บันทึก Profile ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  redirect("/profile");
}
