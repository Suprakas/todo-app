import axios, { AxiosError } from 'axios';
import type { Task, TaskFilters, TaskInput, TaskStatus, WeekSummary } from './types';

// In production set VITE_API_URL to e.g. https://todo-api.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

export const http = axios.create({ baseURL, timeout: 60_000 });

export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { error?: string; details?: { message: string }[] } | undefined;
    if (data?.details?.length) return data.details[0].message;
    if (data?.error) return data.error;
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond';
    if (!error.response) return 'Can’t reach the server. Check your connection.';
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

export const tasksApi = {
  list: (filters: TaskFilters = {}) =>
    http.get<{ data: Task[] }>('/tasks', { params: filters }).then((r) => r.data.data),

  weekly: () =>
    http
      .get<{ data: { timeZone: string; weeks: WeekSummary[] } }>('/tasks/summary/weekly', {
        params: { tz: timeZone },
      })
      .then((r) => r.data.data.weeks),

  get: (id: string) => http.get<{ data: Task }>(`/tasks/${id}`).then((r) => r.data.data),

  create: (input: TaskInput) => http.post<{ data: Task }>('/tasks', input).then((r) => r.data.data),

  update: (id: string, input: Partial<TaskInput>) =>
    http.patch<{ data: Task }>(`/tasks/${id}`, input).then((r) => r.data.data),

  setStatus: (id: string, status: TaskStatus) =>
    http.patch<{ data: Task }>(`/tasks/${id}/status`, { status }).then((r) => r.data.data),

  remove: (id: string) => http.delete(`/tasks/${id}`).then(() => undefined),
};
