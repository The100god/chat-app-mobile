import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useSystemConfig } from '../../context/ConfigContext';
import { TogetherGameId, GameStats, PairGamificationState } from '../../states/togetherTypes';
import {
  Sparkles,
  Trophy,
  XCircle,
  Handshake,
  Gamepad2,
  Play,
  BarChart3,
  Lock,
  Flame,
  Zap,
  Check,
} from 'lucide-react-native';
import { showToast } from '../Toast';

export interface TogetherGameDefinition {
  id: TogetherGameId;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  iconAsset: any;
  badgeGradient: [string, string];
  minPlayers: number;
  maxPlayers: number;
  status: 'active' | 'coming_soon';
  category: 'classic' | 'arcade' | 'creative' | 'trivia';
}

export const GAMES_REGISTRY: TogetherGameDefinition[] = [
  {
    id: 'tictactoe',
    title: 'Tic-Tac-Toe',
    subtitle: 'Classic 3x3 Strategy',
    description: 'Battle a friend in real-time. Align 3 symbols (X or O) to win!',
    icon: '❌⭕',
    iconAsset: require('../../../assets/game-icons/tictactoe.png'),
    badgeGradient: ['#06b6d4', '#2563eb'],
    minPlayers: 2,
    maxPlayers: 2,
    status: 'active',
    category: 'classic',
  },
  {
    id: 'rps',
    title: 'Rock Paper Scissors',
    subtitle: 'Secret Move Showdown',
    description: 'Simultaneous secret choices! Reveal cards to see who takes the round.',
    icon: '✂️🪨',
    iconAsset: require('../../../assets/game-icons/rps.png'),
    badgeGradient: ['#f43f5e', '#db2777'],
    minPlayers: 2,
    maxPlayers: 2,
    status: 'active',
    category: 'arcade',
  },
  {
    id: 'connect4',
    title: 'Connect 4',
    subtitle: '4-in-a-Row Gravity Drop',
    description: 'Drop colored discs into columns and connect 4 in a row to win!',
    icon: '🔴🟡',
    iconAsset: require('../../../assets/game-icons/connect4.png'),
    badgeGradient: ['#f59e0b', '#ef4444'],
    minPlayers: 2,
    maxPlayers: 2,
    status: 'active',
    category: 'classic',
  },
  {
    id: 'memory',
    title: 'Memory Match',
    subtitle: 'Card Flipping Challenge',
    description: 'Test your memory! Flip 2 cards at a time and match pairs.',
    icon: '🎴🧠',
    iconAsset: require('../../../assets/game-icons/memory.png'),
    badgeGradient: ['#a855f7', '#4f46e5'],
    minPlayers: 2,
    maxPlayers: 2,
    status: 'active',
    category: 'arcade',
  },
  {
    id: 'drawing',
    title: 'Drawing Board',
    subtitle: 'Couples Doodle & Stamp',
    description: 'Create art together in real time! Draw, pick colors, and place blocks.',
    icon: '🎨',
    iconAsset: require('../../../assets/game-icons/drawing.png'),
    badgeGradient: ['#10b981', '#0d9488'],
    minPlayers: 2,
    maxPlayers: 2,
    status: 'active',
    category: 'creative',
  },
  {
    id: 'quiz',
    title: 'Trivia Quiz',
    subtitle: 'Fun Knowledge Duel',
    description: 'Answer 5 trivia questions together and see who scores highest!',
    icon: '💡❓',
    iconAsset: require('../../../assets/game-icons/quiz.png'),
    badgeGradient: ['#8b5cf6', '#9333ea'],
    minPlayers: 2,
    maxPlayers: 2,
    status: 'active',
    category: 'trivia',
  },
  {
    id: 'catchpartner',
    title: 'Pakdam Pakdai',
    subtitle: 'Real-Time 2D Top-Down Chase',
    description: 'One is Catcher, one is Runner! Tag your partner before time runs out.',
    icon: '🏃',
    iconAsset: require('../../../assets/game-icons/catchpartner.png'),
    badgeGradient: ['#ef4444', '#f59e0b'],
    minPlayers: 2,
    maxPlayers: 2,
    status: 'active',
    category: 'arcade',
  },
];

interface MobileGameSelectorProps {
  selectedGameId?: TogetherGameId | null;
  onSelectGame: (gameId: TogetherGameId) => void;
  userStats?: Record<string, GameStats>;
  currentUserId?: string;
  partnerId?: string | null;
  partnerName?: string;
  gamificationState?: PairGamificationState | null;
}

export const MobileGameSelector: React.FC<MobileGameSelectorProps> = ({
  selectedGameId = null,
  onSelectGame,
  userStats = {},
  currentUserId,
  partnerId,
  partnerName,
  gamificationState,
}) => {
  const { theme, mode } = useTheme();
  const { isGameEnabled } = useSystemConfig();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showStatsDashboard, setShowStatsDashboard] = useState<boolean>(false);

  const filteredGames = GAMES_REGISTRY.filter(
    (g) => (filterCategory === 'all' || g.category === filterCategory) && isGameEnabled(g.id)
  );

  const getStatsForGame = (gameId: string): GameStats => {
    if (currentUserId && userStats[`${gameId}_${currentUserId}`]) {
      const s = userStats[`${gameId}_${currentUserId}`];
      if (s.total > 0 || s.wins > 0) return s;
    }
    if (userStats[gameId]) {
      const s = userStats[gameId];
      if (s.total > 0 || s.wins > 0) return s;
    }
    if (gamificationState?.games) {
      const gProg = gamificationState.games.find((g) => g.gameId === gameId);
      if (gProg && (gProg.combinedPlays > 0 || gProg.combinedWins > 0)) {
        const wins = gProg.combinedWins || 0;
        const total = gProg.combinedPlays || 0;
        const losses = Math.max(0, total - wins);
        return { wins, losses, ties: 0, total };
      }
    }
    return { wins: 0, losses: 0, ties: 0, total: 0 };
  };

  const computedTotalStats = currentUserId && userStats[currentUserId] && userStats[currentUserId].total > 0
    ? userStats[currentUserId]
    : GAMES_REGISTRY.reduce(
        (acc, g) => {
          const st = getStatsForGame(g.id);
          return {
            wins: acc.wins + st.wins,
            losses: acc.losses + st.losses,
            ties: acc.ties + st.ties,
            total: acc.total + st.total,
          };
        },
        { wins: 0, losses: 0, ties: 0, total: 0 }
      );

  const totalStats: GameStats =
    computedTotalStats.total > 0
      ? computedTotalStats
      : gamificationState?.summary
      ? {
          wins: gamificationState.summary.totalCombinedWins ?? gamificationState.summary.totalWins ?? 0,
          total: gamificationState.summary.totalCombinedPlays ?? gamificationState.summary.totalPlays ?? 0,
          losses: Math.max(
            0,
            (gamificationState.summary.totalCombinedPlays ?? gamificationState.summary.totalPlays ?? 0) -
              (gamificationState.summary.totalCombinedWins ?? gamificationState.summary.totalWins ?? 0)
          ),
          ties: 0,
        }
      : computedTotalStats;

  const winRate =
    totalStats.total > 0 ? Math.round((totalStats.wins / totalStats.total) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Category Filter Tabs */}
      <View style={styles.topFilterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%' }}
          contentContainerStyle={styles.categoryScroll}
        >
          {[
            { id: 'all', label: 'All Games', icon: Gamepad2 },
            { id: 'classic', label: 'Classic', icon: Sparkles },
            { id: 'arcade', label: 'Arcade', icon: Trophy },
            { id: 'creative', label: 'Creative', icon: Sparkles },
            { id: 'trivia', label: 'Quiz', icon: Gamepad2 },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isActive = filterCategory === tab.id && !showStatsDashboard;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.categoryPill,
                  { backgroundColor: theme.muted, borderColor: theme.border },
                  isActive && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => {
                  setFilterCategory(tab.id);
                  setShowStatsDashboard(false);
                }}
              >
                <IconComponent size={14} color={isActive ? '#ffffff' : theme.foreground} />
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: theme.foreground },
                    isActive && { color: '#ffffff', fontWeight: '800' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Pair Progression Box - Matching UI spec & Theme-aware */}
      {gamificationState && (
        <View
          style={[
            styles.pairProgressionCard,
            {
              backgroundColor: theme.card,
              borderColor: mode === 'light' ? 'rgba(217, 119, 6, 0.35)' : 'rgba(251, 191, 36, 0.35)',
            },
          ]}
        >
          <View style={styles.progressionRow}>
            {/* Left: Trophy Squircle */}
            <View
              style={[
                styles.trophySquircle,
                mode === 'light' && {
                  backgroundColor: '#6366f1',
                  borderColor: '#d97706',
                },
              ]}
            >
              <Trophy size={20} color="#ffffff" />
            </View>

            {/* Middle: Title & Stats */}
            <View style={styles.progressionInfo}>
              <View style={styles.progressionTitleLine}>
                <Text style={[styles.progressionMainTitle, { color: theme.foreground }]}>
                  Together Progression
                </Text>
                {partnerName && (
                  <Text style={[styles.progressionPartnerName, mode === 'light' && { color: '#d97706' }]}>
                    with {partnerName}
                  </Text>
                )}
              </View>

              <View style={styles.progressionMetricsLine}>
                <Text style={[styles.progressionPoints, mode === 'light' && { color: '#d97706' }]}>
                  ⚡ {gamificationState.summary.totalCombinedPoints ?? gamificationState.summary.totalPoints ?? 0} Points
                </Text>
                <Text style={[styles.progressionSep, { color: theme.mutedText }]}>•</Text>
                <Text style={[styles.progressionWins, mode === 'light' && { color: '#16a34a' }]}>
                  {gamificationState.summary.totalCombinedWins ?? gamificationState.summary.totalWins ?? 0} Wins
                </Text>
                <Text style={[styles.progressionSep, { color: theme.mutedText }]}>•</Text>
                <Text style={[styles.progressionUnlocked, mode === 'light' && { color: '#4f46e5' }]}>
                  {gamificationState.summary.unlockedGamesCount} / 7 Games Unlocked
                </Text>
              </View>
            </View>
          </View>

          {/* Next Goal / Progress Bar */}
          {(() => {
            const nextLocked = gamificationState.games?.find((g) => !g.isUnlocked);
            if (!nextLocked) {
              return (
                <View style={[styles.goalSectionAllUnlocked, { borderTopColor: theme.border }]}>
                  <Text style={[styles.allUnlockedLabel, mode === 'light' && { color: '#16a34a' }]}>
                    All Games Unlocked!
                  </Text>
                  <Text style={[styles.allUnlockedSub, { color: theme.mutedText }]}>
                    Keep leveling up to Level 20!
                  </Text>
                </View>
              );
            }
            const ptsNeeded = nextLocked.unlockRequirements?.pointsRequired || 0;
            const currentPts = gamificationState.summary.totalCombinedPoints ?? gamificationState.summary.totalPoints ?? 0;
            const pct = Math.min(100, Math.round((currentPts / (ptsNeeded || 1)) * 100));

            return (
              <View style={[styles.goalSection, { borderTopColor: theme.border }]}>
                <View style={styles.goalTextRow}>
                  <Text style={[styles.goalNextName, { color: theme.mutedText }]}>
                    Next: {nextLocked.title}
                  </Text>
                  <Text style={[styles.goalPtsBadge, mode === 'light' && { color: '#d97706' }]}>
                    {currentPts} / {ptsNeeded} pts ({pct}%)
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressBarTrack,
                    {
                      backgroundColor: mode === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.12)',
                      borderColor: mode === 'light' ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: mode === 'light' ? '#d97706' : '#fbbf24',
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })()}
        </View>
      )}

      {/* Stats Dashboard */}
      {showStatsDashboard && (
        <View
          style={[
            styles.statsDashboardCard,
            { backgroundColor: theme.card, borderColor: `${theme.accent}60` },
          ]}
        >
          <View style={[styles.statsHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.statsHeaderLeft}>
              <Text style={styles.trophyEmoji}>🏆</Text>
              <View>
                <Text style={[styles.statsTitle, { color: theme.foreground }]}>
                  Session Stats Overview
                </Text>
                <Text style={[styles.statsSubtitle, { color: theme.mutedText }]}>
                  Real-time multiplayer metrics
                </Text>
              </View>
            </View>
            <View style={styles.winRateBox}>
              <Text style={styles.winRateValue}>{winRate}%</Text>
              <Text style={styles.winRateLabel}>WIN RATE</Text>
            </View>
          </View>

          {/* Aggregate Stats Cards */}
          <View style={styles.statsMetricsRow}>
            <View style={[styles.metricCard, styles.winMetricCard]}>
              <View style={styles.metricTitleRow}>
                <Trophy size={11} color="#22c55e" />
                <Text style={[styles.metricLabel, { color: '#22c55e' }]}>Wins</Text>
              </View>
              <Text style={[styles.metricValue, { color: '#4ade80' }]}>{totalStats.wins}</Text>
            </View>

            <View style={[styles.metricCard, styles.lossMetricCard]}>
              <View style={styles.metricTitleRow}>
                <XCircle size={11} color="#ef4444" />
                <Text style={[styles.metricLabel, { color: '#ef4444' }]}>Losses</Text>
              </View>
              <Text style={[styles.metricValue, { color: '#fca5a5' }]}>{totalStats.losses}</Text>
            </View>

            <View style={[styles.metricCard, styles.tieMetricCard]}>
              <View style={styles.metricTitleRow}>
                <Handshake size={11} color="#eab308" />
                <Text style={[styles.metricLabel, { color: '#eab308' }]}>Ties</Text>
              </View>
              <Text style={[styles.metricValue, { color: '#fde047' }]}>{totalStats.ties}</Text>
            </View>

            <View style={[styles.metricCard, styles.totalMetricCard]}>
              <View style={styles.metricTitleRow}>
                <Gamepad2 size={11} color="#a855f7" />
                <Text style={[styles.metricLabel, { color: '#a855f7' }]}>Played</Text>
              </View>
              <Text style={[styles.metricValue, { color: '#c084fc' }]}>{totalStats.total}</Text>
            </View>
          </View>

          {/* Per Game Stats Breakdown */}
          <View style={styles.perGameList}>
            {GAMES_REGISTRY.map((game) => {
              const st = getStatsForGame(game.id);
              return (
                <View
                  key={game.id}
                  style={[
                    styles.perGameRow,
                    { backgroundColor: theme.muted, borderColor: theme.border },
                  ]}
                >
                  <Image source={game.iconAsset} style={styles.perGameIcon} />
                  <View style={styles.perGameInfo}>
                    <Text style={[styles.perGameTitle, { color: theme.foreground }]}>
                      {game.title}
                    </Text>
                    <Text style={styles.perGameStatsText}>
                      <Text style={{ color: '#22c55e', fontWeight: '700' }}>{st.wins}W </Text>
                      <Text style={{ color: '#ef4444', fontWeight: '700' }}>{st.losses}L </Text>
                      <Text style={{ color: '#eab308', fontWeight: '700' }}>{st.ties}T</Text>
                    </Text>
                  </View>
                  <View style={styles.perGameTotalBadge}>
                    <Text style={[styles.perGameTotalNum, { color: theme.foreground }]}>
                      {st.total}
                    </Text>
                    <Text style={[styles.perGameTotalLabel, { color: theme.mutedText }]}>
                      {st.total === 1 ? 'game' : 'games'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Section Header Row with Stats Toggle Button */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionHeading, { color: theme.foreground }]}>
          Games ({filteredGames.length})
        </Text>
        <TouchableOpacity
          style={[
            styles.statsToggleChip,
            { backgroundColor: theme.card, borderColor: theme.border },
            showStatsDashboard && { backgroundColor: '#8b5cf6', borderColor: '#a855f7' },
          ]}
          onPress={() => setShowStatsDashboard(!showStatsDashboard)}
          activeOpacity={0.8}
        >
          <BarChart3 size={13} color={showStatsDashboard ? '#ffffff' : theme.foreground} />
          <Text
            style={[
              styles.statsToggleChipText,
              { color: theme.foreground },
              showStatsDashboard && { color: '#ffffff', fontWeight: '800' },
            ]}
          >
            {showStatsDashboard ? 'Hide Stats' : 'Game Stats'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Games Grid */}
      <View style={styles.gamesGrid}>
        {filteredGames.map((game) => {
          const isSelected = selectedGameId === game.id;
          const stats = getStatsForGame(game.id);
          const progress = gamificationState?.games.find((g) => g.gameId === game.id);
          const isUnlocked = progress ? progress.isUnlocked : true;
          const currentLevel = progress ? progress.currentLevel : 1;

          return (
            <TouchableOpacity
              key={game.id}
              style={[
                styles.gameCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                !isUnlocked && { opacity: 0.75, borderColor: 'rgba(244, 63, 94, 0.3)' },
                isSelected && {
                  borderColor: theme.accent,
                  backgroundColor: `${theme.accent}15`,
                },
              ]}
              onPress={() => {
                if (!isUnlocked) {
                  showToast(
                    `Locked: Earn ${progress?.unlockRequirements?.pointsRequired || 0} Pair Points to unlock ${game.title}!`,
                    'warning'
                  );
                  return;
                }
                onSelectGame(game.id);
              }}
              activeOpacity={0.8}
            >
              {/* Active Glow Top Bar */}
              {isSelected && (
                <View style={[styles.activeTopIndicator, { backgroundColor: theme.accent }]} />
              )}

              {/* Game Icon & Header */}
              <View style={styles.gameCardHeader}>
                <View
                  style={[
                    styles.gameIconBadge,
                    { backgroundColor: game.badgeGradient[0] },
                    !isUnlocked && { opacity: 0.6 },
                  ]}
                >
                  <Image source={game.iconAsset} style={styles.gameIconImage} />
                </View>
                <View style={styles.gameTitleBox}>
                  <View style={styles.titleRow}>
                    <View style={styles.titleContainer}>
                      <Text style={[styles.gameTitle, { color: theme.foreground }]} numberOfLines={1}>
                        {game.title}
                      </Text>
                      <Text style={[styles.gameSubtitle, { color: theme.mutedText }]} numberOfLines={1}>
                        {game.subtitle}
                      </Text>
                    </View>
                    <View style={styles.badgeColumn}>
                      {isUnlocked ? (
                        <View style={styles.levelBadge}>
                          <Text style={styles.levelBadgeText}>Lvl {currentLevel}</Text>
                        </View>
                      ) : (
                        <View style={styles.lockedBadge}>
                          <Text style={styles.lockedBadgeText}>Locked</Text>
                        </View>
                      )}
                      {isSelected && (
                        <View style={[styles.selectedPill, { backgroundColor: theme.accent }]}>
                          <Text style={styles.selectedPillText}>Active</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Game Description */}
              <Text style={[styles.gameDescription, { color: theme.mutedText }]}>
                {game.description}
              </Text>

              {/* Locked Notice Banner */}
              {!isUnlocked && (
                <View style={styles.lockedNotice}>
                  <Lock size={13} color="#f43f5e" />
                  <Text style={styles.lockedNoticeText}>
                    Requires {progress?.unlockRequirements?.pointsRequired || 0} Pair Points
                    {progress?.unlockRequirements?.requiredPreviousGames?.length ? ' & prerequisite wins' : ''}
                  </Text>
                </View>
              )}

              {/* Stats Bar */}
              <View
                style={[
                  styles.cardStatsBar,
                  { backgroundColor: theme.muted, borderColor: theme.border },
                ]}
              >
                <View style={styles.statsRowLeft}>
                  <Text style={[styles.statText, { color: '#22c55e' }]}>
                    🏆 {stats.wins} W
                  </Text>
                  <Text style={[styles.statText, { color: '#ef4444' }]}>
                    ❌ {stats.losses} L
                  </Text>
                  <Text style={[styles.statText, { color: '#eab308' }]}>
                    🤝 {stats.ties} T
                  </Text>
                </View>
                <Text style={[styles.statTotalText, { color: theme.mutedText }]}>
                  {stats.total} Total
                </Text>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.playButton,
                  !isUnlocked
                    ? styles.lockedButton
                    : {
                        backgroundColor: isSelected
                          ? theme.accent
                          : mode === 'dark'
                          ? 'rgba(139, 92, 246, 0.22)'
                          : mode === 'aurora'
                          ? 'rgba(0, 188, 212, 0.22)'
                          : 'rgba(0, 168, 132, 0.12)',
                        borderColor: isSelected
                          ? theme.accent
                          : mode === 'dark'
                          ? 'rgba(139, 92, 246, 0.55)'
                          : mode === 'aurora'
                          ? 'rgba(0, 188, 212, 0.55)'
                          : 'rgba(0, 168, 132, 0.4)',
                      },
                ]}
                onPress={() => {
                  if (!isUnlocked) {
                    showToast(
                      `Locked: Earn ${progress?.unlockRequirements?.pointsRequired || 0} Pair Points to unlock ${game.title}!`,
                      'warning'
                    );
                    return;
                  }
                  onSelectGame(game.id);
                }}
                activeOpacity={0.75}
              >
                {isUnlocked ? (
                  <>
                    {isSelected ? (
                      <Check size={15} color="#ffffff" strokeWidth={3} style={{ marginRight: 6 }} />
                    ) : (
                      <Play
                        size={14}
                        color={
                          mode === 'dark'
                            ? '#c4b5fd'
                            : mode === 'aurora'
                            ? '#22d3ee'
                            : theme.accent
                        }
                        fill={
                          mode === 'dark'
                            ? '#c4b5fd'
                            : mode === 'aurora'
                            ? '#22d3ee'
                            : theme.accent
                        }
                        style={{ marginRight: 6 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.playButtonText,
                        {
                          color: isSelected
                            ? '#ffffff'
                            : mode === 'dark'
                            ? '#ffffff'
                            : mode === 'aurora'
                            ? '#e0f7fa'
                            : theme.foreground,
                        },
                        isSelected && { fontWeight: '800' },
                      ]}
                    >
                      {isSelected ? 'Selected Game' : 'Play'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Lock size={14} color="#94a3b8" style={{ marginRight: 6 }} />
                    <Text style={[styles.playButtonText, { color: '#94a3b8' }]}>
                      Locked
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  topFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryScroll: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  statsToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsDashboardCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  statsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trophyEmoji: {
    fontSize: 24,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statsSubtitle: {
    fontSize: 11,
  },
  winRateBox: {
    alignItems: 'flex-end',
  },
  winRateValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#22c55e',
  },
  winRateLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  statsMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  winMetricCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  lossMetricCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  tieMetricCard: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  totalMetricCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  metricTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  perGameList: {
    gap: 8,
  },
  perGameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
  },
  perGameIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    marginRight: 10,
  },
  perGameInfo: {
    flex: 1,
  },
  perGameTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  perGameStatsText: {
    fontSize: 11,
    marginTop: 1,
  },
  perGameTotalBadge: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 8,
  },
  perGameTotalNum: {
    fontSize: 12,
    fontWeight: '800',
  },
  perGameTotalLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  playMiniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  playMiniBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  gamesGrid: {
    gap: 14,
  },
  gameCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  activeTopIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  gameCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  gameIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  gameIconImage: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  gameTitleBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  selectedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  selectedPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  gameSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  gameDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  statsRowLeft: {
    flexDirection: 'row',
    gap: 10,
  },
  statText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statTotalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsToggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  statsToggleChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pairProgressionCard: {
    marginHorizontal: 4,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  progressionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trophySquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    elevation: 3,
  },
  progressionInfo: {
    flex: 1,
  },
  progressionTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  progressionMainTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressionPartnerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
  progressionMetricsLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 3,
  },
  progressionPoints: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
  },
  progressionSep: {
    fontSize: 11,
  },
  progressionWins: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10b981',
  },
  progressionUnlocked: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818cf8',
  },
  goalSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  goalSectionAllUnlocked: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  goalTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  goalNextName: {
    fontSize: 11,
    fontWeight: '600',
  },
  goalPtsBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
    fontVariant: ['tabular-nums'],
  },
  progressBarTrack: {
    width: '100%',
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  allUnlockedLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10b981',
    textTransform: 'uppercase',
  },
  allUnlockedSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  levelBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fbbf24',
  },
  lockedBadge: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f43f5e',
  },
  lockedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  lockedNoticeText: {
    fontSize: 11,
    color: '#f43f5e',
    fontWeight: '600',
    flex: 1,
  },
  lockedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});
