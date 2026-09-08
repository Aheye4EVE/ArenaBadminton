"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { OnlinePlayerItem } from "@/lib/player-summary";

export function usePlayerPresence(currentUserId?: string | null, isAuthenticated?: boolean) {
  const [players, setPlayers] = useState<OnlinePlayerItem[]>([]);
  const [liveOnlineIds, setLiveOnlineIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/players/online");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.players)) {
          setPlayers(data.players);
        }
      }
    } catch {
      // Keep existing players on network hiccup
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Periodic polling for player list (every 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPlayers();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchPlayers]);

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

  return {
    players,
    liveOnlineIds,
    isLoading,
    refresh: fetchPlayers,
  };
}
