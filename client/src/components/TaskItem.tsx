import clsx from 'clsx';
import { SquarePen, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDeleteTask, useToggleStatus } from '../hooks/useTasks';
import { friendlyDay, timeRange } from '../lib/dates';
import type { Task } from '../lib/types';
import { SwipeableRow } from './SwipeableRow';
import { Checkbox, PriorityTag } from './ui';

interface Props {
  task: Task;
  /** what tapping the title does: open the edit sheet (home) or the detail view (search) */
  onOpen?: 'edit' | 'view';
  showDay?: boolean;
  highlight?: string;
}

/** Task row from the Figma: square checkbox, title, trash + edit icons, divider */
export function TaskItem({ task, onOpen = 'edit', showDay = false, highlight }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const toggle = useToggleStatus();
  const remove = useDeleteTask();

  const done = task.status === 'completed';
  const due = new Date(task.dueDate);
  const overdue = !done && due.getTime() < Date.now();

  // The edit form opens as a bottom sheet over the current screen
  const edit = () => navigate(`/tasks/${task.id}/edit`, { state: { backgroundLocation: location } });
  const open = () => (onOpen === 'edit' ? edit() : navigate(`/tasks/${task.id}`));

  return (
    <SwipeableRow
      actions={[{ label: 'Delete', tone: 'danger', icon: <Trash2 className="size-4" />, onClick: () => remove.mutate(task) }]}
    >
      <div className="flex items-start gap-3 bg-canvas pt-1">
        <Checkbox
          checked={done}
          onChange={() => toggle.mutate({ id: task.id, status: done ? 'in_progress' : 'completed' })}
          label={done ? `Mark “${task.title}” as in progress` : `Mark “${task.title}” as completed`}
        />

        <div className="flex min-w-0 flex-1 items-start gap-3 border-b border-line pb-4">
          <button type="button" onClick={open} className="min-w-0 flex-1 text-left">
            <p className={clsx('truncate text-sm leading-5 font-medium text-ink', done && 'line-through')}>
              <Highlight text={task.title} query={highlight} />
            </p>
            <p className={clsx('mt-0.5 truncate text-[11px] text-label', overdue && 'text-pending-ink')}>
              {showDay && `${friendlyDay(due)} · `}
              {timeRange(task)}
              {overdue && ' · Overdue'}
              {task.priority && ' · '}
              <PriorityTag priority={task.priority} />
            </p>
            {highlight && task.description && (
              <p className="mt-0.5 truncate text-xs text-label">
                <Highlight text={task.description} query={highlight} />
              </p>
            )}
          </button>

          <div className="-mt-0.5 flex shrink-0 items-center gap-2.5 text-icon">
            <button
              type="button"
              aria-label={`Delete “${task.title}”`}
              onClick={() => remove.mutate(task)}
              className="p-0.5 transition hover:text-pending-ink"
            >
              <Trash2 className="size-6" strokeWidth={1.25} />
            </button>
            <button
              type="button"
              aria-label={`Edit “${task.title}”`}
              onClick={edit}
              className="p-0.5 transition hover:text-brand"
            >
              <SquarePen className="size-6" strokeWidth={1.25} />
            </button>
          </div>
        </div>
      </div>
    </SwipeableRow>
  );
}

function Highlight({ text, query }: { text: string; query?: string }) {
  const q = query?.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-complete-bg text-brand">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}
