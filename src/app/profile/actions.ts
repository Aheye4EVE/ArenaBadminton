"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { parseProfileForm, type ProfileActionState } from "@/lib/profile-validation";
import { resolveAvatarUpdate, resolveProfileBackgroundUpdate } from "@/lib/r2-upload";

export async function updateProfile(_previousState: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const parsed = parseProfileForm(formData);
  if (!parsed.success) return parsed.state;

  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" };
  if (!profile?.profile_completed_at) return { error: "กรุณาตั้งค่า Profile ให้ครบก่อนแก้ไขข้อมูล" };
  const avatar = resolveAvatarUpdate(formData, user.id);
  if (avatar.error) return { error: avatar.error };
  const background = resolveProfileBackgroundUpdate(formData, user.id);
  if (background.error) return { error: background.error };

  const { error } = await supabase.rpc("update_profile", {
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
    p_avatar_url: avatar.value === undefined ? profile.avatar_url ?? null : avatar.value,
    p_avatar_focus_x: avatar.focusX,
    p_avatar_focus_y: avatar.focusY,
    p_profile_background_url: background.value === undefined ? profile.profile_background_url ?? null : background.value,
    p_background_focus_x: background.focusX,
    p_background_focus_y: background.focusY,
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

export async function updateProfileMedia(_previousState: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" };
  if (!profile?.profile_completed_at) return { error: "กรุณาตั้งค่า Profile ให้ครบก่อนอัปโหลดรูป" };

  const mediaType = formData.get("mediaType");
  const avatar = mediaType === "avatar" ? resolveAvatarUpdate(formData, user.id) : { value: undefined, focusX: Number(profile.avatar_focus_x ?? 50), focusY: Number(profile.avatar_focus_y ?? 50), error: null };
  const background = mediaType === "background" ? resolveProfileBackgroundUpdate(formData, user.id) : { value: undefined, focusX: Number(profile.profile_background_focus_x ?? 50), focusY: Number(profile.profile_background_focus_y ?? 50), error: null };

  if (mediaType !== "avatar" && mediaType !== "background") return { error: "ไม่พบประเภทภาพที่ต้องการบันทึก" };
  if (avatar.error) return { error: avatar.error };
  if (background.error) return { error: background.error };
  if (mediaType === "avatar" && avatar.value === undefined) return { error: "ยังไม่มีรูปโปรไฟล์ที่ยืนยันการ Crop" };
  if (mediaType === "background" && background.value === undefined) return { error: "ยังไม่มีภาพพื้นหลังที่ยืนยันการ Crop" };

  const { error } = await supabase.rpc("update_profile", {
    p_handle: profile.handle ?? "",
    p_display_name: profile.display_name ?? "ผู้เล่นใหม่",
    p_bio: profile.bio ?? null,
    p_address_line: profile.address_line ?? "",
    p_province: profile.province ?? "",
    p_district: profile.district ?? "",
    p_subdistrict: profile.subdistrict ?? "",
    p_postal_code: profile.postal_code ?? "",
    p_latitude: profile.latitude ?? null,
    p_longitude: profile.longitude ?? null,
    p_avatar_url: mediaType === "avatar" ? avatar.value : profile.avatar_url ?? null,
    p_avatar_focus_x: mediaType === "avatar" ? avatar.focusX : profile.avatar_focus_x ?? 50,
    p_avatar_focus_y: mediaType === "avatar" ? avatar.focusY : profile.avatar_focus_y ?? 50,
    p_profile_background_url: mediaType === "background" ? background.value : profile.profile_background_url ?? null,
    p_background_focus_x: mediaType === "background" ? background.focusX : profile.profile_background_focus_x ?? 50,
    p_background_focus_y: mediaType === "background" ? background.focusY : profile.profile_background_focus_y ?? 50,
  });

  if (error) {
    if (error.code === "23505" || error.message.toLowerCase().includes("handle already in use")) return { error: "TAGNAME นี้ถูกใช้แล้ว ลองชื่ออื่นได้เลย" };
    return { error: "บันทึกรูป Profile ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { message: mediaType === "avatar" ? "เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว" : "เปลี่ยนภาพพื้นหลังเรียบร้อยแล้ว" };
}
