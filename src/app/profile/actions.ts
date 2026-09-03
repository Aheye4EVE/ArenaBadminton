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
  if (!parsed.data.handle) {
    return { error: "กรุณากรอก TAGNAME", fieldErrors: { handle: ["กรุณากรอก TAGNAME"] } };
  }

  const avatar = resolveAvatarUpdate(formData, user.id);
  if (avatar.error) return { error: avatar.error };

  const { error } = await supabase.rpc("update_profile", {
    p_handle: parsed.data.handle,
    p_display_name: parsed.data.displayName,
    p_bio: parsed.data.bio,
    p_line_contact_id: parsed.data.lineContactId,
    p_address_line: parsed.data.addressLine,
    p_province: parsed.data.province,
    p_district: parsed.data.district,
    p_subdistrict: parsed.data.subdistrict,
    p_postal_code: parsed.data.postalCode,
    p_latitude: parsed.data.latitude ?? null,
    p_longitude: parsed.data.longitude ?? null,
    p_avatar_url: avatar.value === undefined ? profile.avatar_url ?? null : avatar.value,
  });
  if (error) {
    if (error.code === "23505" || error.message.toLowerCase().includes("handle already in use")) {
      return { error: "TAGNAME นี้ถูกใช้แล้ว ลองชื่ออื่นได้เลย", fieldErrors: { handle: ["TAGNAME นี้ถูกใช้แล้ว"] } };
    }
    if (error.code === "22023") {
      return { error: "ข้อมูล Profile ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" };
    }
    return { error: "บันทึก Profile ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  redirect("/profile");
}
