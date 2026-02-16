import { useMemo, useState, useEffect } from "react";
import { Plus } from "lucide-react";
import {
    DndContext,
    type DragEndEvent,
    type DragOverEvent,
    DragOverlay,
    type DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";

import type { Column, Id, Task } from "../types";
import ColumnContainer from "./ColumnContainer";
import TaskCard from "./TaskCard";
import TaskDetailModal from "./TaskDetailModal"; // ✅ 引入新组件
import { kanbanApi } from "../api";

function KanbanBoard() {
    const [columns, setColumns] = useState<Column[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activeColumn, setActiveColumn] = useState<Column | null>(null);
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // ✅ 新增状态：当前查看详情的任务
    const [viewingTask, setViewingTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3,
            },
        })
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                const boardData = await kanbanApi.getBoard();
                setColumns(boardData);
                const allTasks = boardData.flatMap(col =>
                    (col.cards || []).map(task => ({
                        ...task,
                        columnId: col.id
                    }))
                );
                setTasks(allTasks);
            } catch (error) {
                console.error("Failed to load board:", error);
            }
        };
        fetchData();
    }, []);

    // ... CRUD 操作 (列的保持不变) ...
    async function createNewColumn() {
        const order = columns.length;
        const newCol = await kanbanApi.createColumn(`Column ${columns.length + 1}`, order);
        setColumns([...columns, newCol]);
    }

    async function deleteColumn(id: Id) {
        setColumns(columns.filter((col) => col.id !== id));
        setTasks(tasks.filter((t) => t.columnId !== id));
        await kanbanApi.deleteColumn(id);
    }

    async function updateColumn(id: Id, title: string) {
        const newColumns = columns.map((col) => {
            if (col.id !== id) return col;
            return { ...col, title };
        });
        setColumns(newColumns);
        await kanbanApi.updateColumn(id, title);
    }

    // ... Task CRUD ...
    async function createTask(columnId: Id) {
        const tasksInCol = tasks.filter(t => t.columnId === columnId);
        const order = tasksInCol.length;
        const newTask = await kanbanApi.createTask(
            columnId,
            `Task ${tasks.length + 1}`,
            order
        );
        setTasks([...tasks, newTask]);
    }

    async function deleteTask(id: Id) {
        setTasks(tasks.filter((task) => task.id !== id));
        await kanbanApi.deleteTask(id);
    }

    async function updateTask(id: Id, title: string) {
        const newTasks = tasks.map((task) => {
            if (task.id !== id) return task;
            return { ...task, title };
        });
        setTasks(newTasks);
        await kanbanApi.updateTask(id, { title });
    }

    // ✅ 新增：处理详情更新 (标题或内容)
    async function updateTaskDetail(id: Id, updates: { title?: string; content?: string }) {
        const newTasks = tasks.map((task) => {
            if (task.id !== id) return task;
            return { ...task, ...updates };
        });
        setTasks(newTasks);
        await kanbanApi.updateTask(id, updates);
    }

    // --- 拖拽逻辑 ---
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
             const currentTask = tasks.find(t => t.id === activeId);
             if (currentTask) {
                const tasksInThisColumn = tasks.filter(t => t.columnId === currentTask.columnId);
                const newOrder = tasksInThisColumn.findIndex(t => t.id === activeId);
                kanbanApi.moveTask(activeId, currentTask.columnId, newOrder);
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

    const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

    return (
        <div className="m-auto flex min-h-screen w-full items-center overflow-x-auto overflow-y-hidden px-[40px]">
            <DndContext
                sensors={sensors}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
            >
                <div className="m-auto flex gap-4">
                    <div className="flex gap-4">
                        <SortableContext items={columnsId}>
                            {columns.map((col) => (
                                <ColumnContainer
                                    key={col.id}
                                    column={col}
                                    deleteColumn={deleteColumn}
                                    updateColumn={updateColumn}
                                    createTask={createTask}
                                    deleteTask={deleteTask}
                                    updateTask={updateTask}
                                    onTaskClick={setViewingTask} // ✅ 传入打开弹窗函数
                                    tasks={tasks.filter((task) => task.columnId === col.id)}
                                />
                            ))}
                        </SortableContext>
                    </div>
                    <button
                        onClick={() => createNewColumn()}
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

            {/* ✅ 渲染详情弹窗 */}
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