"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { resolveAvatarUpdate, resolveProfileBackgroundUpdate } from "@/lib/r2-upload";
import { parseProfileForm, type ProfileActionState } from "@/lib/profile-validation";

export async function completeProfile(_previousState: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const parsed = parseProfileForm(formData);
  if (!parsed.success) return parsed.state;

  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" };

  const avatar = resolveAvatarUpdate(formData, user.id);
  if (avatar.error) return { error: avatar.error };
  const background = resolveProfileBackgroundUpdate(formData, user.id);
  if (background.error) return { error: background.error };

  const { error } = await supabase.rpc("complete_profile", {
    p_handle: parsed.data.handle,
    p_display_name: parsed.data.displayName,
    p_bio: parsed.data.bio,
    p_address_line: parsed.data.addressLine,
    p_province: parsed.data.province,
    p_district: parsed.data.district,
    p_subdistrict: parsed.data.subdistrict,
    p_postal_code: parsed.data.postalCode,
    p_latitude: parsed.data.latitude ?? null,
    p_longitude: parsed.data.longitude ?? null,
    p_avatar_url: avatar.value === undefined ? profile?.avatar_url ?? null : avatar.value,
    p_avatar_focus_x: avatar.focusX,
    p_avatar_focus_y: avatar.focusY,
    p_profile_background_url: background.value === undefined ? profile?.profile_background_url ?? null : background.value,
    p_background_focus_x: background.focusX,
    p_background_focus_y: background.focusY,
  });

  if (error) {
    if (error.code === "23505") return { error: "TAGNAME นี้ถูกใช้แล้ว ลองชื่ออื่นได้เลย", fieldErrors: { handle: ["TAGNAME นี้ถูกใช้แล้ว"] } };
    return { error: "บันทึกโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  revalidatePath("/profile/setup");
  revalidatePath("/profile");
  redirect("/");
}
