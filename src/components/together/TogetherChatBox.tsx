import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import {
  MessageSquare,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  Smile,
} from 'lucide-react-native';

export interface TogetherComment {
  id: string;
  senderId?: string;
  userId?: string;
  username?: string;
  text: string;
  timestamp: number;
}

interface TogetherChatBoxProps {
  comments: TogetherComment[];
  currentUserId: string;
  hostId: string;
  onSendMessage: (text: string) => void;
  title?: string;
  accentColor?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

const QUICK_REACTIONS = [
  '🔥 Wow',
  '😂 Haha',
  '❤️ Love it',
  '😱 Omg',
  '👏 Bravo',
  '🎉 Yay',
  '💯 100',
  '✨ Perfect',
];

const EMOJI_PALETTE = ['❤️', '😂', '🔥', '👏', '😍', '🎉', '👍', '✨', '🥺', '💯', '🥰', '🥳'];

export const TogetherChatBox: React.FC<TogetherChatBoxProps> = ({
  comments = [],
  currentUserId,
  hostId,
  onSendMessage,
  title = 'Together Live Chat',
  accentColor = '#8b5cf6',
  collapsible = true,
  defaultExpanded = true,
}) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);

  // Floating ambient emoji animation values
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.timing(floatAnim1, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const loop2 = Animated.loop(
      Animated.timing(floatAnim2, {
        toValue: 1,
        duration: 12000,
        delay: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop1.start();
    loop2.start();

    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [floatAnim1, floatAnim2]);

  // Auto-scroll on new message
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [comments.length, isExpanded]);

  const handleSend = (overrideText?: string) => {
    const text = overrideText !== undefined ? overrideText : inputText;
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    if (overrideText === undefined) {
      setInputText('');
      setShowEmojiPicker(false);
    }
  };

  const formatTime = (ts: number) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const translateY1 = floatAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [140, -40],
  });
  const translateY2 = floatAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [140, -40],
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {/* WhatsApp Header */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.header,
          { backgroundColor: theme.muted, borderBottomColor: theme.border },
        ]}
        onPress={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.avatarIconCircle,
              { backgroundColor: accentColor },
            ]}
          >
            <MessageSquare size={16} color="#ffffff" />
          </View>
          <View style={styles.headerTitleWrap}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text>
              <View style={styles.liveDot} />
            </View>
            <Text style={[styles.subtitle, { color: theme.mutedText }]}>
              Live Chat • {comments.length} message{comments.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.syncedBadge, { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}40` }]}>
            <Text style={[styles.syncedText, { color: accentColor }]}>Synced</Text>
          </View>
          {collapsible && (
            <View style={{ marginLeft: 6 }}>
              {isExpanded ? (
                <ChevronUp size={18} color={theme.mutedText} />
              ) : (
                <ChevronDown size={18} color={theme.mutedText} />
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.body}>
          {/* Quick Reactions Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickReactionsScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.quickPrefix}>
              <Sparkles size={12} color={accentColor} />
              <Text style={[styles.quickPrefixText, { color: theme.mutedText }]}>QUICK</Text>
            </View>
            {QUICK_REACTIONS.map((emojiText) => (
              <TouchableOpacity
                key={emojiText}
                style={[
                  styles.quickPill,
                  { backgroundColor: theme.input, borderColor: theme.border },
                ]}
                onPress={() => handleSend(emojiText)}
              >
                <Text style={[styles.quickPillText, { color: theme.foreground }]}>
                  {emojiText}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Chat Messages Stream */}
          <View style={[styles.messagesArea, { backgroundColor: theme.background }]}>
            {/* Background Ambient Floating Emojis */}
            <Animated.Text
              style={[
                styles.floatingAmbientEmoji,
                { transform: [{ translateY: translateY1 }], left: '15%' },
              ]}
            >
              💬
            </Animated.Text>
            <Animated.Text
              style={[
                styles.floatingAmbientEmoji,
                { transform: [{ translateY: translateY2 }], left: '75%' },
              ]}
            >
              ❤️
            </Animated.Text>

            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesScrollContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {comments.length === 0 ? (
                <View style={styles.emptyState}>
                  <MessageSquare size={26} color={accentColor} style={{ opacity: 0.7, marginBottom: 4 }} />
                  <Text style={[styles.emptyText, { color: theme.mutedText }]}>
                    No messages in room yet.
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.mutedText }]}>
                    Say hi or tap a quick reaction!
                  </Text>
                </View>
              ) : (
                comments.map((c) => {
                  const isCurrentUser =
                    (c.senderId && c.senderId === currentUserId) ||
                    (c.userId && c.userId === currentUserId) ||
                    c.username === 'You' ||
                    c.username === 'Me' ||
                    c.username === currentUserId ||
                    (c.username === 'Host' && currentUserId === hostId) ||
                    (c.username === 'Partner' && currentUserId !== hostId);

                  return (
                    <View
                      key={c.id}
                      style={[
                        styles.bubbleRow,
                        isCurrentUser ? styles.bubbleRowSent : styles.bubbleRowReceived,
                      ]}
                    >
                      <View
                        style={[
                          styles.bubble,
                          isCurrentUser
                            ? [styles.bubbleSent, { backgroundColor: '#059669' }]
                            : [
                                styles.bubbleReceived,
                                { backgroundColor: theme.card, borderColor: theme.border },
                              ],
                        ]}
                      >
                        {!isCurrentUser && (
                          <Text style={[styles.senderName, { color: accentColor }]}>
                            {c.username || 'Partner'}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.messageText,
                            { color: isCurrentUser ? '#ffffff' : theme.foreground },
                          ]}
                        >
                          {c.text}
                        </Text>
                        <View style={styles.bubbleFooter}>
                          <Text
                            style={[
                              styles.timestampText,
                              { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : theme.mutedText },
                            ]}
                          >
                            {formatTime(c.timestamp)}
                          </Text>
                          {isCurrentUser && (
                            <CheckCheck size={12} color="#38bdf8" style={{ marginLeft: 3 }} />
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Emoji Shortcut Drawer */}
          {showEmojiPicker && (
            <View style={[styles.emojiDrawer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow} keyboardShouldPersistTaps="handled">
                {EMOJI_PALETTE.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiBtn}
                    onPress={() => setInputText((prev) => prev + emoji)}
                  >
                    <Text style={styles.emojiChar}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* WhatsApp Input Bar */}
          <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={styles.emojiToggleBtn}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={20} color={showEmojiPicker ? accentColor : theme.mutedText} />
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
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              blurOnSubmit={false}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: accentColor, opacity: inputText.trim() ? 1 : 0.4 },
              ]}
              onPress={() => handleSend()}
              disabled={!inputText.trim()}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Send size={15} color="#ffffff" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  subtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  syncedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  body: {
    width: '100%',
  },
  quickReactionsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  quickPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  quickPrefixText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quickPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  messagesArea: {
    height: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  floatingAmbientEmoji: {
    position: 'absolute',
    fontSize: 20,
    opacity: 0.08,
  },
  messagesScroll: {
    flex: 1,
    paddingHorizontal: 12,
  },
  messagesScrollContent: {
    paddingVertical: 10,
    gap: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 10,
    marginTop: 2,
  },
  bubbleRow: {
    width: '100%',
    flexDirection: 'row',
  },
  bubbleRowSent: {
    justifyContent: 'flex-end',
  },
  bubbleRowReceived: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  bubbleSent: {
    borderTopRightRadius: 2,
  },
  bubbleReceived: {
    borderTopLeftRadius: 2,
    borderWidth: 1,
  },
  senderName: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 12,
    lineHeight: 16,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  timestampText: {
    fontSize: 9,
  },
  emojiDrawer: {
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  emojiRow: {
    paddingHorizontal: 10,
    gap: 8,
  },
  emojiBtn: {
    padding: 6,
  },
  emojiChar: {
    fontSize: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  emojiToggleBtn: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 12,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
