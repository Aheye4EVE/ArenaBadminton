"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDistricts, getProvinces, getSubDistricts } from "thai-address-select";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type VenueSuggestionState = { error?: string; message?: string; fieldErrors?: Record<string, string[]> };

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitVenueSuggestionAction(_previousState: VenueSuggestionState, formData: FormData): Promise<VenueSuggestionState> {
  const name = z.string().min(2, "กรุณากรอกชื่อสนาม").max(160, "ชื่อสนามยาวเกินไป").safeParse(text(formData, "name"));
  const province = z.string().min(1, "กรุณาเลือกจังหวัด").max(80).safeParse(text(formData, "province"));
  const district = z.string().min(1, "กรุณาเลือกอำเภอ/เขต").max(80).safeParse(text(formData, "district"));
  const subdistrictValue = text(formData, "subdistrict");
  const subdistrict = z.string().max(80).safeParse(subdistrictValue);
  const address = z.string().max(500, "ที่อยู่ยาวเกินไป").safeParse(text(formData, "address"));
  const sourceValue = text(formData, "sourceUrl");
  const sourceUrl = sourceValue
    ? z.string().max(2_000, "ลิงก์แหล่งข้อมูลยาวเกินไป").url("ลิงก์แหล่งข้อมูลไม่ถูกต้อง").refine((value) => /^https?:\/\//u.test(value), "ใช้ลิงก์ http หรือ https เท่านั้น").safeParse(sourceValue)
    : { success: true as const, data: null };

  const fieldErrors: Record<string, string[]> = {};
  if (!name.success) fieldErrors.name = name.error.issues.map((issue) => issue.message);
  if (!province.success) fieldErrors.province = province.error.issues.map((issue) => issue.message);
  if (!district.success) fieldErrors.district = district.error.issues.map((issue) => issue.message);
  if (!subdistrict.success) fieldErrors.subdistrict = subdistrict.error.issues.map((issue) => issue.message);
  if (!address.success) fieldErrors.address = address.error.issues.map((issue) => issue.message);
  if (!sourceUrl.success) fieldErrors.sourceUrl = sourceUrl.error.issues.map((issue) => issue.message);
  if (Object.keys(fieldErrors).length > 0 || !name.success || !province.success || !district.success || !subdistrict.success || !address.success || !sourceUrl.success) {
    return { error: "กรุณาตรวจสอบข้อมูลสนาม", fieldErrors };
  }

  if (!getProvinces().includes(province.data) || !getDistricts(province.data).includes(district.data) || !getSubDistricts(province.data, district.data).includes(subdistrict.data)) {
    return { error: "พื้นที่ไม่ตรงกับข้อมูลประเทศไทย กรุณาเลือกใหม่", fieldErrors: { province: ["ตรวจสอบจังหวัด อำเภอ/เขต และตำบล/แขวงอีกครั้ง"] } };
  }

  const context = await getAuthenticatedProfile();
  if (!context.supabase || !context.user) return { error: "กรุณาเข้าสู่ระบบก่อนเสนอชื่อสนาม" };
  const { error } = await context.supabase.from("venue_suggestions").insert({
    submitted_by: context.user.id,
    name: name.data,
    province: province.data,
    district: district.data,
    subdistrict: subdistrict.data,
    address: address.data || null,
    source_url: sourceUrl.data || null,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") return { error: "คุณเสนอสนามนี้ไว้แล้วและกำลังรอตรวจสอบ" };
    return { error: "ส่งข้อมูลสนามไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
  revalidatePath("/venues");
  return { message: "ส่งข้อมูลสนามแล้ว ทีมงานจะตรวจสอบก่อนนำเข้าสู่ทะเบียน" };
}
