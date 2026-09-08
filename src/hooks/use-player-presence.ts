"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { OnlinePlayerItem } from "@/lib/player-summary";
import { PLAYER_ONLINE_WINDOW_SECONDS } from "@/lib/player-presence";

export type PlayerPresenceScope = "online" | "all";

type PlayerPresenceOptions = {
  scope?: PlayerPresenceScope;
  initialPlayers?: OnlinePlayerItem[];
};

function preservePlayerOrder(current: OnlinePlayerItem[], next: OnlinePlayerItem[]) {
  const nextById = new Map(next.map((player) => [player.id, player]));
  const currentIds = new Set<string>();
  const retained = current.flatMap((player) => {
    const updated = nextById.get(player.id);
    if (!updated) return [];
    currentIds.add(player.id);
    return [updated];
  });
  return [...retained, ...next.filter((player) => !currentIds.has(player.id))];
}

export function usePlayerPresence(
  currentUserId?: string | null,
  isAuthenticated?: boolean,
  options: PlayerPresenceOptions = {},
) {
  const scope = options.scope ?? "online";
  const initialPlayers = options.initialPlayers ?? [];
  const [players, setPlayers] = useState<OnlinePlayerItem[]>(initialPlayers);
  const [liveOnlineIds, setLiveOnlineIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(initialPlayers.length === 0);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch(scope === "all" ? "/api/players/lobby" : "/api/players/online", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.players)) {
          setPlayers((current) => scope === "all"
            ? preservePlayerOrder(current, data.players)
            : data.players.slice(0, 10));
        }
      }
    } catch {
      // Keep existing players on network hiccup
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  // Initial load
  useEffect(() => {
    const initialLoad = window.setTimeout(() => void fetchPlayers(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchPlayers]);

  // Periodic polling for player list (every 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchPlayers();
    }, scope === "all" ? 60000 : 30000);
    return () => clearInterval(interval);
  }, [fetchPlayers, scope]);

  // Supabase Realtime Presence channel
  useEffect(() => {
    let client: ReturnType<typeof getSupabaseBrowserClient>;
    try {
      client = getSupabaseBrowserClient();
    } catch {
      return;
    }

    const channel = client.channel("lobby-presence", {
      config: {
        presence: {
          key: currentUserId || "guest-" + Math.random().toString(36).slice(2, 8),
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const activeIds = new Set<string>();
        for (const key of Object.keys(state)) {
          const presences = state[key] as Array<{ user_id?: string }>;
          for (const p of presences) {
            if (p.user_id) {
              activeIds.add(p.user_id);
            }
          }
        }
        setLiveOnlineIds(activeIds);
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED" && isAuthenticated && currentUserId) {
          await channel.track({
            user_id: currentUserId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [currentUserId, isAuthenticated]);

  // Heartbeat ping (every 45s if authenticated)
  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;

    const sendHeartbeat = async () => {
      try {
        await fetch("/api/presence/heartbeat", { method: "POST" });
      } catch {
        // Ignore background heartbeat error
      }
    };

    // Send immediately once
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 45000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
        fetchPlayers();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, currentUserId, fetchPlayers]);

  const isOnline = useCallback((player: OnlinePlayerItem) => (
    liveOnlineIds.has(player.id) || player.secondsAgo <= PLAYER_ONLINE_WINDOW_SECONDS
  ), [liveOnlineIds]);

  return {
    players,
    liveOnlineIds,
    isLoading,
    isOnline,
    refresh: fetchPlayers,
  };
}
