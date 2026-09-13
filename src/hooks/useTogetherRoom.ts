import { useEffect, useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  togetherRoomAtom,
  userIdAtom,
  togetherInvitesAtom,
  activeWorkspaceAtom,
} from '../states/States';
import { getSocket, connectSocket } from './useSocket';
import {
  TogetherRoom,
  TogetherRoomType,
  TogetherGameId,
  TogetherActivityId,
  TogetherInvite,
} from '../states/togetherTypes';
import { showToast } from '../components/Toast';

export function useTogetherRoom() {
  const [room, setRoom] = useAtom(togetherRoomAtom);
  const [userId] = useAtom(userIdAtom);
  const [invites, setInvites] = useAtom(togetherInvitesAtom);
  const setActiveWorkspace = useSetAtom(activeWorkspaceAtom);

  const getActiveSocket = useCallback(() => {
    let socket = getSocket();
    if (!socket && userId) {
      socket = connectSocket(userId);
    }
    return socket;
  }, [userId]);

  useEffect(() => {
    if (userId) {
      connectSocket(userId);
    }
  }, [userId]);

  const dismissInvite = useCallback(
    (roomId: string) => {
      setInvites((prev) => prev.filter((i) => i.roomId !== roomId));
    },
    [setInvites]
  );

  const declineInvite = useCallback(
    (roomId: string) => {
      const socket = getActiveSocket();
      if (socket) {
        socket.emit('together:declineInvite', { roomId });
      }
      dismissInvite(roomId);
    },
    [getActiveSocket, dismissInvite]
  );

  const joinRoom = useCallback(
    (roomId: string) => {
      const socket = getActiveSocket();
      if (!socket) return;
      socket.emit('together:join', { roomId });
      dismissInvite(roomId);
      setActiveWorkspace('together');
    },
    [getActiveSocket, setActiveWorkspace, dismissInvite]
  );

  const fetchRejoinableRooms = useCallback(() => {
    const socket = getActiveSocket();
    if (socket) {
      socket.emit('together:getRejoinableRooms');
    }
  }, [getActiveSocket]);

  // Attach socket event listeners
  useEffect(() => {
    const socket = getActiveSocket();
    if (!socket) return;

    if ((socket as any)._togetherListenersAttached) {
      return;
    }
    (socket as any)._togetherListenersAttached = true;

    const handleState = (roomState: TogetherRoom | null) => {
      setRoom(roomState);
      if (roomState?.roomId) {
        setInvites((prev) => prev.filter((i) => i.roomId !== roomState.roomId));
      }
    };

    const handleCreated = (roomState: TogetherRoom) => {
      setRoom(roomState);
      if (roomState?.roomId) {
        setInvites((prev) => prev.filter((i) => i.roomId !== roomState.roomId));
      }
    };

    const handleClosed = (data?: { roomId?: string; reason?: string }) => {
      setRoom(null);
      if (data?.roomId) {
        setInvites((prev) => prev.filter((i) => i.roomId !== data.roomId));
      }
      if (data?.reason === 'invite_declined') {
        showToast('Invitation was declined. Room closed.', 'info');
      }
    };

    const handleRoomClosed = (data: { roomId: string }) => {
      if (data?.roomId) {
        setInvites((prev) => prev.filter((i) => i.roomId !== data.roomId));
      }
    };

    const handleError = (data: { message: string }) => {
      console.error('Together error:', data.message);
      showToast(data.message || 'An error occurred with Together room', 'error');
    };

    const handleInviteReceived = (rawInvite: {
      roomId: string;
      roomType: string;
      hostId: string;
      hostUsername: string;
      hostProfilePic?: string;
    }) => {
      if (userId && String(rawInvite.hostId) === String(userId)) return;

      const inviteObj: TogetherInvite = {
        ...rawInvite,
        createdAt: Date.now(),
      };
      setInvites((prev) => {
        const filtered = prev.filter(
          (i) =>
            i.roomId !== inviteObj.roomId &&
            (userId ? String(i.hostId) !== String(userId) : true)
        );
        return [inviteObj, ...filtered];
      });
    };

    const handleRejoinableRooms = (rejoinableList: TogetherInvite[]) => {
      if (!Array.isArray(rejoinableList)) return;
      setInvites((prev) => {
        const combined = prev.filter(
          (i) => (userId ? String(i.hostId) !== String(userId) : true)
        );
        for (const item of rejoinableList) {
          const isOwnRoom = userId ? String(item.hostId) === String(userId) : false;
          if (!isOwnRoom && !combined.some((i) => i.roomId === item.roomId)) {
            combined.push(item);
          }
        }
        return combined;
      });
    };

    const handleConnect = () => {
      socket.emit('together:getState', { roomId: null });
      socket.emit('together:getRejoinableRooms');
    };

    socket.on('connect', handleConnect);
    socket.on('together:state', handleState);
    socket.on('together:created', handleCreated);
    socket.on('together:closed', handleClosed);
    socket.on('together:roomClosed', handleRoomClosed);
    socket.on('together:error', handleError);
    socket.on('together:inviteReceived', handleInviteReceived);
    socket.on('together:rejoinableRooms', handleRejoinableRooms);

    handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('together:state', handleState);
      socket.off('together:created', handleCreated);
      socket.off('together:closed', handleClosed);
      socket.off('together:roomClosed', handleRoomClosed);
      socket.off('together:error', handleError);
      socket.off('together:inviteReceived', handleInviteReceived);
      socket.off('together:rejoinableRooms', handleRejoinableRooms);
      delete (socket as any)._togetherListenersAttached;
    };
  }, [userId, getActiveSocket, setRoom, setInvites]);

  const createRoom = useCallback(
    (
      type: TogetherRoomType,
      arg2?: string,
      arg3?: string
    ) => {
      const socket = getActiveSocket();
      if (!socket) return;

      const VALID_GAMES_ACTIVITIES = [
        'tictactoe',
        'rps',
        'connect4',
        'memory',
        'drawing',
        'quiz',
        'catchpartner',
        'would_you_rather',
        'truth_or_dare',
        'this_or_that',
        'daily_question',
        'couple_questions',
      ];
      let gameId: string | undefined = undefined;
      let targetUserId: string | undefined = undefined;

      if (arg2 && VALID_GAMES_ACTIVITIES.includes(arg2)) {
        gameId = arg2;
        targetUserId = arg3;
      } else if (arg3 && VALID_GAMES_ACTIVITIES.includes(arg3)) {
        targetUserId = arg2;
        gameId = arg3;
      } else {
        gameId = arg2;
        targetUserId = arg3;
      }

      socket.emit('together:create', { type, gameId, targetUserId });
    },
    [getActiveSocket]
  );

  const updateState = useCallback(
    (patch: Record<string, unknown>) => {
      const socket = getActiveSocket();
      if (!socket || !room) return;
      socket.emit('together:update', { roomId: room.roomId, patch });
    },
    [room, getActiveSocket]
  );

  const leaveRoom = useCallback(() => {
    const socket = getActiveSocket();
    if (!socket || !room) return;
    socket.emit('together:leave', { roomId: room.roomId });
    setRoom(null);
    fetchRejoinableRooms();
  }, [room, getActiveSocket, setRoom, fetchRejoinableRooms]);

  const closeRoom = useCallback(() => {
    const socket = getActiveSocket();
    if (!socket || !room) return;
    socket.emit('together:close', { roomId: room.roomId });
    setRoom(null);
  }, [room, getActiveSocket, setRoom]);

  const switchGame = useCallback(
    (gameId: string) => {
      const socket = getActiveSocket();
      if (!socket || !room) return;
      socket.emit('together:switchGame', { roomId: room.roomId, gameId });
    },
    [room, getActiveSocket]
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      const socket = getActiveSocket();
      if (!socket || !room) return;
      socket.emit('together:room:reaction', { roomId: room.roomId, emoji });
    },
    [room, getActiveSocket]
  );

  const sendComment = useCallback(
    (text: string, username?: string) => {
      const socket = getActiveSocket();
      if (!socket || !room) return;
      socket.emit('together:room:comment', {
        roomId: room.roomId,
        text,
        username,
      });
    },
    [room, getActiveSocket]
  );

  const emit = useCallback(
    (event: string, data?: any) => {
      const socket = getActiveSocket();
      if (!socket) return;
      socket.emit(event, data);
    },
    [getActiveSocket]
  );

  const isHost = room?.hostId === userId;

  return {
    room,
    isHost,
    invites,
    dismissInvite,
    declineInvite,
    fetchRejoinableRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    closeRoom,
    switchGame,
    updateState,
    sendReaction,
    sendComment,
    emit,
  };
}
