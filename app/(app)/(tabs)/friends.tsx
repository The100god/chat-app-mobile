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
import { selectedFriendAtom, userIdAtom, friendRequestsCountAtom } from '../../../src/states/States';
import { useOnlineStatus } from '../../../src/hooks/useOnlineStatus';
import { apiFetch } from '../../../src/utils/apiFetch';
import { getApiUrl } from '../../../src/utils/apiUrl';
import { getSocket } from '../../../src/hooks/useSocket';
import { showToast } from '../../../src/components/Toast';
import { Search, UserCheck, UserPlus, Check, X, MessageSquare, Users, UserMinus } from 'lucide-react-native';
import { AnimatedEmojiBackground } from '../../../src/components/AnimatedEmojiBackground';

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
  const [, setFriendRequestsCount] = useAtom(friendRequestsCountAtom);
  const { isUserOnline } = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<'friends' | 'find' | 'requests'>('friends');
  const [requestsSubTab, setRequestsSubTab] = useState<'received' | 'sent'>('received');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequestItem[]>([]);
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

  // 2️⃣ Fetch Sent Friend Requests to pre-mark requested users (matching web FindUser)
  const fetchSentRequests = useCallback(() => {
    if (!userId) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('getSentFriendRequests', { userId });
    socket.emit('getSentFriendRequestsDetailed', { userId });
  }, [userId]);

  // 3️⃣ Fetch Pending Requests (matching web /api/friends/get-friend-requests/${userId})
  const fetchFriendRequests = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${getApiUrl()}/api/friends/friend-requests/${userId}`);
      if (res.ok) {
        const data = await res.json();
        const validList = Array.isArray(data) ? data : [];
        setFriendRequests(validList);
        setFriendRequestsCount(validList.length);
      }
    } catch (err) {
      console.error('Error fetching friend requests:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, setFriendRequestsCount]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    if (!socket) return;

    fetchSentRequests();

    const handleFriendsUpdate = (updatedFriends: FriendItem[]) => {
      setFriends(Array.isArray(updatedFriends) ? updatedFriends : []);
    };

    const handleSentRequests = (sentIds: string[]) => {
      if (Array.isArray(sentIds)) {
        setRequestedIds(new Set(sentIds));
      }
    };

    const handleSentDetailed = (detailedList: FriendRequestItem[]) => {
      if (Array.isArray(detailedList)) {
        setSentRequests(detailedList);
        setRequestedIds(new Set(detailedList.map((d) => d._id)));
      }
    };

    const handleFriendRequestsList = (data: FriendRequestItem[]) => {
      if (Array.isArray(data)) {
        setFriendRequests(data);
        setFriendRequestsCount(data.length);
      }
    };

    const handleNewFriendRequest = (data: any) => {
      const newReq: FriendRequestItem = {
        _id: data.senderId,
        username: data.username,
        profilePic: data.profilePic,
      };
      setFriendRequests((prev) => {
        if (prev.some((r) => r._id === newReq._id)) return prev;
        return [...prev, newReq];
      });
      setFriendRequestsCount((c) => c + 1);
    };

    const handleAccepted = ({ receiverId }: { receiverId: string }) => {
      setSentRequests((prev) => prev.filter((r) => r._id !== receiverId));
      setRequestedIds((prev) => {
        const next = new Set(prev);
        next.delete(receiverId);
        return next;
      });
      fetchFriends();
    };

    const handleDenied = ({ receiverId }: { receiverId: string }) => {
      setSentRequests((prev) => prev.filter((r) => r._id !== receiverId));
      setRequestedIds((prev) => {
        const next = new Set(prev);
        next.delete(receiverId);
        return next;
      });
    };

    const handleFriendRequestSent = () => {
      fetchSentRequests();
    };

    const handleCancelled = ({ receiverId }: { receiverId: string }) => {
      setSentRequests((prev) => prev.filter((r) => r._id !== receiverId));
      setRequestedIds((prev) => {
        const next = new Set(prev);
        next.delete(receiverId);
        return next;
      });
    };

    const handleRemoved = ({ senderId }: { senderId: string }) => {
      setFriendRequests((prev) => prev.filter((r) => r._id !== senderId));
      setFriendRequestsCount((c) => Math.max(0, c - 1));
    };

    socket.on('friendsUpdated', handleFriendsUpdate);
    socket.on('sentFriendRequestsList', handleSentRequests);
    socket.on('sentFriendRequestsDetailedList', handleSentDetailed);
    socket.on('friendRequestsList', handleFriendRequestsList);
    socket.on('friendRequestReceived', handleNewFriendRequest);
    socket.on('friendRequestAccepted', handleAccepted);
    socket.on('friendRequestDenied', handleDenied);
    socket.on('friendRequestSent', handleFriendRequestSent);
    socket.on('friendRequestCancelled', handleCancelled);
    socket.on('friendRequestRemoved', handleRemoved);

    return () => {
      socket.off('friendsUpdated', handleFriendsUpdate);
      socket.off('sentFriendRequestsList', handleSentRequests);
      socket.off('sentFriendRequestsDetailedList', handleSentDetailed);
      socket.off('friendRequestsList', handleFriendRequestsList);
      socket.off('friendRequestReceived', handleNewFriendRequest);
      socket.off('friendRequestAccepted', handleAccepted);
      socket.off('friendRequestDenied', handleDenied);
      socket.off('friendRequestSent', handleFriendRequestSent);
      socket.off('friendRequestCancelled', handleCancelled);
      socket.off('friendRequestRemoved', handleRemoved);
    };
  }, [userId, fetchFriends, fetchSentRequests, setFriendRequestsCount]);

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
      fetchSentRequests();
    }
  }, [activeTab, searchQuery, fetchFriends, searchUsers, fetchFriendRequests, fetchSentRequests]);

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

  // Cancel Sent Friend Request
  const handleCancelRequest = (receiverId: string) => {
    const socket = getSocket();
    if (!socket || !userId) return;

    socket.emit('cancelFriendRequest', {
      senderId: userId,
      receiverId,
    });

    setSentRequests((prev) => prev.filter((r) => r._id !== receiverId));
    setRequestedIds((prev) => {
      const next = new Set(prev);
      next.delete(receiverId);
      return next;
    });
    showToast('Friend request cancelled.', 'info');
  };

  // Respond to Friend Request via Socket / REST matching web
  const handleRespondRequest = async (senderId: string, action: 'accepted' | 'declined') => {
    if (!userId) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('handleFriendRequest', {
        senderId,
        receiverId: userId,
        status: action,
      });
    }

    try {
      const res = await apiFetch(`${getApiUrl()}/api/friends/respond-request`, {
        method: 'POST',
        body: JSON.stringify({ userId, senderId, action }),
      });
      if (res.ok) {
        setFriendRequests((prev) => prev.filter((r) => r._id !== senderId));
        setFriendRequestsCount((c) => Math.max(0, c - 1));
        if (action === 'accepted') {
          showToast('Friend request accepted!', 'success');
          fetchFriends();
        } else {
          showToast('Friend request declined.', 'info');
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
      <AnimatedEmojiBackground />
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
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: theme.border }]} />
              )}
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
                    style={styles.userRow}
                    onPress={() => openChatWithFriend(item)}
                    activeOpacity={0.65}
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
                            { borderColor: theme.background },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: theme.foreground }]}>
                        {item.username} {item.friendId === userId ? '(You)' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
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
                          {isOnline ? 'Online' : item.friendId === userId ? 'Self Contact' : 'Tap to chat'}
                        </Text>
                      </View>
                    </View>
                    {item.unreadMessagesCount && item.unreadMessagesCount > 0 ? (
                      <View style={[styles.unreadBadge, { backgroundColor: theme.accent }]}>
                        <Text style={styles.unreadText}>{item.unreadMessagesCount}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.chatButton, { backgroundColor: `${theme.accent}18` }]}>
                      <MessageSquare size={16} color={theme.accent} />
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
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: theme.border }]} />
              )}
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
                  <View style={styles.userRow}>
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
                      <Text style={[styles.userEmail, { color: theme.mutedText }]}>
                        Registered user
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.addPillBtn,
                        { backgroundColor: theme.accent },
                        isRequested && { backgroundColor: `${theme.accent}20`, borderColor: theme.accent, borderWidth: 1 },
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
                          <Text style={styles.addContactText}>Add</Text>
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
          {/* Sub-tabs: Received vs Sent */}
          <View
            style={[
              styles.subTabContainer,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.subTabButton,
                requestsSubTab === 'received' && { backgroundColor: theme.accent },
              ]}
              onPress={() => setRequestsSubTab('received')}
            >
              <Text
                style={[
                  styles.subTabText,
                  { color: theme.mutedText },
                  requestsSubTab === 'received' && styles.activeSubTabText,
                ]}
              >
                Received {friendRequests.length > 0 ? `(${friendRequests.length})` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.subTabButton,
                requestsSubTab === 'sent' && { backgroundColor: theme.accent },
              ]}
              onPress={() => setRequestsSubTab('sent')}
            >
              <Text
                style={[
                  styles.subTabText,
                  { color: theme.mutedText },
                  requestsSubTab === 'sent' && styles.activeSubTabText,
                ]}
              >
                Sent {sentRequests.length > 0 ? `(${sentRequests.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {requestsSubTab === 'received' ? (
            loading && friendRequests.length === 0 ? (
              <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
            ) : (
              <FlatList
                data={friendRequests}
                keyExtractor={(item: FriendRequestItem) => item._id}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => (
                  <View style={[styles.separator, { backgroundColor: theme.border }]} />
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.mutedText }]}>
                      No pending received friend requests.
                    </Text>
                  </View>
                }
                renderItem={({ item }: { item: FriendRequestItem }) => (
                  <View style={styles.userRow}>
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
                        {item.email || 'Wants to connect with you'}
                      </Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleRespondRequest(item._id, 'accepted')}
                      >
                        <Check size={16} color="#ffffff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleRespondRequest(item._id, 'declined')}
                      >
                        <X size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )
          ) : (
            <FlatList
              data={sentRequests}
              keyExtractor={(item: FriendRequestItem) => item._id}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: theme.border }]} />
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.mutedText }]}>
                    No pending friend requests.
                  </Text>
                </View>
              }
              renderItem={({ item }: { item: FriendRequestItem }) => (
                <View style={styles.userRow}>
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
                    <Text style={[styles.userEmail, { color: '#f59e0b' }]}>
                      Pending approval...
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.cancelPillBtn,
                      { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' },
                    ]}
                    onPress={() => handleCancelRequest(item._id)}
                  >
                    <UserMinus size={14} color="#ef4444" />
                    <Text style={[styles.cancelPillText, { color: '#ef4444' }]}>Cancel</Text>
                  </TouchableOpacity>
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
  subTabContainer: {
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 16,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeSubTabText: {
    color: '#ffffff',
  },
  cancelPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  cancelPillText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  separator: {
    height: 1,
    marginLeft: 78,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
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
  userInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 13.5,
    marginTop: 2,
  },
  unreadBadge: {
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  chatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
