import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/context/ThemeContext';
import { useTogetherRoom } from '../../../src/hooks/useTogetherRoom';
import { TogetherRoomShell } from '../../../src/components/together/TogetherRoomShell';
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react-native';

export default function TogetherRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { room, joinRoom } = useTogetherRoom();
  const hasAttemptedJoin = useRef(false);

  useEffect(() => {
    if (roomId && (!room || room.roomId !== roomId) && !hasAttemptedJoin.current) {
      hasAttemptedJoin.current = true;
      joinRoom(roomId);
    }
  }, [roomId, room, joinRoom]);

  // Handle when room ends or is closed
  const hadRoomRef = useRef(false);
  useEffect(() => {
    if (room && room.roomId === roomId) {
      hadRoomRef.current = true;
    } else if (hadRoomRef.current && !room) {
      // Room was closed or left
      router.back();
    }
  }, [room, roomId, router]);

  if (!room || room.roomId !== roomId) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor: theme.background,
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={theme.foreground} />
          <Text style={[styles.backBtnText, { color: theme.foreground }]}>Back</Text>
        </TouchableOpacity>

        <View style={styles.loadingCenter}>
          <View style={[styles.loadingPulse, { backgroundColor: `${theme.accent}20` }]}>
            <Sparkles size={36} color={theme.accent} />
          </View>
          <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 20 }} />
          <Text style={[styles.loadingTitle, { color: theme.foreground }]}>
            Connecting to Together Room
          </Text>
          <Text style={[styles.loadingSubtitle, { color: theme.mutedText }]}>
            Room #{roomId?.slice(-6) || '...'}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
            onPress={() => {
              if (roomId) joinRoom(roomId);
            }}
          >
            <RefreshCw size={15} color={theme.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.retryText, { color: theme.accent }]}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.screen,
          {
            backgroundColor: theme.background,
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <TogetherRoomShell onExit={() => router.back()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
