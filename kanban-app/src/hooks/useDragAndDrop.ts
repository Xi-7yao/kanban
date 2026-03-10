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

export function useDragAndDrop(data?: BoardData) {
    const queryClient = useQueryClient();
    const { mutate: moveTask } = useMoveTask();
    const { mutate: moveColumn } = useMoveColumn();

    const [activeColumn, setActiveColumn] = useState<Column | null>(null);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    
    const [dragOverrides, setDragOverrides] = useState<{
        columns?: Column[]; 
        taskMap?: Record<Id, Task>;
        columnTaskIds?: Record<Id, Id[]>;
    } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
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
        } else if (active.data.current?.type === 'Task') {
            setActiveTask(active.data.current.task);
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

        // 🟢 1. 处理列的视觉占位符移�?
        if (isActiveColumn) {
            let targetColumnId = overId;
            if (over.data.current?.type === 'Task') {
                targetColumnId = data.taskMap[overId]?.columnId || overId;
            }

            if (targetColumnId === activeId) return;

            // 基于当前的视觉状态（而不是原始数据）进行连续挪动
            const currentCols = dragOverrides?.columns || data.columns;
            const activeIndex = currentCols.findIndex(c => c.id === activeId);
            const overIndex = currentCols.findIndex(c => c.id === targetColumnId);

            if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
                setDragOverrides({
                    ...dragOverrides,
                    columns: arrayMove(currentCols, activeIndex, overIndex),
                });
            }
            return;
        }

        // 🟢 2. 处理 Task 的视觉占位符移动
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
                [activeId]: { ...activeTaskObj, columnId: overColumnId }
            },
            columnTaskIds: {
                ...currentData.columnTaskIds,
                [activeColumnId]: activeItems,
                [overColumnId]: overItems
            }
        });
    };

    const onDragEnd = (event: DragEndEvent) => {
        setActiveColumn(null);
        setActiveTask(null);

        const { active, over } = event;
        if (!over || !data) {
            setDragOverrides(null);
            return;
        }

        const activeId = active.id;
        const overId = over.id;
        const isActiveTask = active.data.current?.type === 'Task';
        const isActiveColumn = active.data.current?.type === 'Column';

        // 🟢 🚀 3. 列拖拽的最终结算（终极修复版）
        if (isActiveColumn) {
            // 直接�?onDragOver 中已经完美排好序的数�?
            const finalColumns = dragOverrides?.columns;
            
            // 如果压根没发生移动（没触�?onDragOver 的重新排序）
            if (!finalColumns) {
                setDragOverrides(null);
                return;
            }

            const activeIndex = finalColumns.findIndex(c => c.id === activeId);
            const originalIndex = data.columns.findIndex(c => c.id === activeId);

            // 如果最终虽然动了，但落回了原点，取消操�?
            if (activeIndex === originalIndex) {
                setDragOverrides(null);
                return;
            }

            // 直接基于已经排好序的 finalColumns 计算 Float
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

            const updatedColumns = finalColumns.map(col => 
                col.id === activeId ? { ...col, order: newFloatOrder } : col
            );

            console.group('🚀 [DragEnd] 列拖�?Float 排序结算');
            console.log('1. 被拖拽的 Column ID:', activeId);
            console.log('2. 算出全新�?Float Order:', newFloatOrder);
            console.log('3. 前端即将生效的列顺序:', updatedColumns.map(c => ({ id: c.id, order: c.order })));
            console.groupEnd();

            // 乐观更新写入缓存
            queryClient.setQueryData<BoardData>(boardKeys.columns(), {
                ...data,
                columns: updatedColumns
            });

            moveColumn({ id: activeId, order: newFloatOrder });
            setDragOverrides(null);
            return;
        }

        // 🟢 4. 卡片拖拽的最终结�?
        if (isActiveTask) {
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
                        order: newFloatOrder 
                    }
                }
            });

            moveTask({ id: activeId, columnId: overColumnId, order: newFloatOrder });
        }
        
        setDragOverrides(null);
    };

    return { sensors, activeColumn, activeTask, onDragStart, onDragOver, onDragEnd, derivedData };
}
