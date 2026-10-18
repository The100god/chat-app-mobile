import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { AppLockModal } from '../src/components/AppLockModal';
import ToastContainer from '../src/components/Toast';
import TogetherInviteToast from '../src/components/TogetherInviteToast';
import { ConfigProvider, useSystemConfig } from '../src/context/ConfigContext';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const { mode, theme } = useTheme();
  const { maintenance } = useSystemConfig();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login screen
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to main app tabs
      router.replace('/(app)/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={{ marginTop: 12, color: theme.mutedText, fontSize: 14, fontWeight: '600' }}>
          Chugli...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar
        style={mode === 'light' ? 'dark' : 'light'}
        backgroundColor={theme.background}
        translucent
      />
      {maintenance.enabled && (
        <View
          style={{
            backgroundColor: '#e11d48',
            paddingTop: 44,
            paddingBottom: 8,
            paddingHorizontal: 16,
            zIndex: 9999,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: '#ffffff',
              fontSize: 12,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            ⚠️ {maintenance.message}
          </Text>
        </View>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
      <AppLockModal />
      <ToastContainer />
      <TogetherInviteToast />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConfigProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </ThemeProvider>
      </ConfigProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

