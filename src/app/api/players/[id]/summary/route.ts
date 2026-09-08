import { getAuthenticatedUser } from "@/lib/supabase-server";
import { getPlayerPublicSummary } from "@/lib/player-summary";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    if (!id) {
      return Response.json({ error: "Missing player ID" }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    const summary = await getPlayerPublicSummary(id, user?.id ?? null);

    if (!summary) {
      return Response.json({ error: "Player not found" }, { status: 404 });
    }

    return Response.json(
      { player: summary },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (err) {
    return Response.json(
      { error: "Failed to load player summary" },
      { status: 500, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
