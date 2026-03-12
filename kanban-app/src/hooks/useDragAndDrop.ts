import { useState, useMemo } from 'react';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import type { Column, Task, Id } from '../types';
import type { BoardData } from '../queries/useBoardQuery';
import { useMoveTask } from '../queries/mutations/useTaskMutations';
import { useMoveColumn } from '../queries/mutations/useColumnMutations';
import { boardKeys } from '../queries/queryKeys';
import { useSocketContext } from '../contexts/SocketContext';
import { applyColumnMove, applyTaskMoveByIndex, reorderColumns } from '../queries/boardPatches';

export function useDragAndDrop(data?: BoardData) {
  const queryClient = useQueryClient();
  const { mutate: moveTask } = useMoveTask();
  const { mutate: moveColumn } = useMoveColumn();
  const { emitLockAcquire, emitLockRelease } = useSocketContext();

  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [dragOverrides, setDragOverrides] = useState<{
    columns?: Column[];
    taskMap?: Record<Id, Task>;
    columnTaskIds?: Record<Id, Id[]>;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const derivedData = useMemo(() => {
    if (!data) return null;
    if (!dragOverrides) return data;

    return {
      ...data,
      columns: dragOverrides.columns || data.columns,
      taskMap: dragOverrides.taskMap || data.taskMap,
      columnTaskIds: dragOverrides.columnTaskIds || data.columnTaskIds,
    };
  }, [data, dragOverrides]);

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'Column') {
      setActiveColumn(active.data.current.column);
      return;
    }

    if (active.data.current?.type === 'Task') {
      setActiveTask(active.data.current.task);
      emitLockAcquire(active.id);
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !data) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isActiveColumn = active.data.current?.type === 'Column';

    if (isActiveColumn) {
      let targetColumnId = overId;
      if (over.data.current?.type === 'Task') {
        targetColumnId = data.taskMap[overId]?.columnId || overId;
      }

      if (targetColumnId === activeId) return;

      const currentCols = dragOverrides?.columns || data.columns;
      const activeIndex = currentCols.findIndex((column) => column.id === activeId);
      const overIndex = currentCols.findIndex((column) => column.id === targetColumnId);

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        setDragOverrides({
          ...dragOverrides,
          columns: reorderColumns(currentCols, activeId, targetColumnId),
        });
      }
      return;
    }

    if (!isActiveTask) return;

    const currentData = derivedData || data;
    const activeTaskObj = currentData.taskMap[activeId];
    if (!activeTaskObj) return;

    const activeColumnId = activeTaskObj.columnId;
    let overColumnId: Id;

    if (over.data.current?.type === 'Task') {
      overColumnId = currentData.taskMap[overId].columnId;
    } else if (over.data.current?.type === 'Column') {
      overColumnId = overId;
    } else {
      return;
    }

    if (activeColumnId === overColumnId) return;

    const overItems = currentData.columnTaskIds[overColumnId] ?? [];
    const overIndex = over.data.current?.type === 'Task' ? overItems.indexOf(overId) : overItems.length;
    const previewBoard = applyTaskMoveByIndex(currentData, activeId, overColumnId, overIndex);

    setDragOverrides({
      columns: dragOverrides?.columns || currentData.columns,
      taskMap: previewBoard.taskMap,
      columnTaskIds: previewBoard.columnTaskIds,
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id;
    const overId = over?.id;
    const isActiveTask = active.data.current?.type === 'Task';
    const isActiveColumn = active.data.current?.type === 'Column';

    if (isActiveTask) {
      emitLockRelease(activeId);
    }

    setActiveColumn(null);
    setActiveTask(null);

    if (!over || !data) {
      setDragOverrides(null);
      return;
    }

    if (isActiveColumn) {
      const currentData = derivedData || data;
      const finalColumns = dragOverrides?.columns;
      if (!finalColumns) {
        setDragOverrides(null);
        return;
      }

      const activeIndex = finalColumns.findIndex((column) => column.id === activeId);
      const originalIndex = data.columns.findIndex((column) => column.id === activeId);
      if (activeIndex === originalIndex) {
        setDragOverrides(null);
        return;
      }

      const updatedBoard = applyColumnMove(currentData, activeId, activeIndex);
      const movedColumn = updatedBoard.columns.find((column) => column.id === activeId);

      queryClient.setQueryData<BoardData>(boardKeys.columns(), updatedBoard);

      moveColumn({ id: activeId, order: movedColumn?.order ?? 0 });
      setDragOverrides(null);
      return;
    }

    if (isActiveTask && overId !== undefined) {
      const currentData = derivedData || data;
      const activeTaskObj = currentData.taskMap[activeId];
      if (!activeTaskObj) {
        setDragOverrides(null);
        return;
      }

      const isOverTask = over.data.current?.type === 'Task';
      const isOverColumn = over.data.current?.type === 'Column';

      let overColumnId = activeTaskObj.columnId;
      if (isOverTask) {
        overColumnId = currentData.taskMap[overId]?.columnId || overColumnId;
      } else if (isOverColumn) {
        overColumnId = overId;
      }

      const targetItems = currentData.columnTaskIds[overColumnId] ?? [];
      let overIndex = targetItems.indexOf(activeId);
      if (activeId !== overId) {
        if (isOverTask) {
          overIndex = targetItems.indexOf(overId);
        } else if (isOverColumn) {
          overIndex = targetItems.length;
        }
      }

      if (overIndex === -1) {
        setDragOverrides(null);
        return;
      }

      const updatedBoard = applyTaskMoveByIndex(currentData, activeId, overColumnId, overIndex);
      const movedTask = updatedBoard.taskMap[activeId];

      if (!movedTask) {
        setDragOverrides(null);
        return;
      }

      if (
        movedTask.columnId === data.taskMap[activeId]?.columnId &&
        movedTask.order === data.taskMap[activeId]?.order
      ) {
        setDragOverrides(null);
        return;
      }

      queryClient.setQueryData<BoardData>(boardKeys.columns(), updatedBoard);

      moveTask({ id: activeId, columnId: movedTask.columnId, order: movedTask.order });
    }

    setDragOverrides(null);
  };

  return { sensors, activeColumn, activeTask, onDragStart, onDragOver, onDragEnd, derivedData };
}
