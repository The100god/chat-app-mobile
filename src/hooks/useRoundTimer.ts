import { useState, useEffect } from 'react';
import { TogetherRoom } from '../states/togetherTypes';

export function useRoundTimer(room?: TogetherRoom | null): {
  timeLeft: number;
  totalTimeSec: number;
  isLowTime: boolean;
} {
  const [timeLeft, setTimeLeft] = useState<number>(30);

  const gameKey =
    room?.gameId === 'tictactoe' ? 'ticTacToe' :
    room?.gameId === 'connect4' ? 'connect4' :
    room?.gameId === 'memory' ? 'memoryMatch' :
    room?.gameId === 'rps' ? 'rps' :
    room?.gameId === 'catchpartner' ? 'catchPartner' :
    room?.gameId === 'quiz' ? 'quiz' :
    room?.gameId === 'drawing' ? 'drawing' : null;

  const sub = gameKey ? (room?.state as any)?.[gameKey] : null;

  const totalTimeSec =
    sub?.timeSec ||
    (room?.state as any)?.levelConfig?.timeSec ||
    (room?.gameId === 'rps' ? 15 : room?.gameId === 'memory' ? 25 : 30);

  useEffect(() => {
    if (!room || room.type !== 'game') {
      setTimeLeft(30);
      return;
    }

    if (room.gameId === 'catchpartner' && typeof sub?.timer === 'number') {
      setTimeLeft(sub.timer);
      return;
    }

    const startTs =
      sub?.turnStartedAt ||
      sub?.roundStartedAt ||
      (room.state as any)?.turnStartedAt ||
      (room as any)?.createdAt ||
      Date.now();

    const calcTime = () => {
      const elapsed = Math.floor((Date.now() - startTs) / 1000);
      const remaining = Math.max(0, totalTimeSec - elapsed);
      setTimeLeft(remaining);
    };

    calcTime();
    const interval = setInterval(calcTime, 500);
    return () => clearInterval(interval);
  }, [
    room?.gameId,
    totalTimeSec,
    sub?.turnStartedAt,
    sub?.roundStartedAt,
    sub?.currentTurn,
    sub?.round,
    sub?.timer,
    sub?.currentQuestionIndex,
    (room?.state as any)?.currentLevel,
  ]);

  return {
    timeLeft,
    totalTimeSec,
    isLowTime: timeLeft > 0 && timeLeft <= 5,
  };
}
