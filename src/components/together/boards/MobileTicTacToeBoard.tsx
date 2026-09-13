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
  TicTacToeState,
  GameStats,
} from '../../../states/togetherTypes';
import {
  Trophy,
  RotateCcw,
  Sparkles,
  Users,
  Circle,
  XCircle,
  Handshake,
  ArrowRightLeft,
} from 'lucide-react-native';

interface MobileTicTacToeBoardProps {
  room: TogetherRoom;
  currentUserId: string;
  partnerName: string;
  partnerAvatar?: string | null;
  onEmit: (event: string, data: any) => void;
  onLeaveGame?: () => void;
}

export const MobileTicTacToeBoard: React.FC<MobileTicTacToeBoardProps> = ({
  room,
  currentUserId,
  partnerName,
  partnerAvatar,
  onEmit,
  onLeaveGame,
}) => {
  const { theme } = useTheme();

  const participants = room.participants || [];
  const partnerId = participants.find((id) => id !== currentUserId) || '';

  const rawTicTacToe = room.state?.ticTacToe as TicTacToeState | undefined;
  const isBoardEmpty = !rawTicTacToe?.board || rawTicTacToe.board.every((cell) => cell === null);
  const rawStatus = rawTicTacToe?.status;
  const resolvedStatus =
    rawStatus === 'setup'
      ? 'setup'
      : rawStatus === 'waiting' && participants.length >= 2
      ? 'setup'
      : rawStatus || (participants.length >= 2 ? (isBoardEmpty ? 'setup' : 'playing') : 'waiting');

  const gameState: TicTacToeState = rawTicTacToe || {
    board: Array(9).fill(null),
    players: { X: room.hostId, O: partnerId || null },
    currentTurn: 'X',
    winner: null,
    winningLine: null,
    isDraw: false,
    status: resolvedStatus,
    comments: [],
  };

  const { board = Array(9).fill(null), players = { X: room.hostId, O: partnerId }, currentTurn = 'X', winner = null, winningLine = null, isDraw = false } = gameState;
  const status = gameState.status || resolvedStatus;
  const playerSymbol = currentUserId === players.X ? 'X' : currentUserId === players.O ? 'O' : null;
  const isMyTurn = status === 'playing' && playerSymbol && currentTurn === playerSymbol;

  const sessionStats: GameStats =
    (currentUserId &&
      (room.sessionStats?.[`tictactoe_${currentUserId}`] ||
        room.sessionStats?.[currentUserId])) || {
      wins: 0,
      losses: 0,
      ties: 0,
      total: 0,
    };

  const handleCellClick = (index: number) => {
    if (!isMyTurn || board[index] !== null) return;
    onEmit('together:tictactoe:move', { roomId: room.roomId, cellIndex: index });
  };

  const handleRematch = () => {
    onEmit('together:tictactoe:restart', { roomId: room.roomId });
  };

  const handleSelectFirstPlayer = (targetFirstId: string) => {
    onEmit('together:tictactoe:swapFirstTurn', {
      roomId: room.roomId,
      firstPlayerId: targetFirstId,
    });
  };

  const handleStartGame = () => {
    onEmit('together:tictactoe:startGame', { roomId: room.roomId });
  };

  const xIsMe = players.X === currentUserId;
  const oIsMe = players.O === currentUserId;
  const xName = xIsMe ? 'You' : partnerName;
  const oName = oIsMe ? 'You' : partnerName;

  return (
    <View style={styles.container}>
      {/* Top Scoreboard & Stats */}
      <View style={[styles.topCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.titleWithIcon}>
            <Image
              source={require('../../../../assets/game-icons/tictactoe.png')}
              style={styles.gameIcon}
            />
            <View>
              <Text style={[styles.gameTitle, { color: theme.foreground }]}>Tic-Tac-Toe</Text>
              <Text style={[styles.gameSubtitle, { color: theme.mutedText }]}>
                {status === 'playing'
                  ? isMyTurn
                    ? 'Your Turn!'
                    : "Partner's Turn"
                  : '3x3 Strategy Duel'}
              </Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={[styles.smallIconBtn, { backgroundColor: theme.muted }]}
              onPress={handleRematch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RotateCcw size={14} color={theme.foreground} />
            </TouchableOpacity>
          </View>
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
        {/* Player X */}
        <View
          style={[
            styles.playerCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            currentTurn === 'X' && (status === 'playing' || status === 'setup') && {
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6,182,212,0.12)',
            },
          ]}
        >
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarCircle, { backgroundColor: '#06b6d4' }]}>
              <Text style={styles.avatarInitial}>{xName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={[styles.symbolBadge, { backgroundColor: '#06b6d4' }]}>
              <Text style={styles.symbolBadgeText}>X</Text>
            </View>
          </View>
          <View style={styles.playerMeta}>
            <Text style={[styles.playerName, { color: theme.foreground }]} numberOfLines={1}>
              {xName}
            </Text>
            <Text style={{ fontSize: 10, color: '#06b6d4', fontWeight: '700' }}>
              {currentTurn === 'X' && status === 'playing'
                ? '🟢 Moving'
                : currentTurn === 'X' && status === 'setup'
                ? 'Plays 1st'
                : 'Player X'}
            </Text>
          </View>
        </View>

        {/* Player O */}
        <View
          style={[
            styles.playerCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            currentTurn === 'O' && (status === 'playing' || status === 'setup') && {
              borderColor: '#f43f5e',
              backgroundColor: 'rgba(244,63,94,0.12)',
            },
          ]}
        >
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarCircle, { backgroundColor: '#f43f5e' }]}>
              <Text style={styles.avatarInitial}>{oName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={[styles.symbolBadge, { backgroundColor: '#f43f5e' }]}>
              <Text style={styles.symbolBadgeText}>O</Text>
            </View>
          </View>
          <View style={styles.playerMeta}>
            <Text style={[styles.playerName, { color: theme.foreground }]} numberOfLines={1}>
              {oName}
            </Text>
            <Text style={{ fontSize: 10, color: '#f43f5e', fontWeight: '700' }}>
              {currentTurn === 'O' && status === 'playing'
                ? '🟢 Moving'
                : currentTurn === 'O' && status === 'setup'
                ? 'Plays 2nd'
                : 'Player O'}
            </Text>
          </View>
        </View>
      </View>

      {/* Setup / Turn Order Selector Screen */}
      {status === 'setup' && (
        <View style={[styles.setupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.setupTitleRow}>
            <Sparkles size={14} color="#06b6d4" />
            <Text style={[styles.setupTitle, { color: theme.foreground }]}>Who Plays First?</Text>
          </View>
          <Text style={[styles.setupDesc, { color: theme.mutedText }]}>
            Pick who takes the first move as 'X' before starting. You can also discuss in live chat below!
          </Text>

          <View style={styles.firstTurnBtnsRow}>
            <TouchableOpacity
              style={[
                styles.turnOptionBtn,
                { backgroundColor: theme.input, borderColor: theme.border },
                currentTurn === 'X' && { backgroundColor: '#06b6d4', borderColor: '#06b6d4' },
              ]}
              onPress={() => handleSelectFirstPlayer(players.X || currentUserId)}
            >
              <Text
                style={[
                  styles.turnOptionText,
                  { color: currentTurn === 'X' ? '#ffffff' : theme.foreground },
                ]}
              >
                {xName} (1st)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.turnOptionBtn,
                { backgroundColor: theme.input, borderColor: theme.border },
                currentTurn === 'O' && { backgroundColor: '#f43f5e', borderColor: '#f43f5e' },
              ]}
              onPress={() => handleSelectFirstPlayer(players.O || currentUserId)}
            >
              <Text
                style={[
                  styles.turnOptionText,
                  { color: currentTurn === 'O' ? '#ffffff' : theme.foreground },
                ]}
              >
                {oName} (1st)
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
            <Text style={styles.startGameBtnText}>🚀 Start Game</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Banners */}
      {status === 'waiting' && (
        <View style={[styles.banner, { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b' }]}>
          <Users size={14} color="#f59e0b" style={{ marginRight: 6 }} />
          <Text style={[styles.bannerText, { color: '#f59e0b' }]}>
            Waiting for a friend to join the room...
          </Text>
        </View>
      )}

      {status === 'playing' && isBoardEmpty && (
        <TouchableOpacity
          style={[styles.quickSwapBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
          onPress={() => handleSelectFirstPlayer(players.O || '')}
        >
          <ArrowRightLeft size={13} color={theme.accent} style={{ marginRight: 6 }} />
          <Text style={[styles.quickSwapText, { color: theme.accent }]}>
            Swap Turn: {xIsMe ? 'You move 1st (X)' : `${partnerName} moves 1st (X)`}
          </Text>
        </TouchableOpacity>
      )}

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
          <Text
            style={[
              styles.bannerText,
              { color: isMyTurn ? '#10b981' : theme.foreground },
            ]}
          >
            {isMyTurn ? "It's Your Turn! Tap an empty square" : "Waiting for partner's move..."}
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
              <Text style={[styles.resultTitle, { color: '#f59e0b' }]}>Victory! You Won! 🎉</Text>
            </View>
          ) : winner ? (
            <Text style={[styles.resultTitle, { color: '#ef4444' }]}>Partner Won! Better luck next time 💔</Text>
          ) : (
            <Text style={[styles.resultTitle, { color: '#a855f7' }]}>Good Game! It's a Draw! 🤝</Text>
          )}
        </View>
      )}

      {/* 3x3 Grid */}
      {(status === 'playing' || status === 'finished') && (
        <View style={[styles.boardWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.grid}>
            {board.map((cell, idx) => {
              const isWinningCell = winningLine?.includes(idx);
              const canClick = isMyTurn && cell === null;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cell,
                    { backgroundColor: theme.input, borderColor: theme.border },
                    isWinningCell && { backgroundColor: 'rgba(245,158,11,0.25)', borderColor: '#f59e0b' },
                  ]}
                  onPress={() => handleCellClick(idx)}
                  disabled={!canClick}
                >
                  <Text
                    style={[
                      styles.cellText,
                      cell === 'X' ? { color: '#06b6d4' } : { color: '#f43f5e' },
                    ]}
                  >
                    {cell || ''}
                  </Text>
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
          onPress={handleRematch}
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
  topActions: {
    flexDirection: 'row',
    gap: 6,
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
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  symbolBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
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
  boardWrap: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1,
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cell: {
    width: '30%',
    height: '30%',
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 32,
    fontWeight: '900',
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
