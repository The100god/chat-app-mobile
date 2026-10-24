import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Trophy,
  Star,
  Sparkles,
  Award,
  Lock,
  X,
  Zap,
  ArrowUpCircle,
  Flame,
} from 'lucide-react-native';
import { GamificationResultPayload } from '../../states/togetherTypes';

export interface MobileGameResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: GamificationResultPayload | null;
  currentUserId?: string;
  partnerName?: string;
  onPlayAgain?: () => void;
  onSwitchGame?: () => void;
}

export const MobileGameResultModal: React.FC<MobileGameResultModalProps> = ({
  isOpen,
  onClose,
  result,
  currentUserId,
  partnerName,
  onPlayAgain,
  onSwitchGame,
}) => {
  if (!isOpen || !result) return null;

  const myReward = currentUserId
    ? result.rewards[currentUserId]
    : Object.values(result.rewards)[0];
  const isWinner = myReward?.isWinner;
  const leveledUp = result.levelInfo?.leveledUp;
  const currentLevel = result.levelInfo?.currentLevel || 1;
  const previousLevel = result.levelInfo?.previousLevel || 1;
  const newlyUnlocked = result.newlyUnlockedGames || [];

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, isWinner ? styles.winnerCard : styles.defaultCard]}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header Icon */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, isWinner ? styles.winnerIconCircle : styles.defaultIconCircle]}>
                {isWinner ? (
                  <Trophy size={36} color="#fbbf24" />
                ) : (
                  <Award size={36} color="#818cf8" />
                )}
              </View>
              {isWinner && (
                <View style={styles.sparkleBadge}>
                  <Sparkles size={14} color="#f59e0b" />
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {isWinner ? 'Match Won!' : 'Match Finished!'}
            </Text>
            <Text style={styles.subtitle}>
              {isWinner
                ? 'Outstanding performance with your partner!'
                : `Great teamwork with ${partnerName || 'your partner'}!`}
            </Text>

            {/* Points Awarded Banner */}
            <View style={styles.pointsBanner}>
              <Zap size={20} color="#fbbf24" />
              <Text style={styles.pointsNumber}>
                +{myReward?.pointsAwarded ?? 0}
              </Text>
              <Text style={styles.pointsLabel}>PTS EARNED</Text>
            </View>

            {/* Breakdown */}
            {myReward?.breakdown && (
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownValue}>+{myReward.breakdown.basePlay}</Text>
                  <Text style={styles.breakdownKey}>Play</Text>
                </View>
                {myReward.breakdown.winBonus > 0 && (
                  <View style={styles.breakdownItem}>
                    <Text style={[styles.breakdownValue, { color: '#fbbf24' }]}>
                      +{myReward.breakdown.winBonus}
                    </Text>
                    <Text style={styles.breakdownKey}>Win</Text>
                  </View>
                )}
                {myReward.breakdown.levelBonus > 0 && (
                  <View style={styles.breakdownItem}>
                    <Text style={[styles.breakdownValue, { color: '#38bdf8' }]}>
                      +{myReward.breakdown.levelBonus}
                    </Text>
                    <Text style={styles.breakdownKey}>Level</Text>
                  </View>
                )}
                {myReward.breakdown.streakBonus > 0 && (
                  <View style={styles.breakdownItem}>
                    <Text style={[styles.breakdownValue, { color: '#f43f5e' }]}>
                      +{myReward.breakdown.streakBonus}
                    </Text>
                    <Text style={styles.breakdownKey}>Streak</Text>
                  </View>
                )}
              </View>
            )}

            {/* Level Up Banner */}
            {leveledUp && (
              <View style={styles.levelUpBox}>
                <View style={styles.levelUpHeader}>
                  <ArrowUpCircle size={20} color="#22c55e" />
                  <Text style={styles.levelUpTitle}>LEVEL UPGRADED!</Text>
                </View>
                <Text style={styles.levelUpSub}>
                  Progressed to <Text style={{ fontWeight: '800', color: '#4ade80' }}>Level {currentLevel}</Text> of 20
                </Text>
                <Text style={styles.levelUpNote}>
                  Courtyard obstacles, speeds, and rules have scaled!
                </Text>
              </View>
            )}

            {/* Newly Unlocked Games */}
            {newlyUnlocked.length > 0 && (
              <View style={styles.unlockedBox}>
                <View style={styles.unlockedHeader}>
                  <Sparkles size={18} color="#e879f9" />
                  <Text style={styles.unlockedTitle}>NEW GAME UNLOCKED!</Text>
                </View>
                {newlyUnlocked.map((game) => (
                  <View key={game.gameId} style={styles.unlockedGameRow}>
                    <Text style={styles.unlockedGameName}>🔓 {game.title}</Text>
                    <Text style={styles.unlockedReadyBadge}>Ready to Play</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Pair Summary Highlights */}
            {result.summary && (
              <View style={styles.pairSummaryBox}>
                <View style={styles.pairSummaryCol}>
                  <Text style={styles.pairSummaryNum}>{result.summary.totalPoints}</Text>
                  <Text style={styles.pairSummaryLabel}>Pair Points</Text>
                </View>
                <View style={styles.pairSummaryDivider} />
                <View style={styles.pairSummaryCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Flame size={14} color="#f97316" />
                    <Text style={styles.pairSummaryNum}>{result.summary.currentStreak}</Text>
                  </View>
                  <Text style={styles.pairSummaryLabel}>Streak</Text>
                </View>
                <View style={styles.pairSummaryDivider} />
                <View style={styles.pairSummaryCol}>
                  <Text style={styles.pairSummaryNum}>
                    {result.summary.unlockedGamesCount}/{result.summary.totalGamesCount}
                  </Text>
                  <Text style={styles.pairSummaryLabel}>Games Open</Text>
                </View>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.actions}>
              {onPlayAgain && (
                <TouchableOpacity
                  style={styles.playAgainBtn}
                  onPress={() => {
                    onClose();
                    onPlayAgain();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.playAgainText}>Play Again</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.doneText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 22,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '90%',
  },
  winnerCard: {
    borderColor: 'rgba(245, 158, 11, 0.6)',
  },
  defaultCard: {
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  iconContainer: {
    position: 'relative',
    marginVertical: 10,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerIconCircle: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  defaultIconCircle: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  sparkleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0f172a',
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  pointsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '100%',
  },
  pointsNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fbbf24',
  },
  pointsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
    letterSpacing: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  breakdownKey: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  levelUpBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
  },
  levelUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelUpTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4ade80',
    letterSpacing: 1,
  },
  levelUpSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 4,
  },
  levelUpNote: {
    fontSize: 10,
    color: '#86efac',
    marginTop: 2,
    textAlign: 'center',
  },
  unlockedBox: {
    backgroundColor: 'rgba(217, 70, 239, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 70, 239, 0.35)',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    marginTop: 12,
  },
  unlockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  unlockedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#e879f9',
    letterSpacing: 1,
  },
  unlockedGameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  unlockedGameName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  unlockedReadyBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pairSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pairSummaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  pairSummaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pairSummaryNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
  },
  pairSummaryLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  playAgainBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  playAgainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  doneBtn: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
