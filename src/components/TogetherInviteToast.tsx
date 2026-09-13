import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { useAtom } from 'jotai';
import { useRouter } from 'expo-router';
import {
  togetherInvitesAtom,
  togetherRoomAtom,
  userIdAtom,
  isAppLockedAtom,
  pendingTogetherInviteAtom,
} from '../states/States';
import { useTogetherRoom } from '../hooks/useTogetherRoom';
import { useTheme } from '../context/ThemeContext';
import {
  Sparkles,
  Gamepad2,
  Tv,
  Music,
  Heart,
  X,
  Check,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function TogetherInviteToast() {
  const router = useRouter();
  const { theme } = useTheme();
  const [invites] = useAtom(togetherInvitesAtom);
  const [room] = useAtom(togetherRoomAtom);
  const [userId] = useAtom(userIdAtom);
  const [isAppLocked] = useAtom(isAppLockedAtom);
  const [, setPendingInvite] = useAtom(pendingTogetherInviteAtom);
  const { joinRoom, declineInvite } = useTogetherRoom();

  if (room) return null;

  const validInvites = (invites || []).filter((i) => i.hostId !== userId);
  if (validInvites.length === 0) return null;

  const latestInvite = validInvites[0];

  const handleAccept = () => {
    const roomId = latestInvite.roomId;
    if (isAppLocked) {
      setPendingInvite({ roomId });
    } else {
      joinRoom(roomId);
      router.push(`/(app)/together/${roomId}`);
    }
  };

  const handleDecline = () => {
    declineInvite(latestInvite.roomId);
  };

  const renderIcon = () => {
    switch (latestInvite.roomType) {
      case 'game':
        return <Gamepad2 size={16} color="#8b5cf6" />;
      case 'watch':
        return <Tv size={16} color="#ef4444" />;
      case 'music':
        return <Music size={16} color="#06b6d4" />;
      case 'activity':
        return <Heart size={16} color="#ec4899" />;
      default:
        return <Sparkles size={16} color={theme.accent} />;
    }
  };

  return (
    <View style={styles.toastContainer} pointerEvents="box-none">
      <View
        style={[
          styles.toastCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.accent,
            shadowColor: theme.foreground,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDecline}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color={theme.mutedText} />
        </TouchableOpacity>

        <View style={styles.headerRow}>
          {latestInvite.hostProfilePic ? (
            <Image
              source={{ uri: latestInvite.hostProfilePic }}
              style={styles.hostAvatar}
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.accent }]}>
              <Text style={styles.avatarInitial}>
                {latestInvite.hostUsername ? latestInvite.hostUsername.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}

          <View style={styles.infoCol}>
            <View style={styles.typeBadgeRow}>
              {renderIcon()}
              <Text style={[styles.typeBadgeText, { color: theme.accent }]}>
                Together Invite ({latestInvite.roomType.toUpperCase()})
              </Text>
            </View>
            <Text style={[styles.inviteMessage, { color: theme.foreground }]} numberOfLines={2}>
              <Text style={{ fontWeight: '700' }}>{latestInvite.hostUsername}</Text> invited you to join a session!
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: theme.accent }]}
            onPress={handleAccept}
          >
            <Check size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.acceptBtnText}>Join Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.declineBtn, { backgroundColor: theme.muted, borderColor: theme.border }]}
            onPress={handleDecline}
          >
            <X size={16} color={theme.mutedText} style={{ marginRight: 4 }} />
            <Text style={[styles.declineBtnText, { color: theme.mutedText }]}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  toastCard: {
    width: Math.min(width - 32, 400),
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingRight: 24,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 18,
    fontWeight: '700',
  },
  infoCol: {
    marginLeft: 12,
    flex: 1,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inviteMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
