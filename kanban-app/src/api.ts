import axios from 'axios';
import type { Column, Task, Id } from './types';

const apiClient = axios.create({
    baseURL: 'http://localhost:3000', // 后端地址
    headers: { 'Content-Type': 'application/json' }
});

export const kanbanApi = {
    // 1. 获取看板数据
    getBoard: async () => {
        const res = await apiClient.get<Column[]>('/board');
        return res.data;
    },

    // 2. 搜索卡片
    searchCards: async (query: string) => {
        const res = await apiClient.get<Task[]>(`/filtered-cards/${query}`);
        return res.data;
    },

    // --- 列操作 ---
    createColumn: async (title: string, order: number) => {
        const res = await apiClient.post<Column>('/column', { title, order });
        return res.data;
    },

    updateColumn: async (id: Id, title: string) => {
        const res = await apiClient.put<Column>(`/column/${id}`, { title });
        return res.data;
    },

    deleteColumn: async (id: Id) => {
        await apiClient.delete(`/column/${id}`);
    },

    // --- 卡片/任务操作 ---
    createTask: async (columnId: Id, title: string, order: number) => {
        const res = await apiClient.post<Task>('/card', {
            title,
            columnId: Number(columnId),
            order,
            content: "",
        });
        return res.data;
    },

    // ✅ 核心修改：支持部分更新 (Partial Update)
    updateTask: async (id: Id, updates: { title?: string; content?: string; columnId?: number; order?: number }) => {
        const res = await apiClient.put<Task>(`/card/${id}`, updates);
        return res.data;
    },

    // 移动卡片 (其实也是调用 updateTask，为了语义清晰保留)
    moveTask: async (id: Id, columnId: Id, order: number) => {
        const res = await apiClient.put<Task>(`/card/${id}`, {
            columnId: Number(columnId),
            order
        });
        return res.data;
    },

    deleteTask: async (id: Id) => {
        await apiClient.delete(`/card/${id}`);
    }
};