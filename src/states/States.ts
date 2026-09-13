import { atom } from 'jotai';
import { TogetherRoom, TogetherInvite } from './togetherTypes';

export interface GroupMember {
  _id: string;
  username: string;
  profilePic?: string;
  about?: string;
  email?: string;
}

export interface Group {
  _id: string;
  groupName: string;
  groupProfilePic?: string;
  description?: string;
  groupMember: GroupMember[];
  admins: (GroupMember | string)[];
  superAdmin: GroupMember | string | null;
  createdAt?: string;
  unreadCount?: number;
}

export interface Message {
  _id?: string;
  chatId?: string;
  groupId?: string;
  uploading?: boolean;
  sender?:
    | {
        _id: string;
        username: string;
        profilePic: string;
      }
    | string;
  receiver?: string | object;
  content?: string;
  media?: string[];
  createdAt?: string;
  isRead?: boolean;
  expiresAt?: string | null;
  seenBy?: {
    _id: string;
    username: string;
    profilePic: string;
  }[];
  deletedFor?: (string | { _id: string })[];
}

export interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
}

export interface User {
  username: string;
  email: string;
  profilePic: string;
  about: string;
}

export interface Friend {
  friendId: string;
  username: string;
  profilePic: string;
  unreadMessagesCount: number;
}

export const userAtom = atom<User>({
  username: 'User',
  email: 'user@example.com',
  profilePic: '',
  about: "Hey there! I'm using Chugli.",
});

export const activeWorkspaceAtom = atom<'chat' | 'together'>('chat');
export const togetherRoomAtom = atom<TogetherRoom | null>(null);
export const isAppLockedAtom = atom<boolean>(false);
export const pendingTogetherInviteAtom = atom<{ roomId: string; roomType?: string } | null>(null);
export const togetherInvitesAtom = atom<TogetherInvite[]>([]);
export const userIdAtom = atom<string | null>(null);
export const messageAtom = atom<Message[]>([]);
export const loadingMessageAtom = atom<boolean>(true);

export const findFriendAtom = atom<boolean>(false);
export const friendsRequestsAtom = atom<boolean>(false);
export const allFriendsAtom = atom<boolean>(false);
export const selectedFriendAtom = atom<Friend | null>(null);
export const friendsAtom = atom<Friend[]>([]);
export const onlineUsersAtom = atom<string[]>([]);

export const unreadCountAtom = atom<number>((get) => {
  const friends = get(friendsAtom);
  if (!Array.isArray(friends)) return 0;
  return friends.reduce(
    (total, friend) => total + (friend?.unreadMessagesCount || 0),
    0
  );
});

export const selectedGroupAtom = atom<Group | null>(null);
export const groupsAtom = atom<Group[]>([]);
export const groupUnreadTotalAtom = atom<number>((get) => {
  const groups = get(groupsAtom);
  if (!Array.isArray(groups)) return 0;
  return groups.reduce(
    (total, group) => total + (group?.unreadCount || 0),
    0
  );
});
export const disappearDurationAtom = atom<number>(24);

const emojiSet = [
  '💕', '😘', '😍', '💑', '💘', '💞', '💓', '❤️', '💖', '💝',
  '🌸', '🌷', '✨', '🔥', '🎉', '🌟', '🥳', '💌', '🌹', '🦋'
];

export const floatingEmojisAtom = atom<FloatingEmoji[]>(() => {
  return Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    emoji: emojiSet[Math.floor(Math.random() * emojiSet.length)],
    x: Math.random() * 80 + 10,
    y: Math.random() * 80 + 10,
    size: Math.random() * 1.5 + 1.2,
  }));
});
