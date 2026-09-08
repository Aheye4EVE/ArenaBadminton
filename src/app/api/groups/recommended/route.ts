import { getRecommendedGroups } from "@/lib/group-recommendations";
import { normalizeCoordinates } from "@/lib/geolocation";
import { getAuthenticatedProfile, getSupabasePublicServerClient } from "@/lib/supabase-server";

export async function GET() {
  const context = await getAuthenticatedProfile();
  const supabase = context.user ? context.supabase : (getSupabasePublicServerClient() ?? context.supabase);

  if (!supabase) {
    return Response.json({ items: [], locationMode: "public" }, { headers: { "Cache-Control": "public, s-maxage=30" } });
  }

  try {
    const items = await getRecommendedGroups({
      supabase,
      user: context.user,
      profile: context.profile,
    });
    return Response.json({
      items,
      locationMode: context.user ? "profile" : "public",
    }, {
      headers: { "Cache-Control": context.user ? "private, no-store" : "public, s-maxage=30" },
    });
  } catch {
    return Response.json({ error: "โหลดก๊วนแนะนำไม่สำเร็จ กรุณาลองใหม่" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function POST(request: Request) {
  const context = await getAuthenticatedProfile();
  const supabase = context.user ? context.supabase : (getSupabasePublicServerClient() ?? context.supabase);

  if (!supabase) {
    return Response.json({ error: "ระบบไม่พร้อมใช้งานชั่วคราว" }, { status: 503 });
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
    const items = await getRecommendedGroups({
      supabase,
      user: context.user,
      profile: context.profile,
    }, { coordinates });
    return Response.json({ items, locationMode: "gps" }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "โหลดก๊วนใกล้คุณไม่สำเร็จ กรุณาลองใหม่" }, { status: 503 });
  }
}
