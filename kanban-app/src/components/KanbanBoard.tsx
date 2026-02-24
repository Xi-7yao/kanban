import { useMemo, useState } from "react";
import { Plus, LogOut } from "lucide-react";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";

import type { Task } from "../types";
import ColumnContainer from "./ColumnContainer";
import TaskCard from "./TaskCard";
import TaskDetailModal from "./TaskDetailModal";
import { useAuth } from "../contexts/AuthContext";
import { useBoard } from "../hooks/useBoard";
import { useDragAndDrop } from "../hooks/useDragAndDrop";

function KanbanBoard() {
    const { logout } = useAuth();
    const {
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
    } = useBoard();

    const {
        sensors,
        activeColumn,
        activeTask,
        onDragStart,
        onDragEnd,
        onDragOver,
    } = useDragAndDrop({ tasks, setTasks, setColumns, moveTask });

    const [viewingTask, setViewingTask] = useState<Task | null>(null);

    const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-gray-400 text-lg">Loading board...</div>
            </div>
        );
    }

    return (
        <div className="m-auto flex min-h-screen w-full items-center overflow-x-auto overflow-y-hidden px-[40px]">
            <button
                onClick={logout}
                className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-400 hover:text-white hover:border-rose-500 transition"
                title="Sign out"
            >
                <LogOut size={18} />
                <span className="text-sm font-medium">Sign Out</span>
            </button>

            <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
            >
                <div className="m-auto flex gap-4">
                    <div className="flex gap-4">
                        <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
                            {columns.map((col) => (
                                <ColumnContainer
                                    key={col.id}
                                    column={col}
                                    deleteColumn={deleteColumn}
                                    updateColumn={updateColumn}
                                    createTask={createTask}
                                    deleteTask={deleteTask}
                                    updateTask={updateTask}
                                    onTaskClick={setViewingTask}
                                    tasks={tasks.filter((task) => task.columnId === col.id)}
                                />
                            ))}
                        </SortableContext>
                    </div>
                    <button
                        onClick={() => createColumn()}
                        className="h-[60px] w-[350px] min-w-[350px] cursor-pointer rounded-lg bg-gray-900 border-2 border-gray-900 p-4 ring-rose-500 hover:ring-2 flex gap-2 text-white"
                    >
                        <Plus />
                        Add Column
                    </button>
                </div>

                {createPortal(
                    <DragOverlay>
                        {activeColumn && (
                            <ColumnContainer
                                column={activeColumn}
                                deleteColumn={deleteColumn}
                                updateColumn={updateColumn}
                                createTask={createTask}
                                deleteTask={deleteTask}
                                updateTask={updateTask}
                                tasks={tasks.filter((task) => task.columnId === activeColumn.id)}
                            />
                        )}
                        {activeTask && (
                            <TaskCard
                                task={activeTask}
                                deleteTask={deleteTask}
                                updateTask={updateTask}
                            />
                        )}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>

            {viewingTask && createPortal(
                <TaskDetailModal
                    task={viewingTask}
                    onClose={() => setViewingTask(null)}
                    onUpdate={updateTaskDetail}
                />,
                document.body
            )}
        </div>
    );
}

export default KanbanBoard;
