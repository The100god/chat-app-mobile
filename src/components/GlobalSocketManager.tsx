import React, { useEffect, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { usePathname } from 'expo-router';
import {
  userIdAtom,
  friendsAtom,
  groupsAtom,
  Friend,
  Group,
} from '../states/States';
import { getSocket, connectSocket } from '../hooks/useSocket';
import { showToast } from './Toast';
import { apiFetch } from '../utils/apiFetch';
import { getApiUrl } from '../utils/apiUrl';

export const GlobalSocketManager: React.FC = () => {
  const [userId] = useAtom(userIdAtom);
  const [, setFriends] = useAtom(friendsAtom);
  const [, setGroups] = useAtom(groupsAtom);
  const pathname = usePathname();
  const currentPathRef = useRef(pathname);

  useEffect(() => {
    currentPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!userId) return;

    // Ensure socket is connected and registered for this user
    const socket = connectSocket(userId);
    if (!socket) return;

    // 1. Initial friend list with unread counts
    socket.emit('getFriendListWithUnseen', { userId });

    // 2. Fetch initial groups with unread counts
    const fetchGroups = async () => {
      try {
        const res = await apiFetch(`${getApiUrl()}/api/groups/${userId}`);
        if (res.ok) {
          const data = await res.json();
          const validGroups = Array.isArray(data) ? data : [];
          setGroups(validGroups);
        }
      } catch (err) {
        console.warn('Error fetching user groups in GlobalSocketManager:', err);
      }
    };
    fetchGroups();

    // 3. Listeners for real-time unread count updates
    const handleFriendsUpdated = (updatedFriends: Friend[]) => {
      if (Array.isArray(updatedFriends)) {
        setFriends(updatedFriends);
      }
    };

    const handleUnseenCountUpdate = ({
      friendId,
      count,
    }: {
      friendId: string;
      count: number;
    }) => {
      const fIdStr = String(friendId);
      setFriends((prevFriends) => {
        const friendExists = prevFriends.some(
          (f) => String(f.friendId || (f as any)._id) === fIdStr
        );
        if (!friendExists) {
          socket.emit('getFriendListWithUnseen', { userId });
          return prevFriends;
        }
        return prevFriends.map((f) =>
          String(f.friendId || (f as any)._id) === fIdStr
            ? { ...f, unreadMessagesCount: Math.max(0, count) }
            : f
        );
      });
    };

    const handleGroupUnreadUpdate = ({
      groupId,
      count,
    }: {
      groupId: string;
      count: number;
    }) => {
      const gIdStr = String(groupId);
      setGroups((prevGroups) => {
        const groupExists = prevGroups.some((g) => String(g._id) === gIdStr);
        if (!groupExists) {
          fetchGroups();
          return prevGroups;
        }
        return prevGroups.map((g) =>
          String(g._id) === gIdStr ? { ...g, unreadCount: Math.max(0, count) } : g
        );
      });
    };

    // 4. Real-time incoming Direct Message notification & badge increment
    const handleNewMessage = (msg: any) => {
      if (!msg) return;
      const senderId = typeof msg.sender === 'object' ? msg.sender?._id : msg.sender;
      if (senderId && String(senderId) !== String(userId)) {
        const senderName =
          typeof msg.sender === 'object' ? msg.sender?.username : 'A friend';
        const contentPreview = msg.content
          ? msg.content.length > 50
            ? msg.content.substring(0, 50) + '...'
            : msg.content
          : msg.media && msg.media.length > 0
          ? 'Sent a photo/media 📷'
          : 'New message';

        const sIdStr = String(senderId);
        // Check if user is currently in direct chat with this friend
        const isCurrentlyInChat =
          currentPathRef.current &&
          currentPathRef.current.includes(`/chat/${sIdStr}`);

        if (!isCurrentlyInChat) {
          showToast(`💬 ${senderName}: ${contentPreview}`, 'info', 5000);

          // Optimistically increment unread count for this friend in friendsAtom
          setFriends((prev) => {
            const friendExists = prev.some(
              (f) => String(f.friendId || (f as any)._id) === sIdStr
            );
            if (!friendExists) {
              socket.emit('getFriendListWithUnseen', { userId });
              return prev;
            }
            return prev.map((f) =>
              String(f.friendId || (f as any)._id) === sIdStr
                ? { ...f, unreadMessagesCount: (f.unreadMessagesCount || 0) + 1 }
                : f
            );
          });
        }

        // Re-request fresh unread counts
        socket.emit('getFriendListWithUnseen', { userId });
      }
    };

    // 5. Real-time incoming Group Message notification & badge increment
    const handleNewGroupMessage = (msg: any) => {
      if (!msg) return;
      const senderId = typeof msg.sender === 'object' ? msg.sender?._id : msg.sender;
      const groupId = typeof msg.groupId === 'object' ? msg.groupId?._id : (msg.groupId || msg.group);
      if (senderId && String(senderId) !== String(userId)) {
        const senderName =
          typeof msg.sender === 'object' ? msg.sender?.username : 'Member';
        const groupTitle = msg.groupName || 'Group';
        const contentPreview = msg.content
          ? msg.content.length > 40
            ? msg.content.substring(0, 40) + '...'
            : msg.content
          : msg.media && msg.media.length > 0
          ? 'Sent a photo/media 📷'
          : 'Sent an attachment 📎';

        const gIdStr = groupId ? String(groupId) : null;
        const isCurrentlyInGroup =
          gIdStr &&
          currentPathRef.current &&
          currentPathRef.current.includes(`/group/${gIdStr}`);

        if (!isCurrentlyInGroup) {
          showToast(`👥 [${groupTitle}] ${senderName}: ${contentPreview}`, 'info', 5000);

          // Increment unread count for this group in groupsAtom
          if (gIdStr) {
            setGroups((prev) => {
              const groupExists = prev.some((g) => String(g._id) === gIdStr);
              if (!groupExists) {
                fetchGroups();
                return prev;
              }
              return prev.map((g) =>
                String(g._id) === gIdStr
                  ? { ...g, unreadCount: (g.unreadCount || 0) + 1 }
                  : g
              );
            });
          }
        }
      }
    };

    socket.on('friendsUpdated', handleFriendsUpdated);
    socket.on('unreadMessageCountUpdated', handleUnseenCountUpdate);
    socket.on('update_unseen_count', handleUnseenCountUpdate);
    socket.on('groupUnreadCountUpdated', handleGroupUnreadUpdate);
    socket.on('newMessage', handleNewMessage);
    socket.on('newGroupMessage', handleNewGroupMessage);

    return () => {
      socket.off('friendsUpdated', handleFriendsUpdated);
      socket.off('unreadMessageCountUpdated', handleUnseenCountUpdate);
      socket.off('update_unseen_count', handleUnseenCountUpdate);
      socket.off('groupUnreadCountUpdated', handleGroupUnreadUpdate);
      socket.off('newMessage', handleNewMessage);
      socket.off('newGroupMessage', handleNewGroupMessage);
    };
  }, [userId, setFriends, setGroups]);

  return null;
};
