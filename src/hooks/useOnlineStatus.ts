import { useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { onlineUsersAtom } from '../states/States';
import { getSocket } from './useSocket';

export function useOnlineStatus() {
  const [onlineUsers, setOnlineUsers] = useAtom(onlineUsersAtom);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Immediately request current online users snapshot
    socket.emit('getOnlineUsers');

    const handleOnlineUsers = (users: any) => {
      if (Array.isArray(users)) {
        const normalized = users
          .map((u: any) => String(typeof u === 'object' ? u?.userId || u?._id : u))
          .filter(Boolean);
        setOnlineUsers(normalized);
      }
    };

    const handleUserOnline = (data: any) => {
      const id = String(typeof data === 'object' ? data?.userId || data?._id : data);
      if (id && id !== 'undefined') {
        setOnlineUsers((prev) => Array.from(new Set([...prev, id])));
      }
    };

    const handleUserOffline = (data: any) => {
      const id = String(typeof data === 'object' ? data?.userId || data?._id : data);
      if (id && id !== 'undefined') {
        setOnlineUsers((prev) => prev.filter((item) => item !== id));
      }
    };

    socket.on('getOnlineUsers', handleOnlineUsers);
    socket.on('onlineUsers', handleOnlineUsers);
    socket.on('userOnline', handleUserOnline);
    socket.on('userOffline', handleUserOffline);

    return () => {
      socket.off('getOnlineUsers', handleOnlineUsers);
      socket.off('onlineUsers', handleOnlineUsers);
      socket.off('userOnline', handleUserOnline);
      socket.off('userOffline', handleUserOffline);
    };
  }, [setOnlineUsers]);

  const isUserOnline = useCallback(
    (userId?: string) => {
      if (!userId) return false;
      return onlineUsers.includes(String(userId));
    },
    [onlineUsers]
  );

  return { onlineUsers, isUserOnline };
}
