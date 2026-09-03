"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export type CommunityActionState = {
  error?: string;
  message?: string;
};

const uuidSchema = z.string().uuid("โพสต์ไม่ถูกต้อง");
const postBodySchema = z.string().trim().min(1, "กรุณาเขียนข้อความก่อนโพสต์").max(2000, "โพสต์ยาวเกิน 2,000 ตัวอักษร");
const commentBodySchema = z.string().trim().min(1, "กรุณาเขียนความคิดเห็นก่อนส่ง").max(1000, "ความคิดเห็นยาวเกิน 1,000 ตัวอักษร");
const imageUrlSchema = z.string().trim().url("รูปภาพไม่ถูกต้อง").max(2048, "ที่อยู่รูปภาพยาวเกินไป");

function formText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function requireUser() {
  const result = await getAuthenticatedProfile();
  if (!result.supabase || !result.user) redirect("/auth/login?message=auth_required");
  if (!result.profile?.profile_completed_at) redirect("/profile/setup");
  return result;
}

export async function createPostAction(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const body = postBodySchema.safeParse(formText(formData, "body"));
  if (!body.success) return { error: body.error.issues[0]?.message ?? "โพสต์ไม่ถูกต้อง" };

  const rawImageUrl = formText(formData, "imageUrl");
  let imageUrl: string | null = null;
  if (rawImageUrl) {
    const parsedImageUrl = imageUrlSchema.safeParse(rawImageUrl);
    const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
    if (!parsedImageUrl.success || !publicBaseUrl || !parsedImageUrl.data.startsWith(`${publicBaseUrl}/`)) {
      return { error: "รูปภาพต้องมาจากพื้นที่สื่อของ Arena ที่ตั้งค่าไว้เท่านั้น" };
    }
    imageUrl = parsedImageUrl.data;
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("social_posts").insert({ user_id: user.id, body: body.data, image_url: imageUrl, status: "published" });
  if (error) return { error: "สร้างโพสต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  revalidatePath("/community");
  return { message: "เผยแพร่โพสต์แล้ว" };
}

export async function createCommentAction(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const postId = uuidSchema.safeParse(formText(formData, "postId"));
  const body = commentBodySchema.safeParse(formText(formData, "body"));
  if (!postId.success) return { error: "โพสต์ไม่ถูกต้อง" };
  if (!body.success) return { error: body.error.issues[0]?.message ?? "ความคิดเห็นไม่ถูกต้อง" };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("social_post_comments").insert({ post_id: postId.data, user_id: user.id, body: body.data, status: "published" });
  if (error) return { error: "ส่งความคิดเห็นไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  revalidatePath("/community");
  return { message: "ส่งความคิดเห็นแล้ว" };
}

export async function toggleLikeAction(_previousState: CommunityActionState, formData: FormData): Promise<CommunityActionState> {
  const postId = uuidSchema.safeParse(formText(formData, "postId"));
  if (!postId.success) return { error: "โพสต์ไม่ถูกต้อง" };

  const { supabase, user } = await requireUser();
  const { data: existing, error: readError } = await supabase
    .from("social_post_likes")
    .select("post_id")
    .eq("post_id", postId.data)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return { error: "ตรวจสอบ Like ไม่สำเร็จ" };

  if (existing) {
    const { error } = await supabase.from("social_post_likes").delete().eq("post_id", postId.data).eq("user_id", user.id);
    if (error) return { error: "ยกเลิก Like ไม่สำเร็จ" };
  } else {
    const { error } = await supabase.from("social_post_likes").insert({ post_id: postId.data, user_id: user.id });
    if (error) return { error: "กด Like ไม่สำเร็จ" };
  }

  revalidatePath("/community");
  return { message: existing ? "ยกเลิก Like แล้ว" : "กด Like แล้ว" };
}
