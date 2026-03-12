import axios from "axios";
import { memo, useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, FileText, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Task } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import { useUpdateTask, useDeleteTask } from "../queries/mutations/useTaskMutations";
import { boardKeys } from "../queries/queryKeys";
import { useLock } from "../contexts/LockContext";
import { useSocketContext } from "../contexts/SocketContext";
import { useToast } from "../contexts/ToastContext";

interface Props {
  task: Task;
  onClick?: (task: Task) => void;
}

const TaskCard = memo(function TaskCard({ task, onClick }: Props) {
  const [mouseIsOver, setMouseIsOver] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [value, setValue] = useState(task.title);
  const [lastCommittedTitle, setLastCommittedTitle] = useState(task.title);
  const [lastAttemptedTitle, setLastAttemptedTitle] = useState(task.title);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(task.updatedAt);
  const [isSavingInline, setIsSavingInline] = useState(false);

  const debouncedTitle = useDebounce(value, 500);
  const queryClient = useQueryClient();
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutate: deleteTask } = useDeleteTask();
  const { isLocked } = useLock();
  const { emitLockAcquire, emitLockRelease } = useSocketContext();
  const { showToast } = useToast();

  const isTaskLocked = isLocked(`task-${task.id}`);

  const enterEditMode = () => {
    setValue(task.title);
    setLastCommittedTitle(task.title);
    setLastAttemptedTitle(task.title);
    setExpectedUpdatedAt(task.updatedAt);
    setEditMode(true);
    emitLockAcquire(task.id);
  };

  const exitEditMode = () => {
    setEditMode(false);
    emitLockRelease(task.id);
  };

  useEffect(() => {
    if (!editMode || isSavingInline) {
      return;
    }

    const nextTitle = debouncedTitle.trim();
    if (!nextTitle || nextTitle === lastCommittedTitle || nextTitle === lastAttemptedTitle) {
      return;
    }

    let isCancelled = false;

    const saveInlineTitle = async () => {
      setIsSavingInline(true);
      setLastAttemptedTitle(nextTitle);

      try {
        const updatedTask = await updateTask({
          id: task.id,
          updates: {
            title: nextTitle,
            expectedUpdatedAt,
          },
        });

        if (isCancelled) {
          return;
        }

        setLastCommittedTitle(updatedTask.title);
        setExpectedUpdatedAt(updatedTask.updatedAt);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (axios.isAxiosError(error) && error.response?.status === 409) {
          showToast("This card was updated by someone else. Refresh and try again.", "error");
          setEditMode(false);
          emitLockRelease(task.id);
          void queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
          return;
        }

        showToast("Failed to save task title.", "error");
      } finally {
        if (!isCancelled) {
          setIsSavingInline(false);
        }
      }
    };

    void saveInlineTitle();

    return () => {
      isCancelled = true;
    };
  }, [
    debouncedTitle,
    editMode,
    emitLockRelease,
    expectedUpdatedAt,
    isSavingInline,
    lastAttemptedTitle,
    lastCommittedTitle,
    queryClient,
    showToast,
    task.id,
    updateTask,
  ]);

  useEffect(() => {
    if (editMode) {
      return;
    }

    setValue(task.title);
    setLastCommittedTitle(task.title);
    setLastAttemptedTitle(task.title);
    setExpectedUpdatedAt(task.updatedAt);
  }, [editMode, task.title, task.updatedAt]);

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
          placeholder="Enter task title..."
          onBlur={() => exitEditMode()}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.shiftKey) return;
            if (e.key === "Enter") exitEditMode();
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
      onClick={() => enterEditMode()}
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
              title="View details"
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
            title="Delete task"
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
