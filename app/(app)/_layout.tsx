import React from 'react';
import { Stack, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { GlobalSocketManager } from '../../src/components/GlobalSocketManager';
import { AnimatedEmojiBackground } from '../../src/components/AnimatedEmojiBackground';

export default function AppLayout() {
  const segments = useSegments();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Show global top Header for all main tabs
  const isDetailScreen = !(segments as readonly string[]).includes('(tabs)');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AnimatedEmojiBackground />
      <GlobalSocketManager />
      {!isDetailScreen && (
        <View style={{ paddingTop: Math.max(insets.top, 12), backgroundColor: theme.card }}>
          <Header />
        </View>
      )}
      <View style={[styles.content, { backgroundColor: theme.background }]}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: theme.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[friendId]" />
          <Stack.Screen name="group/[groupId]" />
          <Stack.Screen name="together/[roomId]" />
          <Stack.Screen name="profile/index" />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
