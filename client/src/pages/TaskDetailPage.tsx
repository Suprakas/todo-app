import clsx from 'clsx';
import { CalendarDays, Clock, Flag } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BackButton, Checkbox, EmptyNote, PrimaryButton, PriorityTag, SecondaryButton, Skeleton } from '../components/ui';
import { useDeleteTask, useTask, useToggleStatus } from '../hooks/useTasks';
import { longDate, timeRange } from '../lib/dates';

/** "View task" screen opened from search results (not in Figma — built from the same tokens). */
export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: task, isPending, isError } = useTask(id);
  const toggle = useToggleStatus();
  const remove = useDeleteTask();

  return (
    <div className="px-6 pt-8 pb-10">
      <BackButton />

      {isPending ? (
        <Skeleton className="mt-8 h-56" />
      ) : isError || !task ? (
        <EmptyNote>This task no longer exists.</EmptyNote>
      ) : (
        (() => {
          const done = task.status === 'completed';
          return (
            <>
              <div className="mt-8 flex items-start gap-3">
                <div className="pt-1">
                  <Checkbox
                    checked={done}
                    onChange={() => toggle.mutate({ id: task.id, status: done ? 'in_progress' : 'completed' })}
                    label={done ? 'Mark as in progress' : 'Mark as completed'}
                  />
                </div>
                <h1 className={clsx('text-lg font-semibold break-words text-ink', done && 'line-through')}>
                  {task.title}
                </h1>
              </div>

              <span
                className={clsx(
                  'mt-4 inline-block px-2.5 py-1 text-xs',
                  done ? 'bg-complete-bg text-brand-dark' : 'bg-pending-bg text-pending-ink',
                )}
              >
                {done ? 'Completed' : 'In Progress'}
              </span>

              <dl className="mt-6 space-y-3 border-y border-line py-5 text-sm">
                <Row icon={<CalendarDays className="size-[18px]" strokeWidth={1.5} />} label="Date">
                  {longDate(new Date(task.dueDate))}
                </Row>
                <Row icon={<Clock className="size-[18px]" strokeWidth={1.5} />} label="Time">
                  {timeRange(task)}
                </Row>
                <Row icon={<Flag className="size-[18px]" strokeWidth={1.5} />} label="Priority">
                  {task.priority ? <PriorityTag priority={task.priority} /> : <span className="text-label">None</span>}
                </Row>
              </dl>

              <p className="mt-5 text-xs font-medium text-label">Description</p>
              <p className={clsx('mt-2 text-sm whitespace-pre-wrap break-words', !task.description && 'text-label')}>
                {task.description || 'No description'}
              </p>

              <div className="mt-10 space-y-3">
                <PrimaryButton
                  onClick={() => navigate(`/tasks/${task.id}/edit`, { state: { backgroundLocation: location } })}
                >
                  Edit task
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => toggle.mutate({ id: task.id, status: done ? 'in_progress' : 'completed' })}
                >
                  {done ? 'Mark as in progress' : 'Mark as completed'}
                </SecondaryButton>
                <button
                  type="button"
                  onClick={() => {
                    remove.mutate(task);
                    navigate(-1);
                  }}
                  className="h-11 w-full text-sm font-medium text-pending-ink"
                >
                  Delete task
                </button>
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-brand">{icon}</span>
      <dt className="w-16 text-label">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
