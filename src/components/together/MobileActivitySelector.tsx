import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { TogetherActivityId } from '../../states/togetherTypes';
import {
  Heart,
  Sparkles,
  Flame,
  Scale,
  Calendar,
  MessageCircle,
  Play,
} from 'lucide-react-native';

export interface TogetherActivityDefinition {
  id: TogetherActivityId;
  title: string;
  description: string;
  type: 'scenario' | 'turn_based' | 'comparison' | 'daily' | 'categorized';
  icon: string;
  color: string;
}

export const ACTIVITIES_REGISTRY: TogetherActivityDefinition[] = [
  {
    id: 'would_you_rather',
    title: 'Would You Rather',
    description: 'Choose between two tricky scenarios and see if your choices align!',
    type: 'scenario',
    icon: '🤔',
    color: '#ec4899',
  },
  {
    id: 'truth_or_dare',
    title: 'Truth or Dare',
    description: 'Fun, safe, and revealing relationship truths or lighthearted dares!',
    type: 'turn_based',
    icon: '🔥',
    color: '#ef4444',
  },
  {
    id: 'this_or_that',
    title: 'This or That',
    description: 'Quick binary preference choices to test your partner compatibility!',
    type: 'comparison',
    icon: '⚖️',
    color: '#8b5cf6',
  },
  {
    id: 'daily_question',
    title: 'Daily Question',
    description: 'A rotating question every day to connect and reflect together.',
    type: 'daily',
    icon: '📅',
    color: '#10b981',
  },
  {
    id: 'couple_questions',
    title: 'Couple Questions',
    description: 'Explore fun, deep, memory, and future relationship questions.',
    type: 'categorized',
    icon: '💬',
    color: '#f59e0b',
  },
];

interface MobileActivitySelectorProps {
  selectedActivityId?: TogetherActivityId | null;
  onSelectActivity: (activityId: TogetherActivityId) => void;
}

export const MobileActivitySelector: React.FC<MobileActivitySelectorProps> = ({
  selectedActivityId,
  onSelectActivity,
}) => {
  const { theme } = useTheme();
  const [filter, setFilter] = useState<string>('all');

  const filteredActivities = ACTIVITIES_REGISTRY.filter((act) => {
    if (filter === 'all') return true;
    return act.type === filter;
  });

  return (
    <View style={styles.container}>
      {/* Hero Banner Header */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderCenter}>
          <View style={styles.heroIconBadge}>
            <Text style={styles.heroHeartEmoji}>❤️</Text>
          </View>
          <Text style={styles.heroTitle}>COUPLE ACTIVITIES</Text>
        </View>

        {/* Filter Badges Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { id: 'all', label: 'All', icon: Sparkles },
            { id: 'scenario', label: 'Scenario', icon: Heart },
            { id: 'turn_based', label: 'Turn Based', icon: Flame },
            { id: 'comparison', label: 'Comparison', icon: Scale },
            { id: 'daily', label: 'Daily', icon: Calendar },
            { id: 'categorized', label: 'Categorized', icon: MessageCircle },
          ].map((item) => {
            const IconComponent = item.icon;
            const isSelected = filter === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillSelected,
                ]}
                onPress={() => setFilter(item.id)}
              >
                <IconComponent
                  size={13}
                  color={isSelected ? '#be123c' : '#ffffff'}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Activity Cards Grid */}
      <View style={styles.activitiesGrid}>
        {filteredActivities.map((act) => {
          const isSelected = selectedActivityId === act.id;

          return (
            <TouchableOpacity
              key={act.id}
              style={[
                styles.activityCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                isSelected && {
                  borderColor: theme.accent,
                  backgroundColor: `${theme.accent}15`,
                },
              ]}
              onPress={() => onSelectActivity(act.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.activityIconSquare,
                    { backgroundColor: `${act.color}25` },
                  ]}
                >
                  <Text style={styles.activityIconText}>{act.icon}</Text>
                </View>
                <View
                  style={[
                    styles.typeTag,
                    { backgroundColor: theme.muted, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.typeTagText, { color: theme.mutedText }]}>
                    {act.type.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={[styles.activityTitle, { color: theme.foreground }]}>
                {act.title}
              </Text>
              <Text style={[styles.activityDesc, { color: theme.mutedText }]}>
                {act.description}
              </Text>

              {/* Action Footer */}
              <View style={[styles.cardFooter, { borderTopColor: `${theme.border}80` }]}>
                <Text style={[styles.startText, { color: theme.accent }]}>
                  Start Activity
                </Text>
                <View
                  style={[
                    styles.playCircleBtn,
                    { backgroundColor: act.color },
                  ]}
                >
                  <Play size={14} color="#ffffff" style={{ marginLeft: 2 }} />
                </View>
              </View>
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
  heroCard: {
    backgroundColor: '#ec4899',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    gap: 14,
  },
  heroHeaderCenter: {
    alignItems: 'center',
    gap: 8,
  },
  heroIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroHeartEmoji: {
    fontSize: 26,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  filterScroll: {
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  filterPillSelected: {
    backgroundColor: '#ffffff',
  },
  filterPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextSelected: {
    color: '#be123c',
  },
  activitiesGrid: {
    gap: 14,
  },
  activityCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityIconSquare: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIconText: {
    fontSize: 22,
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  activityDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  startText: {
    fontSize: 13,
    fontWeight: '800',
  },
  playCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
