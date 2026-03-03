import { memo, useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, Plus } from "lucide-react";
import type { Column, Id, Task } from "../types";
import TaskCard from "./TaskCard";
import { useColumnTasks } from "../queries/useColumnTasks";
import { useUpdateColumn, useDeleteColumn } from "../queries/mutations/useColumnMutations";
import { useCreateTask } from "../queries/mutations/useTaskMutations";
import { useLock } from "../contexts/LockContext";

interface Props {
    column: Column;
    taskIds: Id[];
    taskMap: Record<Id, Task>;
    onTaskClick?: (task: Task) => void;
}

const ColumnContainer = memo(function ColumnContainer({
    column,
    taskIds,
    taskMap,
    onTaskClick,
}: Props) {
    const [editMode, setEditMode] = useState(false);

    const tasks = useColumnTasks(taskMap, taskIds);
    const { mutate: updateColumn } = useUpdateColumn();
    const { mutate: deleteColumn } = useDeleteColumn();
    const { mutate: createTask } = useCreateTask();
    const { isLocked } = useLock();

    const isColLocked = isLocked(`col-${column.id}`);

    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: column.id,
        data: { type: "Column", column },
        disabled: editMode || isColLocked,
    });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={{ transition }}
                className="bg-gray-800 opacity-40 border-2 border-rose-500 w-[350px] h-[500px] max-h-[500px] rounded-md flex flex-col"
            ></div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} className="bg-gray-900 w-[350px] h-[500px] max-h-[500px] rounded-md flex flex-col">
            <div
                {...attributes}
                {...listeners}
                onClick={() => setEditMode(true)}
                className="bg-gray-900 text-md h-[60px] cursor-grab rounded-md rounded-b-none p-3 font-bold border-gray-800 border-4 flex items-center justify-between"
            >
                <div className="flex gap-2">
                    <div className="flex justify-center items-center bg-gray-900 px-2 py-1 text-sm rounded-full">
                        {taskIds.length}
                    </div>
                    {!editMode && column.title}
                    {editMode && (
                        <input
                            className="bg-black focus:border-rose-500 border rounded outline-none px-2"
                            value={column.title}
                            onChange={(e) => updateColumn({ id: column.id, title: e.target.value })}
                            autoFocus
                            onBlur={() => setEditMode(false)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") setEditMode(false);
                            }}
                        />
                    )}
                </div>
                <button
                    onClick={() => deleteColumn(column.id)}
                    className="stroke-gray-500 hover:stroke-white hover:bg-gray-900 rounded px-1 py-2"
                >
                    <Trash2 />
                </button>
            </div>

            <div className="flex flex-grow flex-col gap-4 p-2 overflow-x-hidden overflow-y-auto">
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={onTaskClick} />
                    ))}
                </SortableContext>
            </div>

            <button
                className="flex gap-2 items-center border-gray-900 border-2 rounded-md p-4 border-x-gray-900 hover:bg-gray-900 hover:text-rose-500 active:bg-black"
                onClick={() => {
                    // 🚀 获取当前列最后一张卡片的 order，加上步长
                    const lastTask = tasks[tasks.length - 1];
                    const nextOrder = lastTask ? lastTask.order + 1024 : 1024;

                    createTask({
                        columnId: column.id,
                        title: `Task ${taskIds.length + 1}`,
                        order: nextOrder
                    });
                }}
            >
                <Plus />
                Add task
            </button>
        </div>
    );
}, (prev, next) => {
    if (prev.column.title !== next.column.title) return false;
    if (prev.taskIds.length !== next.taskIds.length) return false;
    for (let i = 0; i < prev.taskIds.length; i++) {
        const id = prev.taskIds[i];
        if (id !== next.taskIds[i]) return false;
        if (prev.taskMap[id] !== next.taskMap[id]) return false;
    }
    return true;
});

export default ColumnContainer;