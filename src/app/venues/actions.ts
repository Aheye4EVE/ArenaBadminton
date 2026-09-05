"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type VenueActionState = { error?: string; message?: string };

const uuidSchema = z.string().uuid();
const ratingSchema = z.coerce.number().int().min(1).max(5);

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function venueError(error: { message?: string; code?: string }) {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("authentication")) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";
  if (message.includes("venue not found")) return "ไม่พบสนามนี้ หรือสนามไม่ได้เปิดให้บริการแล้ว";
  if (message.includes("rating")) return "คะแนนต้องอยู่ระหว่าง 1 ถึง 5 ดาว";
  if (message.includes("too long")) return "รีวิวมีความยาวเกินกำหนด";
  if (error.code === "22023") return "ข้อมูลรีวิวไม่ถูกต้อง";
  return "บันทึกรีวิวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export async function upsertVenueReviewAction(_previousState: VenueActionState, formData: FormData): Promise<VenueActionState> {
  const venueId = uuidSchema.safeParse(text(formData, "venueId"));
  const rating = ratingSchema.safeParse(text(formData, "rating"));
  const body = z.string().trim().max(1000).safeParse(text(formData, "body"));
  if (!venueId.success || !rating.success || !body.success) return { error: "กรุณาตรวจสอบคะแนนและข้อความรีวิว" };
  const { supabase } = await getAuthenticatedProfile();
  if (!supabase) redirect("/auth/login?message=auth_required");
  const { error } = await supabase.rpc("upsert_venue_review", { p_venue_id: venueId.data, p_rating: rating.data, p_body: body.data });
  if (error) return { error: venueError(error) };
  revalidatePath("/venues");
  revalidatePath(`/venues/${venueId.data}`);
  return { message: "บันทึกรีวิวสนามแล้ว ขอบคุณที่ช่วยแชร์ประสบการณ์" };
}
