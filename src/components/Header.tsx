import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAtom } from 'jotai';
import { activeWorkspaceAtom, unreadCountAtom, groupUnreadTotalAtom } from '../states/States';
import { Sparkles, MessageSquare } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [activeWorkspace, setActiveWorkspace] = useAtom(activeWorkspaceAtom);
  const [totalUnread] = useAtom(unreadCountAtom);
  const router = useRouter();
  const pathname = usePathname();

  const isTogether = pathname ? pathname.includes('together') : activeWorkspace === 'together';

  const toggleWorkspace = () => {
    if (isTogether) {
      setActiveWorkspace('chat');
      router.push('/(app)/(tabs)');
    } else {
      setActiveWorkspace('together');
      router.push('/(app)/(tabs)/together');
    }
  };

  return (
    <View
      style={[
        styles.headerContainer,
        { backgroundColor: theme.card, borderBottomColor: theme.border },
      ]}
    >
      {/* Left Section: Profile Image (opens Profile) & Chugli Title with Logo (opens Home) */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          onPress={() => router.push('/(app)/profile')}
          activeOpacity={0.7}
        >
          {user?.profilePic ? (
            <Image
              source={{ uri: user.profilePic }}
              style={[styles.profileLogo, { borderColor: theme.accent }]}
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.accent }]}>
              <Text style={styles.avatarInitial}>
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.brandRow}
          onPress={() => {
            setActiveWorkspace('chat');
            router.push('/(app)/(tabs)');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.appTitle, { color: theme.accent }]}>Chugli</Text>
        </TouchableOpacity>
      </View>

      {/* Right Section: Workspace Switcher Button */}
      <View style={styles.rightSection}>
        <TouchableOpacity
          style={[
            styles.workspaceToggle,
            {
              backgroundColor: 'rgba(236, 72, 153, 0.15)',
              borderColor: '#ec4899',
            },
            isTogether && { backgroundColor: theme.muted, borderColor: theme.border },
          ]}
          onPress={toggleWorkspace}
          activeOpacity={0.8}
        >
          {isTogether ? (
            <View style={{ position: 'relative' }}>
              <MessageSquare size={16} color={theme.accent} />
              {totalUnread > 0 && (
                <View style={styles.badgeCircle}>
                  <Text style={styles.badgeText}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Sparkles size={16} color="#ec4899" />
          )}
          <Text
            style={[
              styles.togetherTextActive,
              { color: theme.foreground },
              isTogether && styles.workspaceText,
            ]}
          >
            {isTogether ? 'Chat' : 'Together'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    marginRight: 10,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workspaceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  workspaceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  togetherTextActive: {
    color: '#ec4899',
  },
  badgeCircle: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#ef4444',
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
    lineHeight: 10,
  },
});
