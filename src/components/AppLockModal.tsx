import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useAtom } from 'jotai';
import { isAppLockedAtom } from '../states/States';
import { useTheme } from '../context/ThemeContext';
import { useSystemConfig } from '../context/ConfigContext';
import { getLockPin, getLockTimeout } from '../utils/authStorage';
import { Lock, Eye, EyeOff } from 'lucide-react-native';

export const AppLockModal: React.FC = () => {
  const [isLocked, setIsLocked] = useAtom(isAppLockedAtom);
  const { theme } = useTheme();
  const { isFeatureEnabled } = useSystemConfig();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isFeatureEnabled('feature_app_lock') && isLocked) {
      setIsLocked(false);
    }
  }, [isFeatureEnabled, isLocked]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (!isFeatureEnabled('feature_app_lock')) {
        setIsLocked(false);
        return;
      }

      if (
        appStateRef.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        backgroundTimeRef.current = Date.now();
      }

      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        const storedPin = await getLockPin();
        if (storedPin) {
          const timeout = await getLockTimeout();
          if (timeout === -1) {
            setIsLocked(true);
          } else if (timeout > 0 && backgroundTimeRef.current) {
            const elapsed = (Date.now() - backgroundTimeRef.current) / 1000;
            if (elapsed >= timeout) {
              setIsLocked(true);
            }
          }
        }
        backgroundTimeRef.current = null;
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [setIsLocked]);

  const handleUnlock = async () => {
    if (!pin || pin.length < 4) {
      setError('Please enter a valid 4-digit PIN');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const storedPin = await getLockPin();
      if (storedPin === pin) {
        setIsLocked(false);
        setPin('');
      } else {
        setError('Incorrect PIN. Please try again.');
      }
    } catch {
      setError('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal visible={isLocked && isFeatureEnabled('feature_app_lock')} animationType="fade" transparent={false}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: `${theme.accent}20` }]}>
            <Lock size={36} color={theme.accent} />
          </View>
          <Text style={[styles.title, { color: theme.foreground }]}>Chugli App Lock</Text>
          <Text style={[styles.subtitle, { color: theme.mutedText }]}>
            Enter your 4-digit PIN to continue
          </Text>

          <View style={styles.pinInputRow}>
            <TextInput
              style={[
                styles.pinInput,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.border,
                  color: theme.foreground,
                },
              ]}
              value={pin}
              onChangeText={(text: string) => {
                setPin(text);
                setError('');
              }}
              placeholder="••••"
              placeholderTextColor={theme.mutedText}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry={!showPin}
            />
            <TouchableOpacity
              onPress={() => setShowPin((prev) => !prev)}
              style={styles.pinEyeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {showPin ? (
                <EyeOff size={20} color={theme.accent} />
              ) : (
                <Eye size={20} color={theme.mutedText} />
              )}
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: theme.accent }]}
            onPress={handleUnlock}
            disabled={verifying}
          >
            {verifying ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.unlockButtonText}>Unlock App</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  pinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
    position: 'relative',
  },
  pinInput: {
    width: '75%',
    height: 54,
    borderRadius: 14,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 10,
    borderWidth: 1,
  },
  pinEyeBtn: {
    marginLeft: 10,
    padding: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
  },
  unlockButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
