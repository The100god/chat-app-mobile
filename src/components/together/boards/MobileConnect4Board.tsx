import React from 'react';
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
  Connect4State,
  GameStats,
} from '../../../states/togetherTypes';
import {
  Trophy,
  RotateCcw,
  Sparkles,
  Users,
  XCircle,
  Handshake,
  ArrowDown,
  ArrowRightLeft,
} from 'lucide-react-native';

interface MobileConnect4BoardProps {
  room: TogetherRoom;
  currentUserId: string;
  partnerName: string;
  onEmit: (event: string, data: any) => void;
  onLeaveGame?: () => void;
}

export const MobileConnect4Board: React.FC<MobileConnect4BoardProps> = ({
  room,
  currentUserId,
  partnerName,
  onEmit,
  onLeaveGame,
}) => {
  const { theme } = useTheme();

  const participants = room.participants || [];
  const partnerId = participants.find((id) => id !== currentUserId) || '';

  const rawC4 = room.state?.connect4 as Connect4State | undefined;
  const isBoardEmpty = !rawC4?.board || rawC4.board.every((row) => row.every((cell) => cell === null));
  const rawStatus = rawC4?.status;
  const resolvedStatus =
    rawStatus === 'setup'
      ? 'setup'
      : rawStatus === 'waiting' && participants.length >= 2
      ? 'setup'
      : rawStatus || (participants.length >= 2 ? (isBoardEmpty ? 'setup' : 'playing') : 'waiting');

  const c4State: Connect4State = rawC4 || {
    board: Array(6)
      .fill(null)
      .map(() => Array(7).fill(null)),
    players: { R: room.hostId, Y: partnerId || null },
    currentTurn: 'R',
    winner: null,
    winningLine: null,
    isDraw: false,
    status: resolvedStatus,
  };

  const {
    board = Array(6)
      .fill(null)
      .map(() => Array(7).fill(null)),
    players = { R: room.hostId, Y: partnerId },
    currentTurn = 'R',
    winner = null,
    winningLine = null,
    isDraw = false,
  } = c4State;
  const status = c4State.status || resolvedStatus;

  const playerSymbol = currentUserId === players.R ? 'R' : currentUserId === players.Y ? 'Y' : null;
  const isMyTurn = status === 'playing' && currentTurn === playerSymbol;

  const sessionStats: GameStats =
    (currentUserId &&
      (room.sessionStats?.[`connect4_${currentUserId}`] ||
        room.sessionStats?.[currentUserId])) || {
      wins: 0,
      losses: 0,
      ties: 0,
      total: 0,
    };

  const handleDropToken = (colIndex: number) => {
    if (!isMyTurn) return;
    onEmit('together:connect4:dropToken', { roomId: room.roomId, colIndex });
  };

  const handleStartGame = () => {
    onEmit('together:connect4:startGame', { roomId: room.roomId });
  };

  const handleSelectFirstPlayer = (firstPlayerId: string) => {
    let target = firstPlayerId;
    if (target === 'random') {
      target = Math.random() < 0.5 ? currentUserId : partnerId;
    }
    if (target && target === players.Y) {
      onEmit('together:connect4:swapFirstTurn', { roomId: room.roomId, firstPlayerId: target });
    } else if (target && target === players.R) {
      // Already Red (1st)
    } else {
      onEmit('together:connect4:swapFirstTurn', { roomId: room.roomId, firstPlayerId: target });
    }
  };

  const handleRestart = () => {
    onEmit('together:connect4:restart', { roomId: room.roomId });
  };

  const isCellWinning = (r: number, c: number) => {
    if (!winningLine) return false;
    return winningLine.some(([wr, wc]) => wr === r && wc === c);
  };

  const rIsMe = players.R === currentUserId;
  const yIsMe = players.Y === currentUserId;
  const rName = rIsMe ? 'You' : partnerName;
  const yName = yIsMe ? 'You' : partnerName;

  return (
    <View style={styles.container}>
      {/* Top Header & Stats Bar */}
      <View style={[styles.topCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.titleWithIcon}>
            <Image
              source={require('../../../../assets/game-icons/connect4.png')}
              style={styles.gameIcon}
            />
            <View>
              <Text style={[styles.gameTitle, { color: theme.foreground }]}>Connect 4</Text>
              <Text style={[styles.gameSubtitle, { color: theme.mutedText }]}>
                {status === 'playing'
                  ? isMyTurn
                    ? 'Your Turn!'
                    : "Partner's Turn"
                  : '4-in-a-Row Duel'}
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
          <Text style={[styles.statTotal, { color: theme.mutedText }]}>{sessionStats.total} Total</Text>
        </View>
      </View>

      {/* Players Row */}
      <View style={styles.playersRow}>
        <View
          style={[
            styles.playerCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            currentTurn === 'R' && (status === 'playing' || status === 'setup') && {
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239,68,68,0.12)',
            },
          ]}
        >
          <View style={[styles.discBadge, { backgroundColor: '#ef4444' }]} />
          <View style={styles.playerMeta}>
            <Text style={[styles.playerName, { color: theme.foreground }]} numberOfLines={1}>
              {rName}
            </Text>
            <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: '700' }}>
              {currentTurn === 'R' && status === 'playing' ? '🟢 Turn' : 'Red Disc'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.playerCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            currentTurn === 'Y' && (status === 'playing' || status === 'setup') && {
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245,158,11,0.12)',
            },
          ]}
        >
          <View style={[styles.discBadge, { backgroundColor: '#f59e0b' }]} />
          <View style={styles.playerMeta}>
            <Text style={[styles.playerName, { color: theme.foreground }]} numberOfLines={1}>
              {yName}
            </Text>
            <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: '700' }}>
              {currentTurn === 'Y' && status === 'playing' ? '🟢 Turn' : 'Yellow Disc'}
            </Text>
          </View>
        </View>
      </View>

      {/* Setup First Player Screen */}
      {status === 'setup' && (
        <View style={[styles.setupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.setupTitleRow}>
            <Sparkles size={14} color="#f59e0b" />
            <Text style={[styles.setupTitle, { color: theme.foreground }]}>
              Select Who Plays 1st & Gets 🔴 Red
            </Text>
          </View>
          <Text style={[styles.setupDesc, { color: theme.mutedText }]}>
            🔴 Red moves FIRST • 🟡 Yellow moves SECOND (Chat live below!)
          </Text>

          {/* Current Roles Preview */}
          <View style={styles.c4RolesPreview}>
            <View style={[styles.c4RoleBox, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: '#ef4444' }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444' }}>🔴 RED (1st)</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#ef4444', marginTop: 2 }}>
                {players.R === currentUserId ? 'You' : partnerName}
              </Text>
            </View>
            <View style={[styles.c4RoleBox, { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: '#f59e0b' }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#f59e0b' }}>🟡 YELLOW (2nd)</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#f59e0b', marginTop: 2 }}>
                {players.Y === currentUserId ? 'You' : partnerName}
              </Text>
            </View>
          </View>

          <View style={styles.firstTurnBtnsRow}>
            <TouchableOpacity
              style={[
                styles.turnOptionBtn,
                { backgroundColor: theme.input, borderColor: theme.border },
                players.R === currentUserId && { backgroundColor: '#ef4444', borderColor: '#ef4444' },
              ]}
              onPress={() => handleSelectFirstPlayer(currentUserId)}
            >
              <Text style={[styles.turnOptionText, { color: players.R === currentUserId ? '#fff' : theme.foreground }]}>
                🔴 You 1st
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.turnOptionBtn,
                { backgroundColor: theme.input, borderColor: theme.border },
                players.R === partnerId && { backgroundColor: '#ef4444', borderColor: '#ef4444' },
              ]}
              onPress={() => handleSelectFirstPlayer(partnerId)}
            >
              <Text style={[styles.turnOptionText, { color: players.R === partnerId ? '#fff' : theme.foreground }]}>
                🔴 {partnerName} 1st
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
            <Text style={styles.startGameBtnText}>🚀 Launch Connect 4 Board</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Swap Button when game is active but board is untouched */}
      {status === 'playing' && isBoardEmpty && (
        <TouchableOpacity
          style={[styles.quickSwapBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
          onPress={() => handleSelectFirstPlayer(players.Y || partnerId)}
        >
          <ArrowRightLeft size={13} color={theme.accent} style={{ marginRight: 6 }} />
          <Text style={[styles.quickSwapText, { color: theme.accent }]}>
            Swap Turn: Red moves 1st ({players.R === currentUserId ? 'You' : partnerName})
          </Text>
        </TouchableOpacity>
      )}

      {/* Status Banners */}
      {status === 'waiting' && (
        <View style={[styles.banner, { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b' }]}>
          <Users size={14} color="#f59e0b" style={{ marginRight: 6 }} />
          <Text style={[styles.bannerText, { color: '#f59e0b' }]}>
            Waiting for a friend to join Connect 4...
          </Text>
        </View>
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
            {isMyTurn ? "It's Your Turn! Pick a column arrow to drop" : "Waiting for partner's drop..."}
          </Text>
        </View>
      )}

      {status === 'finished' && (
        <View
          style={[
            styles.resultBanner,
            winner && winner === playerSymbol
              ? { backgroundColor: 'rgba(245,158,11,0.2)', borderColor: '#f59e0b' }
              : winner
              ? { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }
              : { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: '#a855f7' },
          ]}
        >
          {winner && winner === playerSymbol ? (
            <View style={styles.resultContent}>
              <Trophy size={18} color="#f59e0b" style={{ marginRight: 6 }} />
              <Text style={[styles.resultTitle, { color: '#f59e0b' }]}>Victory! You Connected 4! 🎉</Text>
            </View>
          ) : winner ? (
            <Text style={[styles.resultTitle, { color: '#ef4444' }]}>Partner Connected 4! Better luck next time 💔</Text>
          ) : (
            <Text style={[styles.resultTitle, { color: '#a855f7' }]}>Full Board! It's a Draw! 🤝</Text>
          )}
        </View>
      )}

      {/* Connect 4 Board */}
      {(status === 'playing' || status === 'finished') && (
        <View style={styles.c4Container}>
          {/* Column Drop Arrow Row */}
          <View style={styles.c4DropRow}>
            {[0, 1, 2, 3, 4, 5, 6].map((colIdx) => {
              const colFull = board[0] && board[0][colIdx] !== null;
              const canDrop = isMyTurn && !colFull;

              return (
                <TouchableOpacity
                  key={colIdx}
                  style={[
                    styles.dropColBtn,
                    { backgroundColor: canDrop ? 'rgba(59,130,246,0.2)' : theme.muted },
                  ]}
                  onPress={() => handleDropToken(colIdx)}
                  disabled={!canDrop}
                >
                  <ArrowDown size={14} color={canDrop ? '#3b82f6' : theme.mutedText} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 7x6 Grid Blue Frame */}
          <View style={styles.gridFrame}>
            {board.map((row, rIdx) => (
              <View key={rIdx} style={styles.gridRow}>
                {row.map((cell, cIdx) => {
                  const isWinning = isCellWinning(rIdx, cIdx);
                  return (
                    <View key={cIdx} style={styles.gridCellSlot}>
                      <View
                        style={[
                          styles.disc,
                          cell === 'R'
                            ? { backgroundColor: '#ef4444' }
                            : cell === 'Y'
                            ? { backgroundColor: '#f59e0b' }
                            : { backgroundColor: '#0f172a' },
                          isWinning && styles.winningDisc,
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
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
          <Text style={styles.rematchBtnText}>Rematch</Text>
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
  playersRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  playerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  discBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  playerMeta: {
    flex: 1,
  },
  playerName: {
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
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
  c4Container: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  c4DropRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  dropColBtn: {
    width: 34,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridFrame: {
    width: '100%',
    backgroundColor: '#1e3a8a',
    borderRadius: 16,
    padding: 8,
    gap: 6,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gridCellSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  winningDisc: {
    borderWidth: 3,
    borderColor: '#ffffff',
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
  c4RolesPreview: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 6,
  },
  c4RoleBox: {
    flex: 1,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
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
