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
  Keyboard,
} from 'react-native';
import { UIConfirmDialog } from '../../../src/components/UIModal';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import { useTheme } from '../../../src/context/ThemeContext';
import {
  selectedFriendAtom,
  userIdAtom,
  disappearDurationAtom,
  Message,
} from '../../../src/states/States';
import { useOnlineStatus } from '../../../src/hooks/useOnlineStatus';
import { apiFetch } from '../../../src/utils/apiFetch';
import { getApiUrl } from '../../../src/utils/apiUrl';
import { getSocket } from '../../../src/hooks/useSocket';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { showToast } from '../../../src/components/Toast';
import { AudioPlayer } from '../../../src/components/AudioPlayer';
import { MediaViewerModal } from '../../../src/components/MediaViewerModal';
import { EmojiPicker } from '../../../src/components/EmojiPicker';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Mic,
  Smile,
  Clock,
  Trash2,
  MoreVertical,
  X,
  UserX,
  CheckCheck,
  Check,
  Sparkles,
  Gamepad2,
  Tv,
  Music,
  Heart,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedEmojiBackground } from '../../../src/components/AnimatedEmojiBackground';

const DISAPPEAR_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '1 hour', value: 1 },
  { label: '4 hours', value: 4 },
  { label: '8 hours', value: 8 },
  { label: '12 hours', value: 12 },
  { label: '24 hours', value: 24 },
];

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

function formatCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatMessageTime(createdAt?: string): string {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatDetailScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const [selectedFriend, setSelectedFriend] = useAtom(selectedFriendAtom);
  const [currentUserId] = useAtom(userIdAtom);
  const [disappearDuration, setDisappearDuration] = useAtom(disappearDurationAtom);
  const { isUserOnline } = useOnlineStatus();
  const isFriendOnline = isUserOnline(friendId);

  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Attached Media
  const [attachedMedia, setAttachedMedia] = useState<string[]>([]);
  const [viewerModalVisible, setViewerModalVisible] = useState(false);
  const [viewerMediaList, setViewerMediaList] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Audio Recording
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

  // Modals
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isTogetherModalOpen, setIsTogetherModalOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [selectedMsgForAction, setSelectedMsgForAction] = useState<Message | null>(null);
  const [showRemoveFriendConfirm, setShowRemoveFriendConfirm] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [, setCountdownTick] = useState(0);

  const [initError, setInitError] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // 1️⃣ Fetch Chat Room & Messages
  const initChat = useCallback(async () => {
    if (!friendId || !currentUserId) return;
    setLoading(true);
    setInitError(null);

    try {
      const chatRes = await apiFetch(`${getApiUrl()}/api/chat`, {
        method: 'POST',
        body: JSON.stringify([currentUserId, friendId]),
      });

      if (chatRes.ok) {
        const chatData = await chatRes.json();
        const activeChatId = chatData._id;
        setChatId(activeChatId);

        const socket = getSocket();
        if (socket && activeChatId) {
          socket.emit('join', activeChatId);
          socket.emit('joinChat', activeChatId);
          socket.emit('messagesRead', {
            chatId: activeChatId,
            readerId: currentUserId,
            senderId: friendId,
          });
          socket.emit('mark_messages_read', {
            senderId: friendId,
            receiverId: currentUserId,
          });
        }

        apiFetch(`${getApiUrl()}/api/message/mark-read`, {
          method: 'PUT',
          body: JSON.stringify({
            senderId: friendId,
            receiverId: currentUserId,
          }),
        }).catch(() => {});

        const msgRes = await apiFetch(
          `${getApiUrl()}/api/message/${activeChatId}?userId=${currentUserId}`
        );
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(Array.isArray(msgData) ? msgData : []);
        }
      } else {
        setInitError('Unable to load chat. Tap Retry below.');
      }
    } catch (err) {
      console.error('Error initializing chat:', err);
      setInitError('Network error initializing chat. Tap Retry below.');
    } finally {
      setLoading(false);
    }
  }, [friendId, currentUserId]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  // Auto-retry chat initialization if socket reconnects while chat is not yet loaded
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleConnect = () => {
      if (!chatId) {
        initChat();
      }
    };

    socket.on('connect', handleConnect);
    return () => {
      socket.off('connect', handleConnect);
    };
  }, [chatId, initChat]);

  // 2️⃣ Socket Event Listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatId) return;

    const handleNewMessage = (message: Message) => {
      if (message.chatId === chatId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === message._id);
          if (exists) return prev;

          const localIndex = prev.findIndex(
            (m) =>
              m._id?.startsWith('local-') &&
              ((typeof m.sender === 'string' && m.sender === currentUserId) ||
                (typeof m.sender === 'object' && m.sender?._id === currentUserId)) &&
              m.content === message.content
          );

          if (localIndex !== -1) {
            const updated = [...prev];
            updated[localIndex] = message;
            return updated;
          }

          return [...prev, message];
        });
      }
    };

    const handleTyping = (data: any) => {
      const sender = typeof data === 'string' ? data : data?.senderId || data?.userId;
      if (sender === friendId) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = (data: any) => {
      const sender = typeof data === 'string' ? data : data?.senderId || data?.userId;
      if (sender === friendId) {
        setIsTyping(false);
      }
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    const handleMessagesReadAck = (data: any) => {
      const ackChatId = data?.chatId;
      const readerId = data?.readerId;
      const updatedMessages = data?.updatedMessages;

      if (!ackChatId || String(ackChatId) === String(chatId) || readerId === friendId) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (updatedMessages && Array.isArray(updatedMessages)) {
              const updated = updatedMessages.find((m: any) => m._id === msg._id);
              if (updated) {
                return { ...msg, isRead: updated.isRead, expiresAt: updated.expiresAt };
              }
            }
            const isSenderCurrent =
              (typeof msg.sender === 'string' && msg.sender === currentUserId) ||
              (typeof msg.sender === 'object' && msg.sender?._id === currentUserId);
            return isSenderCurrent ? { ...msg, isRead: true } : msg;
          })
        );
      }
    };

    const handleFriendRemoved = ({ friendId: removedId }: { friendId: string }) => {
      if (removedId === friendId) {
        setSelectedFriend(null);
        showToast('You are no longer friends with this user.', 'info');
        router.back();
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('messagesReadAck', handleMessagesReadAck);
    socket.on('friendRemoved', handleFriendRemoved);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('messagesReadAck', handleMessagesReadAck);
      socket.off('friendRemoved', handleFriendRemoved);
    };
  }, [chatId, friendId, currentUserId, setSelectedFriend, router]);

  // 3️⃣ Real-time seen trigger for incoming messages while viewing chat
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatId || !friendId || !currentUserId) return;

    const hasUnreadFromFriend = messages.some(
      (msg) =>
        !msg.isRead &&
        ((typeof msg.sender === 'string' && msg.sender === friendId) ||
          (typeof msg.sender === 'object' && msg.sender?._id === friendId))
    );

    if (hasUnreadFromFriend) {
      socket.emit('messagesRead', {
        chatId,
        readerId: currentUserId,
        senderId: friendId,
      });
      socket.emit('mark_messages_read', {
        senderId: friendId,
        receiverId: currentUserId,
      });
      apiFetch(`${getApiUrl()}/api/message/mark-read`, {
        method: 'PUT',
        body: JSON.stringify({
          senderId: friendId,
          receiverId: currentUserId,
        }),
      }).catch(() => {});
    }
  }, [messages, chatId, friendId, currentUserId]);

  // 3️⃣ Countdown interval for disappearing messages
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

  // 4️⃣ Handle Text Change & Typing Socket
  const handleTextChange = (val: string) => {
    setText(val);
    const socket = getSocket();

    if (socket && friendId && currentUserId) {
      socket.emit('typing', { receiverId: friendId, userId: currentUserId });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { receiverId: friendId, userId: currentUserId });
      }, 1500);
    }
  };

  // 5️⃣ Send Message
  const handleSendMessage = async () => {
    if (!text.trim() && attachedMedia.length === 0) return;
    if (!chatId || !currentUserId || !friendId) return;

    const textToSend = text.trim();
    const mediaToSend = [...attachedMedia];

    setText('');
    setAttachedMedia([]);
    setSending(true);

    const localId = `local-${Date.now()}`;
    const optimisticMessage: Message = {
      _id: localId,
      chatId,
      sender: {
        _id: currentUserId,
        username: 'Me',
        profilePic: '',
      },
      receiver: friendId,
      content: textToSend,
      media: mediaToSend,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await apiFetch(`${getApiUrl()}/api/message`, {
        method: 'POST',
        body: JSON.stringify({
          chatId,
          senderId: currentUserId,
          receiverId: friendId,
          content: textToSend,
          media: mediaToSend,
          isRead: false,
          disappearDuration,
        }),
      });

      if (res.ok) {
        const savedMessage = await res.json();
        setMessages((prev) => prev.map((m) => (m._id === localId ? savedMessage : m)));

        const socket = getSocket();
        if (socket) {
          socket.emit('sendMessage', {
            chatId: savedMessage.chatId,
            senderId: currentUserId,
            receiverId: friendId,
            media: savedMessage.media,
            content: savedMessage.content,
          });
        }
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== localId));
        showToast('Failed to send message', 'error');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages((prev) => prev.filter((m) => m._id !== localId));
    } finally {
      setSending(false);
    }
  };

  // 6️⃣ Multi Image Picker
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

  // 7️⃣ Audio Recording with FileSystem base64 encoding & race condition protection
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

  // 8️⃣ Delete Single Message
  const handleDeleteMessage = async (msg: Message, deleteForEveryone: boolean) => {
    if (!msg._id || !currentUserId) return;
    try {
      const res = await apiFetch(`${getApiUrl()}/api/message/delete-message`, {
        method: 'POST',
        body: JSON.stringify({
          messageId: msg._id,
          userId: currentUserId,
          isGroup: false,
          deleteForEveryone,
        }),
      });

      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m._id !== msg._id));
        const socket = getSocket();
        if (socket && deleteForEveryone && chatId) {
          socket.emit('deleteMessage', { messageId: msg._id, chatId });
        }
        showToast('Message deleted.', 'success');
      }
    } catch (err) {
      console.error('Delete message error:', err);
    } finally {
      setSelectedMsgForAction(null);
    }
  };

  // 9️⃣ Clear Chat History
  const handleClearChat = async () => {
    if (!chatId || !currentUserId) return;
    setIsSettingsMenuOpen(false);
    setShowClearChatConfirm(true);
  };

  const handleConfirmClearChat = async () => {
    setShowClearChatConfirm(false);
    try {
      const res = await apiFetch(`${getApiUrl()}/api/message/clear-chat`, {
        method: 'POST',
        body: JSON.stringify({ chatId, userId: currentUserId }),
      });

      if (res.ok) {
        setMessages([]);
        showToast('Chat cleared successfully.', 'success');
      } else {
        showToast('Failed to clear chat.', 'error');
      }
    } catch (err) {
      console.error('Clear chat error:', err);
    }
  };

  // 🔟 Remove Friend
  const handleRemoveFriend = () => {
    if (!friendId || !currentUserId) return;
    setIsSettingsMenuOpen(false);
    setShowRemoveFriendConfirm(true);
  };

  const handleConfirmRemoveFriend = async () => {
    setShowRemoveFriendConfirm(false);
    try {
      const socket = getSocket();
      if (socket) {
        socket.emit('removeFriend', { userId: currentUserId, friendId });
      }

      const res = await apiFetch(`${getApiUrl()}/api/friends/remove-friend`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUserId, friendId }),
      });

      if (res.ok) {
        setSelectedFriend(null);
        showToast('Friend removed successfully.', 'info');
        router.back();
      }
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

  // 1️⃣1️⃣ Together Room Quick Invite
  const handleInviteTogether = (roomType: 'game' | 'watch' | 'music' | 'activity', gameId?: string) => {
    setIsTogetherModalOpen(false);
    const socket = getSocket();
    if (!socket || !friendId) return;

    socket.emit('together:create', {
      type: roomType,
      gameId: gameId || (roomType === 'game' ? 'tictactoe' : undefined),
      targetUserId: friendId,
    });

    showToast(`Invited ${selectedFriend?.username || 'friend'} to Together session!`, 'success');
    router.push('/(app)/(tabs)/together');
  };

  const isSelfChat = friendId === currentUserId;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <AnimatedEmojiBackground />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Navigation Bar */}
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
            style={styles.userHeaderRow}
            onPress={() => {
              if (selectedFriend) {
                router.push('/(app)/profile');
              }
            }}
            activeOpacity={0.7}
          >
            {selectedFriend?.profilePic ? (
              <Image source={{ uri: selectedFriend.profilePic }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: theme.accent }]}>
                <Text style={styles.avatarInitial}>
                  {selectedFriend?.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}

            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.usernameText, { color: theme.foreground }]} numberOfLines={1}>
                {selectedFriend?.username || 'Chat'}
              </Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isTyping
                        ? theme.accent
                        : isFriendOnline
                        ? '#22c55e'
                        : '#94a3b8',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: isTyping
                        ? theme.accent
                        : isFriendOnline
                        ? '#22c55e'
                        : theme.mutedText,
                    },
                  ]}
                >
                  {isTyping ? 'Chugli...' : isFriendOnline ? 'online' : 'offline'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Quick Together Invite Button */}
          <TouchableOpacity
            style={[styles.togetherBtn, { backgroundColor: `${theme.accent}18` }]}
            onPress={() => setIsTogetherModalOpen(true)}
          >
            <Sparkles size={18} color="#ec4899" />
          </TouchableOpacity>

          {/* Disappearing Timer Button */}
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setIsTimerModalOpen(true)}
          >
            <Clock size={20} color={disappearDuration > 0 ? '#ec4899' : theme.mutedText} />
          </TouchableOpacity>

          {/* Settings Menu Button */}
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setIsSettingsMenuOpen(true)}
          >
            <MoreVertical size={20} color={theme.mutedText} />
          </TouchableOpacity>
        </View>

        {/* Messages FlatList */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={{ marginTop: 10, color: theme.mutedText, fontSize: 13, fontWeight: '600' }}>
              Chugli...
            </Text>
          </View>
        ) : initError && !chatId ? (
          <View style={[styles.centerContainer, { paddingHorizontal: 24 }]}>
            <AlertCircle size={44} color="#ef4444" />
            <Text style={{ marginTop: 12, color: theme.foreground, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
              {initError}
            </Text>
            <TouchableOpacity
              style={[styles.initRetryBtn, { backgroundColor: theme.accent }]}
              onPress={() => initChat()}
              activeOpacity={0.8}
            >
              <RefreshCw size={16} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.initRetryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
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
              const senderId = typeof item.sender === 'object' ? item.sender?._id : item.sender;
              const isMe = senderId === currentUserId;

              return (
                <TouchableOpacity
                  style={[
                    styles.messageBubble,
                    isMe
                      ? [styles.myBubble, { backgroundColor: theme.bubbleSent }]
                      : [
                          styles.theirBubble,
                          { backgroundColor: theme.bubbleReceived, borderColor: theme.border },
                        ],
                  ]}
                  onLongPress={() => setSelectedMsgForAction(item)}
                  activeOpacity={0.9}
                >
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

                  {/* Text Content */}
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

                  {/* Footer Row (Time + Read Receipt + Disappear Countdown) */}
                  <View style={styles.bubbleFooter}>
                    {item.expiresAt ? (
                      <Text style={styles.disappearTimerText}>
                        ⏳ {formatCountdown(item.expiresAt)}
                      </Text>
                    ) : null}

                    <Text
                      style={[
                        styles.timeText,
                        {
                          color: isMe ? `${theme.bubbleSentText}aa` : theme.mutedText,
                        },
                      ]}
                    >
                      {formatMessageTime(item.createdAt)}
                    </Text>

                    {isMe ? (
                      <View style={{ marginLeft: 4 }}>
                        <CheckCheck
                          size={15}
                          color={item.isRead ? '#38bdf8' : `${theme.bubbleSentText}70`}
                        />
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Attached Media Previews Bar */}
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

        {/* Emoji Picker Drawer */}
        {isEmojiPickerOpen ? (
          <EmojiPicker
            onSelectEmoji={(emoji) => setText((prev) => prev + emoji)}
          />
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
                onPress={() => {
                  setIsEmojiPickerOpen(false);
                  startRecording();
                }}
              >
                <Mic size={22} color={theme.mutedText} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  setIsEmojiPickerOpen((prev) => !prev);
                }}
              >
                <Smile
                  size={22}
                  color={isEmojiPickerOpen ? theme.accent : theme.mutedText}
                />
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
                placeholder="Type a message..."
                placeholderTextColor={theme.mutedText}
                value={text}
                onChangeText={handleTextChange}
                onFocus={() => setIsEmojiPickerOpen(false)}
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  { backgroundColor: theme.accent },
                  (!text.trim() && attachedMedia.length === 0 && !sending) && styles.disabledSend,
                ]}
                onPress={() => {
                  setIsEmojiPickerOpen(false);
                  handleSendMessage();
                }}
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

        {/* Settings Menu Modal */}
        <Modal visible={isSettingsMenuOpen} animationType="fade" transparent>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsSettingsMenuOpen(false)}
          >
            <View style={[styles.menuModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={styles.menuOptionRow}
                onPress={() => {
                  setIsSettingsMenuOpen(false);
                  setIsTimerModalOpen(true);
                }}
              >
                <Clock size={18} color="#ec4899" />
                <Text style={[styles.menuOptionText, { color: theme.foreground }]}>
                  Disappearing Messages ({disappearDuration ? `${disappearDuration}h` : 'Off'})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOptionRow} onPress={handleClearChat}>
                <Trash2 size={18} color="#ef4444" />
                <Text style={[styles.menuOptionText, { color: '#ef4444' }]}>Clear Chat History</Text>
              </TouchableOpacity>

              {!isSelfChat ? (
                <TouchableOpacity style={styles.menuOptionRow} onPress={handleRemoveFriend}>
                  <UserX size={18} color="#ef4444" />
                  <Text style={[styles.menuOptionText, { color: '#ef4444' }]}>Remove Friend</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Disappearing Timer Modal */}
        <Modal visible={isTimerModalOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.foreground }]}>
                Disappearing Messages
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.mutedText }]}>
                New messages will auto-delete after the selected duration.
              </Text>

              {DISAPPEAR_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.timerOptionRow,
                    { backgroundColor: theme.muted, borderColor: theme.border },
                    disappearDuration === opt.value && styles.timerOptionSelected,
                  ]}
                  onPress={() => {
                    setDisappearDuration(opt.value);
                    setIsTimerModalOpen(false);
                    showToast(`Timer set to ${opt.label}`, 'success');
                  }}
                >
                  <Clock size={18} color={disappearDuration === opt.value ? '#ec4899' : theme.mutedText} />
                  <Text style={[styles.timerOptionText, { color: theme.foreground }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.closeBtn} onPress={() => setIsTimerModalOpen(false)}>
                <Text style={[styles.closeBtnText, { color: theme.mutedText }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Message Options Modal (Delete for me / Delete for everyone) */}
        <Modal visible={!!selectedMsgForAction} animationType="fade" transparent>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedMsgForAction(null)}
          >
            <View style={[styles.modalContentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.foreground }]}>Message Options</Text>

              <TouchableOpacity
                style={[styles.deleteOptionRow, { backgroundColor: theme.muted }]}
                onPress={() => selectedMsgForAction && handleDeleteMessage(selectedMsgForAction, false)}
              >
                <Trash2 size={18} color="#ef4444" />
                <Text style={styles.deleteText}>Delete for me</Text>
              </TouchableOpacity>

              {selectedMsgForAction?.sender === currentUserId ||
              (typeof selectedMsgForAction?.sender === 'object' &&
                selectedMsgForAction?.sender?._id === currentUserId) ? (
                <TouchableOpacity
                  style={[styles.deleteOptionRow, { backgroundColor: theme.muted, marginTop: 8 }]}
                  onPress={() => selectedMsgForAction && handleDeleteMessage(selectedMsgForAction, true)}
                >
                  <Trash2 size={18} color="#ef4444" />
                  <Text style={styles.deleteText}>Delete for everyone</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedMsgForAction(null)}>
                <Text style={[styles.closeBtnText, { color: theme.mutedText }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Together Quick Invite Modal */}
        <Modal visible={isTogetherModalOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.foreground }]}>
                Invite to Together Session ✨
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.mutedText }]}>
                Choose an experience to start with {selectedFriend?.username || 'your friend'}:
              </Text>

              <TouchableOpacity
                style={[styles.togetherOptionCard, { backgroundColor: theme.muted, borderColor: theme.border }]}
                onPress={() => handleInviteTogether('game', 'tictactoe')}
              >
                <Gamepad2 size={24} color="#8b5cf6" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.togetherOptionTitle, { color: theme.foreground }]}>Play Games</Text>
                  <Text style={[styles.togetherOptionDesc, { color: theme.mutedText }]}>
                    Tic-Tac-Toe, RPS, Connect 4, Memory, Quiz
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.togetherOptionCard, { backgroundColor: theme.muted, borderColor: theme.border }]}
                onPress={() => handleInviteTogether('watch')}
              >
                <Tv size={24} color="#ef4444" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.togetherOptionTitle, { color: theme.foreground }]}>Watch Together</Text>
                  <Text style={[styles.togetherOptionDesc, { color: theme.mutedText }]}>
                    Synchronized video streaming
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.togetherOptionCard, { backgroundColor: theme.muted, borderColor: theme.border }]}
                onPress={() => handleInviteTogether('music')}
              >
                <Music size={24} color="#06b6d4" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.togetherOptionTitle, { color: theme.foreground }]}>Listen Together</Text>
                  <Text style={[styles.togetherOptionDesc, { color: theme.mutedText }]}>
                    Synchronized music tracks
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.togetherOptionCard, { backgroundColor: theme.muted, borderColor: theme.border }]}
                onPress={() => handleInviteTogether('activity')}
              >
                <Heart size={24} color="#ec4899" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.togetherOptionTitle, { color: theme.foreground }]}>Couple Activities</Text>
                  <Text style={[styles.togetherOptionDesc, { color: theme.mutedText }]}>
                    Would You Rather, Truth or Dare, Quizzes
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setIsTogetherModalOpen(false)}>
                <Text style={[styles.closeBtnText, { color: theme.mutedText }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Themed Confirmation Dialogs */}
        <UIConfirmDialog
          visible={showRemoveFriendConfirm}
          title="Remove Friend?"
          description={`Are you sure you want to remove ${selectedFriend?.username || 'this user'} from your friends list?`}
          confirmText="Remove"
          cancelText="Cancel"
          variant="danger"
          iconType="delete"
          onConfirm={handleConfirmRemoveFriend}
          onCancel={() => setShowRemoveFriendConfirm(false)}
        />

        <UIConfirmDialog
          visible={showClearChatConfirm}
          title="Clear Chat History?"
          description="Are you sure you want to permanently clear all messages in this conversation?"
          confirmText="Clear Chat"
          cancelText="Cancel"
          variant="danger"
          iconType="delete"
          onConfirm={handleConfirmClearChat}
          onCancel={() => setShowClearChatConfirm(false)}
        />

        {/* Fullscreen Media Viewer Modal */}
        <MediaViewerModal
          visible={viewerModalVisible}
          mediaUrls={viewerMediaList}
          initialIndex={viewerIndex}
          onClose={() => setViewerModalVisible(false)}
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
  initRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
    marginTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  initRetryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  topBar: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backButton: {
    padding: 6,
  },
  userHeaderRow: {
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
  usernameText: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  togetherBtn: {
    padding: 8,
    borderRadius: 20,
    marginRight: 4,
  },
  headerIconBtn: {
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
  },
  disappearTimerText: {
    fontSize: 10,
    color: '#ec4899',
    fontWeight: '700',
    marginRight: 6,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuModalCard: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 220,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  menuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  menuOptionText: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  timerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  timerOptionSelected: {
    borderColor: '#ec4899',
    backgroundColor: 'rgba(236,72,153,0.1)',
  },
  timerOptionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  deleteOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },
  togetherOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  togetherOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  togetherOptionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
