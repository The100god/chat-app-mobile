import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
}

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹',
      '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗',
      '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓',
      '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕',
      '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😮‍💨',
      '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
    ],
  },
  {
    id: 'gestures',
    name: '👍',
    emojis: [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲',
      '🤝', '🙏', '✌️', '🫰', '🤞', '🤌', '🤏', '👌', '🤘', '🤟',
      '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖',
      '👋', '💪', '🦾', '🖕', '✍️', '💅', '🤳', '💃', '🕺', '🚶',
    ],
  },
  {
    id: 'hearts',
    name: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
      '💟', '💌', '💋', '👥', '🫂', '🧑‍🤝‍🧑', '👩‍❤️‍👨', '👩‍❤️‍👩', '💑', '💐',
    ],
  },
  {
    id: 'activities',
    name: '🎉',
    emojis: [
      '🎉', '🎊', '🎈', '🎂', '🎁', '✨', '🔥', '🌟', '⭐', '💫',
      '🚀', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾',
      '🎮', '🎲', '🎯', '🎸', '🎤', '🎧', '🎬', '🎨', '🎪', '🍕',
      '🍔', '🍟', '🍿', '🍻', '🥂', '🍾', '☕', '🧁', '🍦', '🍩',
    ],
  },
  {
    id: 'animals',
    name: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨',
      '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤',
      '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛',
      '🦋', '🐌', '🐞', '🐜', '🦟', '🐢', '🐍', '🐙', '🐬', '🐳',
    ],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji }) => {
  const { theme } = useTheme();
  const [activeCategoryId, setActiveCategoryId] = useState('smileys');

  const activeCategory =
    EMOJI_CATEGORIES.find((cat) => cat.id === activeCategoryId) || EMOJI_CATEGORIES[0];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderBottomColor: theme.border,
        },
      ]}
    >
      {/* Category Pills */}
      <View style={[styles.categoryBar, { borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {EMOJI_CATEGORIES.map((cat) => {
            const isActive = cat.id === activeCategoryId;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryTab,
                  isActive && [styles.activeTab, { backgroundColor: theme.muted }],
                ]}
                onPress={() => setActiveCategoryId(cat.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryIcon}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Emoji Grid */}
      <ScrollView
        style={styles.emojiGridScroll}
        contentContainerStyle={styles.emojiGrid}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {activeCategory.emojis.map((emoji, index) => (
          <TouchableOpacity
            key={`${activeCategory.id}-${index}`}
            style={styles.emojiButton}
            onPress={() => onSelectEmoji(emoji)}
            activeOpacity={0.6}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = Math.floor((SCREEN_WIDTH - 24) / 7);

const styles = StyleSheet.create({
  container: {
    height: 230,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  categoryBar: {
    height: 42,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryScroll: {
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    borderRadius: 14,
  },
  categoryIcon: {
    fontSize: 18,
  },
  emojiGridScroll: {
    flex: 1,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'flex-start',
  },
  emojiButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
});
