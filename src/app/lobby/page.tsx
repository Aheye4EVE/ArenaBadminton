import type { Metadata } from "next";
import ArenaLobbyBrowser from "@/components/arena-lobby-browser";
import { getLobbyPlayers } from "@/lib/player-summary";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arena Lobby | Arena-Badminton",
  description: "ดูผู้เล่นใน Arena Lobby และส่อง Arena Pass ของเพื่อนนักแบด",
};

function shufflePlayers<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export default async function ArenaLobbyPage() {
  const user = await getAuthenticatedUser();
  const players = shufflePlayers(await getLobbyPlayers(user?.id ?? null));

  return (
    <ArenaLobbyBrowser
      initialPlayers={players}
      currentUserId={user?.id ?? null}
      isAuthenticated={Boolean(user)}
    />
  );
}
