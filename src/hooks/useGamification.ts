import { useState, useEffect, useCallback, useRef } from "react";
import { getSocket } from "./useSocket";
import { apiFetch } from "../utils/apiFetch";
import { getApiUrl } from "../utils/apiUrl";
import {
  PairGamificationState,
  GamificationResultPayload,
} from "../states/togetherTypes";

export function useGamification(partnerId?: string | null) {
  const [gamificationState, setGamificationState] = useState<PairGamificationState | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<GamificationResultPayload | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPairGamification = useCallback(async () => {
    if (!partnerId) {
      setGamificationState(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`${getApiUrl()}/api/gamification/pair/${partnerId}`);
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current && data.success) {
          setGamificationState(data.data);
        }
      }
    } catch (err) {
      console.error("[useGamification] Error fetching pair state:", err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [partnerId]);

  useEffect(() => {
    fetchPairGamification();
  }, [fetchPairGamification]);

  // Listen for socket result events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleGamificationResult = (result: GamificationResultPayload) => {
      if (!result) return;
      if (mountedRef.current) {
        setLastResult(result);
        setShowResultModal(true);

        // Optimistically update pair summary & game progress
        setGamificationState((prev) => {
          if (!prev) return prev;
          const updatedGames = prev.games.map((g) => {
            if (g.gameId === result.gameId) {
              return {
                ...g,
                currentLevel: result.levelInfo?.currentLevel || g.currentLevel,
                highestLevelAchieved: Math.max(
                  g.highestLevelAchieved,
                  result.levelInfo?.currentLevel || g.currentLevel
                ),
                combinedPlays: g.combinedPlays + 1,
              };
            }
            return g;
          });

          return {
            ...prev,
            summary: result.summary || prev.summary,
            games: updatedGames,
          };
        });

        // Re-fetch in background to ensure all unlock statuses are fully synchronized
        fetchPairGamification();
      }
    };

    socket.on("together:gamification:result", handleGamificationResult);

    return () => {
      socket.off("together:gamification:result", handleGamificationResult);
    };
  }, [fetchPairGamification]);

  const isGameUnlocked = useCallback(
    (gameId: string) => {
      if (!gamificationState) return true; // Default fallback to allow play
      const game = gamificationState.games.find((g) => g.gameId === gameId);
      return game ? game.isUnlocked : true;
    },
    [gamificationState]
  );

  const getGameLevel = useCallback(
    (gameId: string) => {
      if (!gamificationState) return 1;
      const game = gamificationState.games.find((g) => g.gameId === gameId);
      return game ? game.currentLevel : 1;
    },
    [gamificationState]
  );

  const dismissResultModal = useCallback(() => {
    setShowResultModal(false);
  }, []);

  return {
    gamificationState,
    loading,
    lastResult,
    showResultModal,
    isGameUnlocked,
    getGameLevel,
    dismissResultModal,
    refetch: fetchPairGamification,
  };
}
