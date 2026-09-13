import React, { useState, useEffect } from 'react';
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
  CatchPartnerState,
} from '../../../states/togetherTypes';
import {
  Trophy,
  RotateCcw,
  Sparkles,
  Users,
  Zap,
  Clock,
  ArrowUp,
  ArrowDown,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  ArrowRightLeft,
  Flame,
} from 'lucide-react-native';

interface MobileCatchPartnerBoardProps {
  room: TogetherRoom;
  currentUserId: string;
  partnerName: string;
  onEmit: (event: string, data: any) => void;
  onLeaveGame?: () => void;
}

export const MobileCatchPartnerBoard: React.FC<MobileCatchPartnerBoardProps> = ({
  room,
  currentUserId,
  partnerName,
  onEmit,
  onLeaveGame,
}) => {
  const { theme } = useTheme();

  const participants = room.participants || [];
  const partnerId = participants.find((id) => id !== currentUserId) || '';

  const rawCP = room.state?.catchPartner as CatchPartnerState | undefined;
  const rawStatus = rawCP?.status;
  const resolvedStatus =
    rawStatus === 'setup'
      ? 'setup'
      : rawStatus === 'waiting' && participants.length >= 2
      ? 'setup'
      : rawStatus || (participants.length >= 2 ? 'setup' : 'waiting');

  const cpState: CatchPartnerState = rawCP || {
    status: resolvedStatus,
    players: {},
    roles: { catcher: room.hostId, runner: partnerId || null },
    round: 1,
    maxRounds: 3,
    timer: 30,
    scores: {},
    winner: null,
    obstacles: [],
  };

  const {
    players = {},
    roles = { catcher: room.hostId, runner: partnerId || null },
    round = 1,
    maxRounds = 3,
    timer = 30,
    scores = {},
    winner = null,
    roundResult,
    obstacles = [],
    powerUps = [],
  } = cpState;
  const status = cpState.status || resolvedStatus;

  const isCatcher = roles.catcher === currentUserId;
  const myRole = isCatcher ? 'Catcher' : 'Runner';
  const partnerRole = isCatcher ? 'Runner' : 'Catcher';

  const myPlayer = players[currentUserId] || { x: 20, y: 50, vx: 0, vy: 0, role: isCatcher ? 'catcher' : 'runner' };
  const partnerPlayer = partnerId ? players[partnerId] || { x: 80, y: 50, vx: 0, vy: 0, role: isCatcher ? 'runner' : 'catcher' } : null;

  const [localPos, setLocalPos] = useState({ x: myPlayer.x, y: myPlayer.y });
  const [isBoosting, setIsBoosting] = useState(false);

  useEffect(() => {
    if (myPlayer) {
      setLocalPos({ x: myPlayer.x, y: myPlayer.y });
    }
  }, [myPlayer.x, myPlayer.y]);

  const handleMove = (dx: number, dy: number) => {
    if (status !== 'playing') return;
    const speed = isBoosting ? 16 : 10;
    const nextX = Math.max(8, Math.min(92, localPos.x + dx * speed));
    const nextY = Math.max(8, Math.min(92, localPos.y + dy * speed));

    setLocalPos({ x: nextX, y: nextY });
    onEmit('together:catchpartner:move', {
      roomId: room.roomId,
      position: {
        x: nextX,
        y: nextY,
        vx: dx * speed,
        vy: dy * speed,
        role: isCatcher ? 'catcher' : 'runner',
        isBoosting,
      },
    });
  };

  const handleStartGame = () => {
    onEmit('together:catchpartner:start', { roomId: room.roomId });
  };

  const handleSwapRole = () => {
    onEmit('together:catchpartner:swapFirstRole', {
      roomId: room.roomId,
      firstCatcherId: isCatcher ? partnerId : currentUserId,
    });
  };

  const handleNextRound = () => {
    onEmit('together:catchpartner:nextRound', { roomId: room.roomId });
  };

  const handleRestart = () => {
    onEmit('together:catchpartner:restart', { roomId: room.roomId });
  };

  const triggerBoost = () => {
    setIsBoosting(true);
    setTimeout(() => setIsBoosting(false), 2000);
  };

  return (
    <View style={styles.container}>
      {/* Top Header & Round / Timer */}
      <View style={[styles.topCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.titleWithIcon}>
            <Image
              source={require('../../../../assets/game-icons/catchpartner.png')}
              style={styles.gameIcon}
            />
            <View>
              <Text style={[styles.gameTitle, { color: theme.foreground }]}>Pakdam Pakdai</Text>
              <Text style={[styles.gameSubtitle, { color: theme.mutedText }]}>
                Round {round} of {maxRounds} • {timer}s
              </Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.smallIconBtn, { backgroundColor: theme.muted }]} onPress={handleRestart}>
            <RotateCcw size={14} color={theme.foreground} />
          </TouchableOpacity>
        </View>

        {/* Roles & Scores Row */}
        <View style={styles.rolesRow}>
          <View
            style={[
              styles.roleBadge,
              isCatcher
                ? { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }
                : { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981' },
            ]}
          >
            <Text style={{ fontSize: 16 }}>{isCatcher ? '🏃💨' : '🏃'}</Text>
            <Text style={[styles.roleName, { color: isCatcher ? '#ef4444' : '#10b981' }]}>
              You: {myRole} ({scores[currentUserId] || 0} pts)
            </Text>
          </View>

          <View
            style={[
              styles.roleBadge,
              !isCatcher
                ? { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }
                : { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981' },
            ]}
          >
            <Text style={{ fontSize: 16 }}>{!isCatcher ? '🏃💨' : '🏃'}</Text>
            <Text style={[styles.roleName, { color: !isCatcher ? '#ef4444' : '#10b981' }]}>
              {partnerName}: {partnerRole} ({scores[partnerId] || 0} pts)
            </Text>
          </View>
        </View>
      </View>

      {/* Setup First Catcher Screen */}
      {status === 'setup' && (
        <View style={[styles.setupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.setupTitleRow}>
            <Sparkles size={14} color="#ef4444" />
            <Text style={[styles.setupTitle, { color: theme.foreground }]}>
              Pakdam Pakdai - Starting Roles
            </Text>
          </View>
          <Text style={[styles.setupDesc, { color: theme.mutedText }]}>
            {isCatcher
              ? 'You are starting as the Catcher 🎯! Catch your partner before time runs out. (Chat live below!)'
              : 'You are starting as the Runner ⚡! Escape your partner until time expires. (Chat live below!)'}
          </Text>

          <View style={styles.swapRolesRow}>
            <TouchableOpacity
              style={[
                styles.swapRoleBtn,
                { backgroundColor: theme.input, borderColor: theme.border },
                isCatcher && { backgroundColor: '#ef4444', borderColor: '#ef4444' },
              ]}
              onPress={() => onEmit('together:catchpartner:swapFirstRole', { roomId: room.roomId, firstCatcherId: currentUserId })}
            >
              <Text style={[styles.swapRoleText, { color: isCatcher ? '#fff' : theme.foreground }]}>
                🏃💨 You Catch 1st
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.swapRoleBtn,
                { backgroundColor: theme.input, borderColor: theme.border },
                !isCatcher && { backgroundColor: '#ef4444', borderColor: '#ef4444' },
              ]}
              onPress={() => onEmit('together:catchpartner:swapFirstRole', { roomId: room.roomId, firstCatcherId: partnerId })}
            >
              <Text style={[styles.swapRoleText, { color: !isCatcher ? '#fff' : theme.foreground }]}>
                🏃💨 {partnerName} Catches 1st
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.startChaseBtn} onPress={handleStartGame}>
            <Text style={styles.startChaseBtnText}>🚀 Start Round</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Swap Button when in playing status before timer ticks */}
      {status === 'playing' && timer === 30 && (
        <TouchableOpacity
          style={[styles.quickSwapBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
          onPress={handleSwapRole}
        >
          <ArrowRightLeft size={13} color={theme.accent} style={{ marginRight: 6 }} />
          <Text style={[styles.quickSwapText, { color: theme.accent }]}>
            Swap Role: You are {isCatcher ? 'Catcher 🎯' : 'Runner ⚡'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Finished State */}
      {status === 'finished' && (
        <View style={[styles.banner, { backgroundColor: 'rgba(245,158,11,0.2)', borderColor: '#f59e0b' }]}>
          <Trophy size={16} color="#f59e0b" style={{ marginRight: 6 }} />
          <Text style={[styles.bannerText, { color: '#f59e0b' }]}>
            Match Finished! {winner === currentUserId ? 'You Won the Match! 🎉' : `${partnerName} Won! 💔`}
          </Text>
        </View>
      )}

      {/* Round Result Banner */}
      {status === 'round_ended' && roundResult && (
        <View style={[styles.roundEndCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.roundEndText, { color: theme.foreground }]}>
            {roundResult.reason}
          </Text>
          <TouchableOpacity style={styles.nextRoundBtn} onPress={handleNextRound}>
            <Sparkles size={13} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.nextRoundBtnText}>Next Round</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2D Mini Arena */}
      <View style={styles.arenaFrame}>
        {/* Obstacles */}
        {obstacles.map((obs, idx) => (
          <View
            key={idx}
            style={[
              styles.obstacle,
              {
                left: `${obs.x}%`,
                top: `${obs.y}%`,
                width: `${obs.w}%`,
                height: `${obs.h}%`,
              },
            ]}
          />
        ))}

        {/* Powerups */}
        {powerUps.map((p) => (
          <View
            key={p.id}
            style={[
              styles.powerUp,
              { left: `${p.x}%`, top: `${p.y}%` },
            ]}
          >
            <Text style={{ fontSize: 16 }}>{p.type === 'speed' ? '⚡' : '🛡️'}</Text>
          </View>
        ))}

        {/* Local Player */}
        <View
          style={[
            styles.playerAvatar,
            { left: `${localPos.x}%`, top: `${localPos.y}%` },
            isCatcher ? styles.catcherAura : styles.runnerAura,
          ]}
        >
          <Text style={{ fontSize: 20 }}>{isCatcher ? '🏃💨' : '🏃'}</Text>
        </View>

        {/* Partner Player */}
        {partnerPlayer && (
          <View
            style={[
              styles.playerAvatar,
              { left: `${partnerPlayer.x}%`, top: `${partnerPlayer.y}%` },
              !isCatcher ? styles.catcherAura : styles.runnerAura,
            ]}
          >
            <Text style={{ fontSize: 20 }}>{!isCatcher ? '🏃💨' : '🏃'}</Text>
          </View>
        )}
      </View>

      {/* Controls: D-Pad & Speed Boost Button */}
      {status === 'playing' && (
        <View style={styles.controlsRow}>
          {/* 4-way Directional Pad */}
          <View style={styles.dpad}>
            <TouchableOpacity style={styles.dpadBtn} onPress={() => handleMove(0, -1)}>
              <ArrowUp size={20} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.dpadMiddleRow}>
              <TouchableOpacity style={styles.dpadBtn} onPress={() => handleMove(-1, 0)}>
                <ArrowLeftIcon size={20} color="#ffffff" />
              </TouchableOpacity>
              <View style={styles.dpadCenter} />
              <TouchableOpacity style={styles.dpadBtn} onPress={() => handleMove(1, 0)}>
                <ArrowRightIcon size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.dpadBtn} onPress={() => handleMove(0, 1)}>
              <ArrowDown size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Speed Boost Button */}
          <TouchableOpacity
            style={[
              styles.boostBtn,
              isBoosting && { backgroundColor: '#f59e0b' },
            ]}
            onPress={triggerBoost}
          >
            <Zap size={22} color="#ffffff" />
            <Text style={styles.boostText}>{isBoosting ? 'BOOSTING!' : 'BOOST'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Footer */}
      <View style={styles.actionFooter}>
        <TouchableOpacity style={[styles.rematchBtn, { backgroundColor: theme.accent }]} onPress={handleRestart}>
          <RotateCcw size={15} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.rematchBtnText}>Restart Chase</Text>
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
  rolesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  roleName: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
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
    marginBottom: 2,
  },
  setupTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  setupDesc: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
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
    width: '100%',
  },
  quickSwapText: {
    fontSize: 12,
    fontWeight: '700',
  },
  swapRolesRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  swapRoleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  swapRoleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  startChaseBtn: {
    width: '100%',
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  startChaseBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  banner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roundEndCard: {
    width: '100%',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  roundEndText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  nextRoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  nextRoundBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  arenaFrame: {
    width: '100%',
    height: 240,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  obstacle: {
    position: 'absolute',
    backgroundColor: '#1e293b',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
  },
  powerUp: {
    position: 'absolute',
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
  playerAvatar: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  catcherAura: {
    backgroundColor: 'rgba(239,68,68,0.3)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  runnerAura: {
    backgroundColor: 'rgba(16,185,129,0.3)',
    borderWidth: 1.5,
    borderColor: '#10b981',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 6,
  },
  dpad: {
    alignItems: 'center',
  },
  dpadMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dpadBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenter: {
    width: 30,
    height: 30,
  },
  boostBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    elevation: 4,
  },
  boostText: {
    color: '#ffffff',
    fontSize: 10,
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
});
