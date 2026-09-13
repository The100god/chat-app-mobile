import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import { useTheme } from '../../../src/context/ThemeContext';
import {
  selectedGroupAtom,
  userIdAtom,
  friendsAtom,
  Friend,
  Message,
  GroupMember,
} from '../../../src/states/States';
import { apiFetch } from '../../../src/utils/apiFetch';
import { getApiUrl } from '../../../src/utils/apiUrl';
import { getSocket } from '../../../src/hooks/useSocket';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { showToast } from '../../../src/components/Toast';
import { AudioPlayer } from '../../../src/components/AudioPlayer';
import { MediaViewerModal } from '../../../src/components/MediaViewerModal';
import { UIConfirmDialog } from '../../../src/components/UIModal';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Mic,
  Info,
  X,
  LogOut,
  UserPlus,
  Shield,
  ShieldAlert,
  Trash2,
  Edit2,
  Camera,
  Check,
  CheckCheck,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function isAudioMedia(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.startsWith('data:audio') ||
    lower.includes('.m4a') ||
    lower.includes('.mp3') ||
    lower.includes('.wav') ||
    lower.includes('.webm') ||
    lower.includes('.aac') ||
    lower.includes('.ogg') ||
    lower.includes('/audio/') ||
    lower.includes('/video/upload/') ||
    lower.includes('.mp4')
  );
}

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { theme, mode } = useTheme();
  const [selectedGroup, setSelectedGroup] = useAtom(selectedGroupAtom);
  const [currentUserId] = useAtom(userIdAtom);
  const [friends] = useAtom<Friend[]>(friendsAtom);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Modals & Viewers
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [viewerModalVisible, setViewerModalVisible] = useState(false);
  const [viewerMediaList, setViewerMediaList] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Attached media
  const [attachedMedia, setAttachedMedia] = useState<string[]>([]);

  // Audio recording
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isStartingRecordingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  // Group Info Admin state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupPhoto, setEditGroupPhoto] = useState('');
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [, setCountdownTick] = useState(0);

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    iconType?: 'delete' | 'logout' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const flatListRef = useRef<FlatList>(null);

  // 1️⃣ Fetch Group Details
  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await apiFetch(`${getApiUrl()}/api/groups/details/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedGroup(data);
        setEditGroupName(data.groupName || '');
        setEditGroupPhoto(data.groupProfilePic || '');
      }
    } catch (err) {
      console.error('Error fetching group details:', err);
    }
  }, [groupId, setSelectedGroup]);

  // 2️⃣ Fetch Group Messages
  const fetchGroupMessages = useCallback(async () => {
    if (!groupId || !currentUserId) return;
    try {
      const res = await apiFetch(
        `${getApiUrl()}/api/groups/group-message/${groupId}?userId=${currentUserId}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching group messages:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, currentUserId]);

  useEffect(() => {
    fetchGroupDetails();
    fetchGroupMessages();
  }, [fetchGroupDetails, fetchGroupMessages]);

  // 3️⃣ Socket Event Listeners for Group
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !groupId) return;

    socket.emit('joinGroup', groupId);
    socket.emit('groupMessagesRead', { groupId, readerId: currentUserId });

    const handleConnect = () => {
      socket.emit('joinGroup', groupId);
      fetchGroupMessages();
      fetchGroupDetails();
    };
    socket.on('connect', handleConnect);

    const handleNewGroupMessage = (newMsg: Message) => {
      if (newMsg.groupId === groupId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === newMsg._id);
          if (exists) return prev;

          const localIndex = prev.findIndex(
            (m) =>
              m._id?.startsWith('local-') &&
              ((typeof m.sender === 'string' && m.sender === currentUserId) ||
                (typeof m.sender === 'object' && m.sender?._id === currentUserId)) &&
              m.content === newMsg.content
          );

          if (localIndex !== -1) {
            const updated = [...prev];
            updated[localIndex] = newMsg;
            return updated;
          }

          return [...prev, newMsg];
        });

        socket.emit('groupMessagesRead', { groupId, readerId: currentUserId });
      }
    };

    const handleGroupSeenUpdate = ({
      groupId: seenGroupId,
      messages: updatedMessages,
    }: {
      groupId: string;
      messages: Message[];
    }) => {
      if (seenGroupId === groupId && Array.isArray(updatedMessages)) {
        setMessages((prev) =>
          prev.map((m) => {
            const upd = updatedMessages.find((u) => u._id === m._id);
            return upd ? { ...m, seenBy: upd.seenBy, expiresAt: upd.expiresAt } : m;
          })
        );
      }
    };

    const handleGroupUpdated = (updatedGroup: any) => {
      if (updatedGroup._id === groupId) {
        setSelectedGroup(updatedGroup);
        setEditGroupName(updatedGroup.groupName || '');
        setEditGroupPhoto(updatedGroup.groupProfilePic || '');
      }
    };

    const handleGroupDeleted = ({ groupId: deletedId }: { groupId: string }) => {
      if (deletedId === groupId) {
        setSelectedGroup(null);
        showToast('This group was deleted by an admin.', 'info');
        router.back();
      }
    };

    const handleRemovedFromGroup = ({ groupId: removedId }: { groupId: string }) => {
      if (removedId === groupId) {
        setSelectedGroup(null);
        showToast('You were removed from this group.', 'info');
        router.back();
      }
    };

    const handleGroupMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    socket.on('newGroupMessage', handleNewGroupMessage);
    socket.on('groupSeenUpdate', handleGroupSeenUpdate);
    socket.on('groupUpdated', handleGroupUpdated);
    socket.on('groupDeleted', handleGroupDeleted);
    socket.on('removedFromGroup', handleRemovedFromGroup);
    socket.on('groupMessageDeleted', handleGroupMessageDeleted);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('newGroupMessage', handleNewGroupMessage);
      socket.off('groupSeenUpdate', handleGroupSeenUpdate);
      socket.off('groupUpdated', handleGroupUpdated);
      socket.off('groupDeleted', handleGroupDeleted);
      socket.off('removedFromGroup', handleRemovedFromGroup);
      socket.off('groupMessageDeleted', handleGroupMessageDeleted);
    };
  }, [groupId, currentUserId, setSelectedGroup, router, fetchGroupMessages, fetchGroupDetails]);

  // 4️⃣ Countdown interval for disappearing group messages
  useEffect(() => {
    const hasExpiring = messages.some((m) => m.expiresAt);
    if (!hasExpiring) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setMessages((prev) =>
        prev.filter((m) => !m.expiresAt || new Date(m.expiresAt).getTime() > now)
      );
      setCountdownTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [messages]);

  // 5️⃣ Auto-mark group messages as read when viewing group
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !groupId || !currentUserId) return;

    const hasUnread = messages.some((msg) => {
      const seenIds = (msg.seenBy || []).map((u: any) =>
        typeof u === 'object' ? u._id : u
      );
      return !seenIds.includes(currentUserId);
    });

    if (hasUnread) {
      socket.emit('groupMessagesRead', { groupId, readerId: currentUserId });
    }
  }, [messages, groupId, currentUserId]);

  // 4️⃣ Send Group Message
  const handleSendMessage = async () => {
    if (!text.trim() && attachedMedia.length === 0) return;
    if (!groupId || !currentUserId) return;

    const textToSend = text.trim();
    const mediaToSend = [...attachedMedia];

    setText('');
    setAttachedMedia([]);
    setSending(true);

    const localId = `local-${Date.now()}`;
    const optimisticMessage: Message = {
      _id: localId,
      groupId,
      sender: {
        _id: currentUserId,
        username: 'Me',
        profilePic: '',
      },
      content: textToSend,
      media: mediaToSend,
      createdAt: new Date().toISOString(),
      isRead: false,
      seenBy: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await apiFetch(`${getApiUrl()}/api/groups/send-group-message`, {
        method: 'POST',
        body: JSON.stringify({
          groupId,
          senderId: currentUserId,
          content: textToSend,
          media: mediaToSend,
        }),
      });

      if (res.ok) {
        const savedMsg = await res.json();
        setMessages((prev) => prev.map((m) => (m._id === localId ? savedMsg : m)));

        const socket = getSocket();
        if (socket) {
          socket.emit('sendGroupMessage', {
            groupId,
            senderId: currentUserId,
            content: savedMsg.content,
            media: savedMsg.media,
          });
        }
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== localId));
        showToast('Failed to send group message', 'error');
      }
    } catch (err) {
      console.error('Send group message error:', err);
      setMessages((prev) => prev.filter((m) => m._id !== localId));
    } finally {
      setSending(false);
    }
  };

  // 5️⃣ Multi-Image Picker
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets
          .filter((a) => a.base64)
          .map((a) => `data:image/jpeg;base64,${a.base64}`);
        setAttachedMedia((prev) => [...prev, ...newImages]);
      }
    } catch (err) {
      console.error('Image picking error:', err);
    }
  };

  // 6️⃣ Audio Recording with FileSystem base64 encoding & race condition protection
  const startRecording = async () => {
    if (isStartingRecordingRef.current) {
      return;
    }

    try {
      isStartingRecordingRef.current = true;
      stopRequestedRef.current = false;

      // Clean up any residual recording object
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (_) {}
        recordingRef.current = null;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        showToast('Microphone permission required.', 'warning');
        isStartingRecordingRef.current = false;
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      if (stopRequestedRef.current) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (_) {}
        isStartingRecordingRef.current = false;
        return;
      }

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordDuration(0);

      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
      recordIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      showToast('Could not start recording', 'error');
    } finally {
      isStartingRecordingRef.current = false;
    }
  };

  const stopRecording = async (shouldAttach = true) => {
    stopRequestedRef.current = true;

    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    setIsRecording(false);

    let attempts = 0;
    while (isStartingRecordingRef.current && attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      attempts++;
    }

    const currentRec = recordingRef.current;
    recordingRef.current = null;

    if (!currentRec) return;

    try {
      await currentRec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      if (shouldAttach) {
        const uri = currentRec.getURI();
        if (uri) {
          const base64Audio = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const dataUri = `data:audio/m4a;base64,${base64Audio}`;
          setAttachedMedia((prev) => [...prev, dataUri]);
          showToast('🎙️ Voice note added!', 'success');
        }
      }
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  };

  const cancelRecording = async () => {
    await stopRecording(false);
    showToast('Recording cancelled', 'info');
  };

  // 7️⃣ Group Admin Actions
  const superAdminId =
    typeof selectedGroup?.superAdmin === 'object' && selectedGroup?.superAdmin
      ? (selectedGroup.superAdmin as GroupMember)._id
      : selectedGroup?.superAdmin;

  const isAdmin =
    Boolean(
      selectedGroup?.admins?.some((admin) =>
        typeof admin === 'object' ? admin._id === currentUserId : admin === currentUserId
      )
    ) || superAdminId === currentUserId;

  const handleUpdateGroupInfo = async () => {
    if (!groupId || !editGroupName.trim()) return;
    try {
      const res = await apiFetch(`${getApiUrl()}/api/groups/update-info/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({
          groupName: editGroupName.trim(),
          groupProfilePic: editGroupPhoto,
          requesterId: currentUserId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedGroup(data.group);
        setIsEditingInfo(false);
        showToast('Group updated successfully!', 'success');
      }
    } catch (err) {
      console.error('Error updating group info:', err);
    }
  };

  const handleAddMembers = async () => {
    if (!groupId || selectedNewMembers.length === 0) return;
    try {
      const res = await apiFetch(`${getApiUrl()}/api/groups/add-members/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({
          userIds: selectedNewMembers,
          requesterId: currentUserId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedGroup(data.group);
        setIsAddMembersOpen(false);
        setSelectedNewMembers([]);
        showToast('Members added successfully!', 'success');
      }
    } catch (err) {
      console.error('Error adding members:', err);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setConfirmModal({
      visible: true,
      title: 'Remove Member',
      description: 'Are you sure you want to remove this member from the group?',
      confirmText: 'Remove',
      variant: 'danger',
      iconType: 'delete',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        try {
          const res = await apiFetch(`${getApiUrl()}/api/groups/remove-member/${groupId}`, {
            method: 'PUT',
            body: JSON.stringify({
              memberId,
              requesterId: currentUserId,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setSelectedGroup(data.group);
            showToast('Member removed.', 'info');
          }
        } catch (err) {
          console.error('Error removing member:', err);
        }
      },
    });
  };

  const handlePromoteAdmin = async (memberId: string) => {
    try {
      const res = await apiFetch(`${getApiUrl()}/api/groups/promote/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({
          memberId,
          requesterId: currentUserId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedGroup(data.group);
        showToast('Promoted to Admin!', 'success');
      }
    } catch (err) {
      console.error('Error promoting admin:', err);
    }
  };

  const handleDemoteAdmin = async (memberId: string) => {
    try {
      const res = await apiFetch(`${getApiUrl()}/api/groups/demote/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({
          memberId,
          requesterId: currentUserId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedGroup(data.group);
        showToast('Admin dismissed.', 'info');
      }
    } catch (err) {
      console.error('Error demoting admin:', err);
    }
  };

  const handleLeaveGroup = () => {
    setConfirmModal({
      visible: true,
      title: 'Leave Group',
      description: 'Are you sure you want to leave this group? You will no longer receive messages.',
      confirmText: 'Leave Group',
      variant: 'danger',
      iconType: 'logout',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        try {
          const res = await apiFetch(`${getApiUrl()}/api/groups/leave/${groupId}`, {
            method: 'PUT',
            body: JSON.stringify({ requesterId: currentUserId }),
          });

          if (res.ok) {
            setIsInfoModalOpen(false);
            setSelectedGroup(null);
            showToast('You have left the group.', 'info');
            router.back();
          }
        } catch (err) {
          console.error('Error leaving group:', err);
        }
      },
    });
  };

  const handleDeleteGroup = () => {
    setConfirmModal({
      visible: true,
      title: 'Delete Group',
      description: 'Are you sure you want to permanently delete this group? All chat history and media will be removed.',
      confirmText: 'Delete Group',
      variant: 'danger',
      iconType: 'delete',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        try {
          const res = await apiFetch(`${getApiUrl()}/api/groups/delete-group/${groupId}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            setIsInfoModalOpen(false);
            setSelectedGroup(null);
            showToast('Group deleted.', 'info');
            router.back();
          }
        } catch (err) {
          console.error('Error deleting group:', err);
        }
      },
    });
  };

  // Friends not yet in group
  const groupMemberIds = (selectedGroup?.groupMember || []).map((m: any) =>
    typeof m === 'object' ? m._id : m
  );
  const availableFriends = friends.filter((f) => !groupMemberIds.includes(f.friendId));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View
          style={[
            styles.topBar,
            { backgroundColor: theme.card, borderBottomColor: theme.border },
          ]}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={theme.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.groupHeaderRow}
            onPress={() => setIsInfoModalOpen(true)}
            activeOpacity={0.7}
          >
            {selectedGroup?.groupProfilePic ? (
              <Image source={{ uri: selectedGroup.groupProfilePic }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: theme.accent }]}>
                <Text style={styles.avatarInitial}>
                  {selectedGroup?.groupName?.charAt(0).toUpperCase() || 'G'}
                </Text>
              </View>
            )}
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.groupName, { color: theme.foreground }]} numberOfLines={1}>
                {selectedGroup?.groupName || 'Group Chat'}
              </Text>
              <Text style={[styles.memberCountText, { color: theme.mutedText }]}>
                {selectedGroup?.groupMember?.length || 0} members
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setIsInfoModalOpen(true)}
          >
            <Info size={22} color={theme.mutedText} />
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={{ marginTop: 10, color: theme.mutedText, fontSize: 13, fontWeight: '600' }}>
              Chugli...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item: Message, index: number) => item._id || String(index)}
            contentContainerStyle={styles.messageListContent}
            style={styles.flatList}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }: { item: Message }) => {
              const senderObj = typeof item.sender === 'object' ? item.sender : null;
              const senderId = senderObj?._id || (typeof item.sender === 'string' ? item.sender : '');
              const isMe = senderId === currentUserId;

              return (
                <View
                  style={[
                    styles.messageBubble,
                    isMe
                      ? [styles.myBubble, { backgroundColor: theme.bubbleSent }]
                      : [
                          styles.theirBubble,
                          { backgroundColor: theme.bubbleReceived, borderColor: theme.border },
                        ],
                  ]}
                >
                  {!isMe && senderObj ? (
                    <Text style={[styles.senderName, { color: theme.accent }]}>
                      {senderObj.username}
                    </Text>
                  ) : null}

                  {/* Media Content */}
                  {item.media && item.media.length > 0 ? (
                    <View style={styles.mediaContainer}>
                      {item.media.map((url: string, i: number) => {
                        const isAudio = isAudioMedia(url);
                        return (
                          <View key={i} style={styles.mediaItemWrapper}>
                            {isAudio ? (
                              <AudioPlayer
                                uri={url}
                                isMe={isMe}
                                accentColor={theme.accent}
                                textColor={isMe ? theme.bubbleSentText : theme.bubbleReceivedText}
                              />
                            ) : (
                              <TouchableOpacity
                                onPress={() => {
                                  const imageMedia = (item.media || []).filter((u) => !isAudioMedia(u));
                                  setViewerMediaList(imageMedia);
                                  setViewerIndex(imageMedia.indexOf(url) !== -1 ? imageMedia.indexOf(url) : 0);
                                  setViewerModalVisible(true);
                                }}
                              >
                                <Image
                                  source={{ uri: url }}
                                  style={[
                                    styles.mediaImage,
                                    {
                                      borderColor: isMe
                                        ? (mode === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.35)')
                                        : (mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.25)'),
                                    },
                                  ]}
                                />
                              </TouchableOpacity>
                            )}

                            {/* Border between multiple media items */}
                            {i < (item.media?.length || 0) - 1 ? (
                              <View
                                style={[
                                  styles.mediaDivider,
                                  {
                                    backgroundColor: isMe
                                      ? (mode === 'light' ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.45)')
                                      : (mode === 'light' ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.35)'),
                                  },
                                ]}
                              />
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : null}

                  {/* Border between Media and Text content */}
                  {item.media && item.media.length > 0 && item.content && item.content.trim() ? (
                    <View
                      style={[
                        styles.mediaTextDivider,
                        {
                          backgroundColor: isMe
                            ? (mode === 'light' ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.48)')
                            : (mode === 'light' ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.38)'),
                        },
                      ]}
                    />
                  ) : null}

                  {item.content ? (
                    <Text
                      style={[
                        styles.messageText,
                        { color: isMe ? theme.bubbleSentText : theme.bubbleReceivedText },
                      ]}
                    >
                      {item.content}
                    </Text>
                  ) : null}

                  <View style={styles.bubbleFooter}>
                    {item.expiresAt ? (
                      <Text style={styles.disappearTimerText}>
                        ⏳ {formatCountdown(item.expiresAt)}
                      </Text>
                    ) : null}

                    <Text
                      style={[
                        styles.timeText,
                        { color: isMe ? `${theme.bubbleSentText}aa` : theme.mutedText },
                      ]}
                    >
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </Text>

                    {/* Seen tick status for sent messages */}
                    {isMe ? (() => {
                      const totalGroupMembersCount = selectedGroup?.groupMember?.length || 2;
                      const otherMembersCount = Math.max(1, totalGroupMembersCount - 1);
                      const seenOthers = (item.seenBy || []).filter((u: any) => {
                        const id = typeof u === 'object' ? u._id : u;
                        return id && id !== currentUserId;
                      });
                      const allSeen = seenOthers.length >= otherMembersCount;
                      const someSeen = seenOthers.length > 0;

                      if (allSeen) {
                        return (
                          <View style={styles.seenByRow}>
                            <CheckCheck size={14} color="#38bdf8" />
                            <Text style={[styles.seenByCount, { color: '#38bdf8' }]}>
                              {seenOthers.length}
                            </Text>
                          </View>
                        );
                      } else if (someSeen) {
                        return (
                          <View style={styles.seenByRow}>
                            <CheckCheck size={14} color={isMe ? `${theme.bubbleSentText}80` : theme.mutedText} />
                            <Text style={[styles.seenByCount, { color: isMe ? `${theme.bubbleSentText}aa` : theme.mutedText }]}>
                              {seenOthers.length}
                            </Text>
                          </View>
                        );
                      } else {
                        return (
                          <View style={{ marginLeft: 4 }}>
                            <Check size={14} color={isMe ? `${theme.bubbleSentText}80` : theme.mutedText} />
                          </View>
                        );
                      }
                    })() : null}
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Attached Media Preview Bar */}
        {attachedMedia.length > 0 ? (
          <View style={[styles.attachedPreviewBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachedContent}>
              {attachedMedia.map((uri, index) => {
                const isAudio = isAudioMedia(uri);
                return (
                  <View key={index} style={styles.attachedItemWrapper}>
                    {isAudio ? (
                      <View style={[styles.attachedAudioCard, { backgroundColor: theme.muted, borderColor: theme.border }]}>
                        <View style={[styles.audioIconBadge, { backgroundColor: theme.accent }]}>
                          <Mic size={16} color="#ffffff" />
                        </View>
                        <View style={styles.audioMeta}>
                          <Text style={[styles.audioMetaTitle, { color: theme.foreground }]}>Voice Note</Text>
                          <Text style={[styles.audioMetaSubtitle, { color: theme.mutedText }]}>Ready to send</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.audioCardRemoveBtn, { backgroundColor: 'rgba(239,68,68,0.14)' }]}
                          onPress={() => setAttachedMedia((prev) => prev.filter((_, i) => i !== index))}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.imageThumbnailWrapper}>
                        <Image source={{ uri }} style={styles.attachedThumbnail} />
                        <TouchableOpacity
                          style={styles.removeAttachedBtn}
                          onPress={() => setAttachedMedia((prev) => prev.filter((_, i) => i !== index))}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <X size={12} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Input Bar */}
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.card, borderTopColor: theme.border },
          ]}
        >
          {isRecording ? (
            <View style={styles.recordingBar}>
              <TouchableOpacity
                style={styles.cancelRecBtn}
                onPress={cancelRecording}
                activeOpacity={0.7}
              >
                <Trash2 size={18} color="#ef4444" />
                <Text style={styles.cancelRecText}>Cancel</Text>
              </TouchableOpacity>

              <View style={styles.recStatusContainer}>
                <View style={styles.recRedDot} />
                <Text style={[styles.recTimerText, { color: theme.foreground }]}>
                  {Math.floor(recordDuration / 60)}:{recordDuration % 60 < 10 ? '0' : ''}{recordDuration % 60}
                </Text>
                <Text style={[styles.recLabelText, { color: theme.mutedText }]}>
                  Recording Chugli...
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.finishRecBtn, { backgroundColor: theme.accent }]}
                onPress={() => stopRecording(true)}
                activeOpacity={0.8}
              >
                <Send size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.iconBtn} onPress={handlePickImage}>
                <ImageIcon size={22} color={theme.mutedText} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconBtn}
                onPress={startRecording}
              >
                <Mic size={22} color={theme.mutedText} />
              </TouchableOpacity>

              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    color: theme.foreground,
                  },
                ]}
                placeholder="Type a group message..."
                placeholderTextColor={theme.mutedText}
                value={text}
                onChangeText={setText}
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  { backgroundColor: theme.accent },
                  (!text.trim() && attachedMedia.length === 0 && !sending) && styles.disabledSend,
                ]}
                onPress={handleSendMessage}
                disabled={(!text.trim() && attachedMedia.length === 0) || sending}
              >
                {sending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Send size={18} color="#ffffff" />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Group Info Modal */}
        <Modal visible={isInfoModalOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.foreground }]}>Group Info</Text>
                <TouchableOpacity
                  onPress={() => setIsInfoModalOpen(false)}
                  style={[styles.closeCircleBtn, { backgroundColor: theme.muted }]}
                >
                  <X size={18} color={theme.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.groupInfoBanner}>
                  {selectedGroup?.groupProfilePic ? (
                    <Image source={{ uri: selectedGroup.groupProfilePic }} style={styles.avatarLarge} />
                  ) : (
                    <View style={[styles.avatarFallbackLarge, { backgroundColor: theme.accent }]}>
                      <Text style={styles.avatarInitialLarge}>
                        {selectedGroup?.groupName?.charAt(0).toUpperCase() || 'G'}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.groupTitleLarge, { color: theme.foreground }]}>
                    {selectedGroup?.groupName}
                  </Text>
                  <Text style={[styles.memberCountBadge, { color: theme.mutedText }]}>
                    {selectedGroup?.groupMember?.length || 0} participants
                  </Text>
                </View>

                {/* Admin: Edit Group Details */}
                {isAdmin ? (
                  <View style={[styles.editSection, { borderColor: theme.border }]}>
                    <TouchableOpacity
                      style={styles.editToggleBtn}
                      onPress={() => setIsEditingInfo(!isEditingInfo)}
                    >
                      <Edit2 size={16} color={theme.accent} />
                      <Text style={[styles.editToggleText, { color: theme.accent }]}>
                        {isEditingInfo ? 'Cancel Editing' : 'Edit Group Details'}
                      </Text>
                    </TouchableOpacity>

                    {isEditingInfo ? (
                      <View style={{ marginTop: 10 }}>
                        <TextInput
                          style={[styles.editInput, { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground }]}
                          value={editGroupName}
                          onChangeText={setEditGroupName}
                          placeholder="Group name"
                          placeholderTextColor={theme.mutedText}
                        />
                        <TouchableOpacity
                          style={[styles.saveBtn, { backgroundColor: theme.accent }]}
                          onPress={handleUpdateGroupInfo}
                        >
                          <Text style={styles.saveBtnText}>Save Changes</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Admin: Add Members Button */}
                {isAdmin ? (
                  <TouchableOpacity
                    style={[styles.actionRowBtn, { backgroundColor: `${theme.accent}15` }]}
                    onPress={() => setIsAddMembersOpen(true)}
                  >
                    <UserPlus size={18} color={theme.accent} />
                    <Text style={[styles.actionRowText, { color: theme.accent }]}>Add Members</Text>
                  </TouchableOpacity>
                ) : null}

                {/* Member List */}
                <Text style={[styles.sectionLabel, { color: theme.mutedText }]}>Members</Text>
                <View style={styles.memberScrollView}>
                  {(selectedGroup?.groupMember || []).map((member: any) => {
                    const memberId = typeof member === 'object' ? member._id : member;
                    const memberName = typeof member === 'object' ? member.username : 'Member';
                    const memberPic = typeof member === 'object' ? member.profilePic : null;
                    const isMemberAdmin = Boolean(
                      selectedGroup?.admins?.some((adm) =>
                        typeof adm === 'object' ? adm._id === memberId : adm === memberId
                      )
                    );
                    const isMemberSuperAdmin = superAdminId === memberId;

                    return (
                      <View
                        key={memberId}
                        style={[
                          styles.memberCard,
                          { backgroundColor: theme.muted, borderColor: theme.border },
                        ]}
                      >
                        {memberPic ? (
                          <Image source={{ uri: memberPic }} style={styles.memberAvatar} />
                        ) : (
                          <View style={[styles.memberAvatarFallback, { backgroundColor: theme.accent }]}>
                            <Text style={styles.memberAvatarInitial}>
                              {memberName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.memberName, { color: theme.foreground }]}>
                          {memberName} {memberId === currentUserId ? '(You)' : ''}
                        </Text>

                        {isMemberSuperAdmin ? (
                          <View style={[styles.adminBadge, { borderColor: '#eab308' }]}>
                            <Text style={[styles.adminBadgeText, { color: '#eab308' }]}>Owner</Text>
                          </View>
                        ) : isMemberAdmin ? (
                          <View style={[styles.adminBadge, { borderColor: theme.accent }]}>
                            <Text style={[styles.adminBadgeText, { color: theme.accent }]}>Admin</Text>
                          </View>
                        ) : null}

                        {/* Admin controls for other members */}
                        {isAdmin && memberId !== currentUserId && !isMemberSuperAdmin ? (
                          <View style={styles.adminActionIcons}>
                            {isMemberAdmin ? (
                              <TouchableOpacity
                                style={styles.miniIconBtn}
                                onPress={() => handleDemoteAdmin(memberId)}
                              >
                                <ShieldAlert size={16} color="#eab308" />
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={styles.miniIconBtn}
                                onPress={() => handlePromoteAdmin(memberId)}
                              >
                                <Shield size={16} color={theme.accent} />
                              </TouchableOpacity>
                            )}

                            <TouchableOpacity
                              style={styles.miniIconBtn}
                              onPress={() => handleRemoveMember(memberId)}
                            >
                              <X size={16} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                {/* Leave Group / Delete Group */}
                <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
                  <LogOut size={18} color="#ef4444" />
                  <Text style={styles.leaveText}>Leave Group</Text>
                </TouchableOpacity>

                {isAdmin ? (
                  <TouchableOpacity style={styles.deleteGroupBtn} onPress={handleDeleteGroup}>
                    <Trash2 size={18} color="#ef4444" />
                    <Text style={styles.leaveText}>Delete Group</Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Add Members Sub-Modal */}
        <Modal visible={isAddMembersOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.foreground }]}>Add Members</Text>
                <TouchableOpacity
                  onPress={() => setIsAddMembersOpen(false)}
                  style={[styles.closeCircleBtn, { backgroundColor: theme.muted }]}
                >
                  <X size={18} color={theme.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 300 }}>
                {availableFriends.length === 0 ? (
                  <Text style={[styles.noFriendsText, { color: theme.mutedText }]}>
                    All your friends are already in this group.
                  </Text>
                ) : (
                  availableFriends.map((f) => {
                    const isSelected = selectedNewMembers.includes(f.friendId);
                    return (
                      <TouchableOpacity
                        key={f.friendId}
                        style={[
                          styles.addMemberItem,
                          { borderColor: theme.border },
                          isSelected && { backgroundColor: `${theme.accent}15` },
                        ]}
                        onPress={() =>
                          setSelectedNewMembers((prev) =>
                            prev.includes(f.friendId)
                              ? prev.filter((id) => id !== f.friendId)
                              : [...prev, f.friendId]
                          )
                        }
                      >
                        <Text style={[styles.memberName, { color: theme.foreground }]}>{f.username}</Text>
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
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: theme.accent, marginTop: 16 },
                  selectedNewMembers.length === 0 && { opacity: 0.5 },
                ]}
                onPress={handleAddMembers}
                disabled={selectedNewMembers.length === 0}
              >
                <Text style={styles.saveBtnText}>
                  Add {selectedNewMembers.length} Selected
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Media Viewer Modal */}
        <MediaViewerModal
          visible={viewerModalVisible}
          mediaUrls={viewerMediaList}
          initialIndex={viewerIndex}
          onClose={() => setViewerModalVisible(false)}
        />

        {/* Themed Confirmation Dialog */}
        <UIConfirmDialog
          visible={confirmModal.visible}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmText={confirmModal.confirmText || 'Confirm'}
          cancelText={confirmModal.cancelText || 'Cancel'}
          variant={confirmModal.variant || 'danger'}
          iconType={confirmModal.iconType || 'warning'}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
  },
  groupHeaderRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  groupName: {
    fontSize: 15,
    fontWeight: '700',
  },
  memberCountText: {
    fontSize: 11,
  },
  infoButton: {
    padding: 8,
  },
  messageListContent: {
    padding: 14,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 8,
  },
  myBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  mediaContainer: {
    marginBottom: 2,
  },
  mediaItemWrapper: {
    width: '100%',
  },
  mediaDivider: {
    height: 1.5,
    minHeight: 1.5,
    width: '100%',
    alignSelf: 'stretch',
    marginVertical: 8,
    borderRadius: 1,
  },
  mediaTextDivider: {
    height: 1.5,
    minHeight: 1.5,
    width: '100%',
    alignSelf: 'stretch',
    marginVertical: 8,
    borderRadius: 1,
  },
  mediaImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  disappearTimerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
    marginRight: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  seenByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seenByCount: {
    fontSize: 10,
    fontWeight: '700',
  },
  attachedPreviewBar: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  attachedContent: {
    alignItems: 'center',
    paddingRight: 8,
    paddingTop: 6,
    paddingBottom: 4,
  },
  attachedItemWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  imageThumbnailWrapper: {
    position: 'relative',
    paddingTop: 4,
    paddingRight: 4,
  },
  attachedThumbnail: {
    width: 62,
    height: 62,
    borderRadius: 12,
  },
  attachedAudioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 170,
    gap: 8,
  },
  audioIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioMeta: {
    justifyContent: 'center',
    marginRight: 4,
  },
  audioMetaTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  audioMetaSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  audioCardRemoveBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  removeAttachedBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 11,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    zIndex: 10,
  },
  recordingBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cancelRecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    gap: 6,
  },
  cancelRecText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  recStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recRedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  recTimerText: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  recLabelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  finishRecBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  iconBtn: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 15,
    marginHorizontal: 4,
    borderWidth: 1,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSend: {
    opacity: 0.5,
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
  groupInfoBanner: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 8,
  },
  avatarFallbackLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarInitialLarge: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  groupTitleLarge: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberCountBadge: {
    fontSize: 13,
    marginTop: 2,
  },
  editSection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  editInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  saveBtn: {
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    gap: 8,
  },
  actionRowText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  memberScrollView: {
    maxHeight: 220,
    marginBottom: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
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
  memberName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  adminActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  miniIconBtn: {
    padding: 4,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    marginBottom: 10,
    gap: 8,
  },
  deleteGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    marginBottom: 20,
    gap: 8,
  },
  leaveText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  addMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  noFriendsText: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
