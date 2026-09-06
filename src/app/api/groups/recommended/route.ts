import { getRecommendedGroups } from "@/lib/group-recommendations";
import { normalizeCoordinates } from "@/lib/geolocation";
import { getAuthenticatedProfile } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const context = await getAuthenticatedProfile();
  if (!context.supabase || !context.user) {
    return Response.json({ error: "กรุณาเข้าสู่ระบบเพื่อใช้การค้นหาตามตำแหน่ง" }, { status: 401 });
  }

  let coordinates: ReturnType<typeof normalizeCoordinates> = null;
  try {
    const payload = await request.json() as { latitude?: unknown; longitude?: unknown };
    const hasLatitude = payload && Object.prototype.hasOwnProperty.call(payload, "latitude");
    const hasLongitude = payload && Object.prototype.hasOwnProperty.call(payload, "longitude");
    if (!hasLatitude || !hasLongitude) {
      return Response.json({ error: "ข้อมูลตำแหน่งไม่ครบถ้วน" }, { status: 400 });
    }
    coordinates = normalizeCoordinates(payload.latitude, payload.longitude);
  } catch {
    return Response.json({ error: "ข้อมูลตำแหน่งไม่ถูกต้อง" }, { status: 400 });
  }

  if (!coordinates) {
    return Response.json({ error: "ข้อมูลตำแหน่งไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const items = await getRecommendedGroups(context, { coordinates });
    return Response.json({ items, locationMode: "gps" }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "โหลดก๊วนใกล้คุณไม่สำเร็จ กรุณาลองใหม่" }, { status: 503 });
  }
}
