import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save } from 'lucide-react';
import type { Task, Id } from '../types';
import { useSocketContext } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';

interface Props {
  task: Task;
  onClose: () => void;
  onUpdate: (
    id: Id,
    updates: { title?: string; content?: string; expectedUpdatedAt?: string }
  ) => Promise<void>;
}

function TaskDetailModal({ task, onClose, onUpdate }: Props) {
  const [title, setTitle] = useState(task.title);
  const [content, setContent] = useState(task.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [expectedUpdatedAt] = useState(task.updatedAt);
  const { emitLockAcquire, emitLockRelease } = useSocketContext();
  const { showToast } = useToast();

  useEffect(() => {
    emitLockAcquire(task.id);
    return () => {
      emitLockRelease(task.id);
    };
  }, [task.id, emitLockAcquire, emitLockRelease]);

  const handleSave = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      showToast('Task title cannot be empty.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(task.id, { title: nextTitle, content, expectedUpdatedAt });
      onClose();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        showToast('This card was updated by someone else. Refresh and try again.', 'error');
      } else {
        showToast('Failed to save card details.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={isSaving ? undefined : onClose}></div>

      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="w-full">
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-gray-400">
              Task Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-b-2 border-transparent bg-transparent pb-1 text-2xl font-bold text-white transition-colors focus:border-rose-500 focus:outline-none"
              placeholder="Enter task title..."
              disabled={isSaving}
            />
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-8">
          <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-gray-400">
            Task Details
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-64 w-full resize-none rounded-lg bg-gray-800 p-4 leading-relaxed text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            placeholder="Add a detailed description here..."
            disabled={isSaving}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg px-4 py-2 font-medium text-gray-300 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-rose-500 px-6 py-2 font-medium text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;
