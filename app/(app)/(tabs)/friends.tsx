import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import { useTheme } from '../../../src/context/ThemeContext';
import { selectedFriendAtom, userIdAtom } from '../../../src/states/States';
import { useOnlineStatus } from '../../../src/hooks/useOnlineStatus';
import { apiFetch } from '../../../src/utils/apiFetch';
import { getApiUrl } from '../../../src/utils/apiUrl';
import { getSocket } from '../../../src/hooks/useSocket';
import { showToast } from '../../../src/components/Toast';
import { Search, UserCheck, UserPlus, Check, X, MessageSquare, Users } from 'lucide-react-native';

interface FriendItem {
  friendId: string;
  username: string;
  profilePic?: string;
  unreadMessagesCount?: number;
}

interface UserSearchResult {
  _id: string;
  username: string;
  profilePic?: string;
}

interface FriendRequestItem {
  _id: string;
  username: string;
  email?: string;
  profilePic?: string;
}

export default function FriendsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [userId] = useAtom(userIdAtom);
  const [, setSelectedFriend] = useAtom(selectedFriendAtom);
  const { isUserOnline } = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<'friends' | 'find' | 'requests'>('friends');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  // 1️⃣ Fetch Friends (matching web /api/friends/get-friends/${userId})
  const fetchFriends = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${getApiUrl()}/api/friends/get-friends/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setFriends(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Listen to live socket friendsUpdated event
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleFriendsUpdate = (updatedFriends: FriendItem[]) => {
      setFriends(Array.isArray(updatedFriends) ? updatedFriends : []);
    };

    socket.on('friendsUpdated', handleFriendsUpdate);
    return () => {
      socket.off('friendsUpdated', handleFriendsUpdate);
    };
  }, []);

  // 2️⃣ Fetch Sent Friend Requests to pre-mark requested users (matching web FindUser)
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('getSentFriendRequests', { userId });

    const handleSentRequests = (sentIds: string[]) => {
      if (Array.isArray(sentIds)) {
        setRequestedIds(new Set(sentIds));
      }
    };

    socket.on('sentFriendRequestsList', handleSentRequests);
    return () => {
      socket.off('sentFriendRequestsList', handleSentRequests);
    };
  }, [userId]);

  // 3️⃣ Fetch Pending Requests (matching web /api/friends/get-friend-requests/${userId})
  const fetchFriendRequests = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${getApiUrl()}/api/friends/friend-requests/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setFriendRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching friend requests:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 4️⃣ Search Users / Fetch Registered Users (matching web searchUsers)
  const searchUsers = useCallback(async (queryText: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await apiFetch(
        `${getApiUrl()}/api/users/search?username=${encodeURIComponent(queryText.trim())}&userId=${userId}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Tab change & Search Query effect
  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriends();
    } else if (activeTab === 'find') {
      searchUsers(searchQuery);
    } else if (activeTab === 'requests') {
      fetchFriendRequests();
    }
  }, [activeTab, searchQuery, fetchFriends, searchUsers, fetchFriendRequests]);

  // Send Friend Request via Socket matching web
  const handleSendRequest = (receiverId: string) => {
    const socket = getSocket();
    if (!socket || !userId) return;

    socket.emit('sendFriendRequest', {
      senderId: userId,
      receiverId,
    });

    setRequestedIds((prev) => new Set(prev).add(receiverId));
    showToast('Friend request sent!', 'success');
  };

  // Respond to Friend Request via Socket / REST matching web
  const handleRespondRequest = async (senderId: string, action: 'accept' | 'rejected') => {
    if (!userId) return;
    const socket = getSocket();
    if (socket) {
      // socket.emit('respondToFriendRequest', {
      //   senderId,
      //   receiverId: userId,
      //   status: action,
      // });
      socket.emit("handleFriendRequest", {
        senderId,
        receiverId: userId,
        status: action === "accept" ? "accepted" : "declined",
      });
    }

    try {
      const res = await apiFetch(`${getApiUrl()}/api/friends/respond-request`, {
        method: 'POST',
        body: JSON.stringify({ userId, senderId, action }),
      });
      if (res.ok) {
        setFriendRequests((prev) => prev.filter((r) => r._id !== senderId));
        if (action === 'accept') {
          showToast('Friend request accepted!', 'success');
          fetchFriends();
        } else {
          showToast('Friend request rejected.', 'info');
        }
      }
    } catch (err) {
      console.error('Error responding to friend request:', err);
    }
  };

  const openChatWithFriend = (friend: FriendItem) => {
    setSelectedFriend({
      friendId: friend.friendId,
      username: friend.username,
      profilePic: friend.profilePic || '',
      unreadMessagesCount: friend.unreadMessagesCount || 0,
    });
    router.push(`/(app)/chat/${friend.friendId}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Sub-Header Tabs */}
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'friends' && { backgroundColor: theme.accent },
          ]}
          onPress={() => setActiveTab('friends')}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.mutedText },
              activeTab === 'friends' && styles.activeTabText,
            ]}
          >
            All Friends ({friends.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'find' && { backgroundColor: theme.accent },
          ]}
          onPress={() => setActiveTab('find')}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.mutedText },
              activeTab === 'find' && styles.activeTabText,
            ]}
          >
            Find Friends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'requests' && { backgroundColor: theme.accent },
          ]}
          onPress={() => setActiveTab('requests')}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.mutedText },
              activeTab === 'requests' && styles.activeTabText,
            ]}
          >
            Requests {friendRequests.length > 0 ? `(${friendRequests.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {activeTab === 'friends' && (
        <View style={styles.content}>
          {loading && friends.length === 0 ? (
            <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item: FriendItem) => item.friendId}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Users size={48} color={theme.mutedText} style={{ marginBottom: 12 }} />
                  <Text style={[styles.emptyText, { color: theme.foreground }]}>
                    No friends added yet.
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.mutedText }]}>
                    Switch to "Find Friends" to discover registered users!
                  </Text>
                </View>
              }
              renderItem={({ item }: { item: FriendItem }) => {
                const isOnline = isUserOnline(item.friendId);

                return (
                  <TouchableOpacity
                    style={[
                      styles.userCard,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                    onPress={() => openChatWithFriend(item)}
                    activeOpacity={0.8}
                  >
                    <View style={{ position: 'relative' }}>
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
                            styles.onlineIndicator,
                            { borderColor: theme.card },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: theme.foreground }]}>
                        {item.username} {item.friendId === userId ? '(You)' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        {isOnline && (
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: '#22c55e',
                              marginRight: 4,
                            }}
                          />
                        )}
                        <Text
                          style={[
                            styles.userEmail,
                            { color: isOnline ? '#22c55e' : theme.mutedText },
                          ]}
                        >
                          {isOnline ? 'Online' : item.friendId === userId ? 'Self Contact' : 'Offline'}
                        </Text>
                      </View>
                    </View>
                    {item.unreadMessagesCount && item.unreadMessagesCount > 0 ? (
                      <View style={[styles.unreadBadge, { backgroundColor: theme.accent }]}>
                        <Text style={styles.unreadText}>{item.unreadMessagesCount}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.chatButton, { backgroundColor: theme.accent }]}>
                      <MessageSquare size={16} color="#ffffff" />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {activeTab === 'find' && (
        <View style={styles.content}>
          {/* Search Box */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Search size={18} color={theme.mutedText} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.foreground }]}
              placeholder="Search by username..."
              placeholderTextColor={theme.mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <X size={16} color={theme.mutedText} />
              </TouchableOpacity>
            ) : null}
          </View>

          {loading && searchResults.length === 0 ? (
            <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item: UserSearchResult) => item._id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptySubtext, { color: theme.mutedText }]}>
                    {searchQuery.trim()
                      ? `No registered users found matching "${searchQuery}"`
                      : 'No other registered users available to add'}
                  </Text>
                </View>
              }
              renderItem={({ item }: { item: UserSearchResult }) => {
                const isRequested = requestedIds.has(item._id);
                return (
                  <View
                    style={[
                      styles.userCard,
                      { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                  >
                    {item.profilePic ? (
                      <Image source={{ uri: item.profilePic }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatarFallback, { backgroundColor: theme.accent }]}>
                        <Text style={styles.avatarInitial}>
                          {item.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: theme.foreground }]}>
                        {item.username}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.addPillBtn,
                        { backgroundColor: theme.accent },
                        isRequested && { backgroundColor: `${theme.accent}30`, borderColor: theme.accent },
                      ]}
                      disabled={isRequested}
                      onPress={() => !isRequested && handleSendRequest(item._id)}
                    >
                      {isRequested ? (
                        <View style={styles.requestedRow}>
                          <UserCheck size={14} color={theme.accent} style={{ marginRight: 4 }} />
                          <Text style={[styles.requestedText, { color: theme.accent }]}>Requested ✓</Text>
                        </View>
                      ) : (
                        <View style={styles.requestedRow}>
                          <UserPlus size={14} color="#ffffff" style={{ marginRight: 4 }} />
                          <Text style={styles.addContactText}>Add Contact</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {activeTab === 'requests' && (
        <View style={styles.content}>
          {loading && friendRequests.length === 0 ? (
            <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
          ) : (
            <FlatList
              data={friendRequests}
              keyExtractor={(item: FriendRequestItem) => item._id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.mutedText }]}>
                    No pending friend requests.
                  </Text>
                </View>
              }
              renderItem={({ item }: { item: FriendRequestItem }) => (
                <View
                  style={[
                    styles.userCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  {item.profilePic ? (
                    <Image source={{ uri: item.profilePic }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: theme.accent }]}>
                      <Text style={styles.avatarInitial}>
                        {item.username?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.foreground }]}>
                      {item.username || 'User'}
                    </Text>
                    <Text style={[styles.userEmail, { color: theme.mutedText }]}>
                      {item.email || 'Wants to add you'}
                    </Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleRespondRequest(item._id, 'accept')}
                    >
                      <Check size={16} color="#ffffff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => handleRespondRequest(item._id, 'rejected')}
                    >
                      <X size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    marginTop: 12,
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  chatButton: {
    padding: 10,
    borderRadius: 12,
  },
  addPillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  requestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addContactText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  requestedText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#22c55e',
    padding: 8,
    borderRadius: 8,
  },
  declineBtn: {
    backgroundColor: '#ef4444',
    padding: 8,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
