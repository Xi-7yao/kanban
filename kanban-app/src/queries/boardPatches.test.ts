import { describe, expect, it } from 'vitest';
import type { BoardData } from './useBoardQuery';
import {
  applyBoardEvent,
  applyColumnMove,
  applyTaskMoveByIndex,
  applyTaskUpdate,
  computeBetweenOrder,
  moveItem,
  sortTaskIdsByOrder,
} from './boardPatches';

function createBoard(): BoardData {
  return {
    columns: [
      { id: 1, title: 'Todo', order: 1024, updatedAt: '2026-03-12T10:00:00.000Z' },
      { id: 2, title: 'Doing', order: 2048, updatedAt: '2026-03-12T10:00:00.000Z' },
      { id: 3, title: 'Done', order: 3072, updatedAt: '2026-03-12T10:00:00.000Z' },
    ],
    taskMap: {
      11: { id: 11, columnId: 1, title: 'Task 1', order: 1024, updatedAt: '2026-03-12T10:00:00.000Z' },
      12: { id: 12, columnId: 1, title: 'Task 2', order: 2048, updatedAt: '2026-03-12T10:00:00.000Z' },
      13: { id: 13, columnId: 1, title: 'Task 3', order: 3072, updatedAt: '2026-03-12T10:00:00.000Z' },
      21: { id: 21, columnId: 2, title: 'Task 4', order: 1024, updatedAt: '2026-03-12T10:00:00.000Z' },
    },
    columnTaskIds: {
      1: [11, 12, 13],
      2: [21],
      3: [],
    },
  };
}

describe('boardPatches', () => {
  it('computes between-order values for edges and middle inserts', () => {
    expect(computeBetweenOrder()).toBe(65536);
    expect(computeBetweenOrder(undefined, 2048)).toBe(1024);
    expect(computeBetweenOrder(2048, undefined)).toBe(3072);
    expect(computeBetweenOrder(1024, 3072)).toBe(2048);
  });

  it('moves items within an array without mutating the input', () => {
    const items = ['a', 'b', 'c'];
    const moved = moveItem(items, 0, 2);

    expect(moved).toEqual(['b', 'c', 'a']);
    expect(items).toEqual(['a', 'b', 'c']);
  });

  it('re-sorts task ids after a task order update', () => {
    const board = createBoard();
    const updated = applyTaskUpdate(board, 13, { order: 512 });

    expect(sortTaskIdsByOrder(updated.columnTaskIds[1], updated.taskMap)).toEqual([13, 11, 12]);
    expect(updated.columnTaskIds[1]).toEqual([13, 11, 12]);
  });

  it('moves a task within the same column by target index and recomputes order', () => {
    const board = createBoard();
    const moved = applyTaskMoveByIndex(board, 13, 1, 0);

    expect(moved.columnTaskIds[1]).toEqual([13, 11, 12]);
    expect(moved.taskMap[13].columnId).toBe(1);
    expect(moved.taskMap[13].order).toBeLessThan(moved.taskMap[11].order);
  });

  it('moves a task across columns by target index and cleans up both columns', () => {
    const board = createBoard();
    const moved = applyTaskMoveByIndex(board, 12, 2, 1);

    expect(moved.columnTaskIds[1]).toEqual([11, 13]);
    expect(moved.columnTaskIds[2]).toEqual([21, 12]);
    expect(moved.taskMap[12].columnId).toBe(2);
    expect(moved.taskMap[12].order).toBeGreaterThan(moved.taskMap[21].order);
  });

  it('reorders columns and computes a new floating order for the moved column', () => {
    const board = createBoard();
    const moved = applyColumnMove(board, 1, 2);

    expect(moved.columns.map((column) => column.id)).toEqual([2, 3, 1]);
    expect(moved.columns[2].order).toBeGreaterThan(moved.columns[1].order);
  });

  it('removes orphaned task data when a column is deleted', () => {
    const board = createBoard();
    const updated = applyBoardEvent(board, { type: 'column:deleted', columnId: 1 });

    expect(updated.columns.map((column) => column.id)).toEqual([2, 3]);
    expect(updated.columnTaskIds[1]).toBeUndefined();
    expect(updated.taskMap[11]).toBeUndefined();
    expect(updated.taskMap[12]).toBeUndefined();
    expect(updated.taskMap[13]).toBeUndefined();
  });
});
