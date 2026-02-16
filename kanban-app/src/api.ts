import axios from 'axios';
import type { Column, Task, Id } from './types';

const apiClient = axios.create({
    baseURL: 'http://localhost:3000',
    headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request if available
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 Unauthorized — auto-logout (skip for /auth/ requests)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            error.response?.status === 401 &&
            !error.config?.url?.startsWith('/auth/')
        ) {
            localStorage.removeItem('access_token');
            window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(error);
    }
);

export const kanbanApi = {
    // 1. 获取看板数据
    getBoard: async () => {
        const res = await apiClient.get<Column[]>('/columns');
        return res.data;
    },

    // 2. 搜索卡片
    searchCards: async (query: string) => {
        const res = await apiClient.get<Task[]>('/cards', { params: { q: query } });
        return res.data;
    },

    // --- 列操作 ---
    createColumn: async (title: string, order: number) => {
        const res = await apiClient.post<Column>('/columns', { title, order });
        return res.data;
    },

    updateColumn: async (id: Id, title: string) => {
        const res = await apiClient.put<Column>(`/columns/${id}`, { title });
        return res.data;
    },

    deleteColumn: async (id: Id) => {
        await apiClient.delete(`/columns/${id}`);
    },

    // --- 卡片/任务操作 ---
    createTask: async (columnId: Id, title: string, order: number) => {
        const res = await apiClient.post<Task>('/cards', {
            title,
            columnId: Number(columnId),
            order,
            content: "",
        });
        return res.data;
    },

    updateTask: async (id: Id, updates: { title?: string; content?: string; columnId?: number; order?: number }) => {
        const res = await apiClient.put<Task>(`/cards/${id}`, updates);
        return res.data;
    },

    moveTask: async (id: Id, columnId: Id, order: number) => {
        const res = await apiClient.put<Task>(`/cards/${id}`, {
            columnId: Number(columnId),
            order
        });
        return res.data;
    },

    deleteTask: async (id: Id) => {
        await apiClient.delete(`/cards/${id}`);
    }
};

export const authApi = {
    login: async (email: string, password: string) => {
        const res = await apiClient.post<{ access_token: string }>('/auth/login', { email, password });
        localStorage.setItem('access_token', res.data.access_token);
        return res.data;
    },

    register: async (email: string, password: string, name?: string) => {
        const res = await apiClient.post<{ access_token: string }>('/auth/register', { email, password, name });
        localStorage.setItem('access_token', res.data.access_token);
        return res.data;
    },

    logout: () => {
        localStorage.removeItem('access_token');
    },

    isLoggedIn: () => {
        return !!localStorage.getItem('access_token');
    },
};