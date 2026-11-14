import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage, tasksApi } from '../lib/api';
import type { Task, TaskFilters, TaskInput, TaskStatus } from '../lib/types';

export const keys = {
  weeks: ['weeks'] as const,
  tasks: ['tasks'] as const,
  list: (filters: TaskFilters) => ['tasks', 'list', filters] as const,
  task: (id: string) => ['tasks', 'detail', id] as const,
};

const refreshAll = (qc: QueryClient) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: keys.weeks }),
    qc.invalidateQueries({ queryKey: keys.tasks }),
  ]);

export const useWeeks = () => useQuery({ queryKey: keys.weeks, queryFn: tasksApi.weekly });

export const useTaskList = (filters: TaskFilters, enabled = true) =>
  useQuery({
    queryKey: keys.list(filters),
    queryFn: () => tasksApi.list(filters),
    enabled,
    placeholderData: (prev) => prev,
  });

export const useTask = (id: string | undefined) =>
  useQuery({
    queryKey: keys.task(id ?? ''),
    queryFn: () => tasksApi.get(id!),
    enabled: Boolean(id),
  });

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => tasksApi.create(input),
    onSuccess: () => refreshAll(qc),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TaskInput> }) => tasksApi.update(id, input),
    onSuccess: (task) => {
      qc.setQueryData(keys.task(task.id), task);
      return refreshAll(qc);
    },
  });
}

/** Patch a task everywhere it's cached (lists + detail) for snappy optimistic UI */
function patchCachedTask(qc: QueryClient, id: string, patch: (t: Task) => Task | null) {
  qc.setQueriesData<Task[]>({ queryKey: ['tasks', 'list'] }, (list) =>
    list?.flatMap((t) => (t.id === id ? (patch(t) ?? []) : [t])),
  );
  qc.setQueryData<Task>(keys.task(id), (t) => (t ? (patch(t) ?? undefined) : t));
}

export function useToggleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => tasksApi.setStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: keys.tasks });
      const snapshot = qc.getQueriesData({ queryKey: keys.tasks });
      patchCachedTask(qc, id, (t) => ({ ...t, status }));
      return { snapshot };
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(getErrorMessage(err));
    },
    onSettled: () => refreshAll(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const create = useCreateTask();

  return useMutation({
    mutationFn: (task: Task) => tasksApi.remove(task.id),
    onMutate: async (task) => {
      await qc.cancelQueries({ queryKey: keys.tasks });
      const snapshot = qc.getQueriesData({ queryKey: keys.tasks });
      patchCachedTask(qc, task.id, () => null);
      return { snapshot };
    },
    onError: (err, _task, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(getErrorMessage(err));
    },
    onSuccess: (_data, task) => {
      qc.removeQueries({ queryKey: keys.task(task.id) });
      toast.success('Task deleted', {
        action: {
          label: 'Undo',
          onClick: () =>
            create.mutate(
              {
                title: task.title,
                description: task.description,
                dueDate: task.dueDate,
                priority: task.priority,
                status: task.status,
              },
              { onError: (e) => toast.error(getErrorMessage(e)) },
            ),
        },
      });
    },
    onSettled: () => refreshAll(qc),
  });
}
