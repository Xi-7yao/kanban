import axios from 'axios';
import type { Column, Task, Id } from './types';

const apiClient = axios.create({
    baseURL: 'http://localhost:3000',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, 
});

apiClient.interceptors.request.use((config) => {
    const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];

    if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            error.response?.status === 401 &&
            !error.config?.url?.startsWith('/auth/')
        ) {
            window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(error);
    }
);

export const kanbanApi = {
    // 1. 鑾峰彇鐪嬫澘鏁版嵁
    getBoard: async () => {
        const res = await apiClient.get<Column[]>('/columns');
        return res.data;
    },

    // 2. 鎼滅储鍗＄墖
    searchCards: async (query: string) => {
        const res = await apiClient.get<Task[]>('/cards', { params: { q: query } });
        return res.data;
    },

    // --- 鍒楁搷浣?---
    createColumn: async (title: string, order: number) => {
        const res = await apiClient.post<Column>('/columns', { title, order });
        return res.data;
    },

    updateColumn: async (id: Id, updates: { title?: string; order?: number }) => {
        const res = await apiClient.put<Column>(`/columns/${id}`, updates);
        return res.data;
    },

    deleteColumn: async (id: Id) => {
        await apiClient.delete(`/columns/${id}`);
    },

    // --- 鍗＄墖/浠诲姟鎿嶄綔 ---
    createTask: async (columnId: Id, title: string, order: number) => {
        const res = await apiClient.post<Task>('/cards', {
            title,
            columnId: Number(columnId),
            order,
            content: "",
        });
        return res.data;
    },

    updateTask: async (id: Id, updates: { title?: string; content?: string; columnId?: number; order?: number; expectedUpdatedAt?: string }) => {
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
        const res = await apiClient.post('/auth/login', { email, password });
        return res.data;
    },

    register: async (email: string, password: string, name?: string) => {
        const res = await apiClient.post('/auth/register', { email, password, name });
        return res.data;
    },

    logout: async () => {
        await apiClient.post('/auth/logout');
    },

    me: async () => {
        const res = await apiClient.get('/auth/me');
        return res.data;
    },
};
