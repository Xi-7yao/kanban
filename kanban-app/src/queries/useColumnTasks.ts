import { useMemo } from 'react';
import type { Task, Id } from '../types';

export function useColumnTasks(taskMap: Record<Id, Task>, taskIds: Id[]): Task[] {
    return useMemo(() => {
        return taskIds.map(id => taskMap[id]).filter(Boolean);
    }, [taskMap, taskIds]);
}