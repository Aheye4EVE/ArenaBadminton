"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type MarketplaceActionState = { error?: string; message?: string; listingId?: string; orderId?: string };
const uuid = z.string().uuid();
const optional = (max: number) => z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(max).optional());
function text(formData: FormData, key: string) { const value = formData.get(key); return typeof value === "string" ? value : ""; }
function returned(data: unknown) { return Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : data as Record<string, unknown> | undefined; }
function marketplaceError(error: { message?: string; code?: string }) { const message = (error.message ?? "").toLowerCase(); if (message.includes("authentication")) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง"; if (message.includes("seller cannot")) return "ไม่สามารถขอซื้อสินค้าของตัวเองได้"; if (message.includes("no longer available")) return "สินค้านี้มีคนจองหรือขายไปแล้ว"; if (message.includes("purchase request")) return "ไม่พบคำขอซื้อสินค้า"; if (message.includes("only the seller")) return "เฉพาะผู้ขายเท่านั้นที่จัดการคำขอซื้อได้"; if (message.includes("invalid marketplace")) return "ข้อมูลประกาศขายไม่ถูกต้อง"; if (error.code === "23505") return "คุณส่งคำขอนี้ไปแล้ว"; return "ไม่สามารถทำรายการ Marketplace ได้ กรุณาลองใหม่อีกครั้ง"; }
async function requireCompletedProfile() { const result = await getAuthenticatedProfile(); if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required"); if (!result.profile?.profile_completed_at) redirect("/profile/setup"); return result; }

export async function createMarketplaceListingAction(_previousState: MarketplaceActionState, formData: FormData): Promise<MarketplaceActionState> {
  const parsed = z.object({ title: z.string().trim().min(1).max(160), description: optional(3000), category: z.enum(["racket", "shoes", "bag", "apparel", "equipment", "other"]), conditionGrade: z.enum(["new", "like_new", "good", "fair", "for_parts"]), price: z.coerce.number().min(0).max(100_000_000), province: optional(80), district: optional(80), subdistrict: optional(80), imageUrl: optional(2048) }).safeParse({ title: text(formData, "title"), description: text(formData, "description"), category: text(formData, "category"), conditionGrade: text(formData, "conditionGrade"), price: text(formData, "price"), province: text(formData, "province"), district: text(formData, "district"), subdistrict: text(formData, "subdistrict"), imageUrl: text(formData, "imageUrl") });
  if (!parsed.success) return { error: "กรุณากรอกรายละเอียดสินค้าที่จำเป็นให้ครบ" };
  const imageUrl = parsed.data.imageUrl?.trim() || null;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (imageUrl && (!publicBaseUrl || !imageUrl.startsWith(`${publicBaseUrl}/`))) return { error: "รูปสินค้าต้องมาจากพื้นที่สื่อของ Arena เท่านั้น" };
  const { supabase } = await requireCompletedProfile();
  const { data, error } = await supabase.rpc("create_marketplace_listing", { p_title: parsed.data.title, p_description: parsed.data.description ?? "", p_category: parsed.data.category, p_condition_grade: parsed.data.conditionGrade, p_price: parsed.data.price, p_province: parsed.data.province ?? null, p_district: parsed.data.district ?? null, p_subdistrict: parsed.data.subdistrict ?? null, p_image_url: imageUrl });
  if (error) return { error: marketplaceError(error) };
  const row = returned(data);
  const listingId = typeof row?.id === "string" ? row.id : "";
  if (!listingId) return { error: "สร้างประกาศสำเร็จแต่ไม่พบรหัสสินค้า" };
  revalidatePath("/marketplace");
  redirect(`/marketplace/${listingId}`);
}

export async function requestMarketplacePurchaseAction(_previousState: MarketplaceActionState, formData: FormData): Promise<MarketplaceActionState> {
  const listingId = uuid.safeParse(text(formData, "listingId"));
  const message = z.string().trim().max(1000).safeParse(text(formData, "message"));
  if (!listingId.success || !message.success) return { error: "ข้อมูลคำขอซื้อไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { data, error } = await supabase.rpc("request_marketplace_purchase", { p_listing_id: listingId.data, p_message: message.data });
  if (error) return { error: marketplaceError(error) };
  const row = returned(data);
  revalidatePath(`/marketplace/${listingId.data}`);
  revalidatePath("/marketplace");
  return { message: "ส่งคำขอซื้อแล้ว ผู้ขายจะติดต่อกลับผ่าน Messenger", orderId: typeof row?.id === "string" ? row.id : undefined };
}

export async function updateMarketplaceOrderAction(_previousState: MarketplaceActionState, formData: FormData): Promise<MarketplaceActionState> {
  const orderId = uuid.safeParse(text(formData, "orderId"));
  const decision = z.enum(["accept", "reject", "complete", "cancel"]).safeParse(text(formData, "decision"));
  const listingId = uuid.safeParse(text(formData, "listingId"));
  if (!orderId.success || !decision.success || !listingId.success) return { error: "คำสั่งซื้อไม่ถูกต้อง" };
  const { supabase } = await requireCompletedProfile();
  const { error } = await supabase.rpc("update_marketplace_order", { p_order_id: orderId.data, p_decision: decision.data });
  if (error) return { error: marketplaceError(error) };
  revalidatePath(`/marketplace/${listingId.data}`);
  revalidatePath("/marketplace");
  return { message: decision.data === "accept" ? "รับคำขอซื้อแล้ว" : decision.data === "complete" ? "ปิดการขายแล้ว" : decision.data === "reject" ? "ปฏิเสธคำขอแล้ว" : "ยกเลิกคำขอแล้ว" };
}
