import { useState, useEffect, useCallback } from "react";
import type { Column, Id, Task } from "../types";
import { kanbanApi } from "../api";
import { useToast } from "../contexts/ToastContext";

export function useBoard() {
    const [columns, setColumns] = useState<Column[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useToast();

    const fetchBoard = useCallback(async () => {
        setIsLoading(true);
        try {
            const boardData = await kanbanApi.getBoard();
            setColumns(boardData);
            const allTasks = boardData.flatMap((col) =>
                (col.cards || []).map((task) => ({
                    ...task,
                    columnId: col.id,
                }))
            );
            setTasks(allTasks);
        } catch {
            showToast("Failed to load board data", "error");
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchBoard();
    }, [fetchBoard]);

    // --- Column operations (optimistic + rollback) ---

    const createColumn = useCallback(async () => {
        try {
            const order = columns.length;
            const newCol = await kanbanApi.createColumn(`Column ${columns.length + 1}`, order);
            setColumns((prev) => [...prev, newCol]);
        } catch {
            showToast("Failed to create column", "error");
        }
    }, [columns.length, showToast]);

    const deleteColumn = useCallback(async (id: Id) => {
        const prevColumns = columns;
        const prevTasks = tasks;

        setColumns((prev) => prev.filter((col) => col.id !== id));
        setTasks((prev) => prev.filter((t) => t.columnId !== id));

        try {
            await kanbanApi.deleteColumn(id);
        } catch {
            setColumns(prevColumns);
            setTasks(prevTasks);
            showToast("Failed to delete column", "error");
        }
    }, [columns, tasks, showToast]);

    const updateColumn = useCallback(async (id: Id, title: string) => {
        const prevColumns = columns;

        setColumns((prev) =>
            prev.map((col) => (col.id === id ? { ...col, title } : col))
        );

        try {
            await kanbanApi.updateColumn(id, title);
        } catch {
            setColumns(prevColumns);
            showToast("Failed to update column", "error");
        }
    }, [columns, showToast]);

    // --- Task operations (optimistic + rollback) ---

    const createTask = useCallback(async (columnId: Id) => {
        try {
            const tasksInCol = tasks.filter((t) => t.columnId === columnId);
            const order = tasksInCol.length;
            const newTask = await kanbanApi.createTask(
                columnId,
                `Task ${tasks.length + 1}`,
                order
            );
            setTasks((prev) => [...prev, newTask]);
        } catch {
            showToast("Failed to create task", "error");
        }
    }, [tasks, showToast]);

    const deleteTask = useCallback(async (id: Id) => {
        const prevTasks = tasks;

        setTasks((prev) => prev.filter((task) => task.id !== id));

        try {
            await kanbanApi.deleteTask(id);
        } catch {
            setTasks(prevTasks);
            showToast("Failed to delete task", "error");
        }
    }, [tasks, showToast]);

    const updateTask = useCallback(async (id: Id, title: string) => {
        const prevTasks = tasks;

        setTasks((prev) =>
            prev.map((task) => (task.id === id ? { ...task, title } : task))
        );

        try {
            await kanbanApi.updateTask(id, { title });
        } catch {
            setTasks(prevTasks);
            showToast("Failed to update task", "error");
        }
    }, [tasks, showToast]);

    const updateTaskDetail = useCallback(async (id: Id, updates: { title?: string; content?: string }) => {
        const prevTasks = tasks;

        setTasks((prev) =>
            prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
        );

        try {
            await kanbanApi.updateTask(id, updates);
        } catch {
            setTasks(prevTasks);
            showToast("Failed to update task", "error");
        }
    }, [tasks, showToast]);

    const moveTask = useCallback(async (id: Id, columnId: Id, order: number) => {
        try {
            await kanbanApi.moveTask(id, columnId, order);
        } catch {
            await fetchBoard();
            showToast("Failed to move task", "error");
        }
    }, [fetchBoard, showToast]);

    return {
        columns,
        setColumns,
        tasks,
        setTasks,
        isLoading,
        createColumn,
        deleteColumn,
        updateColumn,
        createTask,
        deleteTask,
        updateTask,
        updateTaskDetail,
        moveTask,
    };
}
