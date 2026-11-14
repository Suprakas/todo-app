import clsx from 'clsx';
import { format, isSameDay, isToday } from 'date-fns';
import { ChevronDown, ChevronLeft, ChevronRight, SquareCheck, SquareX } from 'lucide-react';
import { useTaskList } from '../hooks/useTasks';
import { weekDays, weekLabel, weekRangeLabel } from '../lib/dates';
import type { WeekSummary } from '../lib/types';
import { TaskItem } from './TaskItem';
import { EmptyNote, Skeleton } from './ui';

const pad = (n: number) => String(n).padStart(2, '0');

/* ───────────── Day strip (Figma "Calendar") ───────────── */

export function DayStrip({
  weekStart,
  selected,
  daysWithTasks,
  onSelect,
  onPrevWeek,
  onNextWeek,
}: {
  weekStart: Date;
  selected: Date | null;
  daysWithTasks: Set<string>;
  onSelect: (day: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-label">
          {format(weekStart, 'MMMM yyyy')} · <span className="text-ink">{weekLabel(weekStart)}</span>
        </p>
        <div className="flex gap-1 text-label">
          <button type="button" aria-label="Previous week" onClick={onPrevWeek} className="grid size-7 place-items-center hover:text-brand">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label="Next week" onClick={onNextWeek} className="grid size-7 place-items-center hover:text-brand">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="-mx-1.5 flex justify-between" role="tablist" aria-label="Days of the week">
        {weekDays(weekStart).map((day) => {
          const active = selected && isSameDay(day, selected);
          const hasTasks = daysWithTasks.has(format(day, 'yyyy-MM-dd'));
          return (
            <button
              key={day.toISOString()}
              type="button"
              role="tab"
              aria-selected={!!active}
              aria-label={format(day, 'EEEE d MMMM')}
              onClick={() => onSelect(day)}
              className={clsx(
                'flex min-w-[38px] flex-col items-center px-2 pt-1.5 pb-1.5 text-center transition',
                active ? 'bg-brand text-white' : isToday(day) ? 'text-ink' : 'text-faint hover:text-ink',
              )}
            >
              <span className="text-[10px] leading-[22px]">{format(day, 'EEE')}</span>
              <span className="text-sm leading-[22px] font-medium">{format(day, 'dd')}</span>
              <span
                className={clsx(
                  'mt-1 size-1 rounded-full',
                  hasTasks ? (active ? 'bg-white' : 'bg-brand') : 'bg-transparent',
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── Summary cards (Figma "Reminder") ───────────── */

export function SummaryCards({ completed, pending }: { completed: number; pending: number }) {
  return (
    <div className="grid grid-cols-2 gap-[17px]">
      <SummaryCard
        title="Task Complete"
        value={completed}
        className="bg-complete-bg"
        icon={<SquareCheck className="size-6 text-brand-dark" strokeWidth={1.5} />}
        iconBg="bg-complete-icon"
      />
      <SummaryCard
        title="Task Pending"
        value={pending}
        className="bg-pending-bg"
        icon={<SquareX className="size-6 text-pending-ink" strokeWidth={1.5} />}
        iconBg="bg-pending-icon"
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  iconBg,
  className,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  className: string;
}) {
  return (
    <div className={clsx('flex h-24 gap-[11px] px-[15px] pt-4', className)}>
      <div className={clsx('grid size-7 shrink-0 place-items-center', iconBg)}>{icon}</div>
      <div>
        <p className="text-xs leading-7 text-ink">{title}</p>
        <p className="mt-0.5 flex items-baseline gap-1">
          <span className="text-[22px] font-semibold text-ink" aria-label={`${value}`}>{pad(value)}</span>
          <span className="text-[10px] text-subtle">This Week</span>
        </p>
      </div>
    </div>
  );
}

/* ───────────── Weekly progress (Figma "Progress") ───────────── */

export function WeeklyProgress({ completed, total }: { completed: number; total: number }) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-black">Weekly Progress</h2>
        <span className="text-xs text-label">
          {completed}/{total} done · {pct}%
        </span>
      </div>
      <div
        className="mt-3.5 h-6 w-full bg-brand-track"
        role="progressbar"
        aria-label="Weekly progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="h-full bg-brand-dark transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ───────────── Week overview card (spec §3.2 — expandable) ───────────── */

export function WeekCard({
  week,
  expanded,
  onToggle,
  onOpenWeek,
}: {
  week: WeekSummary;
  expanded: boolean;
  onToggle: () => void;
  onOpenWeek: () => void;
}) {
  const start = new Date(week.weekStart);
  const pct = week.total ? Math.round((week.completed / week.total) * 100) : 0;
  const panelId = `week-${week.weekKey}`;

  return (
    <section className={clsx('border bg-surface transition', expanded ? 'border-brand' : 'border-line')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="w-full px-4 pt-3.5 pb-4 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{weekLabel(start)}</p>
            <p className="text-xs text-label">{weekRangeLabel(start)}</p>
          </div>
          <ChevronDown className={clsx('size-5 text-label transition-transform', expanded && 'rotate-180')} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
          <p className="flex items-center gap-2 bg-pending-bg px-2.5 py-2 text-ink">
            <SquareX className="size-4 text-pending-ink" strokeWidth={1.5} />
            <span className="text-base font-semibold">{pad(week.open)}</span> Open
          </p>
          <p className="flex items-center gap-2 bg-complete-bg px-2.5 py-2 text-ink">
            <SquareCheck className="size-4 text-brand-dark" strokeWidth={1.5} />
            <span className="text-base font-semibold">{pad(week.completed)}</span> Completed
          </p>
        </div>
        <div className="mt-3 h-1.5 bg-brand-track">
          <div className="h-full bg-brand-dark transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </button>

      {expanded && (
        <div id={panelId} className="border-t border-line px-4 pt-4 pb-3">
          <WeekTasks week={week} />
          <button type="button" onClick={onOpenWeek} className="mt-1 text-sm font-medium text-brand">
            Open in planner →
          </button>
        </div>
      )}
    </section>
  );
}

function WeekTasks({ week }: { week: WeekSummary }) {
  const { data, isPending, isError, refetch } = useTaskList({ from: week.weekStart, to: week.weekEnd });
  if (isPending) return <Skeleton className="mb-3 h-24" />;
  if (isError)
    return (
      <EmptyNote>
        Couldn’t load tasks.{' '}
        <button className="font-medium text-brand underline" onClick={() => refetch()}>
          Retry
        </button>
      </EmptyNote>
    );
  if (data.length === 0) return <EmptyNote>No tasks this week.</EmptyNote>;
  return (
    <div className="space-y-4 pb-2">
      {data.map((t) => (
        <TaskItem key={t.id} task={t} showDay />
      ))}
    </div>
  );
}
