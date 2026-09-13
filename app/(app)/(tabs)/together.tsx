import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import { useTheme } from '../../../src/context/ThemeContext';
import {
  togetherRoomAtom,
  togetherInvitesAtom,
  friendsAtom,
  Friend,
  userIdAtom,
} from '../../../src/states/States';
import { useTogetherRoom } from '../../../src/hooks/useTogetherRoom';
import {
  TogetherRoomType,
  TogetherGameId,
  TogetherActivityId,
} from '../../../src/states/togetherTypes';
import { MobileGameSelector } from '../../../src/components/together/MobileGameSelector';
import { MobileActivitySelector } from '../../../src/components/together/MobileActivitySelector';
import {
  Gamepad2,
  Tv,
  Music,
  Heart,
  Plus,
  ArrowRight,
  Sparkles,
  X,
  LogIn,
  Check,
  RotateCcw,
  Send,
  Users,
  UserCheck,
} from 'lucide-react-native';

type TogetherSection = 'home' | 'games' | 'watch' | 'listen' | 'activities';

interface SectionInfo {
  id: TogetherSection;
  label: string;
  emoji: string;
  roomType: TogetherRoomType;
  color: string;
}

const SECTIONS: SectionInfo[] = [
  { id: 'home', label: 'Home', emoji: '🏠', roomType: 'game', color: '#8b5cf6' },
  { id: 'games', label: 'Games', emoji: '🎮', roomType: 'game', color: '#8b5cf6' },
  { id: 'watch', label: 'Watch', emoji: '🎬', roomType: 'watch', color: '#ef4444' },
  { id: 'listen', label: 'Listen', emoji: '🎵', roomType: 'music', color: '#06b6d4' },
  { id: 'activities', label: 'Activities', emoji: '❤️', roomType: 'activity', color: '#ec4899' },
];

export default function TogetherTab() {
  const router = useRouter();
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState<TogetherSection>('home');

  const [activeRoom] = useAtom(togetherRoomAtom);
  const [invites] = useAtom(togetherInvitesAtom);
  const [currentUserId] = useAtom(userIdAtom);
  const [friends] = useAtom<Friend[]>(friendsAtom);
  const { createRoom, joinRoom, declineInvite } = useTogetherRoom();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState('');

  const [pendingType, setPendingType] = useState<TogetherRoomType>('game');
  const [selectedGameId, setSelectedGameId] = useState<TogetherGameId | undefined>(undefined);
  const [selectedActivityId, setSelectedActivityId] = useState<TogetherActivityId | undefined>(undefined);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  // Exclude current user from selectable friends
  const selectableFriends = (friends || []).filter(
    (f) => String(f.friendId) !== String(currentUserId) && String((f as any)._id || '') !== String(currentUserId)
  );

  // Auto-navigate to room detail when a new room is created or joined
  const prevRoomIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeRoom?.roomId && activeRoom.roomId !== prevRoomIdRef.current) {
      prevRoomIdRef.current = activeRoom.roomId;
      router.push(`/(app)/together/${activeRoom.roomId}`);
    } else if (!activeRoom) {
      prevRoomIdRef.current = null;
    }
  }, [activeRoom?.roomId, router]);

  const handleOpenCreateModal = (
    type: TogetherRoomType,
    gameId?: TogetherGameId,
    activityId?: TogetherActivityId
  ) => {
    setPendingType(type);
    setSelectedGameId(gameId);
    setSelectedActivityId(activityId || (type === 'activity' ? 'would_you_rather' : undefined));
    setSelectedFriendId(selectableFriends.length > 0 ? selectableFriends[0].friendId : null);
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreate = (inviteFriend: boolean) => {
    const targetUserId = inviteFriend && selectedFriendId ? selectedFriendId : undefined;
    const gameOrActId =
      pendingType === 'activity'
        ? selectedActivityId || 'would_you_rather'
        : pendingType === 'game'
        ? selectedGameId
        : undefined;

    createRoom(pendingType, gameOrActId, targetUserId);
    setIsCreateModalOpen(false);
  };

  const handleManualJoin = () => {
    if (!joinRoomInput.trim()) return;
    const cleanId = joinRoomInput.trim().replace('#', '');
    joinRoom(cleanId);
    setIsJoinModalOpen(false);
    setJoinRoomInput('');
    router.push(`/(app)/together/${cleanId}`);
  };

  const handleAcceptInvite = (roomId: string) => {
    joinRoom(roomId);
    setIsJoinModalOpen(false);
    router.push(`/(app)/together/${roomId}`);
  };

  const validInvites = (invites || []).filter((i) => i.hostId !== currentUserId);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Together Sections Navigation Bar */}
      <View
        style={[
          styles.sectionTabBar,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionTabScroll}>
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            const secInviteCount = (invites || []).filter((i) => i.roomType === sec.roomType).length;
            const hasInvites = sec.id !== 'home' && secInviteCount > 0;

            return (
              <TouchableOpacity
                key={sec.id}
                style={[
                  styles.sectionTabPill,
                  { backgroundColor: theme.muted, borderColor: theme.border },
                  isActive && {
                    backgroundColor: `${sec.color}20`,
                    borderColor: sec.color,
                  },
                ]}
                onPress={() => setActiveSection(sec.id)}
              >
                <Text style={styles.sectionEmoji}>{sec.emoji}</Text>
                <Text
                  style={[
                    styles.sectionTabLabel,
                    { color: theme.mutedText },
                    isActive && { color: sec.color, fontWeight: '700' },
                  ]}
                >
                  {sec.label}
                </Text>
                {hasInvites && (
                  <View style={[styles.inviteBadge, { backgroundColor: sec.color }]}>
                    <Text style={styles.inviteBadgeText}>{secInviteCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Active Session in Progress Banner */}
        {activeRoom ? (
          <TouchableOpacity
            style={[styles.activeRoomCard, { backgroundColor: theme.accent }]}
            onPress={() => router.push(`/(app)/together/${activeRoom.roomId}`)}
          >
            <View style={styles.activeRoomIconCircle}>
              <Sparkles size={22} color="#ffffff" />
            </View>
            <View style={styles.activeRoomInfo}>
              <Text style={styles.activeRoomTitle}>Active Session in Progress</Text>
              <Text style={styles.activeRoomSubtitle}>
                {activeRoom.type.toUpperCase()} • Room #{activeRoom.roomId.slice(-6)}
              </Text>
            </View>
            <ArrowRight size={20} color="#ffffff" />
          </TouchableOpacity>
        ) : null}

        {/* Pending Invitations Section */}
        {validInvites.length > 0 ? (
          <View style={styles.invitesSection}>
            <Text style={[styles.sectionHeading, { color: theme.foreground }]}>
              Pending Invitations ({validInvites.length})
            </Text>
            {validInvites.map((inv) => (
              <View
                key={inv.roomId}
                style={[
                  styles.inviteCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.inviteInfoRow}>
                  {inv.hostProfilePic ? (
                    <Image source={{ uri: inv.hostProfilePic }} style={styles.inviteAvatar} />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: theme.accent }]}>
                      <Text style={styles.avatarInitial}>
                        {inv.hostUsername.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={[styles.inviteHost, { color: theme.foreground }]}>
                      {inv.hostUsername}
                    </Text>
                    <Text style={[styles.inviteType, { color: theme.mutedText }]}>
                      Invited you to {inv.roomType.toUpperCase()} session
                    </Text>
                  </View>
                </View>

                <View style={styles.inviteBtnsRow}>
                  <TouchableOpacity
                    style={[styles.joinBtn, { backgroundColor: theme.accent }]}
                    onPress={() => handleAcceptInvite(inv.roomId)}
                  >
                    <Check size={14} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.joinBtnText}>Accept</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.declineBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
                    onPress={() => declineInvite(inv.roomId)}
                  >
                    <X size={14} color={theme.mutedText} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* SECTION 1: HOME */}
        {activeSection === 'home' && (
          <View>
            <View style={styles.welcomeHero}>
              <View style={[styles.heroIconBox, { backgroundColor: `${theme.accent}20` }]}>
                <Sparkles size={36} color={theme.accent} />
              </View>
              <Text style={[styles.heroTitle, { color: theme.foreground }]}>
                Together Hub ✨
              </Text>
              <Text style={[styles.heroSubtitle, { color: theme.mutedText }]}>
                Strengthen your connection. Play games, watch synchronized videos, listen to music, and engage in couple activities together in real-time.
              </Text>

              {/* Quick Actions */}
              <View style={styles.heroActionBtns}>
                <TouchableOpacity
                  style={[styles.heroCreateBtn, { backgroundColor: theme.accent }]}
                  onPress={() => handleOpenCreateModal('game')}
                >
                  <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.heroCreateBtnText}>Create Room</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.heroJoinBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
                  onPress={() => setIsJoinModalOpen(true)}
                >
                  <LogIn size={16} color={theme.foreground} style={{ marginRight: 6 }} />
                  <Text style={[styles.heroJoinBtnText, { color: theme.foreground }]}>Join Room</Text>
                  {validInvites.length > 0 && (
                    <View style={[styles.heroJoinBadge, { backgroundColor: theme.accent }]}>
                      <Text style={styles.heroJoinBadgeText}>{validInvites.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Feature Grid */}
            <View style={styles.quickGrid}>
              <TouchableOpacity
                style={[styles.quickCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => handleOpenCreateModal('game')}
              >
                <View style={[styles.iconBox, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                  <Gamepad2 size={24} color="#8b5cf6" />
                </View>
                <Text style={[styles.quickCardTitle, { color: theme.foreground }]}>Play Games 🎮</Text>
                <Text style={[styles.quickCardDesc, { color: theme.mutedText }]}>
                  TicTacToe, RPS, Connect 4, Memory, Quiz, Drawing, Pakdam Pakdai
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => handleOpenCreateModal('activity', undefined, 'would_you_rather')}
              >
                <View style={[styles.iconBox, { backgroundColor: 'rgba(236,72,153,0.15)' }]}>
                  <Heart size={24} color="#ec4899" />
                </View>
                <Text style={[styles.quickCardTitle, { color: theme.foreground }]}>Couple Activities ❤️</Text>
                <Text style={[styles.quickCardDesc, { color: theme.mutedText }]}>
                  Would You Rather, Truth or Dare, This or That, Daily & Couple Questions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => handleOpenCreateModal('watch')}
              >
                <View style={[styles.iconBox, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                  <Tv size={24} color="#ef4444" />
                </View>
                <Text style={[styles.quickCardTitle, { color: theme.foreground }]}>Watch Together 🎬</Text>
                <Text style={[styles.quickCardDesc, { color: theme.mutedText }]}>
                  Synchronized video co-streaming with live play/pause/seek sync
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => handleOpenCreateModal('music')}
              >
                <View style={[styles.iconBox, { backgroundColor: 'rgba(6,182,212,0.15)' }]}>
                  <Music size={24} color="#06b6d4" />
                </View>
                <Text style={[styles.quickCardTitle, { color: theme.foreground }]}>Listen Together 🎵</Text>
                <Text style={[styles.quickCardDesc, { color: theme.mutedText }]}>
                  Synchronized playlist with lo-fi beats, acoustics, and live audio sync
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECTION 2: GAMES */}
        {activeSection === 'games' && (
          <MobileGameSelector
            onSelectGame={(gameId) => handleOpenCreateModal('game', gameId)}
          />
        )}

        {/* SECTION 3: WATCH */}
        {activeSection === 'watch' && (
          <View style={[styles.infoBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.bannerIconBox, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <Tv size={36} color="#ef4444" />
            </View>
            <Text style={[styles.bannerTitle, { color: theme.foreground }]}>Watch Together 🎬</Text>
            <Text style={[styles.bannerDesc, { color: theme.mutedText }]}>
              Watch video clips and movies in real-time with your partner. Play, pause, and seek stay perfectly in sync.
            </Text>
            <View style={styles.bannerActionsRow}>
              <TouchableOpacity
                style={[styles.startSessionBtn, { backgroundColor: '#ef4444' }]}
                onPress={() => handleOpenCreateModal('watch')}
              >
                <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.startSessionText}>Start Watch Room</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bannerJoinBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
                onPress={() => setIsJoinModalOpen(true)}
              >
                <LogIn size={16} color={theme.foreground} style={{ marginRight: 6 }} />
                <Text style={[styles.bannerJoinBtnText, { color: theme.foreground }]}>Join via ID</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECTION 4: LISTEN */}
        {activeSection === 'listen' && (
          <View style={[styles.infoBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.bannerIconBox, { backgroundColor: 'rgba(6,182,212,0.15)' }]}>
              <Music size={36} color="#06b6d4" />
            </View>
            <Text style={[styles.bannerTitle, { color: theme.foreground }]}>Listen Together 🎵</Text>
            <Text style={[styles.bannerDesc, { color: theme.mutedText }]}>
              Listen to curated lo-fi beats, acoustics, and custom tracks together with live playback synchronisation.
            </Text>
            <View style={styles.bannerActionsRow}>
              <TouchableOpacity
                style={[styles.startSessionBtn, { backgroundColor: '#06b6d4' }]}
                onPress={() => handleOpenCreateModal('music')}
              >
                <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.startSessionText}>Start Listen Room</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bannerJoinBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
                onPress={() => setIsJoinModalOpen(true)}
              >
                <LogIn size={16} color={theme.foreground} style={{ marginRight: 6 }} />
                <Text style={[styles.bannerJoinBtnText, { color: theme.foreground }]}>Join via ID</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SECTION 5: ACTIVITIES */}
        {activeSection === 'activities' && (
          <MobileActivitySelector
            onSelectActivity={(activityId) =>
              handleOpenCreateModal('activity', undefined, activityId)
            }
          />
        )}
      </ScrollView>

      {/* ─── CREATE TOGETHER SESSION MODAL ─── */}
      <Modal visible={isCreateModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Plus size={20} color={theme.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: theme.foreground }]}>
                  Create Together Session
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeCircleBtn, { backgroundColor: theme.muted }]}
                onPress={() => setIsCreateModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={theme.mutedText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubheading, { color: theme.mutedText }]}>
              Select the session type and a friend to invite into your Together session.
            </Text>

            {/* 1. Activity Type Grid */}
            <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
              1. Select Activity Type:
            </Text>
            <View style={styles.typeSelectorRow}>
              {SECTIONS.slice(1).map((sec) => {
                const isSelected = pendingType === sec.roomType;
                return (
                  <TouchableOpacity
                    key={sec.id}
                    style={[
                      styles.typeBtn,
                      { backgroundColor: theme.muted, borderColor: theme.border },
                      isSelected && {
                        backgroundColor: `${sec.color}20`,
                        borderColor: sec.color,
                      },
                    ]}
                    onPress={() => {
                      setPendingType(sec.roomType);
                      if (sec.roomType === 'game') {
                        setSelectedGameId(undefined);
                      } else if (sec.roomType === 'activity') {
                        setSelectedActivityId('would_you_rather');
                      }
                    }}
                  >
                    <Text style={{ fontSize: 18, marginBottom: 2 }}>{sec.emoji}</Text>
                    <Text
                      style={[
                        styles.typeBtnText,
                        { color: theme.mutedText },
                        isSelected && { color: sec.color, fontWeight: '700' },
                      ]}
                    >
                      {sec.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Friend Selector */}
            <Text style={[styles.fieldLabel, { color: theme.foreground, marginTop: 14 }]}>
              2. Select Friend to Invite:
            </Text>
            {selectableFriends.length > 0 ? (
              <ScrollView style={styles.friendsScroll}>
                {selectableFriends.map((friend) => {
                  const isSelected = selectedFriendId === friend.friendId;
                  return (
                    <TouchableOpacity
                      key={friend.friendId}
                      style={[
                        styles.friendItem,
                        { backgroundColor: theme.muted, borderColor: theme.border },
                        isSelected && {
                          backgroundColor: `${theme.accent}15`,
                          borderColor: theme.accent,
                        },
                      ]}
                      onPress={() => setSelectedFriendId(friend.friendId)}
                    >
                      {friend.profilePic ? (
                        <Image source={{ uri: friend.profilePic }} style={styles.friendAvatar} />
                      ) : (
                        <View style={[styles.avatarFallbackSmall, { backgroundColor: `${theme.accent}30` }]}>
                          <Text style={[styles.avatarInitialSmall, { color: theme.accent }]}>
                            {friend.username.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.friendName, { color: theme.foreground }]}>
                        {friend.username}
                      </Text>
                      {isSelected ? (
                        <UserCheck size={18} color={theme.accent} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={[styles.noFriendsBox, { backgroundColor: theme.muted }]}>
                <Users size={22} color={theme.mutedText} style={{ marginBottom: 4 }} />
                <Text style={[styles.noFriendsText, { color: theme.mutedText }]}>
                  No friends available to invite. You can still create a session and share the Room ID!
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActionButtons}>
              {selectableFriends.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: theme.accent },
                    !selectedFriendId && { opacity: 0.5 },
                  ]}
                  disabled={!selectedFriendId}
                  onPress={() => handleConfirmCreate(true)}
                >
                  <Send size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>
                    Create & Send Invite ({pendingType})
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
                onPress={() => handleConfirmCreate(false)}
              >
                <Text style={[styles.secondaryBtnText, { color: theme.foreground }]}>
                  Create Without Inviting ({pendingType})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── JOIN ROOM BY ID MODAL ─── */}
      <Modal visible={isJoinModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <LogIn size={20} color={theme.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: theme.foreground }]}>
                  Join Room
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeCircleBtn, { backgroundColor: theme.muted }]}
                onPress={() => setIsJoinModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={theme.mutedText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubheading, { color: theme.mutedText }]}>
              Rejoin an active room session, or enter a Room ID manually.
            </Text>

            {/* Rejoinable active rooms if available */}
            {validInvites.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.fieldLabel, { color: theme.accent, marginBottom: 8 }]}>
                  Active Sessions Open to Join ({validInvites.length}):
                </Text>
                <ScrollView style={{ maxHeight: 120 }}>
                  {validInvites.map((inv) => (
                    <View
                      key={inv.roomId}
                      style={[
                        styles.rejoinCard,
                        { backgroundColor: theme.muted, borderColor: theme.border },
                      ]}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.rejoinHost, { color: theme.foreground }]} numberOfLines={1}>
                          {inv.hostUsername}'s Room
                        </Text>
                        <Text style={[styles.rejoinType, { color: theme.mutedText }]}>
                          {inv.roomType.toUpperCase()} Session
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.rejoinBtn, { backgroundColor: theme.accent }]}
                        onPress={() => handleAcceptInvite(inv.roomId)}
                      >
                        <RotateCcw size={12} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={styles.rejoinBtnText}>Join</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Manual Room ID Input */}
            <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
              Or enter Room ID manually:
            </Text>
            <TextInput
              style={[
                styles.roomIdInput,
                { backgroundColor: theme.input, borderColor: theme.border, color: theme.foreground },
              ]}
              placeholder="Paste room ID (e.g. 4a9f2b189c4d)"
              placeholderTextColor={theme.mutedText}
              value={joinRoomInput}
              onChangeText={setJoinRoomInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.joinModalActions}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
                onPress={() => setIsJoinModalOpen(false)}
              >
                <Text style={[styles.cancelModalText, { color: theme.foreground }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmJoinBtn,
                  { backgroundColor: theme.accent },
                  !joinRoomInput.trim() && { opacity: 0.5 },
                ]}
                disabled={!joinRoomInput.trim()}
                onPress={handleManualJoin}
              >
                <Text style={styles.confirmJoinText}>Join via ID</Text>
              </TouchableOpacity>
            </View>
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
  sectionTabBar: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  sectionTabScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  sectionTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  sectionTabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inviteBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  inviteBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  activeRoomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  activeRoomIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeRoomInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activeRoomTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  activeRoomSubtitle: {
    color: '#ffffff',
    opacity: 0.9,
    fontSize: 12,
  },
  invitesSection: {
    marginBottom: 18,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  inviteCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  inviteInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inviteAvatar: {
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
    fontSize: 16,
    fontWeight: '700',
  },
  inviteHost: {
    fontSize: 14,
    fontWeight: '700',
  },
  inviteType: {
    fontSize: 12,
  },
  inviteBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  joinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  declineBtn: {
    width: 38,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  welcomeHero: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  heroIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },
  heroActionBtns: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  heroCreateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
  },
  heroCreateBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  heroJoinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  heroJoinBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  heroJoinBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  heroJoinBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  quickGrid: {
    gap: 12,
    marginBottom: 20,
  },
  quickCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickCardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  infoBanner: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  bannerIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  bannerDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  bannerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  startSessionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  startSessionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  bannerJoinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerJoinBtnText: {
    fontSize: 14,
    fontWeight: '600',
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
    padding: 22,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  closeCircleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubheading: {
    fontSize: 12,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeBtnText: {
    fontSize: 11,
  },
  friendsScroll: {
    maxHeight: 150,
    marginBottom: 14,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  friendAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  avatarFallbackSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitialSmall: {
    fontSize: 13,
    fontWeight: '700',
  },
  friendName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  noFriendsBox: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  noFriendsText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalActionButtons: {
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rejoinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  rejoinHost: {
    fontSize: 13,
    fontWeight: '700',
  },
  rejoinType: {
    fontSize: 11,
  },
  rejoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rejoinBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  roomIdInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  joinModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelModalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmJoinBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmJoinText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
