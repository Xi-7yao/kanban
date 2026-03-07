import { useMemo, useState } from "react";
import { Plus, LogOut } from "lucide-react";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";

import ColumnContainer from "./ColumnContainer";
import TaskCard from "./TaskCard";
import TaskDetailModal from "./TaskDetailModal";
import { useAuth } from "../contexts/AuthContext";
import { useBoardQuery } from "../queries/useBoardQuery";
import { useCreateColumn } from "../queries/mutations/useColumnMutations";
import { useUpdateTask } from "../queries/mutations/useTaskMutations";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { useSocket } from "../hooks/useSocket";
import type { Task } from "../types";

function KanbanBoard() {
    useSocket();
    const { logout } = useAuth();
    const { data, isLoading, error } = useBoardQuery();
    const { mutate: createColumn } = useCreateColumn();
    const { mutate: updateTaskDetail } = useUpdateTask();
    const [activeTaskDetail, setActiveTaskDetail] = useState<Task | null>(null);

    const { sensors, activeColumn, activeTask, onDragStart, onDragOver, onDragEnd, derivedData } = useDragAndDrop(data);

    const boardData = derivedData || { columns: [], taskMap: {}, columnTaskIds: {} };
    const { columns, taskMap, columnTaskIds } = boardData;

    const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-gray-400 text-lg">Loading board...</div>
            </div>
        );
    }

    if (error || !data) return <div className="text-red-500">Error loading board.</div>;

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
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
            >
                <div className="m-auto flex gap-4">
                    <div className="flex gap-4">
                        <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
                            {columns.map((col) => (
                                <ColumnContainer
                                    key={col.id}
                                    column={col}
                                    taskIds={columnTaskIds[col.id] || []}
                                    taskMap={taskMap}
                                    onTaskClick={setActiveTaskDetail}
                                />
                            ))}
                        </SortableContext>
                    </div>
                    <button
                        onClick={() => {
                            // 🚀 获取当前最后一列的 order，加上步长
                            const lastColumn = columns[columns.length - 1];
                            const nextOrder = lastColumn ? lastColumn.order + 1024 : 1024;
                            createColumn({ title: "New Column", order: nextOrder });
                        }}
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
                                taskIds={columnTaskIds[activeColumn.id] || []}
                                taskMap={taskMap}
                            />
                        )}
                        {activeTask && <TaskCard task={activeTask} />}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>

            {activeTaskDetail && (
                <TaskDetailModal
                    task={activeTaskDetail}
                    onClose={() => setActiveTaskDetail(null)}
                    onUpdate={(id, updates) => updateTaskDetail({ id, updates })}
                />
            )}
        </div>
    );
}

export default KanbanBoard;