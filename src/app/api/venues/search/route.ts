import { getAuthenticatedProfile } from "@/lib/supabase-server";
import { normalizeCoordinates, type GeoCoordinates } from "@/lib/geolocation";
import { directoryFilters, searchVenues } from "@/lib/venue-directory";

async function search(
  request: Request,
  coordinates: GeoCoordinates | null = null,
) {
  const { supabase, user } = await getAuthenticatedProfile();
  if (!supabase || !user)
    return Response.json(
      { error: "กรุณาเข้าสู่ระบบเพื่อเลือกสนาม" },
      { status: 401 },
    );
  try {
    return Response.json(
      await searchVenues(
        supabase,
        directoryFilters(new URL(request.url).searchParams),
        600,
        coordinates,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { error: "โหลดรายชื่อสนามไม่สำเร็จ กรุณาลองใหม่" },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  return search(request);
}

export async function POST(request: Request) {
  let coordinates: GeoCoordinates | null = null;
  try {
    const payload = (await request.json()) as {
      latitude?: unknown;
      longitude?: unknown;
    };
    const hasLatitude =
      payload && Object.prototype.hasOwnProperty.call(payload, "latitude");
    const hasLongitude =
      payload && Object.prototype.hasOwnProperty.call(payload, "longitude");
    if (!hasLatitude || !hasLongitude)
      return Response.json(
        { error: "ข้อมูลตำแหน่งไม่ครบถ้วน" },
        { status: 400 },
      );
    coordinates = normalizeCoordinates(payload.latitude, payload.longitude);
  } catch {
    return Response.json({ error: "ข้อมูลตำแหน่งไม่ถูกต้อง" }, { status: 400 });
  }
  if (!coordinates)
    return Response.json({ error: "ข้อมูลตำแหน่งไม่ถูกต้อง" }, { status: 400 });
  return search(request, coordinates);
}
