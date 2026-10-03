import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useAtom } from 'jotai';
import { useTheme } from '../context/ThemeContext';
import { animatedBgEnabledAtom, animatedBgTextAtom, animatedBgTextColorAtom } from '../states/States';
import { getAnimatedBgConfig } from '../utils/authStorage';

interface FloatingEmojiItem {
  id: number;
  emoji: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  size: number;
  duration: number;
  delay: number;
}

// Curated coordinates to distribute beautifully across screens without clustering
const PRESET_ITEMS: FloatingEmojiItem[] = [
  { id: 1, emoji: '🌸', x: 8, y: 7, size: 22, duration: 5200, delay: 0 },
  { id: 2, emoji: '💖', x: 82, y: 12, size: 20, duration: 5800, delay: 600 },
  { id: 3, emoji: '✨', x: 18, y: 24, size: 18, duration: 4900, delay: 300 },
  { id: 4, emoji: '🌺', x: 88, y: 28, size: 24, duration: 6400, delay: 900 },
  { id: 5, emoji: '💕', x: 6, y: 40, size: 21, duration: 5500, delay: 200 },
  { id: 6, emoji: '🦋', x: 78, y: 45, size: 22, duration: 6100, delay: 1100 },
  { id: 7, emoji: '🌷', x: 22, y: 56, size: 19, duration: 5300, delay: 400 },
  { id: 8, emoji: '💫', x: 84, y: 62, size: 18, duration: 4700, delay: 800 },
  { id: 9, emoji: '❤️', x: 10, y: 72, size: 20, duration: 5900, delay: 500 },
  { id: 10, emoji: '🌟', x: 80, y: 78, size: 23, duration: 6300, delay: 1000 },
  { id: 11, emoji: '🥰', x: 28, y: 88, size: 20, duration: 5100, delay: 150 },
  { id: 12, emoji: '💌', x: 72, y: 92, size: 21, duration: 5700, delay: 750 },
];

function parseCustomEmojis(input: string): string[] {
  if (!input || !input.trim()) return [];
  const spaceParts = input.trim().split(/\s+/).filter(Boolean);
  if (spaceParts.length > 1) return spaceParts;

  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
      const segments: string[] = [];
      for (const seg of segmenter.segment(input.trim())) {
        const val = seg.segment.trim();
        if (val) segments.push(val);
      }
      if (segments.length > 0) return segments;
    } catch {
      // fallback below
    }
  }

  return Array.from(input.trim()).filter((c) => c !== ' ');
}

function FloatingEmojiNode({
  item,
  displayEmoji,
  isDark,
  textColor,
  isCustom,
}: {
  item: FloatingEmojiItem;
  displayEmoji: string;
  isDark: boolean;
  textColor?: string;
  isCustom?: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: item.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: item.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const timer = setTimeout(() => {
      if (isMounted) {
        animation.start();
      }
    }, item.delay);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      animation.stop();
    };
  }, [anim, item.duration, item.delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [6, -18, 6],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-8deg', '8deg', '-8deg'],
  });

  const resolvedColor = textColor
    ? textColor
    : (isDark ? '#f9fafb' : '#374151');

  const minOpacity = isDark ? (isCustom ? 0.22 : 0.12) : 0.12;
  const maxOpacity = isDark ? (isCustom ? 0.55 : 0.32) : 0.35;

  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [minOpacity, maxOpacity, minOpacity],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.emojiWrapper,
        {
          left: `${item.x}%`,
          top: `${item.y}%`,
          opacity,
          transform: [{ translateY }, { rotate }],
        },
      ]}
    >
      <Text style={{ fontSize: item.size, color: resolvedColor, fontWeight: '600' }}>
        {displayEmoji}
      </Text>
    </Animated.View>
  );
}

export function AnimatedEmojiBackground() {
  const { mode } = useTheme();
  const [enabled, setEnabled] = useAtom(animatedBgEnabledAtom);
  const [customText, setCustomText] = useAtom(animatedBgTextAtom);
  const [textColor, setTextColor] = useAtom(animatedBgTextColorAtom);
  const isDark = mode === 'dark' || mode === 'aurora';

  // Load persisted background config on initial mount
  useEffect(() => {
    let isMounted = true;
    getAnimatedBgConfig().then((cfg) => {
      if (isMounted) {
        setEnabled(cfg.enabled);
        setCustomText(cfg.text);
        if (cfg.textColor) {
          setTextColor(cfg.textColor);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [setEnabled, setCustomText, setTextColor]);

  if (!enabled) return null;

  const customTokens = parseCustomEmojis(customText);
  const isCustom = customTokens.length > 0;

  return (
    <View style={styles.container} pointerEvents="none">
      {PRESET_ITEMS.map((item, index) => {
        const displayEmoji =
          customTokens.length > 0
            ? customTokens[index % customTokens.length]
            : item.emoji;

        return (
          <FloatingEmojiNode
            key={`${item.id}-${displayEmoji}`}
            item={item}
            displayEmoji={displayEmoji}
            isDark={isDark}
            textColor={textColor}
            isCustom={isCustom}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  emojiWrapper: {
    position: 'absolute',
    userSelect: 'none',
  } as any,
});
