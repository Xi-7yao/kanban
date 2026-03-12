import axios from 'axios';
import type { Column, Task, Id } from './types';
import { API_BASE_URL } from './config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const csrfToken = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrf_token='))
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

const hasCsrfCookie = () =>
  document.cookie
    .split('; ')
    .some((row) => row.startsWith('csrf_token='));

const ensureCsrfCookie = async () => {
  if (hasCsrfCookie()) {
    return;
  }
  await apiClient.get('/auth/csrf');
};

export const kanbanApi = {
  getBoard: async () => {
    const res = await apiClient.get<Column[]>('/columns');
    return res.data;
  },

  searchCards: async (query: string) => {
    const res = await apiClient.get<Task[]>('/cards', { params: { q: query } });
    return res.data;
  },

  createColumn: async (title: string, order: number) => {
    const res = await apiClient.post<Column>('/columns', { title, order });
    return res.data;
  },

  updateColumn: async (id: Id, updates: { title?: string; order?: number; expectedUpdatedAt?: string }) => {
    const res = await apiClient.put<Column>(`/columns/${id}`, updates);
    return res.data;
  },

  deleteColumn: async (id: Id) => {
    await apiClient.delete(`/columns/${id}`);
  },

  createTask: async (columnId: Id, title: string, order: number) => {
    const res = await apiClient.post<Task>('/cards', {
      title,
      columnId: Number(columnId),
      order,
      content: '',
    });
    return res.data;
  },

  updateTask: async (
    id: Id,
    updates: {
      title?: string;
      content?: string;
      columnId?: number;
      order?: number;
      expectedUpdatedAt?: string;
    }
  ) => {
    const res = await apiClient.put<Task>(`/cards/${id}`, updates);
    return res.data;
  },

  moveTask: async (id: Id, columnId: Id, order: number) => {
    const res = await apiClient.put<Task>(`/cards/${id}`, {
      columnId: Number(columnId),
      order,
    });
    return res.data;
  },

  deleteTask: async (id: Id) => {
    await apiClient.delete(`/cards/${id}`);
  },
};

export const authApi = {
  login: async (email: string, password: string) => {
    await ensureCsrfCookie();
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },

  register: async (email: string, password: string, name?: string) => {
    await ensureCsrfCookie();
    const res = await apiClient.post('/auth/register', { email, password, name });
    return res.data;
  },

  logout: async () => {
    await ensureCsrfCookie();
    await apiClient.post('/auth/logout');
  },

  me: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
};
