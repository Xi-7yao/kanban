import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import type { Task, Id } from "../types";

interface Props {
  task: Task;
  onClose: () => void;
  onUpdate: (id: Id, updates: { title?: string; content?: string }) => void;
}

function TaskDetailModal({ task, onClose, onUpdate }: Props) {
  const [title, setTitle] = useState(task.title);
  const [content, setContent] = useState(task.content || "");

  useEffect(() => {
    setTitle(task.title);
    setContent(task.content || "");
  }, [task]);

  const handleSave = () => {
    onUpdate(task.id, { title, content });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative z-10 w-full max-w-2xl rounded-xl bg-gray-900 border border-gray-700 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* 标题编辑区 */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="w-full">
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
              任务标题
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-2xl font-bold text-white border-b-2 border-transparent focus:border-rose-500 focus:outline-none transition-colors pb-1"
              placeholder="输入任务标题..."
            />
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* 内容编辑区 */}
        <div className="mb-8">
          <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
            任务详情
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-64 rounded-lg bg-gray-800 p-4 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none leading-relaxed"
            placeholder="在这里添加详细的描述..."
          />
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 transition font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition font-medium shadow-lg shadow-rose-500/20"
          >
            <Save size={18} />
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;