import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, FileText } from "lucide-react";
import type { Task, Id } from "../types";
import { useEffect, useState } from "react";
import { useDebounce } from "../hooks/useDebounce";

interface Props {
    task: Task;
    deleteTask: (id: Id) => void;
    updateTask: (id: Id, title: string) => void;
    onClick?: (task: Task) => void;
}

function TaskCard({ task, deleteTask, updateTask, onClick }: Props) {
    const [mouseIsOver, setMouseIsOver] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [value, setValue] = useState(task.title);

    const debouncedTitle = useDebounce(value, 500);

    useEffect(() => {
        if (debouncedTitle !== task.title) {
            updateTask(task.id, debouncedTitle);
        }
    }, [debouncedTitle, task.id, task.title]);

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
        disabled: editMode,
    });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };

    // 拖拽时的样式（保持不变，已经是 border-2）
    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-30 bg-gray-900 p-2.5 h-[100px] min-h-[100px] items-center flex text-left rounded-xl border-2 border-rose-500 cursor-grab relative"
            />
        );
    }

    // 编辑模式
    if (editMode) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                // ✅ 修复：使用 border-2 border-transparent 替代 ring
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

    // 默认展示模式
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => setEditMode(true)}
            onMouseEnter={() => setMouseIsOver(true)}
            onMouseLeave={() => setMouseIsOver(false)}
            // ✅ 修复：使用 border-2 border-transparent 替代 ring，消除渲染残留
            className="bg-gray-900 p-2.5 h-[100px] min-h-[100px] items-center flex text-left rounded-xl border-2 border-transparent hover:border-rose-500 cursor-grab relative task group"
        >
            <p className="my-auto h-[90%] w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap text-gray-100">
                {task.title}

                {task.content && (
                    <p className="text-xs text-gray-500 line-clamp-2 mt-2">
                        {task.content}
                    </p>
                )}
            </p>

            {mouseIsOver && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    {/* 详情按钮 */}
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

                    {/* 删除按钮 */}
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
}

export default TaskCard;