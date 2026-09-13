import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAtom } from 'jotai';
import { isAppLockedAtom } from '../states/States';
import { getLockPin } from '../utils/authStorage';
import { Lock } from 'lucide-react-native';

export const AppLockModal: React.FC = () => {
  const [isLocked, setIsLocked] = useAtom(isAppLockedAtom);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  if (!isLocked) return null;

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
    <Modal visible={isLocked} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Lock size={36} color="#3b82f6" />
          </View>
          <Text style={styles.title}>Chugli App Lock</Text>
          <Text style={styles.subtitle}>Enter your 4-digit PIN to continue</Text>

          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={(text: string) => {
              setPin(text);
              setError('');
            }}
            placeholder="••••"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.unlockButton}
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
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    textAlign: 'center',
  },
  pinInput: {
    width: '80%',
    height: 54,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    fontSize: 28,
    color: '#f8fafc',
    textAlign: 'center',
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
  },
  unlockButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
