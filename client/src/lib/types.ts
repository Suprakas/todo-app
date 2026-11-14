export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // ISO — the task's date & start time
  endsAt: string | null; // optional end time
  priority: Priority | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  dueDate: string; // ISO
  endsAt?: string | null;
  priority?: Priority | null;
  status?: TaskStatus;
}

export interface WeekSummary {
  weekKey: string; // yyyy-MM-dd of the Monday
  weekStart: string; // ISO instant, inclusive
  weekEnd: string; // ISO instant, exclusive (next Monday)
  total: number;
  open: number;
  completed: number;
}

export interface TaskFilters {
  search?: string;
  from?: string;
  to?: string;
}
