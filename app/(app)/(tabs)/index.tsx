import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import { useTheme } from '../../../src/context/ThemeContext';
import { friendsAtom, Friend, selectedFriendAtom, userIdAtom } from '../../../src/states/States';
import { apiFetch } from '../../../src/utils/apiFetch';
import { getApiUrl } from '../../../src/utils/apiUrl';
import { getSocket } from '../../../src/hooks/useSocket';
import { MessageSquare, UserPlus, Search } from 'lucide-react-native';

import { useOnlineStatus } from '../../../src/hooks/useOnlineStatus';

export default function ChatsTab() {
  const router = useRouter();
  const { theme } = useTheme();
  const [currentUserId] = useAtom(userIdAtom);
  const [friends, setFriends] = useAtom(friendsAtom);
  const [, setSelectedFriend] = useAtom(selectedFriendAtom);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isUserOnline } = useOnlineStatus();

  const fetchFriends = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await apiFetch(`${getApiUrl()}/api/friends/get-friends/${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setFriends(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId, setFriends]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleFriendsUpdate = (updatedFriends: Friend[]) => {
      if (Array.isArray(updatedFriends)) {
        setFriends(updatedFriends);
      }
    };

    const handleUnreadUpdate = () => {
      fetchFriends();
    };

    socket.on('friendsUpdated', handleFriendsUpdate);
    socket.on('unreadMessageCountUpdated', handleUnreadUpdate);
    socket.on('update_unseen_count', handleUnreadUpdate);

    return () => {
      socket.off('friendsUpdated', handleFriendsUpdate);
      socket.off('unreadMessageCountUpdated', handleUnreadUpdate);
      socket.off('update_unseen_count', handleUnreadUpdate);
    };
  }, [fetchFriends, setFriends]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFriends();
  };

  const handleOpenChat = (friend: Friend) => {
    setSelectedFriend(friend);
    router.push(`/(app)/chat/${friend.friendId}`);
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={{ marginTop: 10, color: theme.mutedText, fontSize: 14, fontWeight: '600' }}>
          Chugli...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Messages</Text>
        <TouchableOpacity
          style={[
            styles.findButton,
            { backgroundColor: `${theme.accent}20`, borderColor: theme.accent },
          ]}
          onPress={() => router.push('/(app)/(tabs)/friends')}
        >
          <UserPlus size={16} color={theme.accent} />
          <Text style={[styles.findButtonText, { color: theme.accent }]}>Add Friend</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={friends}
        keyExtractor={(item: Friend) => item.friendId}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <MessageSquare size={36} color={theme.mutedText} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
              No conversations yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.mutedText }]}>
              Connect with friends to start chatting and playing games together!
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.accent }]}
              onPress={() => router.push('/(app)/(tabs)/friends')}
            >
              <Search size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.emptyButtonText}>Find Friends</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }: { item: Friend }) => {
          const isSelf = item.friendId === currentUserId;
          const isOnline = isSelf || isUserOnline(item.friendId);
          return (
            <TouchableOpacity
              style={[
                styles.chatCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => handleOpenChat(item)}
              activeOpacity={0.75}
            >
              <View style={styles.avatarWrapper}>
                {item.profilePic ? (
                  <Image source={{ uri: item.profilePic }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: theme.accent }]}>
                    <Text style={styles.avatarInitial}>
                      {item.username ? item.username.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.statusDot,
                    { borderColor: theme.card },
                    isOnline ? styles.onlineDot : styles.offlineDot,
                  ]}
                />
              </View>

              <View style={styles.chatInfo}>
                <Text style={[styles.username, { color: theme.foreground }]}>
                  {item.username} {isSelf ? '(You)' : ''}
                </Text>
                <Text
                  style={[
                    styles.statusText,
                    { color: isOnline ? '#22c55e' : theme.mutedText },
                  ]}
                >
                  {isSelf ? 'Self Contact' : isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>

              {item.unreadMessagesCount && item.unreadMessagesCount > 0 ? (
                <View style={[styles.unreadBadge, { backgroundColor: theme.accent }]}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unreadMessagesCount > 99 ? '99+' : item.unreadMessagesCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  findButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  onlineDot: {
    backgroundColor: '#22c55e',
  },
  offlineDot: {
    backgroundColor: '#64748b',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 14,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
  },
  unreadBadge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
