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
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import { useTheme } from '../../../src/context/ThemeContext';
import { Group, selectedGroupAtom, friendsAtom, Friend, userIdAtom, groupsAtom } from '../../../src/states/States';
import { apiFetch } from '../../../src/utils/apiFetch';
import { getApiUrl } from '../../../src/utils/apiUrl';
import { getSocket } from '../../../src/hooks/useSocket';
import * as ImagePicker from 'expo-image-picker';
import { showToast } from '../../../src/components/Toast';
import { Users, Plus, Check, X, Camera, Search } from 'lucide-react-native';
import { AnimatedEmojiBackground } from '../../../src/components/AnimatedEmojiBackground';

export default function GroupsTab() {
  const router = useRouter();
  const { theme } = useTheme();
  const [currentUserId] = useAtom(userIdAtom);
  const [, setSelectedGroup] = useAtom(selectedGroupAtom);
  const [friends] = useAtom<Friend[]>(friendsAtom);
  const [groups, setGroups] = useAtom(groupsAtom);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Group Form State
  const [groupName, setGroupName] = useState('');
  const [groupProfilePic, setGroupProfilePic] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // 1️⃣ Fetch User's Groups
  const fetchGroups = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await apiFetch(`${getApiUrl()}/api/groups/${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        const validGroups = Array.isArray(data) ? data : [];
        setGroups(validGroups);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId, setGroups]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // 2️⃣ Socket Event Listeners for Group Updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewGroupCreated = (newGroup: Group) => {
      setGroups((prev) => {
        if (prev.some((g) => g._id === newGroup._id)) return prev;
        return [newGroup, ...prev];
      });
    };

    const handleGroupUpdated = (updatedGroup: Group) => {
      setGroups((prev) =>
        prev.map((g) => (g._id === updatedGroup._id ? updatedGroup : g))
      );
    };

    const handleGroupDeleted = ({ groupId }: { groupId: string }) => {
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
    };

    const handleRemovedFromGroup = ({ groupId }: { groupId: string }) => {
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
    };

    const handleGroupUnreadCountUpdated = ({
      groupId,
      count,
    }: {
      groupId: string;
      count: number;
    }) => {
      const gIdStr = String(groupId);
      setGroups((prev) => {
        const exists = prev.some((g) => String(g._id) === gIdStr);
        if (!exists) {
          fetchGroups();
          return prev;
        }
        return prev.map((g) =>
          String(g._id) === gIdStr ? { ...g, unreadCount: Math.max(0, count) } : g
        );
      });
    };

    const handleNewGroupMessage = (newMsg: any) => {
      const msgGroupId =
        typeof newMsg.groupId === 'object'
          ? newMsg.groupId?._id?.toString() || newMsg.groupId?.toString()
          : (newMsg.groupId || newMsg.group)?.toString();
      if (!msgGroupId) return;

      const gIdStr = String(msgGroupId);
      setGroups((prev) => {
        const exists = prev.some((g) => String(g._id) === gIdStr);
        if (!exists) {
          fetchGroups();
          return prev;
        }
        return prev.map((g) =>
          String(g._id) === gIdStr
            ? { ...g, unreadCount: (g.unreadCount || 0) + 1 }
            : g
        );
      });
    };

    socket.on('newGroupCreated', handleNewGroupCreated);
    socket.on('groupUpdated', handleGroupUpdated);
    socket.on('groupDeleted', handleGroupDeleted);
    socket.on('removedFromGroup', handleRemovedFromGroup);
    socket.on('groupUnreadCountUpdated', handleGroupUnreadCountUpdated);
    socket.on('newGroupMessage', handleNewGroupMessage);

    return () => {
      socket.off('newGroupCreated', handleNewGroupCreated);
      socket.off('groupUpdated', handleGroupUpdated);
      socket.off('groupDeleted', handleGroupDeleted);
      socket.off('removedFromGroup', handleRemovedFromGroup);
      socket.off('groupUnreadCountUpdated', handleGroupUnreadCountUpdated);
      socket.off('newGroupMessage', handleNewGroupMessage);
    };
  }, [setGroups]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const handleOpenGroup = (group: Group) => {
    // Clear unread count locally immediately
    setGroups((prev) =>
      prev.map((g) => (g._id === group._id ? { ...g, unreadCount: 0 } : g))
    );

    const socket = getSocket();
    if (socket && currentUserId) {
      socket.emit('groupMessagesRead', {
        groupId: group._id,
        readerId: currentUserId,
      });
    }

    setSelectedGroup(group);
    router.push(`/(app)/group/${group._id}`);
  };

  const toggleMemberSelection = (friendId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handlePickGroupPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setGroupProfilePic(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (err) {
      console.error('Group photo picker error:', err);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setCreateError('Please enter a group name');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setCreateError('Please select at least one friend');
      return;
    }
    if (!currentUserId) return;

    setCreating(true);
    setCreateError('');

    try {
      const res = await apiFetch(`${getApiUrl()}/api/groups/create-group`, {
        method: 'POST',
        body: JSON.stringify({
          groupName: groupName.trim(),
          groupProfilePic: groupProfilePic || '',
          groupMember: [...selectedMemberIds, currentUserId],
          admins: [currentUserId],
          superAdmin: currentUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create group');
      }

      const socket = getSocket();
      if (socket && data.groupId) {
        socket.emit('createGroup', {
          groupId: data.groupId,
          adminId: [currentUserId],
          members: selectedMemberIds,
          superAdmin: currentUserId,
          groupName: groupName.trim(),
        });
      }

      showToast('Group created successfully!', 'success');
      setIsModalOpen(false);
      setGroupName('');
      setGroupProfilePic('');
      setSelectedMemberIds([]);
      fetchGroups();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

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
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Groups</Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.accent }]}
          onPress={() => setIsModalOpen(true)}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.createButtonText}>Create Group</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item: Group) => item._id}
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
                { backgroundColor: `${theme.accent}15` },
              ]}
            >
              <Users size={48} color={theme.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.foreground }]}>No Groups Yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.mutedText }]}>
              Create a group with your friends to chat together.
            </Text>
            <TouchableOpacity
              style={[styles.emptyCreateBtn, { backgroundColor: theme.accent }]}
              onPress={() => setIsModalOpen(true)}
            >
              <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.createButtonText}>Create Your First Group</Text>
            </TouchableOpacity>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
        renderItem={({ item }: { item: Group }) => {
          const hasUnread = Boolean(item.unreadCount && item.unreadCount > 0);
          const memberCount = item.groupMember?.length || 0;

          return (
            <TouchableOpacity
              style={styles.groupRow}
              onPress={() => handleOpenGroup(item)}
              activeOpacity={0.65}
            >
              <View style={styles.avatarWrapper}>
                {item.groupProfilePic ? (
                  <Image source={{ uri: item.groupProfilePic }} style={styles.groupAvatar} />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: `${theme.accent}20` },
                    ]}
                  >
                    <Text style={[styles.avatarInitial, { color: theme.accent }]}>
                      {item.groupName ? item.groupName.charAt(0).toUpperCase() : 'G'}
                    </Text>
                  </View>
                )}
                <View style={[styles.groupBadge, { backgroundColor: theme.accent, borderColor: theme.background }]}>
                  <Users size={9} color="#ffffff" />
                </View>
              </View>

              <View style={styles.groupInfo}>
                <View style={styles.groupHeaderRow}>
                  <Text
                    style={[
                      styles.groupName,
                      { color: theme.foreground },
                      hasUnread && styles.unreadGroupName,
                    ]}
                    numberOfLines={1}
                  >
                    {item.groupName}
                  </Text>
                  {hasUnread ? (
                    <View style={[styles.unreadBadge, { backgroundColor: theme.accent }]}>
                      <Text style={styles.unreadBadgeText}>
                        {item.unreadCount! > 99 ? '99+' : item.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.groupFooterRow}>
                  <Text style={[styles.groupSubtext, { color: theme.mutedText }]} numberOfLines={1}>
                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Create Group Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.foreground }]}>Create Group</Text>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={[styles.closeCircleBtn, { backgroundColor: theme.muted }]}
              >
                <X size={18} color={theme.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Group Photo Selector */}
              <View style={styles.photoContainer}>
                <TouchableOpacity style={styles.photoPicker} onPress={handlePickGroupPhoto}>
                  {groupProfilePic ? (
                    <Image source={{ uri: groupProfilePic }} style={styles.groupPhotoPreview} />
                  ) : (
                    <View style={[styles.photoPlaceholder, { backgroundColor: theme.muted }]}>
                      <Camera size={28} color={theme.mutedText} />
                      <Text style={[styles.photoPickerText, { color: theme.mutedText }]}>
                        Add Photo
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {createError ? <Text style={styles.errorText}>{createError}</Text> : null}

              {/* Group Name Input */}
              <Text style={[styles.fieldLabel, { color: theme.foreground }]}>Group Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    color: theme.foreground,
                  },
                ]}
                placeholder="e.g., Weekend Hangout"
                placeholderTextColor={theme.mutedText}
                value={groupName}
                onChangeText={(text) => {
                  setGroupName(text);
                  setCreateError('');
                }}
              />

              {/* Select Members Section */}
              <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
                Add Members ({selectedMemberIds.length} selected)
              </Text>

              {/* Search Friends */}
              <View style={[styles.searchBar, { backgroundColor: theme.input, borderColor: theme.border }]}>
                <Search size={16} color={theme.mutedText} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: theme.foreground }]}
                  placeholder="Search friends..."
                  placeholderTextColor={theme.mutedText}
                  value={memberSearchQuery}
                  onChangeText={setMemberSearchQuery}
                />
              </View>

              <View style={styles.friendsListContainer}>
                {filteredFriends.length === 0 ? (
                  <Text style={[styles.noFriendsText, { color: theme.mutedText }]}>
                    {friends.length === 0
                      ? 'You have no friends to add yet.'
                      : 'No matching friends found.'}
                  </Text>
                ) : (
                  filteredFriends.map((friend) => {
                    const isSelected = selectedMemberIds.includes(friend.friendId);
                    return (
                      <TouchableOpacity
                        key={friend.friendId}
                        style={[
                          styles.memberSelectItem,
                          { borderColor: theme.border },
                          isSelected && { backgroundColor: `${theme.accent}15` },
                        ]}
                        onPress={() => toggleMemberSelection(friend.friendId)}
                      >
                        {friend.profilePic ? (
                          <Image source={{ uri: friend.profilePic }} style={styles.memberAvatar} />
                        ) : (
                          <View style={[styles.memberAvatarFallback, { backgroundColor: theme.accent }]}>
                            <Text style={styles.memberAvatarInitial}>
                              {friend.username.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.memberSelectName, { color: theme.foreground }]}>
                          {friend.username}
                        </Text>
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: isSelected ? theme.accent : theme.mutedText },
                            isSelected && { backgroundColor: theme.accent },
                          ]}
                        >
                          {isSelected ? <Check size={12} color="#ffffff" /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: theme.accent },
                  creating && styles.disabledBtn,
                ]}
                onPress={handleCreateGroup}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Group</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  listContent: {
    paddingBottom: 24,
  },
  groupRow: {
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
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  groupBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '700',
  },
  groupInfo: {
    marginLeft: 14,
    flex: 1,
    justifyContent: 'center',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  unreadGroupName: {
    fontWeight: '700',
  },
  groupFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupSubtext: {
    fontSize: 13.5,
    flex: 1,
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
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  closeCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPicker: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  groupPhotoPreview: {
    width: 80,
    height: 80,
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPickerText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  friendsListContainer: {
    maxHeight: 180,
    marginBottom: 20,
  },
  noFriendsText: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 12,
  },
  memberSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  memberAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarInitial: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  memberSelectName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
});
