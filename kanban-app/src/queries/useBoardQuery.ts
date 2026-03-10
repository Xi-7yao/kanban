import { useQuery } from '@tanstack/react-query';
import { boardKeys } from './queryKeys';
import { kanbanApi } from '../api';
import type { Column, Task, Id } from '../types';

export interface BoardData {
    columns: Column[];
    taskMap: Record<Id, Task>;
    columnTaskIds: Record<Id, Id[]>;
}

export function useBoardQuery() {
    return useQuery({
        queryKey: boardKeys.columns(),
        queryFn: async (): Promise<BoardData> => {
            const rawColumns = await kanbanApi.getBoard();

            const columns: Column[] = [];
            const taskMap: Record<Id, Task> = {};
            const columnTaskIds: Record<Id, Id[]> = {};

            rawColumns.forEach((rawCol: any) => {
                const { cards, ...columnData } = rawCol;
                columns.push(columnData);
                columnTaskIds[columnData.id] = [];

                const sortedCards = (cards || []).sort((a: Task, b: Task) => a.order - b.order);

                sortedCards.forEach((card: Task) => {
                    taskMap[card.id] = card;
                    columnTaskIds[columnData.id].push(card.id);
                });
            });

            columns.sort((a, b) => a.order - b.order);

            // console.group('📥 [Server Data] 刚刚从服务器拉取的最新排序');
            // Object.keys(columnTaskIds).forEach(colId => {
            //     console.log(`列 ID: ${colId} => 内部 Task 排序:`, columnTaskIds[colId]);
            // });
            // console.groupEnd();

            return { columns, taskMap, columnTaskIds };
        },
        staleTime: 5 * 60 * 1000,
    });
}