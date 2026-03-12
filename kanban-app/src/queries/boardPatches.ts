import type { Column, Id, Task } from '../types';
import type { BoardData } from './useBoardQuery';

const DEFAULT_ORDER = 65536;
const ORDER_STEP = 1024;

export type BoardEvent =
  | { type: 'card:created'; card: Task }
  | { type: 'card:updated'; cardId: number; changes: Partial<Task> }
  | { type: 'card:deleted'; cardId: number; columnId: number }
  | { type: 'card:moved'; cardId: number; fromColumnId: number; toColumnId: number; order: number }
  | { type: 'column:created'; column: Column }
  | { type: 'column:updated'; columnId: number; changes: Partial<Column> }
  | { type: 'column:deleted'; columnId: number };

export function sortTaskIdsByOrder(taskIds: Id[], taskMap: Record<Id, Task>): Id[] {
  return [...taskIds].sort((a, b) => {
    const aOrder = taskMap[a]?.order ?? 0;
    const bOrder = taskMap[b]?.order ?? 0;
    return aOrder - bOrder;
  });
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function computeBetweenOrder(previous?: number, next?: number): number {
  if (previous == null && next == null) return DEFAULT_ORDER;
  if (previous == null) return next! - ORDER_STEP;
  if (next == null) return previous + ORDER_STEP;
  return (previous + next) / 2;
}

function computeTaskOrder(taskIds: Id[], taskMap: Record<Id, Task>, taskId: Id): number {
  const index = taskIds.indexOf(taskId);
  if (index === -1) {
    return taskMap[taskId]?.order ?? DEFAULT_ORDER;
  }

  const previousId = index > 0 ? taskIds[index - 1] : undefined;
  const nextId = index < taskIds.length - 1 ? taskIds[index + 1] : undefined;
  const previousOrder = previousId != null ? taskMap[previousId]?.order : undefined;
  const nextOrder = nextId != null ? taskMap[nextId]?.order : undefined;
  return computeBetweenOrder(previousOrder, nextOrder);
}

export function reorderColumns(columns: Column[], activeId: Id, targetId: Id): Column[] {
  const fromIndex = columns.findIndex((column) => column.id === activeId);
  const toIndex = columns.findIndex((column) => column.id === targetId);
  if (fromIndex === -1 || toIndex === -1) {
    return columns;
  }
  return moveItem(columns, fromIndex, toIndex);
}

export function applyColumnMove(current: BoardData, columnId: Id, toIndex: number): BoardData {
  const fromIndex = current.columns.findIndex((column) => column.id === columnId);
  if (fromIndex === -1 || toIndex < 0 || toIndex >= current.columns.length) {
    return current;
  }

  const reorderedColumns = moveItem(current.columns, fromIndex, toIndex);
  const updatedOrder = computeBetweenOrder(
    toIndex > 0 ? reorderedColumns[toIndex - 1]?.order : undefined,
    toIndex < reorderedColumns.length - 1 ? reorderedColumns[toIndex + 1]?.order : undefined,
  );

  return {
    ...current,
    columns: reorderedColumns.map((column) =>
      column.id === columnId ? { ...column, order: updatedOrder } : column,
    ),
  };
}

export function applyBoardEvent(current: BoardData, event: BoardEvent): BoardData {
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

      if (event.fromColumnId === event.toColumnId) {
        const sameColumnIds = current.columnTaskIds[event.toColumnId] ?? [];
        return {
          ...current,
          taskMap,
          columnTaskIds: {
            ...current.columnTaskIds,
            [event.toColumnId]: sortTaskIdsByOrder(sameColumnIds, taskMap),
          },
        };
      }

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

export function applyTaskUpdate(current: BoardData, taskId: Id, changes: Partial<Task>): BoardData {
  return applyBoardEvent(current, { type: 'card:updated', cardId: Number(taskId), changes });
}

export function applyTaskDelete(current: BoardData, taskId: Id): BoardData {
  const task = current.taskMap[taskId];
  if (!task) {
    return current;
  }

  return applyBoardEvent(current, {
    type: 'card:deleted',
    cardId: Number(taskId),
    columnId: Number(task.columnId),
  });
}

export function applyColumnUpdate(current: BoardData, columnId: Id, changes: Partial<Column>): BoardData {
  return applyBoardEvent(current, { type: 'column:updated', columnId: Number(columnId), changes });
}

export function applyColumnDelete(current: BoardData, columnId: Id): BoardData {
  return applyBoardEvent(current, { type: 'column:deleted', columnId: Number(columnId) });
}

export function applyTaskMove(
  current: BoardData,
  taskId: Id,
  toColumnId: Id,
  order: number,
  extraChanges: Partial<Task> = {},
): BoardData {
  const existing = current.taskMap[taskId];
  if (!existing) {
    return current;
  }

  const taskMap = {
    ...current.taskMap,
    [taskId]: {
      ...existing,
      ...extraChanges,
      columnId: toColumnId,
      order,
    },
  };

  const fromColumnId = existing.columnId;
  if (fromColumnId === toColumnId) {
    return {
      ...current,
      taskMap,
      columnTaskIds: {
        ...current.columnTaskIds,
        [toColumnId]: sortTaskIdsByOrder(current.columnTaskIds[toColumnId] ?? [], taskMap),
      },
    };
  }

  const fromIds = (current.columnTaskIds[fromColumnId] ?? []).filter((id) => id !== taskId);
  const toIds = current.columnTaskIds[toColumnId] ?? [];

  return {
    ...current,
    taskMap,
    columnTaskIds: {
      ...current.columnTaskIds,
      [fromColumnId]: fromIds,
      [toColumnId]: sortTaskIdsByOrder([...toIds.filter((id) => id !== taskId), taskId], taskMap),
    },
  };
}

export function applyTaskMoveByIndex(
  current: BoardData,
  taskId: Id,
  toColumnId: Id,
  toIndex: number,
  extraChanges: Partial<Task> = {},
): BoardData {
  const existing = current.taskMap[taskId];
  if (!existing) {
    return current;
  }

  const fromColumnId = existing.columnId;
  const sameColumn = fromColumnId === toColumnId;
  const sourceIds = [...(current.columnTaskIds[fromColumnId] ?? [])];
  const targetBase = sameColumn ? sourceIds : [...(current.columnTaskIds[toColumnId] ?? [])];

  const nextSourceIds = sourceIds.filter((id) => id !== taskId);
  const nextTargetIds = (sameColumn ? nextSourceIds : targetBase.filter((id) => id !== taskId));
  const insertIndex = Math.max(0, Math.min(toIndex, nextTargetIds.length));
  nextTargetIds.splice(insertIndex, 0, taskId);

  const taskWithoutOrder = {
    ...existing,
    ...extraChanges,
    columnId: toColumnId,
  };

  const provisionalTaskMap = {
    ...current.taskMap,
    [taskId]: taskWithoutOrder,
  };

  const nextOrder = computeTaskOrder(nextTargetIds, provisionalTaskMap, taskId);
  const taskMap = {
    ...provisionalTaskMap,
    [taskId]: {
      ...taskWithoutOrder,
      order: nextOrder,
    },
  };

  if (sameColumn) {
    return {
      ...current,
      taskMap,
      columnTaskIds: {
        ...current.columnTaskIds,
        [toColumnId]: nextTargetIds,
      },
    };
  }

  return {
    ...current,
    taskMap,
    columnTaskIds: {
      ...current.columnTaskIds,
      [fromColumnId]: nextSourceIds,
      [toColumnId]: nextTargetIds,
    },
  };
}
