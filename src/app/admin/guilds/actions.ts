"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type AdminGuildActionState = { error?: string; message?: string };

function readText(formData: FormData, name: string) { const value = formData.get(name); return typeof value === "string" ? value : ""; }
function parseBangkokDateTime(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
function adminError(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("admin access")) return "บัญชีนี้ไม่มีสิทธิ์ Admin";
  if (message.includes("founder item")) return "ไม่พบไอเทมก่อตั้ง Guild ใน Shop";
  if (error.code === "22023") return "ค่าตั้งค่า Guild ไม่ถูกต้อง";
  return "บันทึกการตั้งค่า Guild ไม่สำเร็จ";
}

export async function updateGuildSettingsAction(_previousState: AdminGuildActionState, formData: FormData): Promise<AdminGuildActionState> {
  const maxMembers = z.coerce.number().int().min(32).max(256).safeParse(readText(formData, "maxMembersCap"));
  const founderItemSlug = z.string().trim().min(3).max(80).safeParse(readText(formData, "founderItemSlug"));
  const creationMode = readText(formData, "creationMode");
  if (!maxMembers.success || !founderItemSlug.success || !["free", "item"].includes(creationMode)) return { error: "กรุณาตรวจสอบค่าการตั้งค่าให้ถูกต้อง" };
  const freeUntilText = readText(formData, "freeUntil");
  const freeUntil = parseBangkokDateTime(freeUntilText);
  if (freeUntilText && !freeUntil) return { error: "ช่วงเวลาฟรีไม่ถูกต้อง" };
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { error } = await supabase.rpc("admin_update_guild_settings", { p_creation_mode: creationMode, p_free_until: freeUntil, p_founder_item_slug: founderItemSlug.data, p_max_members_cap: maxMembers.data });
  if (error) return { error: adminError(error) };
  revalidatePath("/admin/guilds");
  revalidatePath("/guilds");
  revalidatePath("/guilds/create");
  return { message: "บันทึกการตั้งค่า Guild แล้ว" };
}
