"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type ProfileActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const optionalCoordinate = (min: number, max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.trim() === "") return undefined;
      return Number(value);
    },
    z.number().finite().min(min).max(max).optional(),
  );

const profileSchema = z
  .object({
    displayName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(80, "ชื่อยาวเกินไป"),
    lineContactId: z.string().trim().min(1, "กรุณากรอก LINE ID").max(80, "LINE ID ยาวเกินไป"),
    addressLine: z.string().trim().min(1, "กรุณากรอกที่อยู่").max(240, "ที่อยู่ยาวเกินไป"),
    province: z.string().trim().min(1, "กรุณากรอกจังหวัด").max(80, "ชื่อจังหวัดยาวเกินไป"),
    district: z.string().trim().min(1, "กรุณากรอกอำเภอ/เขต").max(80, "ชื่ออำเภอ/เขตยาวเกินไป"),
    subdistrict: z.string().trim().min(1, "กรุณากรอกตำบล/แขวง").max(80, "ชื่อตำบล/แขวงยาวเกินไป"),
    postalCode: z.string().trim().regex(/^\d{5}$/, "กรุณากรอกรหัสไปรษณีย์ 5 หลัก"),
    latitude: optionalCoordinate(-90, 90),
    longitude: optionalCoordinate(-180, 180),
  })
  .superRefine((data, context) => {
    if ((data.latitude === undefined) !== (data.longitude === undefined)) {
      context.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "ต้องระบุพิกัด latitude และ longitude พร้อมกัน",
      });
    }
  });

function readFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function getLineUserId(user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedProfile>>["user"]>) {
  const identity = user.identities?.find((item) => item.provider === "line" || item.provider === "custom:line");
  const identityData = identity?.identity_data as Record<string, unknown> | undefined;
  const subject = identityData?.sub ?? identityData?.user_id;
  return typeof subject === "string" ? subject : undefined;
}

export async function completeProfile(_previousState: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const parsed = profileSchema.safeParse({
    displayName: readFormText(formData, "displayName"),
    lineContactId: readFormText(formData, "lineContactId"),
    addressLine: readFormText(formData, "addressLine"),
    province: readFormText(formData, "province"),
    district: readFormText(formData, "district"),
    subdistrict: readFormText(formData, "subdistrict"),
    postalCode: readFormText(formData, "postalCode"),
    latitude: readFormText(formData, "latitude"),
    longitude: readFormText(formData, "longitude"),
  });

  if (!parsed.success) {
    return {
      error: "กรุณาตรวจสอบข้อมูลให้ครบถ้วน",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!supabase || !user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" };

  const now = new Date().toISOString();
  const lineUserId = getLineUserId(user) ?? profile?.line_user_id ?? null;
  const handle = typeof profile?.handle === "string" && profile.handle.length > 0
    ? profile.handle
    : `player_${user.id.replaceAll("-", "").slice(0, 12)}`;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: parsed.data.displayName,
      handle,
      line_user_id: lineUserId,
      line_contact_id: parsed.data.lineContactId,
      address_line: parsed.data.addressLine,
      province: parsed.data.province,
      district: parsed.data.district,
      subdistrict: parsed.data.subdistrict,
      postal_code: parsed.data.postalCode,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      location_updated_at: parsed.data.latitude !== undefined ? now : null,
      profile_completed_at: now,
    },
    { onConflict: "id" },
  );

  if (error) {
    if (error.code === "23505") return { error: "LINE ID นี้ถูกใช้กับบัญชีอื่นแล้ว" };
    return { error: "บันทึกโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  revalidatePath("/profile/setup");
  revalidatePath("/profile");
  redirect("/");
}
