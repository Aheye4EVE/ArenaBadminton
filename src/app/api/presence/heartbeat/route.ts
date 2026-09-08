import { getAuthenticatedUser, getSupabasePublicServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ success: false, authenticated: false }, { status: 200 });
    }

    const supabase = getSupabasePublicServerClient();
    if (!supabase) {
      return Response.json({ success: false, error: "Database unavailable" }, { status: 503 });
    }

    const now = new Date().toISOString();
    await supabase.from("profiles").update({ updated_at: now }).eq("id", user.id);

    return Response.json(
      { success: true, authenticated: true, timestamp: now },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: "Failed to update heartbeat" },
      { status: 500, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
