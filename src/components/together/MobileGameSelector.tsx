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
import { TogetherGameId, GameStats } from '../../states/togetherTypes';
import {
  Sparkles,
  Trophy,
  XCircle,
  Handshake,
  Gamepad2,
  Play,
  BarChart3,
} from 'lucide-react-native';

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
}

export const MobileGameSelector: React.FC<MobileGameSelectorProps> = ({
  selectedGameId = null,
  onSelectGame,
  userStats = {},
  currentUserId,
}) => {
  const { theme } = useTheme();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showStatsDashboard, setShowStatsDashboard] = useState<boolean>(false);

  const filteredGames = GAMES_REGISTRY.filter(
    (g) => filterCategory === 'all' || g.category === filterCategory
  );

  const getStatsForGame = (gameId: string): GameStats => {
    if (currentUserId && userStats[`${gameId}_${currentUserId}`]) {
      return userStats[`${gameId}_${currentUserId}`];
    }
    if (userStats[gameId]) {
      return userStats[gameId];
    }
    return { wins: 0, losses: 0, ties: 0, total: 0 };
  };

  const totalStats = GAMES_REGISTRY.reduce(
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

  const winRate =
    totalStats.total > 0 ? Math.round((totalStats.wins / totalStats.total) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Category Filter Tabs & Stats Toggle Header */}
      <View style={styles.topFilterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
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

        <TouchableOpacity
          style={[
            styles.statsToggleBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
            showStatsDashboard && { backgroundColor: '#8b5cf6', borderColor: '#a855f7' },
          ]}
          onPress={() => setShowStatsDashboard(!showStatsDashboard)}
        >
          <BarChart3 size={14} color={showStatsDashboard ? '#ffffff' : theme.foreground} />
          <Text
            style={[
              styles.statsToggleText,
              { color: theme.foreground },
              showStatsDashboard && { color: '#ffffff', fontWeight: '800' },
            ]}
          >
            Stats
          </Text>
        </TouchableOpacity>
      </View>

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
                  <TouchableOpacity
                    style={[styles.playMiniBtn, { backgroundColor: theme.accent }]}
                    onPress={() => onSelectGame(game.id)}
                  >
                    <Text style={styles.playMiniBtnText}>Play</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Games Grid */}
      <View style={styles.gamesGrid}>
        {filteredGames.map((game) => {
          const isSelected = selectedGameId === game.id;
          const stats = getStatsForGame(game.id);

          return (
            <TouchableOpacity
              key={game.id}
              style={[
                styles.gameCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                isSelected && {
                  borderColor: theme.accent,
                  backgroundColor: `${theme.accent}15`,
                },
              ]}
              onPress={() => onSelectGame(game.id)}
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
                  ]}
                >
                  <Image source={game.iconAsset} style={styles.gameIconImage} />
                </View>
                <View style={styles.gameTitleBox}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.gameTitle, { color: theme.foreground }]}>
                      {game.title}
                    </Text>
                    {isSelected && (
                      <View style={[styles.selectedPill, { backgroundColor: theme.accent }]}>
                        <Text style={styles.selectedPillText}>Selected</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.gameSubtitle, { color: theme.mutedText }]}>
                    {game.subtitle}
                  </Text>
                </View>
              </View>

              {/* Game Description */}
              <Text style={[styles.gameDescription, { color: theme.mutedText }]}>
                {game.description}
              </Text>

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
                  { backgroundColor: theme.muted },
                  isSelected && { backgroundColor: theme.accent },
                ]}
                onPress={() => onSelectGame(game.id)}
              >
                <Play
                  size={14}
                  color={isSelected ? '#ffffff' : theme.foreground}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.playButtonText,
                    { color: theme.foreground },
                    isSelected && { color: '#ffffff', fontWeight: '800' },
                  ]}
                >
                  {isSelected ? 'Selected Game' : 'Play'}
                </Text>
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
  playMiniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
    height: 40,
    borderRadius: 12,
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
