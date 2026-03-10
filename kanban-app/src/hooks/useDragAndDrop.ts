import { useState, useMemo } from 'react';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import type { Column, Task, Id } from '../types';
import type { BoardData } from '../queries/useBoardQuery';
import { useMoveTask } from '../queries/mutations/useTaskMutations';
import { useMoveColumn } from '../queries/mutations/useColumnMutations';
import { boardKeys } from '../queries/queryKeys';
import { useSocketContext } from '../contexts/SocketContext';

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
          columns: arrayMove(currentCols, activeIndex, overIndex),
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

    const activeItems = [...currentData.columnTaskIds[activeColumnId]];
    const overItems = [...currentData.columnTaskIds[overColumnId]];
    const activeIndex = activeItems.indexOf(activeId);
    const overIndex = over.data.current?.type === 'Task' ? overItems.indexOf(overId) : overItems.length;

    activeItems.splice(activeIndex, 1);
    overItems.splice(overIndex, 0, activeId);

    setDragOverrides({
      columns: dragOverrides?.columns || currentData.columns,
      taskMap: {
        ...currentData.taskMap,
        [activeId]: { ...activeTaskObj, columnId: overColumnId },
      },
      columnTaskIds: {
        ...currentData.columnTaskIds,
        [activeColumnId]: activeItems,
        [overColumnId]: overItems,
      },
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

      let newFloatOrder = 0;
      if (finalColumns.length === 1) {
        newFloatOrder = 65536;
      } else if (activeIndex === 0) {
        newFloatOrder = finalColumns[1].order - 1024;
      } else if (activeIndex === finalColumns.length - 1) {
        newFloatOrder = finalColumns[activeIndex - 1].order + 1024;
      } else {
        newFloatOrder = (finalColumns[activeIndex - 1].order + finalColumns[activeIndex + 1].order) / 2.0;
      }

      const updatedColumns = finalColumns.map((column) =>
        column.id === activeId ? { ...column, order: newFloatOrder } : column,
      );

      queryClient.setQueryData<BoardData>(boardKeys.columns(), {
        ...data,
        columns: updatedColumns,
      });

      moveColumn({ id: activeId, order: newFloatOrder });
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

      const finalColumnTaskIds = { ...currentData.columnTaskIds };
      const items = [...finalColumnTaskIds[overColumnId]];
      const activeIndex = items.indexOf(activeId);

      let overIndex = activeIndex;
      if (activeId !== overId) {
        if (isOverTask) {
          overIndex = items.indexOf(overId);
        } else if (isOverColumn) {
          overIndex = items.length - 1;
        }

        if (overIndex !== -1 && activeIndex !== overIndex) {
          finalColumnTaskIds[overColumnId] = arrayMove(items, activeIndex, overIndex);
        }
      }

      const finalArray = finalColumnTaskIds[overColumnId];
      const currentIndex = finalArray.indexOf(activeId);

      let newFloatOrder = 0;
      if (finalArray.length === 1) {
        newFloatOrder = 65536;
      } else if (currentIndex === 0) {
        const nextCardId = finalArray[1];
        const nextOrder = currentData.taskMap[nextCardId].order;
        newFloatOrder = nextOrder - 1024;
      } else if (currentIndex === finalArray.length - 1) {
        const prevCardId = finalArray[currentIndex - 1];
        const prevOrder = currentData.taskMap[prevCardId].order;
        newFloatOrder = prevOrder + 1024;
      } else {
        const prevCardId = finalArray[currentIndex - 1];
        const nextCardId = finalArray[currentIndex + 1];
        const prevOrder = currentData.taskMap[prevCardId].order;
        const nextOrder = currentData.taskMap[nextCardId].order;
        newFloatOrder = (prevOrder + nextOrder) / 2.0;
      }

      queryClient.setQueryData<BoardData>(boardKeys.columns(), {
        ...currentData,
        columnTaskIds: finalColumnTaskIds,
        taskMap: {
          ...currentData.taskMap,
          [activeId]: {
            ...activeTaskObj,
            columnId: overColumnId,
            order: newFloatOrder,
          },
        },
      });

      moveTask({ id: activeId, columnId: overColumnId, order: newFloatOrder });
    }

    setDragOverrides(null);
  };

  return { sensors, activeColumn, activeTask, onDragStart, onDragOver, onDragEnd, derivedData };
}