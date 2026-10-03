import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { getApiUrl } from '../../src/utils/apiUrl';
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedEmojiBackground } from '../../src/components/AnimatedEmojiBackground';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username/email and password.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Login failed. Please check credentials.');
      }

      if (data.token) {
        const userId = data.userId || data.user?._id;
        await login(data.token, userId);
        setMessage('Login successful!');
        router.replace('/(app)/(tabs)');
      } else {
        throw new Error('No token returned from server.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* 🌸 Animated Floating Background Emojis */}
      <AnimatedEmojiBackground />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Branding */}
          <View style={styles.headerContainer}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
            />
            <Text style={[styles.brandTitle, { color: theme.accent }]}>Chugli</Text>
            <Text style={[styles.brandSubtitle, { color: theme.mutedText }]}>
              A real-time chat application
            </Text>
          </View>

          {/* Login Card */}
          <View
            style={[
              styles.formCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.formTitle, { color: theme.foreground }]}>Login</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {message ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{message}</Text>
              </View>
            ) : null}

            {/* Username Input */}
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.input, borderColor: theme.border },
              ]}
            >
              <User size={19} color={theme.mutedText} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.foreground }]}
                placeholder="Username or Email"
                placeholderTextColor={theme.mutedText}
                value={username}
                onChangeText={(t: string) => {
                  setUsername(t);
                  setError('');
                }}
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.input, borderColor: theme.border },
              ]}
            >
              <Lock size={19} color={theme.mutedText} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.foreground }]}
                placeholder="Password"
                placeholderTextColor={theme.mutedText}
                value={password}
                onChangeText={(t: string) => {
                  setPassword(t);
                  setError('');
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ? (
                  <EyeOff size={19} color={theme.accent} />
                ) : (
                  <Eye size={19} color={theme.accent} />
                )}
              </TouchableOpacity>
            </View>

            {/* Login Submit Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: theme.accent },
                loading && styles.disabledButton,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.loginButtonText}>Logging In...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Sign Up Redirect Link */}
            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: theme.mutedText }]}>
                Don't have an account?
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text style={[styles.signupLink, { color: '#3b82f6' }]}> Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  floatingContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  floatingEmoji: {
    position: 'absolute',
    fontSize: 32,
    opacity: 0.25,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 20,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#22c55e',
    fontSize: 14,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  eyeIcon: {
    padding: 6,
  },
  loginButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
