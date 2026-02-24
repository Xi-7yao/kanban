import { useState, useRef } from "react";
import {
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Column, Id, Task } from "../types";

interface UseDragAndDropParams {
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    setColumns: React.Dispatch<React.SetStateAction<Column[]>>;
    moveTask: (id: Id, columnId: Id, order: number) => Promise<void>;
}

export function useDragAndDrop({ tasks, setTasks, setColumns, moveTask }: UseDragAndDropParams) {
    const [activeColumn, setActiveColumn] = useState<Column | null>(null);
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // 用 ref 同步记录拖拽过程中的目标列，避免 React 批处理/闭包过时问题
    const dragTargetColumnRef = useRef<Id | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    function onDragStart(event: DragStartEvent) {
        dragTargetColumnRef.current = null;

        if (event.active.data.current?.type === "Column") {
            setActiveColumn(event.active.data.current.column);
            return;
        }
        if (event.active.data.current?.type === "Task") {
            setActiveTask(event.active.data.current.task);
            return;
        }
    }

    function onDragEnd(event: DragEndEvent) {
        setActiveColumn(null);
        setActiveTask(null);

        const targetColumnId = dragTargetColumnRef.current;
        dragTargetColumnRef.current = null;

        const { active, over } = event;

        if (!over) return;

        // 松手时，处理任务的最终本地数组排序
        if (active.data.current?.type === "Task") {
            setTasks((prev) => {
                const activeIndex = prev.findIndex((t) => t.id === active.id);
                const overIndex = prev.findIndex((t) => t.id === over.id);

                if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
                    return arrayMove(prev, activeIndex, overIndex);
                }
                return prev;
            });
        }

        // 列拖拽排序
        if (active.data.current?.type === "Column" && active.id !== over.id) {
            setColumns((columns) => {
                const activeIndex = columns.findIndex((col) => col.id === active.id);
                const overIndex = columns.findIndex((col) => col.id === over.id);
                return arrayMove(columns, activeIndex, overIndex);
            });
        }

        // 服务端持久化
        if (active.data.current?.type === "Task" && targetColumnId !== null) {
            const tasksInColumn = tasks.filter((t) => t.columnId === targetColumnId);
            const newOrder = tasksInColumn.findIndex((t) => t.id === active.id);
            moveTask(active.id, targetColumnId, newOrder >= 0 ? newOrder : tasksInColumn.length);
        }
    }

    function onDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveTask = active.data.current?.type === "Task";
        const isOverTask = over.data.current?.type === "Task";
        const isOverColumn = over.data.current?.type === "Column";

        if (!isActiveTask) return;

        // 1. 获取目标位置所属的列 ID
        let overColumnId: Id | undefined;
        if (isOverTask) {
            overColumnId = over.data.current?.task?.columnId;
        } else if (isOverColumn) {
            overColumnId = overId;
        }

        if (!overColumnId) return;

        // 2. 将逻辑全部包裹在 setTasks 中，利用最新状态进行精准拦截
        setTasks((prev) => {
            const activeIndex = prev.findIndex((t) => t.id === activeId);
            if (activeIndex === -1) return prev;

            const currentActiveColumnId = prev[activeIndex].columnId;

            // 同列拖拽：直接 return，dnd-kit 通过 transform 自动处理动画
            if (currentActiveColumnId === overColumnId) {
                return prev;
            }

            // --- 跨列拖拽 ---

            const overIndex = prev.findIndex((t) => t.id === overId);

            if (isOverTask && overIndex !== -1) {
                dragTargetColumnRef.current = overColumnId;
                const updated = [...prev];
                updated[activeIndex] = { ...updated[activeIndex], columnId: overColumnId };
                return arrayMove(updated, activeIndex, overIndex);
            }

            if (isOverColumn) {
                dragTargetColumnRef.current = overColumnId;
                const updated = [...prev];
                updated[activeIndex] = { ...updated[activeIndex], columnId: overColumnId };
                return updated;
            }

            return prev;
        });
    }

    return {
        sensors,
        activeColumn,
        activeTask,
        onDragStart,
        onDragEnd,
        onDragOver,
    };
}
