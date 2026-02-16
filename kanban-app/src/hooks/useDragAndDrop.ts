import { useState } from "react";
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

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    function onDragStart(event: DragStartEvent) {
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

        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        if (active.data.current?.type === "Column") {
            setColumns((columns) => {
                const activeIndex = columns.findIndex((col) => col.id === activeId);
                const overIndex = columns.findIndex((col) => col.id === overId);
                return arrayMove(columns, activeIndex, overIndex);
            });
        }

        if (active.data.current?.type === "Task") {
            const currentTask = tasks.find((t) => t.id === activeId);
            if (currentTask) {
                const tasksInColumn = tasks.filter((t) => t.columnId === currentTask.columnId);
                const newOrder = tasksInColumn.findIndex((t) => t.id === activeId);
                moveTask(activeId, currentTask.columnId, newOrder);
            }
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
            setTasks((tasks) => {
                const activeIndex = tasks.findIndex((t) => t.id === activeId);
                const overIndex = tasks.findIndex((t) => t.id === overId);
                if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
                    tasks[activeIndex].columnId = tasks[overIndex].columnId;
                }
                return arrayMove(tasks, activeIndex, overIndex);
            });
        }

        const isOverColumn = over.data.current?.type === "Column";
        if (isActiveTask && isOverColumn) {
            setTasks((tasks) => {
                const activeIndex = tasks.findIndex((t) => t.id === activeId);
                tasks[activeIndex].columnId = overId;
                return arrayMove(tasks, activeIndex, activeIndex);
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
