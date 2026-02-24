import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Trash2, Plus } from "lucide-react";
import type { Column, Id, Task } from "../types";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import TaskCard from "./TaskCard";

interface Props {
  column: Column;
  deleteColumn: (id: Id) => void;
  updateColumn: (id: Id, title: string) => void;

  createTask: (columnId: Id) => void;
  updateTask: (id: Id, title: string) => void;
  deleteTask: (id: Id) => void;
  tasks: Task[];
  
  // ✅ 新增
  onTaskClick?: (task: Task) => void;
}

function ColumnContainer({
  column,
  deleteColumn,
  updateColumn,
  createTask,
  tasks,
  deleteTask,
  updateTask,
  onTaskClick, // ✅ 接收
}: Props) {
  const [editMode, setEditMode] = useState(false);

  const tasksIds = useMemo(() => {
    return tasks.map((task) => task.id);
  }, [tasks]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
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
        className="bg-gray-800 opacity-40 border-2 border-rose-500 w-[350px] h-[500px] max-h-[500px] rounded-md flex flex-col"
      ></div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-900 w-[350px] h-[500px] max-h-[500px] rounded-md flex flex-col"
    >
      {/* Column Title */}
      <div
        {...attributes}
        {...listeners}
        onClick={() => setEditMode(true)}
        className="bg-gray-900 text-md h-[60px] cursor-grab rounded-md rounded-b-none p-3 font-bold border-gray-800 border-4 flex items-center justify-between"
      >
        <div className="flex gap-2">
          <div className="flex justify-center items-center bg-gray-900 px-2 py-1 text-sm rounded-full">
            {tasks.length}
          </div>
          {!editMode && column.title}
          {editMode && (
            <input
              className="bg-black focus:border-rose-500 border rounded outline-none px-2"
              value={column.title}
              onChange={(e) => updateColumn(column.id, e.target.value)}
              autoFocus
              onBlur={() => setEditMode(false)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                setEditMode(false);
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

      {/* Column Task Container */}
      <div className="flex flex-grow flex-col gap-4 p-2 overflow-x-hidden overflow-y-auto">
        <SortableContext items={tasksIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              deleteTask={deleteTask}
              updateTask={updateTask}
              onClick={onTaskClick} // ✅ 传递
            />
          ))}
        </SortableContext>
      </div>

      {/* Footer */}
      <button
        className="flex gap-2 items-center border-gray-900 border-2 rounded-md p-4 border-x-gray-900 hover:bg-gray-900 hover:text-rose-500 active:bg-black"
        onClick={() => createTask(column.id)}
      >
        <Plus />
        Add task
      </button>
    </div>
  );
}

export default ColumnContainer;