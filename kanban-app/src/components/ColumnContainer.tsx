import { memo, useState } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Plus } from 'lucide-react';
import type { Column, Id, Task } from '../types';
import TaskCard from './TaskCard';
import { useColumnTasks } from '../queries/useColumnTasks';
import { useUpdateColumn, useDeleteColumn } from '../queries/mutations/useColumnMutations';
import { useCreateTask } from '../queries/mutations/useTaskMutations';

interface Props {
  column: Column;
  taskIds: Id[];
  taskMap: Record<Id, Task>;
  onTaskClick?: (task: Task) => void;
}

const ColumnContainer = memo(
  function ColumnContainer({
    column,
    taskIds,
    taskMap,
    onTaskClick,
  }: Props) {
    const [editMode, setEditMode] = useState(false);
    const [draftTitle, setDraftTitle] = useState(column.title);

    const tasks = useColumnTasks(taskMap, taskIds);
    const { mutate: updateColumn } = useUpdateColumn();
    const { mutate: deleteColumn } = useDeleteColumn();
    const { mutate: createTask } = useCreateTask();

    const commitTitle = () => {
      const nextTitle = draftTitle.trim();
      setEditMode(false);

      if (!nextTitle) {
        setDraftTitle(column.title);
        return;
      }

      if (nextTitle !== column.title) {
        updateColumn({ id: column.id, title: nextTitle });
      }
    };

    const {
      setNodeRef,
      attributes,
      listeners,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: column.id,
      data: { type: 'Column', column },
      disabled: editMode,
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
          className="h-[500px] max-h-[500px] w-[350px] rounded-md border-2 border-rose-500 bg-gray-800 opacity-40"
        ></div>
      );
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex h-[500px] max-h-[500px] w-[350px] flex-col rounded-md bg-gray-900"
      >
        <div
          {...attributes}
          {...listeners}
          onClick={() => {
            setDraftTitle(column.title);
            setEditMode(true);
          }}
          className="flex h-[60px] cursor-grab items-center justify-between rounded-md rounded-b-none border-4 border-gray-800 bg-gray-900 p-3 text-md font-bold"
        >
          <div className="flex gap-2">
            <div className="flex items-center justify-center rounded-full bg-gray-900 px-2 py-1 text-sm">
              {taskIds.length}
            </div>
            {!editMode && column.title}
            {editMode && (
              <input
                className="rounded border bg-black px-2 outline-none focus:border-rose-500"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                autoFocus
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                  if (e.key === 'Escape') {
                    setDraftTitle(column.title);
                    setEditMode(false);
                  }
                }}
              />
            )}
          </div>
          <button
            onClick={() => deleteColumn(column.id)}
            className="rounded px-1 py-2 stroke-gray-500 hover:bg-gray-900 hover:stroke-white"
          >
            <Trash2 />
          </button>
        </div>

        <div className="flex flex-grow flex-col gap-4 overflow-x-hidden overflow-y-auto p-2">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={onTaskClick} />
            ))}
          </SortableContext>
        </div>

        <button
          className="flex items-center gap-2 rounded-md border-2 border-gray-900 border-x-gray-900 p-4 hover:bg-gray-900 hover:text-rose-500 active:bg-black"
          onClick={() => {
            const lastTask = tasks[tasks.length - 1];
            const nextOrder = lastTask ? lastTask.order + 1024 : 1024;

            createTask({
              columnId: column.id,
              title: `Task ${taskIds.length + 1}`,
              order: nextOrder,
            });
          }}
        >
          <Plus />
          Add task
        </button>
      </div>
    );
  },
  (prev, next) => {
    if (prev.column.title !== next.column.title) return false;
    if (prev.taskIds.length !== next.taskIds.length) return false;
    for (let i = 0; i < prev.taskIds.length; i++) {
      const id = prev.taskIds[i];
      if (id !== next.taskIds[i]) return false;
      if (prev.taskMap[id] !== next.taskMap[id]) return false;
    }
    return true;
  },
);

export default ColumnContainer;

