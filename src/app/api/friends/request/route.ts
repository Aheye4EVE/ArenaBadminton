import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

function friendError(error: { message?: string; code?: string }) {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("authentication")) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";
  if (message.includes("profile completion")) return "กรุณากรอก Profile ให้ครบก่อนเพิ่มเพื่อน";
  if (message.includes("already friends")) return "คุณเป็นเพื่อนกับผู้เล่นคนนี้อยู่แล้ว";
  if (message.includes("already pending")) return "ส่งคำขอเป็นเพื่อนไปแล้ว กำลังรอการตอบรับ";
  if (message.includes("incoming friend request")) return "ผู้เล่นคนนี้ส่งคำขอมาให้คุณแล้ว ไปที่คำขอเข้าเพื่อกดรับได้เลย";
  if (message.includes("not found")) return "คำขอเป็นเพื่อนนี้ไม่พร้อมใช้งานแล้ว";
  if (message.includes("access denied") || message.includes("only the recipient")) return "คุณไม่มีสิทธิ์จัดการคำขอนี้";
  if (message.includes("invalid")) return "ข้อมูลเพื่อนไม่ถูกต้อง";
  if (error.code === "23505") return "คำขอนี้มีอยู่แล้ว";
  return "จัดการเพื่อนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await getAuthenticatedProfile();
    if (!supabase || !user) {
      return Response.json(
        { success: false, error: "กรุณาเข้าสู่ระบบก่อนเพิ่มเพื่อน", requireAuth: true },
        { status: 401 }
      );
    }

    if (!profile?.profile_completed_at) {
      return Response.json(
        { success: false, error: "กรุณากรอก Profile ให้ครบก่อนเพิ่มเพื่อน", requireProfile: true },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = uuidSchema.safeParse(body?.otherUserId);
    if (!parsed.success) {
      return Response.json({ success: false, error: "รหัสผู้เล่นไม่ถูกต้อง" }, { status: 400 });
    }

    const { error } = await supabase.rpc("send_friend_request", {
      p_other_user_id: parsed.data,
    });

    if (error) {
      return Response.json({ success: false, error: friendError(error) }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: "ส่งคำขอเป็นเพื่อนเรียบร้อยแล้ว",
    });
  } catch (err) {
    return Response.json(
      { success: false, error: "เกิดข้อผิดพลาดในการส่งคำขอเป็นเพื่อน" },
      { status: 500 }
    );
  }
}
