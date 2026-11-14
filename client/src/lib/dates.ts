import {
  addDays,
  addWeeks,
  differenceInCalendarWeeks,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import type { Task } from './types';

export const WEEK = { weekStartsOn: 1 } as const; // weeks run Monday → Sunday

export const weekStartOf = (date: Date) => startOfWeek(date, WEEK);
export const weekKeyOf = (date: Date) => format(weekStartOf(date), 'yyyy-MM-dd');
export const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');
export const parseDayKey = (key: string | null) => {
  if (!key) return null;
  const d = parseISO(key);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
};

/** Local Monday 00:00 → next Monday 00:00 */
export function weekBounds(weekStart: Date) {
  const start = weekStartOf(weekStart);
  return { start, end: addWeeks(start, 1) };
}

export const weekDays = (weekStart: Date) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

export function weekLabel(weekStart: Date, now = new Date()): string {
  const diff = differenceInCalendarWeeks(weekStart, now, WEEK);
  if (diff === 0) return 'This week';
  if (diff === 1) return 'Next week';
  if (diff === -1) return 'Last week';
  return diff > 0 ? `In ${diff} weeks` : `${-diff} weeks ago`;
}

export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const showYear = weekStart.getFullYear() !== new Date().getFullYear() || end.getFullYear() !== weekStart.getFullYear();
  return `${format(weekStart, sameMonth ? 'd' : 'd MMM')} – ${format(end, showYear ? 'd MMM yyyy' : 'd MMM')}`;
}

export function friendlyDay(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, d MMM');
}

export const timeLabel = (date: Date) => format(date, 'h:mm a');

export function timeRange(task: Pick<Task, 'dueDate' | 'endsAt'>) {
  const start = timeLabel(new Date(task.dueDate));
  return task.endsAt ? `${start} – ${timeLabel(new Date(task.endsAt))}` : start;
}

/** Figma date format: "Friday 14, January" */
export const longDate = (date: Date) => format(date, 'EEEE d, MMMM');

/** Value helpers for <input type="date|time"> (local time) */
export const toDateInput = (date: Date) => format(date, 'yyyy-MM-dd');
export const toTimeInput = (date: Date) => format(date, 'HH:mm');

export function combineDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/**
 * Default start for a new task on a given day:
 * today → the next full hour; any other day → 9:00 AM.
 */
export function defaultDueDate(day?: Date | null, now = new Date()): Date {
  const nextHour = setMinutes(setHours(now, now.getHours() + 1), 0);
  if (!day || isSameDay(day, now)) return nextHour;
  return setMinutes(setHours(startOfDay(day), 9), 0);
}
