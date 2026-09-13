import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { UIConfirmDialog } from '../UIModal';
import { useTheme } from '../../context/ThemeContext';
import { useTogetherRoom } from '../../hooks/useTogetherRoom';
import { useAtom } from 'jotai';
import { useRouter } from 'expo-router';
import { userIdAtom, friendsAtom, userAtom, unreadCountAtom, groupUnreadTotalAtom } from '../../states/States';
import { TogetherGameId } from '../../states/togetherTypes';
import {
  LogOut,
  X,
  Copy,
  Check,
  Users,
  Crown,
  Gamepad2,
  Tv,
  Music,
  Heart,
  ArrowRightLeft,
  MessageSquare,
} from 'lucide-react-native';

import { MobileTicTacToeBoard } from './boards/MobileTicTacToeBoard';
import { MobileRPSBoard } from './boards/MobileRPSBoard';
import { MobileConnect4Board } from './boards/MobileConnect4Board';
import { MobileMemoryMatchBoard } from './boards/MobileMemoryMatchBoard';
import { MobileDrawingBoard } from './boards/MobileDrawingBoard';
import { MobileQuizBoard } from './boards/MobileQuizBoard';
import { MobileCatchPartnerBoard } from './boards/MobileCatchPartnerBoard';
import { MobileActivityBoard } from './boards/MobileActivityBoard';
import { MobileWatchBoard } from './boards/MobileWatchBoard';
import { MobileListenBoard } from './boards/MobileListenBoard';
import { MobileGameSelector, GAMES_REGISTRY } from './MobileGameSelector';
import { TogetherChatBox, TogetherComment } from './TogetherChatBox';
import { showToast } from '../Toast';

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; emoji: string }
> = {
  game: { label: 'Game Room', color: '#8b5cf6', emoji: '🎮' },
  watch: { label: 'Watch Together', color: '#ef4444', emoji: '🎬' },
  music: { label: 'Listen Together', color: '#06b6d4', emoji: '🎵' },
  activity: { label: 'Couple Activity', color: '#ec4899', emoji: '❤️' },
};

interface TogetherRoomShellProps {
  onExit?: () => void;
}

export const TogetherRoomShell: React.FC<TogetherRoomShellProps> = ({ onExit }) => {
  const { theme } = useTheme();
  const [userId] = useAtom(userIdAtom);
  const [friends] = useAtom(friendsAtom);
  const [currentUser] = useAtom(userAtom);
  const [unreadCount] = useAtom(unreadCountAtom);
  const [groupUnreadTotal] = useAtom(groupUnreadTotalAtom);
  const totalUnread = unreadCount + groupUnreadTotal;
  const router = useRouter();

  const { room, isHost, leaveRoom, closeRoom, switchGame, emit } = useTogetherRoom();
  const [isChangingGame, setIsChangingGame] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'leave' | 'close' | null>(null);

  if (!room) return null;

  const config = TYPE_CONFIG[room.type] || TYPE_CONFIG.game;
  const gameDef = room.gameId
    ? GAMES_REGISTRY.find((g) => g.id === room.gameId)
    : undefined;

  const partnerId = room.participants.find((p) => p !== userId);
  const partnerFriend = friends.find((f) => f.friendId === partnerId);
  const partnerName = partnerFriend?.username || (room.participants.length > 1 ? 'Partner' : 'Waiting...');

  const handleCopyRoomId = () => {
    setCopied(true);
    showToast(`Room ID copied: #${room.roomId.slice(-6)}`, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeavePress = () => {
    setConfirmAction('leave');
  };

  const handleClosePress = () => {
    setConfirmAction('close');
  };

  const handleConfirmAction = () => {
    if (confirmAction === 'close') {
      setConfirmAction(null);
      closeRoom();
      onExit?.();
    } else if (confirmAction === 'leave') {
      setConfirmAction(null);
      leaveRoom();
      onExit?.();
    }
  };

  const getParticipantName = (pid: string) => {
    if (pid === userId) return 'You';
    const friend = friends.find((f) => f.friendId === pid);
    return friend?.username || 'User';
  };

  const getRoomComments = (): TogetherComment[] => {
    const stateObj = room.state || {};
    const commentsList =
      room.type === 'game'
        ? stateObj.ticTacToe?.comments ||
          stateObj.rps?.comments ||
          stateObj.connect4?.comments ||
          stateObj.memoryMatch?.comments ||
          stateObj.drawing?.comments ||
          stateObj.quiz?.comments ||
          stateObj.catchPartner?.comments ||
          stateObj.comments
        : room.type === 'activity'
        ? stateObj.activity?.comments || stateObj.comments
        : stateObj.comments;

    return Array.isArray(commentsList) ? (commentsList as TogetherComment[]) : [];
  };

  const handleSendComment = (text: string) => {
    const senderName = currentUser?.username || (userId === room.hostId ? 'Host' : 'Partner');
    if (room.type === 'game') {
      emit('together:game:comment', {
        roomId: room.roomId,
        gameId: room.gameId,
        text,
        username: senderName,
      });
    } else if (room.type === 'activity') {
      emit('together:activity:comment', {
        roomId: room.roomId,
        text,
        username: senderName,
      });
    } else {
      emit('together:room:comment', {
        roomId: room.roomId,
        text,
        username: senderName,
      });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {/* Compact Room Header */}
      <View style={[styles.headerBanner, { backgroundColor: config.color }]}>
        <View style={styles.headerLeft}>
          {gameDef ? (
            <Image source={gameDef.iconAsset} style={styles.headerGameIcon} />
          ) : (
            <Text style={{ fontSize: 20 }}>{config.emoji}</Text>
          )}
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {gameDef ? gameDef.title : config.label}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {totalUnread > 0 && (
            <TouchableOpacity
              style={styles.unreadChatBtn}
              onPress={() => router.push('/(app)/(tabs)')}
              activeOpacity={0.8}
            >
              <MessageSquare size={12} color="#ffffff" />
              <Text style={styles.unreadChatText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
            </TouchableOpacity>
          )}

          {room.type === 'game' && (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setIsChangingGame(!isChangingGame)}
            >
              <ArrowRightLeft size={13} color="#ffffff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.headerBtn} onPress={handleCopyRoomId}>
            <Text style={styles.roomIdMono}>#{room.roomId.slice(-6)}</Text>
            {copied ? <Check size={12} color="#ffffff" /> : <Copy size={12} color="#ffffff" />}
          </TouchableOpacity>

          <View style={styles.usersPill}>
            <Users size={12} color="#ffffff" />
            <Text style={styles.usersCountText}>{room.participants.length}</Text>
          </View>
        </View>
      </View>

      {/* Waiting for Partner Invitation Overlay */}
      {room.participants.length < 2 ? (
        <View style={[styles.waitingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.waitingPulseCircle, { backgroundColor: `${config.color}20` }]}>
            <Users size={32} color={config.color} />
          </View>
          <Text style={[styles.waitingTitle, { color: theme.foreground }]}>Waiting for Partner</Text>
          <Text style={[styles.waitingDesc, { color: theme.mutedText }]}>
            Waiting for your friend to accept or join the invitation.
          </Text>
          <TouchableOpacity
            style={[styles.cancelRoomBtn, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }]}
            onPress={isHost ? closeRoom : leaveRoom}
          >
            <X size={14} color="#ef4444" style={{ marginRight: 4 }} />
            <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>
              Cancel Session
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Game Rooms */}
          {room.type === 'game' && (
            <View style={{ width: '100%' }}>
              {!room.gameId || isChangingGame ? (
                <View style={[styles.switchGameSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.switchGameHeader}>
                    <Text style={[styles.switchGameTitle, { color: theme.foreground }]}>
                      {room.gameId ? 'Select New Game for Room' : 'Choose a Game to Play!'}
                    </Text>
                    {room.gameId && (
                      <TouchableOpacity
                        style={styles.cancelSwitchBtn}
                        onPress={() => setIsChangingGame(false)}
                      >
                        <X size={14} color={theme.foreground} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <MobileGameSelector
                    selectedGameId={room.gameId}
                    userStats={room.sessionStats}
                    currentUserId={userId || undefined}
                    onSelectGame={(newGameId) => {
                      switchGame(newGameId);
                      setIsChangingGame(false);
                    }}
                  />
                </View>
              ) : (
                <>
                  {room.gameId === 'tictactoe' && (
                    <MobileTicTacToeBoard
                      room={room}
                      currentUserId={userId || ''}
                      partnerName={partnerName}
                      onEmit={emit}
                      onLeaveGame={() => setIsChangingGame(true)}
                    />
                  )}
                  {room.gameId === 'rps' && (
                    <MobileRPSBoard
                      room={room}
                      currentUserId={userId || ''}
                      partnerName={partnerName}
                      onEmit={emit}
                      onLeaveGame={() => setIsChangingGame(true)}
                    />
                  )}
                  {room.gameId === 'connect4' && (
                    <MobileConnect4Board
                      room={room}
                      currentUserId={userId || ''}
                      partnerName={partnerName}
                      onEmit={emit}
                      onLeaveGame={() => setIsChangingGame(true)}
                    />
                  )}
                  {room.gameId === 'memory' && (
                    <MobileMemoryMatchBoard
                      room={room}
                      currentUserId={userId || ''}
                      partnerName={partnerName}
                      onEmit={emit}
                      onLeaveGame={() => setIsChangingGame(true)}
                    />
                  )}
                  {room.gameId === 'drawing' && (
                    <MobileDrawingBoard
                      room={room}
                      currentUserId={userId || ''}
                      partnerName={partnerName}
                      onEmit={emit}
                      onLeaveGame={() => setIsChangingGame(true)}
                    />
                  )}
                  {room.gameId === 'quiz' && (
                    <MobileQuizBoard
                      room={room}
                      currentUserId={userId || ''}
                      partnerName={partnerName}
                      onEmit={emit}
                      onLeaveGame={() => setIsChangingGame(true)}
                    />
                  )}
                  {room.gameId === 'catchpartner' && (
                    <MobileCatchPartnerBoard
                      room={room}
                      currentUserId={userId || ''}
                      partnerName={partnerName}
                      onEmit={emit}
                      onLeaveGame={() => setIsChangingGame(true)}
                    />
                  )}
                </>
              )}
            </View>
          )}

          {/* Activity Rooms */}
          {room.type === 'activity' && (
            <MobileActivityBoard
              room={room}
              currentUserId={userId || ''}
              partnerName={partnerName}
              onEmit={emit}
              onLeaveRoom={leaveRoom}
            />
          )}

          {/* Watch Rooms */}
          {room.type === 'watch' && (
            <MobileWatchBoard
              room={room}
              currentUserId={userId || ''}
              onEmit={emit}
              onLeaveRoom={leaveRoom}
            />
          )}

          {/* Music Rooms */}
          {room.type === 'music' && (
            <MobileListenBoard
              room={room}
              currentUserId={userId || ''}
              onEmit={emit}
              onLeaveRoom={leaveRoom}
            />
          )}

          {/* Room Live WhatsApp Chat for Games & Activities */}
          {(room.type === 'game' || room.type === 'activity') && (
            <TogetherChatBox
              comments={getRoomComments()}
              currentUserId={userId || ''}
              hostId={room.hostId}
              onSendMessage={handleSendComment}
              title={`${room.type === 'game' ? 'Game' : 'Activity'} Room Live Chat`}
              accentColor={room.type === 'game' ? '#8b5cf6' : '#ec4899'}
              collapsible={true}
              defaultExpanded={true}
            />
          )}
        </>
      )}

      {/* Participants Card */}
      <View style={[styles.participantsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.participantsHeader}>
          <Users size={16} color={theme.foreground} />
          <Text style={[styles.participantsTitle, { color: theme.foreground }]}>
            Participants ({room.participants.length})
          </Text>
        </View>

        <View style={styles.participantsList}>
          {room.participants.map((pid) => {
            const isSelf = pid === userId;
            const isParticipantHost = pid === room.hostId;
            const name = getParticipantName(pid);

            return (
              <View
                key={pid}
                style={[styles.participantRow, { backgroundColor: theme.input, borderColor: theme.border }]}
              >
                <View style={styles.participantLeft}>
                  <View style={[styles.participantAvatar, { backgroundColor: config.color }]}>
                    <Text style={styles.avatarInitialText}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.participantNameText, { color: theme.foreground }]}>
                    {name} {isSelf && '(You)'}
                  </Text>
                </View>

                {isParticipantHost && (
                  <View style={styles.hostBadge}>
                    <Crown size={11} color="#f59e0b" style={{ marginRight: 3 }} />
                    <Text style={styles.hostBadgeText}>Host</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Action Exit Buttons Footer */}
      <View style={styles.exitFooter}>
        {isHost ? (
          <TouchableOpacity style={styles.closeBtn} onPress={handleClosePress}>
            <X size={15} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={styles.closeBtnText}>Close Room for Everyone</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeavePress}>
            <LogOut size={15} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={styles.leaveBtnText}>Leave Room Session</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Themed Confirmation Modal */}
      <UIConfirmDialog
        visible={confirmAction !== null}
        title={confirmAction === 'close' ? 'Close Room for Everyone?' : 'Leave Room Session?'}
        description={
          confirmAction === 'close'
            ? 'This will end the session and disconnect all participants.'
            : 'You will leave this room session. You can rejoin if the host keeps it open.'
        }
        confirmText={confirmAction === 'close' ? 'Close Room' : 'Leave'}
        cancelText="Cancel"
        variant="danger"
        iconType={confirmAction === 'close' ? 'delete' : 'logout'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    padding: 12,
    alignItems: 'center',
    gap: 12,
    paddingBottom: 40,
  },
  headerBanner: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerGameIcon: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  headerTitleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomIdMono: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  unreadChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  unreadChatText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  usersPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  usersCountText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  waitingCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
  },
  waitingPulseCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  waitingDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  cancelRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  switchGameSection: {
    width: '100%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  switchGameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  switchGameTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  cancelSwitchBtn: {
    padding: 4,
  },
  participantsCard: {
    width: '100%',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantsTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  participantsList: {
    gap: 6,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  participantNameText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  hostBadgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '800',
  },
  exitFooter: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  closeBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  leaveBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
});
