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
  RPSState,
  GameStats,
} from '../../../states/togetherTypes';
import {
  Trophy,
  RotateCcw,
  Sparkles,
  Users,
  XCircle,
  Handshake,
} from 'lucide-react-native';

interface MobileRPSBoardProps {
  room: TogetherRoom;
  currentUserId: string;
  partnerName: string;
  onEmit: (event: string, data: any) => void;
  onLeaveGame?: () => void;
}

export const MobileRPSBoard: React.FC<MobileRPSBoardProps> = ({
  room,
  currentUserId,
  partnerName,
  onEmit,
  onLeaveGame,
}) => {
  const { theme } = useTheme();

  const rpsState: RPSState = (room.state?.rps as RPSState) || {
    playerChoices: {},
    scores: {},
    round: 1,
    status: 'waiting',
  };

  const { playerChoices = {}, scores = {}, round = 1, status = 'waiting', roundResult } = rpsState;

  const participants = room.participants || [];
  const partnerId = participants.find((id) => id !== currentUserId) || '';

  const myChoice = playerChoices[currentUserId];
  const partnerChoice = partnerId ? playerChoices[partnerId] : null;
  const hasMyChoice = !!myChoice;
  const hasPartnerChoice = !!partnerChoice;

  const myScore = scores[currentUserId] || 0;
  const partnerScore = partnerId ? scores[partnerId] || 0 : 0;

  const sessionStats: GameStats =
    (currentUserId &&
      (room.sessionStats?.[`rps_${currentUserId}`] ||
        room.sessionStats?.[currentUserId])) || {
      wins: 0,
      losses: 0,
      ties: 0,
      total: 0,
    };

  const handleSelectChoice = (choice: 'rock' | 'paper' | 'scissors') => {
    if (status === 'round_ended') return;
    onEmit('together:rps:choice', { roomId: room.roomId, choice });
  };

  const handleNextRound = () => {
    onEmit('together:rps:nextRound', { roomId: room.roomId });
  };

  const handleRestart = () => {
    onEmit('together:rps:restart', { roomId: room.roomId });
  };

  const getChoiceEmoji = (choice?: string | null) => {
    if (choice === 'rock') return '✊';
    if (choice === 'paper') return '🤚';
    if (choice === 'scissors') return '✌️';
    return '❓';
  };

  return (
    <View style={styles.container}>
      {/* Top Scoreboard & Stats */}
      <View style={[styles.topCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.titleWithIcon}>
            <Image
              source={require('../../../../assets/game-icons/rps.png')}
              style={styles.gameIcon}
            />
            <View>
              <Text style={[styles.gameTitle, { color: theme.foreground }]}>Rock Paper Scissors</Text>
              <Text style={[styles.gameSubtitle, { color: theme.mutedText }]}>Round {round}</Text>
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

        {/* Player Score Counter */}
        <View style={styles.scoresRow}>
          <View style={[styles.scoreBox, { backgroundColor: 'rgba(6,182,212,0.12)', borderColor: '#06b6d4' }]}>
            <Text style={[styles.scoreLabel, { color: '#06b6d4' }]}>YOU</Text>
            <Text style={[styles.scoreNumber, { color: '#06b6d4' }]}>{myScore}</Text>
          </View>
          <View style={[styles.scoreBox, { backgroundColor: 'rgba(244,63,94,0.12)', borderColor: '#f43f5e' }]}>
            <Text style={[styles.scoreLabel, { color: '#f43f5e' }]}>{partnerName.toUpperCase()}</Text>
            <Text style={[styles.scoreNumber, { color: '#f43f5e' }]}>{partnerScore}</Text>
          </View>
        </View>
      </View>

      {/* Battle Stage / Secret Cards */}
      <View style={[styles.battleStage, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardsRow}>
          {/* Your Move Card */}
          <View style={styles.cardWrap}>
            <Text style={[styles.cardLabel, { color: theme.mutedText }]}>Your Move</Text>
            <View
              style={[
                styles.secretCard,
                { backgroundColor: theme.input, borderColor: theme.border },
                hasMyChoice && {
                  backgroundColor: 'rgba(6,182,212,0.15)',
                  borderColor: '#06b6d4',
                },
              ]}
            >
              <Text style={styles.cardEmoji}>{hasMyChoice ? getChoiceEmoji(myChoice) : '❓'}</Text>
            </View>
          </View>

          <Text style={[styles.vsText, { color: theme.mutedText }]}>VS</Text>

          {/* Partner Card */}
          <View style={styles.cardWrap}>
            <Text style={[styles.cardLabel, { color: theme.mutedText }]}>{partnerName}</Text>
            <View
              style={[
                styles.secretCard,
                { backgroundColor: theme.input, borderColor: theme.border },
                status === 'round_ended'
                  ? { backgroundColor: 'rgba(244,63,94,0.15)', borderColor: '#f43f5e' }
                  : hasPartnerChoice
                  ? { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: '#a855f7' }
                  : {},
              ]}
            >
              {status === 'round_ended' ? (
                <Text style={styles.cardEmoji}>{getChoiceEmoji(partnerChoice)}</Text>
              ) : hasPartnerChoice ? (
                <Text style={styles.lockedText}>🔒 Locked</Text>
              ) : (
                <Text style={styles.cardEmoji}>❓</Text>
              )}
            </View>
          </View>
        </View>

        {/* Round Result Banner */}
        {status === 'round_ended' && roundResult && (
          <View style={[styles.roundResultCard, { backgroundColor: theme.muted, borderColor: theme.border }]}>
            <Text
              style={[
                styles.roundResultText,
                roundResult.isDraw
                  ? { color: '#f59e0b' }
                  : roundResult.winnerId === currentUserId
                  ? { color: '#10b981' }
                  : { color: '#ef4444' },
              ]}
            >
              {roundResult.isDraw
                ? `🤝 Round Draw! ${roundResult.reason ? `(${roundResult.reason})` : ''}`
                : roundResult.winnerId === currentUserId
                ? `🎉 You Won the Round! ${roundResult.reason ? `(${roundResult.reason})` : ''}`
                : `💔 ${partnerName} Won! ${roundResult.reason ? `(${roundResult.reason})` : ''}`}
            </Text>
            <TouchableOpacity style={styles.nextRoundBtn} onPress={handleNextRound}>
              <Sparkles size={13} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.nextRoundBtnText}>Next Round</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Choice Selection Buttons */}
      {status !== 'round_ended' && (
        <View style={styles.choiceRow}>
          {[
            { id: 'rock', label: 'Rock', icon: '✊' },
            { id: 'paper', label: 'Paper', icon: '🤚' },
            { id: 'scissors', label: 'Scissors', icon: '✌️' },
          ].map((item) => {
            const isSelected = myChoice === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.choiceBtn,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  isSelected && {
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244,63,94,0.12)',
                    borderWidth: 2,
                  },
                ]}
                onPress={() => handleSelectChoice(item.id as any)}
              >
                <Text style={styles.choiceIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.choiceLabel,
                    { color: isSelected ? '#f43f5e' : theme.foreground },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Action Footer */}
      <View style={styles.actionFooter}>
        <TouchableOpacity
          style={[styles.rematchBtn, { backgroundColor: theme.accent }]}
          onPress={handleRestart}
        >
          <RotateCcw size={15} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.rematchBtnText}>Restart Game</Text>
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
    marginTop: 2,
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
    fontSize: 18,
    fontWeight: '900',
  },
  battleStage: {
    width: '100%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  cardWrap: {
    alignItems: 'center',
    gap: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  secretCard: {
    width: 72,
    height: 100,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 34,
  },
  lockedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a855f7',
  },
  vsText: {
    fontSize: 14,
    fontWeight: '900',
  },
  roundResultCard: {
    width: '100%',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  roundResultText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  nextRoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  nextRoundBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  choiceRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  choiceIcon: {
    fontSize: 26,
  },
  choiceLabel: {
    fontSize: 11,
    fontWeight: '700',
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
