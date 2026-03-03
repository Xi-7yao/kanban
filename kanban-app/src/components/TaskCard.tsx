import { memo, useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, FileText, Lock } from "lucide-react";
import type { Task } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import { useUpdateTask, useDeleteTask } from "../queries/mutations/useTaskMutations";
import { useLock } from "../contexts/LockContext";

interface Props {
    task: Task;
    onClick?: (task: Task) => void;
}

const TaskCard = memo(function TaskCard({ task, onClick }: Props) {
    const [mouseIsOver, setMouseIsOver] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [value, setValue] = useState(task.title);

    const debouncedTitle = useDebounce(value, 500);
    const { mutate: updateTask } = useUpdateTask();
    const { mutate: deleteTask } = useDeleteTask();
    const { isLocked } = useLock();

    const isTaskLocked = isLocked(`task-${task.id}`);

    useEffect(() => {
        if (debouncedTitle !== task.title && debouncedTitle.trim() !== "") {
            updateTask({ id: task.id, updates: { title: debouncedTitle } });
        }
    }, [debouncedTitle, task.id, task.title, updateTask]);

    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: { type: "Task", task },
        disabled: editMode || isTaskLocked,
    });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };

    if (isDragging || isTaskLocked) {
        return (
            <div
                ref={setNodeRef}
                style={{ transition, transform: CSS.Transform.toString(transform) }}
                className="opacity-30 bg-gray-900 p-2.5 h-[100px] min-h-[100px] items-center flex justify-center text-left rounded-xl border-2 border-rose-500 relative"
            >
               {isTaskLocked && <Lock className="text-rose-500" size={24} />}
            </div>
        );
    }

    if (editMode) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className="bg-gray-900 p-2.5 h-[100px] min-h-[100px] items-center flex text-left rounded-xl border-2 border-transparent hover:border-rose-500 cursor-grab relative"
            >
                <textarea
                    className="h-[90%] w-full resize-none border-none rounded bg-transparent text-white focus:outline-none"
                    value={value}
                    autoFocus
                    placeholder="输入任务标题..."
                    onBlur={() => setEditMode(false)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && e.shiftKey) return;
                        if (e.key === "Enter") setEditMode(false);
                    }}
                    onChange={(e) => setValue(e.target.value)}
                />
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => setEditMode(true)}
            onMouseEnter={() => setMouseIsOver(true)}
            onMouseLeave={() => setMouseIsOver(false)}
            className="bg-gray-900 p-2.5 h-[100px] min-h-[100px] items-center flex text-left rounded-xl border-2 border-transparent hover:border-rose-500 cursor-grab relative task group"
        >
            <p className="my-auto h-[90%] w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap text-gray-100">
                {task.title}
                {task.content && (
                    <span className="block text-xs text-gray-500 line-clamp-2 mt-2">
                        {task.content}
                    </span>
                )}
            </p>

            {mouseIsOver && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    {onClick && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick(task);
                            }}
                            className="stroke-white bg-gray-800 p-2 rounded opacity-60 hover:opacity-100 hover:bg-rose-500 transition"
                            title="查看详情"
                        >
                            <FileText size={16} />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                        }}
                        className="stroke-white bg-gray-800 p-2 rounded opacity-60 hover:opacity-100 hover:bg-red-500 transition"
                        title="删除任务"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}, (prev, next) => {
    return prev.task.id === next.task.id
        && prev.task.title === next.task.title
        && prev.task.content === next.task.content
        && prev.task.columnId === next.task.columnId;
});

export default TaskCard;