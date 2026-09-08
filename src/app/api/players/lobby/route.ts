import { getAuthenticatedUser } from "@/lib/supabase-server";
import { getLobbyPlayers } from "@/lib/player-summary";

export const dynamic = "force-dynamic";

/**
 * Returns the safe public player directory used by the full Arena Lobby.
 * Private profile fields never leave getLobbyPlayers().
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const players = await getLobbyPlayers(user?.id ?? null);

    return Response.json(
      {
        players,
        currentUserId: user?.id ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      },
    );
  } catch {
    return Response.json(
      { players: [], currentUserId: null, error: "Failed to load lobby players" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, private" },
      },
    );
  }
}
