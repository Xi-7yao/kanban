import { useMutation, useQueryClient } from '@tanstack/react-query';
import { kanbanApi } from '../../api';
import { boardKeys } from '../queryKeys';
import type { BoardData } from '../useBoardQuery';
import type { Id } from '../../types';
import { applyColumnDelete, applyColumnUpdate } from '../boardPatches';

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
    mutationFn: ({ id, title, expectedUpdatedAt }: { id: Id; title: string; expectedUpdatedAt?: string }) =>
      kanbanApi.updateColumn(id, { title, expectedUpdatedAt }),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.columns() });
      const previousBoard = queryClient.getQueryData<BoardData>(boardKeys.columns());

      if (previousBoard) {
        queryClient.setQueryData<BoardData>(boardKeys.columns(), applyColumnUpdate(previousBoard, id, { title }));
      }
      return { previousBoard };
    },
    onError: (_err, _newTitle, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(boardKeys.columns(), context.previousBoard);
      }
    },
    onSuccess: (updatedColumn, { id }) => {
      queryClient.setQueryData<BoardData>(boardKeys.columns(), (current) => {
        if (!current) return current;
        return applyColumnUpdate(current, id, updatedColumn);
      });
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
        queryClient.setQueryData<BoardData>(boardKeys.columns(), applyColumnDelete(previousBoard, id));
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

export function useMoveColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, order }: { id: Id; order: number }) => kanbanApi.updateColumn(id, { order }),
    onSuccess: (updatedColumn, { id }) => {
      queryClient.setQueryData<BoardData>(boardKeys.columns(), (current) => {
        if (!current) return current;
        return applyColumnUpdate(current, id, updatedColumn);
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
    },
  });
}
