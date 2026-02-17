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

        // 持久化任务移动（从 ref 取目标列，不依赖 over 或 tasks 闭包）
        if (active.data.current?.type === "Task" && targetColumnId !== null) {
            const tasksInColumn = tasks.filter((t) => t.columnId === targetColumnId);
            const newOrder = tasksInColumn.findIndex((t) => t.id === active.id);
            moveTask(active.id, targetColumnId, newOrder >= 0 ? newOrder : tasksInColumn.length);
        }

        if (!over) return;
        if (active.id === over.id) return;

        // 列拖拽排序
        if (active.data.current?.type === "Column") {
            setColumns((columns) => {
                const activeIndex = columns.findIndex((col) => col.id === active.id);
                const overIndex = columns.findIndex((col) => col.id === over.id);
                return arrayMove(columns, activeIndex, overIndex);
            });
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

        if (!isActiveTask) return;

        if (isActiveTask && isOverTask) {
            // 同步写入 ref：over 任务的 columnId 就是目标列
            dragTargetColumnRef.current = over.data.current.task.columnId;

            setTasks((prev) => {
                const activeIndex = prev.findIndex((t) => t.id === activeId);
                const overIndex = prev.findIndex((t) => t.id === overId);
                const updated = prev.map((t, i) =>
                    i === activeIndex && t.columnId !== prev[overIndex].columnId
                        ? { ...t, columnId: prev[overIndex].columnId }
                        : t
                );
                return arrayMove(updated, activeIndex, overIndex);
            });
        }

        const isOverColumn = over.data.current?.type === "Column";
        if (isActiveTask && isOverColumn) {
            // 同步写入 ref：拖到列容器上，overId 就是目标列 ID
            dragTargetColumnRef.current = overId;

            setTasks((prev) => {
                const activeIndex = prev.findIndex((t) => t.id === activeId);
                const updated = prev.map((t, i) =>
                    i === activeIndex ? { ...t, columnId: overId } : t
                );
                return arrayMove(updated, activeIndex, activeIndex);
            });
        }
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
