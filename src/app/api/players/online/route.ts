import { getAuthenticatedUser } from "@/lib/supabase-server";
import { getOnlinePlayers } from "@/lib/player-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const players = await getOnlinePlayers(user?.id ?? null);

    return Response.json(
      {
        players,
        currentUserId: user?.id ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      }
    );
  } catch (err) {
    return Response.json(
      { players: [], currentUserId: null, error: "Failed to load players" },
      { status: 500, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
