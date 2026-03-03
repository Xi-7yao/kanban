import { useMutation, useQueryClient } from '@tanstack/react-query';
import { kanbanApi } from '../../api';
import { boardKeys } from '../queryKeys';
import type { BoardData } from '../useBoardQuery';
import type { Id } from '../../types';

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
        mutationFn: ({ id, updates }: { id: Id; updates: { title?: string; content?: string } }) =>
            kanbanApi.updateTask(id, updates),
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: boardKeys.columns() });
            const previousBoard = queryClient.getQueryData<BoardData>(boardKeys.columns());

            if (previousBoard && previousBoard.taskMap[id]) {
                // 乐观更新：在 O(1) 的字典中定点修改
                queryClient.setQueryData<BoardData>(boardKeys.columns(), {
                    ...previousBoard,
                    taskMap: {
                        ...previousBoard.taskMap,
                        [id]: { ...previousBoard.taskMap[id], ...updates },
                    },
                });
            }
            return { previousBoard };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousBoard) {
                queryClient.setQueryData(boardKeys.columns(), context.previousBoard);
            }
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: boardKeys.columns() }),
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
                const columnId = previousBoard.taskMap[id].columnId;

                // 1. 从字典中移除
                const newTaskMap = { ...previousBoard.taskMap };
                delete newTaskMap[id];

                // 2. 从列的 ID 数组中移除
                const newColumnTaskIds = { ...previousBoard.columnTaskIds };
                newColumnTaskIds[columnId] = newColumnTaskIds[columnId].filter(taskId => taskId !== id);

                queryClient.setQueryData<BoardData>(boardKeys.columns(), {
                    ...previousBoard,
                    taskMap: newTaskMap,
                    columnTaskIds: newColumnTaskIds,
                });
            }
            return { previousBoard };
        },
        onError: (_err, _id, context) => {
            if (context?.previousBoard) {
                queryClient.setQueryData(boardKeys.columns(), context.previousBoard);
            }
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: boardKeys.columns() }),
    });
}

// 注意：根据你的 1.7 计划，moveTask 不需要 onMutate，因为 dnd-kit 会在本地维持拖拽的视觉覆盖层（dragOverrides）
export function useMoveTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, columnId, order }: { id: Id; columnId: Id; order: number }) =>
            kanbanApi.moveTask(id, columnId, order),
        onError: () => {
            queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
        },
        onSettled: () => {
            console.log('📡 [Network] moveTask 请求完成！正在触发后台重新拉取服务器数据...');
            // 如果界面在这个 log 出现后瞬间闪跳，100% 说明后端的 order 逻辑算错了！
            queryClient.invalidateQueries({ queryKey: boardKeys.columns() });
        }
    });
}