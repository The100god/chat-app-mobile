import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Modal,
  TextInput,
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
  X,
  Search,
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
  onSelectGame: (gameId: TogetherGameId | null) => void;
  userStats?: Record<string, GameStats>;
  currentUserId?: string;
  partnerId?: string | null;
  partnerName?: string;
  gamificationState?: PairGamificationState | null;
  friends?: Array<{ friendId: string; username: string; name?: string; profilePic?: string }>;
  onSelectPartner?: (partnerId: string) => void;
}

export const MobileGameSelector: React.FC<MobileGameSelectorProps> = ({
  selectedGameId = null,
  onSelectGame,
  userStats = {},
  currentUserId,
  partnerId,
  partnerName,
  gamificationState,
  friends = [],
  onSelectPartner,
}) => {
  const { theme, mode } = useTheme();
  const { isGameEnabled } = useSystemConfig();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showStatsDashboard, setShowStatsDashboard] = useState<boolean>(false);
  const [partnerSearch, setPartnerSearch] = useState<string>('');

  // Sort partners: currently selected partner first, then alphabetically
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      if (a.friendId === partnerId) return -1;
      if (b.friendId === partnerId) return 1;
      return (a.username || '').localeCompare(b.username || '');
    });
  }, [friends, partnerId]);

  const filteredPartners = useMemo(() => {
    if (!partnerSearch.trim()) return sortedFriends;
    const q = partnerSearch.toLowerCase().trim();
    return sortedFriends.filter(
      (f) =>
        f.username?.toLowerCase().includes(q) ||
        (f.name && f.name.toLowerCase().includes(q))
    );
  }, [sortedFriends, partnerSearch]);

  const filteredGames = GAMES_REGISTRY.filter(
    (g) => (filterCategory === 'all' || g.category === filterCategory) && isGameEnabled(g.id)
  );

  const isLiveRoomMode = Boolean(userStats && Object.keys(userStats).length > 0);
  const isPairMode = !isLiveRoomMode && Boolean(gamificationState);

  const getStatsForGame = (gameId: string): GameStats & { pointsTogether: number; level: number } => {
    if (isLiveRoomMode) {
      if (currentUserId && userStats?.[`${gameId}_${currentUserId}`]) {
        return { ...userStats[`${gameId}_${currentUserId}`], pointsTogether: 0, level: 1 };
      }
      if (userStats?.[gameId]) {
        return { ...userStats[gameId], pointsTogether: 0, level: 1 };
      }
      return { wins: 0, losses: 0, ties: 0, total: 0, pointsTogether: 0, level: 1 };
    }

    // Pair Mode (No Room Created)
    const prog = gamificationState?.games?.find((g) => g.gameId === gameId);
    if (prog) {
      const pair = prog.pairStats;
      const myWins = pair ? pair.myWins : (prog.userWins?.[currentUserId || ''] || 0);
      const partnerWins = pair ? pair.partnerWins : 0;
      const ties = pair ? pair.ties : (prog.ties || 0);
      const total = pair ? pair.totalPlays : (prog.combinedPlays || (myWins + partnerWins + ties));
      return {
        wins: myWins,
        losses: partnerWins,
        ties: ties,
        total: total,
        pointsTogether: prog.combinedPoints || 0,
        level: prog.currentLevel || 1,
      };
    }

    return { wins: 0, losses: 0, ties: 0, total: 0, pointsTogether: 0, level: 1 };
  };

  const computedTotalStats: GameStats & { pointsTogether: number } = isLiveRoomMode
    ? (currentUserId && userStats?.[currentUserId]
        ? { ...userStats[currentUserId], pointsTogether: 0 }
        : GAMES_REGISTRY.reduce(
            (acc, g) => {
              const st = getStatsForGame(g.id);
              return {
                wins: acc.wins + st.wins,
                losses: acc.losses + st.losses,
                ties: acc.ties + st.ties,
                total: acc.total + st.total,
                pointsTogether: 0,
              };
            },
            { wins: 0, losses: 0, ties: 0, total: 0, pointsTogether: 0 }
          ))
    : {
        wins: gamificationState?.summary?.myTotalWins ?? gamificationState?.summary?.totalCombinedWins ?? 0,
        losses: gamificationState?.summary?.partnerTotalWins ?? 0,
        ties: gamificationState?.summary?.totalTies ?? 0,
        total: gamificationState?.summary?.totalCombinedPlays ?? 0,
        pointsTogether: gamificationState?.summary?.totalCombinedPoints ?? 0,
      };

  const totalStats = computedTotalStats;

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

      {/* Pair Progression Box - Matching UI spec & Theme-aware (Shown only when in active game room) */}
      {isLiveRoomMode && gamificationState && (
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

      {/* Stats Dashboard Modal */}
      <Modal
        visible={showStatsDashboard}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatsDashboard(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.statsModalContent,
              { backgroundColor: theme.card, borderColor: `${theme.accent}60` },
            ]}
          >
            <View style={[styles.statsHeader, { borderBottomColor: theme.border }]}>
              <View style={styles.statsHeaderLeft}>
                <Text style={styles.trophyEmoji}>{isPairMode ? '⚡' : '🏆'}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.statsTitle, { color: theme.foreground }]} numberOfLines={1}>
                    {isPairMode ? `Pair: You ⇄ ${partnerName || 'Partner'}` : 'Session Stats Overview'}
                  </Text>
                  <Text style={[styles.statsSubtitle, { color: theme.mutedText }]} numberOfLines={1}>
                    {isPairMode ? 'Lifetime matches & points together' : 'Real-time multiplayer metrics'}
                  </Text>
                </View>
              </View>
              <View style={styles.statsHeaderRight}>
                <View style={styles.winRateBox}>
                  <Text style={styles.winRateValue}>{winRate}%</Text>
                  <Text style={styles.winRateLabel}>WIN RATE</Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: theme.muted }]}
                  onPress={() => setShowStatsDashboard(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color={theme.foreground} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Partner Switcher (When in Pair Mode with multiple friends) */}
            {isPairMode && friends.length > 1 && onSelectPartner && (
              <View style={styles.partnerSwitcherSection}>
                <View style={styles.partnerSwitcherHeader}>
                  <Text style={[styles.partnerSwitcherLabel, { color: theme.mutedText }]}>
                    With Partner ({filteredPartners.length}):
                  </Text>
                  {friends.length > 6 && (
                    <View style={[styles.partnerSearchBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
                      <Search size={11} color={theme.mutedText} />
                      <TextInput
                        value={partnerSearch}
                        onChangeText={setPartnerSearch}
                        placeholder="Search friend..."
                        placeholderTextColor={theme.mutedText}
                        style={[styles.partnerSearchInput, { color: theme.foreground }]}
                      />
                      {partnerSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setPartnerSearch('')}>
                          <X size={11} color={theme.mutedText} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                  {filteredPartners.map((f) => {
                    const isSelected = f.friendId === partnerId;
                    return (
                      <TouchableOpacity
                        key={f.friendId}
                        onPress={() => onSelectPartner(f.friendId)}
                        style={[
                          styles.partnerChip,
                          {
                            borderColor: theme.border,
                            backgroundColor: theme.muted,
                          },
                          isSelected && {
                            backgroundColor: 'rgba(245, 158, 11, 0.2)',
                            borderColor: '#f59e0b',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.partnerChipText,
                            { color: theme.mutedText },
                            isSelected && { color: '#f59e0b', fontWeight: '800' },
                          ]}
                          numberOfLines={1}
                        >
                          {isSelected ? '⚡ ' : ''}{f.username}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Aggregate Stats Cards */}
            <View style={styles.statsMetricsRow}>
              {isPairMode ? (
                <>
                  <View style={[styles.metricCard, styles.tieMetricCard]}>
                    <View style={styles.metricTitleRow}>
                      <Zap size={11} color="#f59e0b" />
                      <Text style={[styles.metricLabel, { color: '#f59e0b' }]}>Points</Text>
                    </View>
                    <Text style={[styles.metricValue, { color: '#fbbf24', fontSize: 14 }]}>
                      {totalStats.pointsTogether}
                    </Text>
                  </View>

                  <View style={[styles.metricCard, styles.winMetricCard]}>
                    <View style={styles.metricTitleRow}>
                      <Trophy size={11} color="#22c55e" />
                      <Text style={[styles.metricLabel, { color: '#22c55e' }]}>You (W)</Text>
                    </View>
                    <Text style={[styles.metricValue, { color: '#4ade80', fontSize: 14 }]}>
                      {totalStats.wins}
                    </Text>
                  </View>

                  <View style={[styles.metricCard, styles.lossMetricCard]}>
                    <View style={styles.metricTitleRow}>
                      <XCircle size={11} color="#ef4444" />
                      <Text style={[styles.metricLabel, { color: '#ef4444' }]}>Partner</Text>
                    </View>
                    <Text style={[styles.metricValue, { color: '#fca5a5', fontSize: 14 }]}>
                      {totalStats.losses}
                    </Text>
                  </View>

                  <View style={[styles.metricCard, styles.totalMetricCard]}>
                    <View style={styles.metricTitleRow}>
                      <Handshake size={11} color="#a855f7" />
                      <Text style={[styles.metricLabel, { color: '#a855f7' }]}>Ties</Text>
                    </View>
                    <Text style={[styles.metricValue, { color: '#c084fc', fontSize: 14 }]}>
                      {totalStats.ties}
                    </Text>
                  </View>
                </>
              ) : (
                <>
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
                </>
              )}
            </View>

            {/* Per Game Stats Breakdown */}
            <ScrollView
              style={styles.modalScrollList}
              contentContainerStyle={styles.perGameList}
              showsVerticalScrollIndicator={false}
            >
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.perGameTitle, { color: theme.foreground }]} numberOfLines={1}>
                          {game.title}
                        </Text>
                        {st.level ? (
                          <View style={{ paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#f59e0b' }}>Lvl {st.level}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.perGameStatsText}>
                        <Text style={{ color: '#22c55e', fontWeight: '700' }}>{st.wins}W </Text>
                        <Text style={{ color: '#ef4444', fontWeight: '700' }}>{st.losses}L </Text>
                        <Text style={{ color: '#eab308', fontWeight: '700' }}>{st.ties}T </Text>
                        {isPairMode && st.pointsTogether > 0 ? (
                          <Text style={{ color: '#f59e0b', fontWeight: '800' }}>• ⚡{st.pointsTogether} pts</Text>
                        ) : null}
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
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBottomCloseBtn, { backgroundColor: theme.accent }]}
              onPress={() => setShowStatsDashboard(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBottomCloseBtnText}>Close Stats</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

              {/* Stats Bar (Show only when inside an active game room) */}
              {isLiveRoomMode && (
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
                    {isPairMode && stats.pointsTogether > 0
                      ? `⚡ ${stats.pointsTogether} pts`
                      : `${stats.total} Total`}
                  </Text>
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.playButton,
                  !isUnlocked
                    ? styles.lockedButton
                    : {
                        backgroundColor: isSelected
                          ? '#ef4444'
                          : theme.accent,
                        borderColor: isSelected
                          ? '#dc2626'
                          : theme.accent,
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
                  if (isSelected) {
                    onSelectGame(null);
                  } else {
                    onSelectGame(game.id);
                  }
                }}
                activeOpacity={0.8}
              >
                {isUnlocked ? (
                  <>
                    {isSelected ? (
                      <X size={15} color="#ffffff" strokeWidth={3} style={{ marginRight: 6 }} />
                    ) : (
                      <Play
                        size={14}
                        color="#ffffff"
                        fill="#ffffff"
                        style={{ marginRight: 6 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.playButtonText,
                        { color: '#ffffff', fontWeight: '800' },
                      ]}
                    >
                      {isSelected ? 'Cancel Selection' : 'Play Now'}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  statsModalContent: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
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
    marginBottom: 12,
  },
  statsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  trophyEmoji: {
    fontSize: 22,
    flexShrink: 0,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statsSubtitle: {
    fontSize: 10,
  },
  statsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  winRateBox: {
    alignItems: 'flex-end',
    minWidth: 44,
  },
  winRateValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#22c55e',
    fontVariant: ['tabular-nums'],
  },
  winRateLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748b',
  },
  partnerSwitcherSection: {
    marginBottom: 12,
  },
  partnerSwitcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  partnerSwitcherLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  partnerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: 150,
  },
  partnerSearchInput: {
    fontSize: 11,
    padding: 0,
    minWidth: 70,
  },
  partnerChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  partnerChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollList: {
    maxHeight: 280,
    marginBottom: 12,
  },
  modalBottomCloseBtn: {
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBottomCloseBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
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
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    flexShrink: 0,
  },
  gameIconImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
    flexShrink: 0,
  },
  gameTitleBox: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
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
