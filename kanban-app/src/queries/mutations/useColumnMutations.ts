import { useMutation, useQueryClient } from '@tanstack/react-query';
import { kanbanApi } from '../../api';
import { boardKeys } from '../queryKeys';
import type { BoardData } from '../useBoardQuery';
import type { Id } from '../../types';

export function useCreateColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, order }: { title: string; order: number }) =>
      kanbanApi.createColumn(title, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
    },
  });
}

export function useUpdateColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: Id; title: string }) => kanbanApi.updateColumn(id, { title }),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.columns() });
      const previousBoard = queryClient.getQueryData<BoardData>(boardKeys.columns());

      if (previousBoard) {
        queryClient.setQueryData<BoardData>(boardKeys.columns(), {
          ...previousBoard,
          columns: previousBoard.columns.map((col) =>
            col.id === id ? { ...col, title } : col,
          ),
        });
      }
      return { previousBoard };
    },
    onError: (_err, _newTitle, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.columns(), context.previousBoard);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
    },
  });
}

export function useDeleteColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => kanbanApi.deleteColumn(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.columns() });
      const previousBoard = queryClient.getQueryData<BoardData>(boardKeys.columns());

      if (previousBoard) {
        const newColumns = previousBoard.columns.filter((col) => col.id !== id);
        const removedTaskIds = previousBoard.columnTaskIds[id] ?? [];

        const newColumnTaskIds = { ...previousBoard.columnTaskIds };
        delete newColumnTaskIds[id];

        const newTaskMap = { ...previousBoard.taskMap };
        removedTaskIds.forEach((taskId) => {
          delete newTaskMap[taskId];
        });

        queryClient.setQueryData<BoardData>(boardKeys.columns(), {
          ...previousBoard,
          columns: newColumns,
          columnTaskIds: newColumnTaskIds,
          taskMap: newTaskMap,
        });
      }
      return { previousBoard };
    },
    onError: (_err, _id, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.columns(), context.previousBoard);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
    },
  });
}

export function useMoveColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, order }: { id: Id; order: number }) => kanbanApi.updateColumn(id, { order }),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
    },
  });
}
