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
import { AnimatedEmojiBackground } from '../../../src/components/AnimatedEmojiBackground';

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
      <AnimatedEmojiBackground />

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
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
        renderItem={({ item }: { item: Friend }) => {
          const isSelf = item.friendId === currentUserId;
          const isOnline = isSelf || isUserOnline(item.friendId);
          const hasUnread = Boolean(item.unreadMessagesCount && item.unreadMessagesCount > 0);

          return (
            <TouchableOpacity
              style={styles.chatRow}
              onPress={() => handleOpenChat(item)}
              activeOpacity={0.65}
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
                {isOnline && (
                  <View
                    style={[
                      styles.statusDot,
                      { borderColor: theme.background },
                    ]}
                  />
                )}
              </View>

              <View style={styles.chatInfo}>
                <View style={styles.chatHeaderRow}>
                  <Text
                    style={[
                      styles.username,
                      { color: theme.foreground },
                      hasUnread && styles.unreadUsername,
                    ]}
                    numberOfLines={1}
                  >
                    {item.username} {isSelf ? '(You)' : ''}
                  </Text>
                  <Text
                    style={[
                      styles.timeStatusText,
                      { color: isOnline ? '#22c55e' : theme.mutedText },
                      hasUnread && { color: theme.accent, fontWeight: '700' },
                    ]}
                  >
                    {isSelf ? 'You' : isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>

                <View style={styles.chatFooterRow}>
                  <Text
                    style={[
                      styles.lastMessageText,
                      { color: theme.mutedText },
                      hasUnread && [styles.unreadLastMessage, { color: theme.foreground }],
                    ]}
                    numberOfLines={1}
                  >
                    {hasUnread ? 'New message' : isOnline ? 'Tap to Chugli' : 'No Messages'}
                  </Text>

                  {hasUnread ? (
                    <View style={[styles.unreadBadge, { backgroundColor: theme.accent }]}>
                      <Text style={styles.unreadBadgeText}>
                        {item.unreadMessagesCount! > 99 ? '99+' : item.unreadMessagesCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
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
    paddingBottom: 24,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  separator: {
    height: 1,
    marginLeft: 78,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  unreadUsername: {
    fontWeight: '700',
  },
  timeStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chatFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessageText: {
    fontSize: 13.5,
    flex: 1,
    marginRight: 8,
  },
  unreadLastMessage: {
    fontWeight: '600',
  },
  unreadBadge: {
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
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
