import { addWeeks, startOfWeek, format } from 'date-fns';
import { TZDate } from '@date-fns/tz';

const WEEK_OPTIONS = { weekStartsOn: 1 }; // Monday → Sunday, as per the spec

/** Returns a valid IANA time zone, falling back to UTC for anything unknown. */
export function resolveTimeZone(tz) {
  if (!tz || typeof tz !== 'string') return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

/**
 * Monday 00:00 → next Monday 00:00 (exclusive) of the week containing `date`,
 * evaluated in the user's time zone, so a task due late on Sunday night lands
 * in the week the user expects even if it's already Monday in UTC.
 */
export function getWeekRange(date, timeZone = 'UTC') {
  const zoned = new TZDate(new Date(date).getTime(), timeZone);
  const start = startOfWeek(zoned, WEEK_OPTIONS);
  const end = addWeeks(start, 1);
  return {
    key: format(start, 'yyyy-MM-dd'),
    start: new Date(start.getTime()),
    end: new Date(end.getTime()),
  };
}

/**
 * Groups tasks into Monday-start weeks with open/completed counts.
 * Always includes the current week so the home screen is never empty.
 */
export function summarizeByWeek(tasks, timeZone = 'UTC', now = new Date()) {
  const weeks = new Map();

  const ensure = (date) => {
    const range = getWeekRange(date, timeZone);
    if (!weeks.has(range.key)) {
      weeks.set(range.key, {
        weekKey: range.key,
        weekStart: range.start.toISOString(),
        weekEnd: range.end.toISOString(),
        total: 0,
        open: 0,
        completed: 0,
      });
    }
    return weeks.get(range.key);
  };

  ensure(now);

  for (const task of tasks) {
    const week = ensure(task.dueDate);
    week.total += 1;
    if (task.status === 'completed') week.completed += 1;
    else week.open += 1;
  }

  return [...weeks.values()].sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}
