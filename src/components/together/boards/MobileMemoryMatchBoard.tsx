import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import {
  TogetherRoom,
  MemoryMatchState,
  GameStats,
} from '../../../states/togetherTypes';
import {
  Trophy,
  RotateCcw,
  Sparkles,
  Users,
  XCircle,
  Handshake,
  ArrowRightLeft,
} from 'lucide-react-native';

interface MobileMemoryMatchBoardProps {
  room: TogetherRoom;
  currentUserId: string;
  partnerName: string;
  onEmit: (event: string, data: any) => void;
  onLeaveGame?: () => void;
}

export const MobileMemoryMatchBoard: React.FC<MobileMemoryMatchBoardProps> = ({
  room,
  currentUserId,
  partnerName,
  onEmit,
  onLeaveGame,
}) => {
  const { theme } = useTheme();

  const participants = room.participants || [];
  const partnerId = participants.find((id) => id !== currentUserId) || '';

  const rawMM = room.state?.memoryMatch as MemoryMatchState | undefined;
  const totalPairsMatched = Math.floor((rawMM?.cards || []).filter((c) => c.isMatched).length / 2);
  const isUntouched = totalPairsMatched === 0 && (rawMM?.flippedCards || []).length === 0;
  const rawStatus = rawMM?.status;
  const resolvedStatus =
    rawStatus === 'setup'
      ? 'setup'
      : rawStatus === 'waiting' && participants.length >= 2
      ? 'setup'
      : rawStatus || (participants.length >= 2 ? (isUntouched ? 'setup' : 'playing') : 'waiting');

  const mmState: MemoryMatchState = rawMM || {
    cards: [],
    players: participants,
    scores: {},
    currentTurn: currentUserId,
    flippedCards: [],
    winner: null,
    isDraw: false,
    status: resolvedStatus,
  };

  const {
    cards = [],
    scores = {},
    currentTurn = null,
    flippedCards = [],
    winner = null,
  } = mmState;
  const status = mmState.status || resolvedStatus;

  const isMyTurn = currentTurn === currentUserId;

  const myScore = scores[currentUserId] || 0;
  const partnerScore = partnerId ? scores[partnerId] || 0 : 0;

  const sessionStats: GameStats =
    (currentUserId &&
      (room.sessionStats?.[`memory_${currentUserId}`] ||
        room.sessionStats?.[currentUserId])) || {
      wins: 0,
      losses: 0,
      ties: 0,
      total: 0,
    };

  // Auto flip back non-matching cards after 1.2s delay
  useEffect(() => {
    if (flippedCards.length === 2) {
      const timer = setTimeout(() => {
        onEmit('together:memory:resetFlipped', { roomId: room.roomId });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [flippedCards, room.roomId, onEmit]);

  const handleCardClick = (cardIndex: number) => {
    if (!isMyTurn || flippedCards.length >= 2) return;
    onEmit('together:memory:flipCard', { roomId: room.roomId, cardIndex });
  };

  const handleStartGame = () => {
    onEmit('together:memory:startGame', { roomId: room.roomId });
  };

  const handleSelectFirstPlayer = (firstPlayerId: string) => {
    let target = firstPlayerId;
    if (target === 'random') {
      target = Math.random() < 0.5 ? currentUserId : partnerId;
    }
    onEmit('together:memory:swapFirstTurn', { roomId: room.roomId, firstPlayerId: target });
  };

  const handleRestart = () => {
    onEmit('together:memory:restart', { roomId: room.roomId });
  };

  return (
    <View style={styles.container}>
      {/* Top Header & Stats */}
      <View style={[styles.topCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.titleWithIcon}>
            <Image
              source={require('../../../../assets/game-icons/memory.png')}
              style={styles.gameIcon}
            />
            <View>
              <Text style={[styles.gameTitle, { color: theme.foreground }]}>Memory Match</Text>
              <Text style={[styles.gameSubtitle, { color: theme.mutedText }]}>
                {status === 'playing'
                  ? isMyTurn
                    ? 'Your Turn to Flip!'
                    : "Partner's Turn"
                  : 'Card Flipping Challenge'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.smallIconBtn, { backgroundColor: theme.muted }]}
            onPress={handleRestart}
          >
            <RotateCcw size={14} color={theme.foreground} />
          </TouchableOpacity>
        </View>

        {/* Live Session Stats */}
        <View style={[styles.statsRow, { backgroundColor: theme.muted }]}>
          <View style={styles.statItem}>
            <Trophy size={11} color="#10b981" />
            <Text style={[styles.statText, { color: '#10b981' }]}>{sessionStats.wins} W</Text>
          </View>
          <View style={styles.statItem}>
            <XCircle size={11} color="#ef4444" />
            <Text style={[styles.statText, { color: '#ef4444' }]}>{sessionStats.losses} L</Text>
          </View>
          <View style={styles.statItem}>
            <Handshake size={11} color="#f59e0b" />
            <Text style={[styles.statText, { color: '#f59e0b' }]}>{sessionStats.ties} T</Text>
          </View>
          <Text style={[styles.statTotal, { color: theme.mutedText }]}>
            Matched: {totalPairsMatched} / 8
          </Text>
        </View>

        {/* Player Match Counters */}
        <View style={styles.scoresRow}>
          <View style={[styles.scoreBox, { backgroundColor: 'rgba(168,85,247,0.12)', borderColor: '#a855f7' }]}>
            <Text style={[styles.scoreLabel, { color: '#a855f7' }]}>YOU</Text>
            <Text style={[styles.scoreNumber, { color: '#a855f7' }]}>{myScore} pairs</Text>
          </View>
          <View style={[styles.scoreBox, { backgroundColor: 'rgba(236,72,153,0.12)', borderColor: '#ec4899' }]}>
            <Text style={[styles.scoreLabel, { color: '#ec4899' }]}>{partnerName.toUpperCase()}</Text>
            <Text style={[styles.scoreNumber, { color: '#ec4899' }]}>{partnerScore} pairs</Text>
          </View>
        </View>
      </View>

      {/* Setup First Turn Screen */}
      {status === 'setup' && (
        <View style={[styles.setupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.setupTitleRow}>
            <Sparkles size={14} color="#a855f7" />
            <Text style={[styles.setupTitle, { color: theme.foreground }]}>Who Flips First?</Text>
          </View>
          <Text style={[styles.setupDesc, { color: theme.mutedText }]}>
            Choose who flips the first pair of cards. Coordinate in live chat below!
          </Text>
          <View style={styles.firstTurnBtnsRow}>
            <TouchableOpacity
              style={[
                styles.turnOptionBtn,
                { backgroundColor: theme.input, borderColor: theme.border },
                currentTurn === currentUserId && { backgroundColor: '#a855f7', borderColor: '#a855f7' },
              ]}
              onPress={() => handleSelectFirstPlayer(currentUserId)}
            >
              <Text
                style={[
                  styles.turnOptionText,
                  { color: currentTurn === currentUserId ? '#fff' : theme.foreground },
                ]}
              >
                You First
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.turnOptionBtn,
                { backgroundColor: theme.input, borderColor: theme.border },
                currentTurn === partnerId && { backgroundColor: '#ec4899', borderColor: '#ec4899' },
              ]}
              onPress={() => handleSelectFirstPlayer(partnerId)}
            >
              <Text
                style={[
                  styles.turnOptionText,
                  { color: currentTurn === partnerId ? '#fff' : theme.foreground },
                ]}
              >
                {partnerName} First
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.turnOptionBtn, { backgroundColor: theme.input, borderColor: theme.border }]}
              onPress={() => handleSelectFirstPlayer('random')}
            >
              <Text style={[styles.turnOptionText, { color: theme.foreground }]}>🎲 Rand</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.startGameBtn} onPress={handleStartGame}>
            <Text style={styles.startGameBtnText}>🚀 Start Match</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Swap Button when cards are untouched */}
      {status === 'playing' && isUntouched && (
        <TouchableOpacity
          style={[styles.quickSwapBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
          onPress={() => handleSelectFirstPlayer(currentTurn === currentUserId ? partnerId : currentUserId)}
        >
          <ArrowRightLeft size={13} color={theme.accent} style={{ marginRight: 6 }} />
          <Text style={[styles.quickSwapText, { color: theme.accent }]}>
            Swap Turn: {currentTurn === currentUserId ? 'You flip 1st' : `${partnerName} flips 1st`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Status Banners */}
      {status === 'playing' && (
        <View
          style={[
            styles.banner,
            isMyTurn
              ? { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981' }
              : { backgroundColor: theme.muted, borderColor: theme.border },
          ]}
        >
          {isMyTurn && <Sparkles size={14} color="#10b981" style={{ marginRight: 6 }} />}
          <Text style={[styles.bannerText, { color: isMyTurn ? '#10b981' : theme.foreground }]}>
            {isMyTurn ? "It's Your Turn! Tap cards to reveal pairs" : `Waiting for ${partnerName}'s flip...`}
          </Text>
        </View>
      )}

      {status === 'finished' && (
        <View
          style={[
            styles.resultBanner,
            winner === currentUserId
              ? { backgroundColor: 'rgba(245,158,11,0.2)', borderColor: '#f59e0b' }
              : winner
              ? { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }
              : { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: '#a855f7' },
          ]}
        >
          {winner === currentUserId ? (
            <View style={styles.resultContent}>
              <Trophy size={18} color="#f59e0b" style={{ marginRight: 6 }} />
              <Text style={[styles.resultTitle, { color: '#f59e0b' }]}>Victory! You Found More Pairs! 🎉</Text>
            </View>
          ) : winner ? (
            <Text style={[styles.resultTitle, { color: '#ef4444' }]}>
              {partnerName} Won! Better luck next time 💔
            </Text>
          ) : (
            <Text style={[styles.resultTitle, { color: '#a855f7' }]}>Equal Pairs! It's a Tie! 🤝</Text>
          )}
        </View>
      )}

      {/* 4x4 Card Grid */}
      {(status === 'playing' || status === 'finished') && (
        <View style={[styles.gridCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardGrid}>
            {cards.map((card, idx) => {
              const isFlipped =
                card.isFlipped ||
                card.isMatched ||
                flippedCards.includes(idx);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.memoryCard,
                    { backgroundColor: theme.input, borderColor: theme.border },
                    isFlipped && {
                      backgroundColor: card.isMatched ? 'rgba(16,185,129,0.2)' : 'rgba(168,85,247,0.2)',
                      borderColor: card.isMatched ? '#10b981' : '#a855f7',
                    },
                  ]}
                  onPress={() => handleCardClick(idx)}
                  disabled={isFlipped || !isMyTurn || flippedCards.length >= 2}
                >
                  <Text style={styles.cardEmoji}>{isFlipped ? card.emoji : '❓'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Action Footer */}
      <View style={styles.actionFooter}>
        <TouchableOpacity
          style={[styles.rematchBtn, { backgroundColor: theme.accent }]}
          onPress={handleRestart}
        >
          <RotateCcw size={15} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.rematchBtnText}>Restart Match</Text>
        </TouchableOpacity>

        {onLeaveGame && (
          <TouchableOpacity
            style={[styles.switchGameBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
            onPress={onLeaveGame}
          >
            <Users size={14} color={theme.foreground} style={{ marginRight: 6 }} />
            <Text style={[styles.switchGameBtnText, { color: theme.foreground }]}>Switch Game</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  topCard: {
    width: '100%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  gameTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  gameSubtitle: {
    fontSize: 10,
    fontWeight: '600',
  },
  smallIconBtn: {
    padding: 6,
    borderRadius: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statTotal: {
    fontSize: 10,
    fontWeight: '600',
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreBox: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  scoreNumber: {
    fontSize: 15,
    fontWeight: '900',
  },
  setupCard: {
    width: '100%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  setupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setupTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  setupDesc: {
    fontSize: 10,
    textAlign: 'center',
  },
  firstTurnBtnsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 6,
  },
  turnOptionBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnOptionText: {
    fontSize: 10,
    fontWeight: '700',
  },
  startGameBtn: {
    width: '100%',
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  startGameBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  banner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resultBanner: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  gridCard: {
    width: '100%',
    maxWidth: 320,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  cardGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  memoryCard: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 24,
  },
  actionFooter: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  rematchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
  },
  rematchBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  switchGameBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  switchGameBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickSwapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  quickSwapText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
