import { addWeeks, format, isSameDay, isToday, isWithinInterval } from 'date-fns';
import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DayStrip, SummaryCards, WeekCard, WeeklyProgress } from '../components/home';
import { TaskItem } from '../components/TaskItem';
import { EmptyNote, SearchBox, SectionTitle, Skeleton } from '../components/ui';
import { useTaskList, useWeeks } from '../hooks/useTasks';
import { getErrorMessage } from '../lib/api';
import { dayKey, parseDayKey, weekBounds, weekKeyOf, weekRangeLabel, weekStartOf } from '../lib/dates';

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  // ── URL state: ?week=<monday>&day=<yyyy-MM-dd|all>&open=<weekKey> ──
  const [today] = useState(() => new Date());
  const weekStart = weekStartOf(parseDayKey(params.get('week')) ?? today);
  const { start, end } = weekBounds(weekStart);
  const inWeek = (d: Date) => isWithinInterval(d, { start, end: new Date(end.getTime() - 1) });
  const isCurrentWeek = inWeek(today);
  const dayParam = params.get('day');
  const parsedDay = parseDayKey(dayParam);
  const selectedDay: Date | null =
    dayParam === 'all'
      ? null
      : parsedDay && inWeek(parsedDay)
        ? parsedDay
        : isCurrentWeek
          ? today
          : null; // other weeks default to showing every task
  const openWeek = params.get('open');

  const update = (patch: Record<string, string | null>) =>
    setParams(
      (p) => {
        Object.entries(patch).forEach(([k, v]) => (v === null ? p.delete(k) : p.set(k, v)));
        return p;
      },
      { replace: true },
    );

  const goToWeek = (date: Date) => {
    update({ week: weekKeyOf(date), day: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── data ──
  const weekQuery = useTaskList({ from: start.toISOString(), to: end.toISOString() });
  const weeksQuery = useWeeks();
  const weekTasks = useMemo(() => weekQuery.data ?? [], [weekQuery.data]);
  const completed = weekTasks.filter((t) => t.status === 'completed').length;
  const pending = weekTasks.length - completed;
  const daysWithTasks = useMemo(() => new Set(weekTasks.map((t) => dayKey(new Date(t.dueDate)))), [weekTasks]);
  const visibleTasks = selectedDay ? weekTasks.filter((t) => isSameDay(new Date(t.dueDate), selectedDay)) : weekTasks;
  const slow = useSlowFlag(weekQuery.isPending);

  const listTitle = selectedDay
    ? isToday(selectedDay)
      ? 'Tasks Today'
      : `Tasks · ${format(selectedDay, 'EEE d')}`
    : `All Tasks · ${weekRangeLabel(weekStart)}`;

  const addTask = () => {
    const day = selectedDay ?? (isCurrentWeek ? today : weekStart);
    navigate(`/tasks/new?date=${dayKey(day)}`, { state: { backgroundLocation: location } });
  };

  return (
    <div className="px-6 pt-9 pb-36">
      <SearchBox onClick={() => navigate('/search')}>
        <button type="button" className="flex-1 text-left text-xs font-light text-black/60" aria-label="Search for a task">
          Search for a task
        </button>
      </SearchBox>

      <div className="mt-3">
        <DayStrip
          weekStart={weekStart}
          selected={selectedDay}
          daysWithTasks={daysWithTasks}
          onSelect={(d) =>
            update({ week: weekKeyOf(d), day: selectedDay && isSameDay(d, selectedDay) ? 'all' : dayKey(d) })
          }
          onPrevWeek={() => goToWeek(addWeeks(weekStart, -1))}
          onNextWeek={() => goToWeek(addWeeks(weekStart, 1))}
        />
      </div>

      {weekQuery.isError ? (
        <div className="mt-8 border border-pending-icon bg-pending-bg p-4 text-sm">
          <p className="font-medium">Couldn’t load your tasks</p>
          <p className="mt-1 text-label">{getErrorMessage(weekQuery.error)}</p>
          <button className="mt-3 font-medium text-brand" onClick={() => weekQuery.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="mt-[30px]">
            {weekQuery.isPending ? <Skeleton className="h-24" /> : <SummaryCards completed={completed} pending={pending} />}
          </div>

          {slow && (
            <p className="mt-4 flex items-center gap-2 text-xs text-label">
              <RefreshCw className="size-3.5 animate-spin" /> Waking up the server — the first load can take a few
              seconds…
            </p>
          )}

          <div className="mt-[30px]">
            <WeeklyProgress completed={completed} total={weekTasks.length} />
          </div>

          <section className="mt-[30px]">
            <SectionTitle
              action={
                selectedDay ? (
                  <button type="button" onClick={() => update({ day: 'all' })} className="text-sm font-medium text-brand">
                    View All
                  </button>
                ) : isCurrentWeek ? (
                  <button
                    type="button"
                    onClick={() => update({ day: dayKey(today) })}
                    className="text-sm font-medium text-brand"
                  >
                    Today
                  </button>
                ) : null
              }
            >
              {listTitle}
            </SectionTitle>

            <div className="mt-5 space-y-4">
              {weekQuery.isPending ? (
                <>
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </>
              ) : visibleTasks.length === 0 ? (
                <EmptyNote>
                  {selectedDay ? 'Nothing planned for this day.' : 'Nothing planned for this week.'}{' '}
                  <button type="button" onClick={addTask} className="font-medium text-brand">
                    Add a task
                  </button>
                </EmptyNote>
              ) : (
                visibleTasks.map((t) => <TaskItem key={t.id} task={t} showDay={!selectedDay} />)
              )}
            </div>
            {visibleTasks.length > 0 && (
              <p className="mt-3 text-center text-[10px] text-faint">Swipe a task left to delete it</p>
            )}
          </section>
        </>
      )}

      {/* Spec §3.2 — every week as an expandable summary card */}
      <section className="mt-10">
        <SectionTitle>Weekly Overview</SectionTitle>
        <div className="mt-4 space-y-3">
          {weeksQuery.isPending && <Skeleton className="h-28" />}
          {weeksQuery.data
            ?.filter((w) => w.total > 0 || w.weekKey === weekKeyOf(today))
            .map((w) => (
              <WeekCard
                key={w.weekKey}
                week={w}
                expanded={openWeek === w.weekKey}
                onToggle={() => update({ open: openWeek === w.weekKey ? null : w.weekKey })}
                onOpenWeek={() => goToWeek(new Date(w.weekStart))}
              />
            ))}
        </div>
      </section>

      {/* FAB (Figma "Group 40") */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-safe">
        <button
          type="button"
          onClick={addTask}
          aria-label="Add Task"
          className="pointer-events-auto grid size-[76px] place-items-center rounded-full bg-brand text-white shadow-[0_10px_24px_-8px_rgba(69,102,236,0.7)] transition hover:brightness-110 active:scale-95"
        >
          <Plus className="size-8" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

/** true once `active` has been on for `ms` (e.g. a cold-starting free-tier server) */
function useSlowFlag(active: boolean, ms = 3500) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setSlow(true), ms);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [active, ms]);
  return active && slow;
}
