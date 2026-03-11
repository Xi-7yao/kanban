import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { boardKeys } from '../queries/queryKeys';
import { useLock } from '../contexts/LockContext';
import type { BoardData } from '../queries/useBoardQuery';
import type { Column, Id, Task } from '../types';

type BoardEvent =
  | { type: 'card:created'; card: Task }
  | { type: 'card:updated'; cardId: number; changes: Partial<Task> }
  | { type: 'card:deleted'; cardId: number; columnId: number }
  | { type: 'card:moved'; cardId: number; fromColumnId: number; toColumnId: number; order: number }
  | { type: 'column:created'; column: Column }
  | { type: 'column:updated'; columnId: number; changes: Partial<Column> }
  | { type: 'column:deleted'; columnId: number }
  | { type: 'user:editing'; cardId: number }
  | { type: 'user:stopEditing'; cardId: number };

function sortTaskIdsByOrder(taskIds: Id[], taskMap: Record<Id, Task>): Id[] {
  return [...taskIds].sort((a, b) => {
    const aOrder = taskMap[a]?.order ?? 0;
    const bOrder = taskMap[b]?.order ?? 0;
    return aOrder - bOrder;
  });
}

function patchBoardData(current: BoardData, event: BoardEvent): BoardData {
  switch (event.type) {
    case 'card:created': {
      const card = event.card;
      const taskMap = { ...current.taskMap, [card.id]: card };
      const nextIds = current.columnTaskIds[card.columnId] ?? [];
      const columnTaskIds = {
        ...current.columnTaskIds,
        [card.columnId]: sortTaskIdsByOrder(
          [...nextIds.filter((id) => id !== card.id), card.id],
          taskMap,
        ),
      };
      return { ...current, taskMap, columnTaskIds };
    }

    case 'card:updated': {
      const existing = current.taskMap[event.cardId];
      if (!existing) return current;
      const updatedTask = { ...existing, ...event.changes };
      const taskMap = { ...current.taskMap, [event.cardId]: updatedTask };
      const columnTaskIds = {
        ...current.columnTaskIds,
        [updatedTask.columnId]: sortTaskIdsByOrder(current.columnTaskIds[updatedTask.columnId] ?? [], taskMap),
      };
      return { ...current, taskMap, columnTaskIds };
    }

    case 'card:moved': {
      const existing = current.taskMap[event.cardId];
      if (!existing) return current;
      const movedTask = { ...existing, columnId: event.toColumnId, order: event.order };
      const taskMap = { ...current.taskMap, [event.cardId]: movedTask };
      const fromIds = (current.columnTaskIds[event.fromColumnId] ?? []).filter((id) => id !== event.cardId);
      const toIdsBase = (current.columnTaskIds[event.toColumnId] ?? []).filter((id) => id !== event.cardId);
      const columnTaskIds = {
        ...current.columnTaskIds,
        [event.fromColumnId]: fromIds,
        [event.toColumnId]: sortTaskIdsByOrder([...toIdsBase, event.cardId], taskMap),
      };
      return { ...current, taskMap, columnTaskIds };
    }

    case 'card:deleted': {
      const taskMap = { ...current.taskMap };
      delete taskMap[event.cardId];
      const columnTaskIds = {
        ...current.columnTaskIds,
        [event.columnId]: (current.columnTaskIds[event.columnId] ?? []).filter((id) => id !== event.cardId),
      };
      return { ...current, taskMap, columnTaskIds };
    }

    case 'column:created': {
      const nextColumns = [...current.columns.filter((c) => c.id !== event.column.id), event.column].sort(
        (a, b) => a.order - b.order,
      );
      const columnTaskIds = {
        ...current.columnTaskIds,
        [event.column.id]: current.columnTaskIds[event.column.id] ?? [],
      };
      return { ...current, columns: nextColumns, columnTaskIds };
    }

    case 'column:updated': {
      const nextColumns = current.columns
        .map((column) => (column.id === event.columnId ? { ...column, ...event.changes } : column))
        .sort((a, b) => a.order - b.order);
      return { ...current, columns: nextColumns };
    }

    case 'column:deleted': {
      const columns = current.columns.filter((column) => column.id !== event.columnId);
      const columnTaskIds = { ...current.columnTaskIds };
      delete columnTaskIds[event.columnId];
      const taskMap = Object.fromEntries(
        Object.entries(current.taskMap).filter(([, task]) => task.columnId !== event.columnId),
      ) as Record<Id, Task>;
      return { columns, columnTaskIds, taskMap };
    }

    default:
      return current;
  }
}

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
    let hasConnectedOnce = false;

    socket.on('connect', () => {
      if (hasConnectedOnce) {
        queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
      }
      hasConnectedOnce = true;
    });

    socket.on('connect_error', (err) => {
      console.error('[WebSocket] connection error:', err.message);
    });

    socket.on('board:event', (event: BoardEvent) => {
      switch (event.type) {
        case 'card:created':
        case 'card:deleted':
        case 'card:moved':
        case 'column:created':
        case 'column:updated':
        case 'column:deleted':
        case 'card:updated': {
          const existing = queryClient.getQueryData<BoardData>(boardKeys.columns());
          if (!existing) {
            queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
            break;
          }

          queryClient.setQueryData<BoardData>(boardKeys.columns(), (current) => {
            if (!current) return current;
            return patchBoardData(current, event);
          });
          break;
        }

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
