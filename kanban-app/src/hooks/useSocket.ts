import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { boardKeys } from '../queries/queryKeys';
import { useLock } from '../contexts/LockContext';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const { acquire, release } = useLock();
  const lockRef = useRef({ acquire, release });

  useEffect(() => {
    lockRef.current = { acquire, release };
  }, [acquire, release]);

  useEffect(() => {
    const socket = io('http://localhost:3000/board', { withCredentials: true });

    socket.on('connect', () => {
      console.log('[WebSocket] 握手成功, socketId =', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('[WebSocket] 握手失败:', err.message);
    });

    socket.on('board:event', (event) => {
      console.log('[WebSocket] 收到事件:', event);
      switch (event.type) {
        case 'card:created':
        case 'card:deleted':
        case 'card:moved':
        case 'column:created':
        case 'column:updated':
        case 'column:deleted':
        case 'card:updated':
          queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
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
      socket.disconnect();
    };
  }, [queryClient]);

  return socketRef;
}
