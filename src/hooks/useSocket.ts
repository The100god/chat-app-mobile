import { default as io, Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { getDefaultStore } from 'jotai';
import { getApiUrl } from '../utils/apiUrl';
import { onlineUsersAtom } from '../states/States';

const store = getDefaultStore();

let socket: Socket<DefaultEventsMap, DefaultEventsMap> | null = null;
let currentUserId: string | null = null;

export const connectSocket = (
  userId: string | null
): Socket<DefaultEventsMap, DefaultEventsMap> | null => {
  if (userId) {
    currentUserId = userId;
  }

  if (!socket && userId) {
    socket = io(getApiUrl(), {
      auth: { userId },
      query: { userId },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      if (currentUserId && socket) {
        socket.emit('join', currentUserId);
        socket.emit('getOnlineUsers');
      }
    });

    socket.on('getOnlineUsers', (users: string[]) => {
      if (Array.isArray(users)) {
        store.set(onlineUsersAtom, users);
      }
    });

    socket.on('userOnline', (onlineId: string) => {
      if (onlineId) {
        store.set(onlineUsersAtom, (prev) =>
          Array.from(new Set([...prev, String(onlineId)]))
        );
      }
    });

    socket.on('userOffline', (offlineId: string) => {
      if (offlineId) {
        store.set(onlineUsersAtom, (prev) =>
          prev.filter((id) => id !== String(offlineId))
        );
      }
    });

    socket.emit('join', userId);
    socket.emit('getOnlineUsers');
  } else if (userId && socket) {
    socket.emit('join', userId);
    socket.emit('getOnlineUsers');
  }

  return socket;
};

export const getSocket = (): Socket<
  DefaultEventsMap,
  DefaultEventsMap
> | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentUserId = null;
    store.set(onlineUsersAtom, []);
  }
};
