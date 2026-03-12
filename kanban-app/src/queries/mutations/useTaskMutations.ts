import { useMutation, useQueryClient } from '@tanstack/react-query';
import { kanbanApi } from '../../api';
import { boardKeys } from '../queryKeys';
import type { BoardData } from '../useBoardQuery';
import type { Id } from '../../types';
import { applyTaskDelete, applyTaskMove, applyTaskUpdate } from '../boardPatches';

type TaskUpdatePayload = {
  title?: string;
  content?: string;
  expectedUpdatedAt?: string;
};

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ columnId, title, order }: { columnId: Id; title: string; order: number }) =>
      kanbanApi.createTask(columnId, title, order),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.columns() }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: Id; updates: TaskUpdatePayload }) =>
      kanbanApi.updateTask(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.columns() });
      const previousBoard = queryClient.getQueryData<BoardData>(boardKeys.columns());
      const optimisticUpdates = { ...updates };
      delete optimisticUpdates.expectedUpdatedAt;

      if (previousBoard && previousBoard.taskMap[id]) {
        queryClient.setQueryData<BoardData>(
          boardKeys.columns(),
          applyTaskUpdate(previousBoard, id, optimisticUpdates),
        );
      }
      return { previousBoard };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.columns(), context.previousBoard);
      }
    },
    onSuccess: (updatedTask, { id }) => {
      queryClient.setQueryData<BoardData>(boardKeys.columns(), (current) => {
        if (!current) return current;
        return applyTaskUpdate(current, id, updatedTask);
      });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => kanbanApi.deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.columns() });
      const previousBoard = queryClient.getQueryData<BoardData>(boardKeys.columns());

      if (previousBoard && previousBoard.taskMap[id]) {
        queryClient.setQueryData<BoardData>(boardKeys.columns(), applyTaskDelete(previousBoard, id));
      }
      return { previousBoard };
    },
    onError: (_err, _id, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.columns(), context.previousBoard);
      }
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, columnId, order }: { id: Id; columnId: Id; order: number }) =>
      kanbanApi.moveTask(id, columnId, order),
    onSuccess: (updatedTask, { id, columnId, order }) => {
      queryClient.setQueryData<BoardData>(boardKeys.columns(), (current) => {
        if (!current) return current;
        return applyTaskMove(current, id, columnId, order, { updatedAt: updatedTask.updatedAt });
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
    },
  });
}
