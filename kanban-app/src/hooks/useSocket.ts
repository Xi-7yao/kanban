import { useEffect, useRef, type MutableRefObject } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { boardKeys } from '../queries/queryKeys';
import { useLock } from '../contexts/LockContext';
import { API_BASE_URL } from '../config';
import type { BoardEvent } from '../queries/boardPatches';

type SocketBoardEvent =
  | BoardEvent
  | { type: 'user:editing'; cardId: number }
  | { type: 'user:stopEditing'; cardId: number };

type LockSyncPayload = {
  cardIds: number[];
};

export function useSocket(
  enabled = true,
  ownedLockIdsRef?: MutableRefObject<Set<string | number>>,
) {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const { acquire, release, sync } = useLock();
  const lockRef = useRef({ acquire, release, sync });

  useEffect(() => {
    lockRef.current = { acquire, release, sync };
  }, [acquire, release, sync]);

  useEffect(() => {
    if (!enabled) {
      socketRef.current = null;
      return;
    }

    const socket = io(`${API_BASE_URL}/board`, { withCredentials: true });

    socket.on('connect', () => {
      ownedLockIdsRef?.current.forEach((cardId) => {
        socket.emit('lock:acquire', cardId);
      });

      void queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
    });

    socket.on('connect_error', (err) => {
      console.error('[WebSocket] connection error:', err.message);
    });

    socket.on('locks:sync', (payload: LockSyncPayload) => {
      const ownedLocks = ownedLockIdsRef?.current ?? new Set<string | number>();
      const remoteLockKeys = payload.cardIds
        .filter((cardId) => !ownedLocks.has(cardId))
        .map((cardId) => `task-${cardId}`);

      lockRef.current.sync(remoteLockKeys);
    });

    socket.on('board:event', (event: SocketBoardEvent) => {
      switch (event.type) {
        case 'card:created':
        case 'card:deleted':
        case 'card:moved':
        case 'column:created':
        case 'column:updated':
        case 'column:deleted':
        case 'card:updated':
          void queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
          break;

        case 'user:editing':
          lockRef.current.acquire(`task-${event.cardId}`);
          break;

        case 'user:stopEditing':
          lockRef.current.release(`task-${event.cardId}`);
          break;
      }
    });

    socketRef.current = socket;
    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [enabled, ownedLockIdsRef, queryClient]);

  return socketRef;
}
