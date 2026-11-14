import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { CalendarDays, Clock, Loader2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { PRIORITY_LABEL, PrimaryButton, Skeleton } from '../components/ui';
import { useCreateTask, useDeleteTask, useTask, useUpdateTask } from '../hooks/useTasks';
import { getErrorMessage } from '../lib/api';
import {
  combineDateTime,
  dayKey,
  defaultDueDate,
  longDate,
  parseDayKey,
  timeLabel,
  toDateInput,
  toTimeInput,
  weekKeyOf,
} from '../lib/dates';
import type { Priority, Task, TaskStatus } from '../lib/types';

const schema = z
  .object({
    title: z.string().trim().min(1, 'Please enter a task title').max(120, 'Keep it under 120 characters'),
    start: z.string().min(1, 'Pick a start time'),
    end: z.string(),
    date: z.string().min(1, 'Pick a date'),
    description: z.string().trim().max(1000, 'Keep it under 1000 characters'),
    priority: z.enum(['low', 'medium', 'high']).nullable(),
    status: z.enum(['in_progress', 'completed']),
  })
  .refine((v) => !v.end || v.end > v.start, { path: ['end'], message: 'Must be after the start time' });
type FormValues = z.infer<typeof schema>;

const toValues = (task?: Task, day?: Date | null): FormValues => {
  const due = task ? new Date(task.dueDate) : defaultDueDate(day);
  return {
    title: task?.title ?? '',
    start: toTimeInput(due),
    end: task?.endsAt ? toTimeInput(new Date(task.endsAt)) : '',
    date: toDateInput(due),
    description: task?.description ?? '',
    priority: task?.priority ?? null,
    status: task?.status ?? 'in_progress',
  };
};

/** "Add New Task" bottom sheet (Figma node 20:1329). Also used for editing. */
export default function TaskFormPage() {
  const { id } = useParams();
  const { data: task, isPending, isError } = useTask(id);
  const navigate = useNavigate();
  const location = useLocation();
  const hasBackground = Boolean((location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation);

  const close = (to?: string) => {
    if (to) navigate(to, { replace: true });
    else if (hasBackground) navigate(-1);
    else navigate('/', { replace: true });
  };

  return (
    <Sheet title={id ? 'Edit Task' : 'Add New Task'} onClose={() => close()}>
      {id && isPending ? (
        <div className="space-y-6">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : id && isError ? (
        <p className="py-10 text-center text-sm text-label">This task no longer exists.</p>
      ) : (
        <TaskForm task={task} onDone={close} />
      )}
    </Sheet>
  );
}

function TaskForm({ task, onDone }: { task?: Task; onDone: (to?: string) => void }) {
  const [params] = useSearchParams();
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const isEdit = Boolean(task);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toValues(task, parseDayKey(params.get('date'))),
  });

  useEffect(() => {
    if (task) reset(toValues(task));
  }, [task, reset]);

  const onSubmit = async (v: FormValues) => {
    const due = combineDateTime(v.date, v.start);
    const input = {
      title: v.title,
      description: v.description,
      dueDate: due.toISOString(),
      endsAt: v.end ? combineDateTime(v.date, v.end).toISOString() : null,
      priority: v.priority,
      status: v.status,
    };
    try {
      if (task) {
        await update.mutateAsync({ id: task.id, input });
        toast.success('Task updated');
        onDone();
      } else {
        await create.mutateAsync(input);
        toast.success('Task created');
        // land on the week/day the task was added to
        onDone(`/?week=${weekKeyOf(due)}&day=${dayKey(due)}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Field label="Task title" htmlFor="title" error={errors.title?.message}>
        <input
          id="title"
          autoFocus={!isEdit}
          placeholder="Doing Homework"
          className={inputClass(!!errors.title)}
          {...register('title')}
        />
      </Field>

      <Field label="Set Time" error={errors.start?.message || errors.end?.message}>
        <div className="grid grid-cols-2 gap-[30px]">
          <Controller
            control={control}
            name="start"
            render={({ field }) => (
              <PickerInput
                type="time"
                ariaLabel="Start time"
                icon={<Clock className="size-[18px]" strokeWidth={1.5} />}
                placeholder="Start"
                display={field.value ? timeLabel(combineDateTime('2000-01-01', field.value)) : ''}
                invalid={!!errors.start}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="end"
            render={({ field }) => (
              <PickerInput
                type="time"
                ariaLabel="End time (optional)"
                icon={<Clock className="size-[18px]" strokeWidth={1.5} />}
                placeholder="Ends"
                display={field.value ? timeLabel(combineDateTime('2000-01-01', field.value)) : ''}
                invalid={!!errors.end}
                onClear={field.value ? () => field.onChange('') : undefined}
                {...field}
              />
            )}
          />
        </div>
      </Field>

      <Field label="Set Date" error={errors.date?.message}>
        <Controller
          control={control}
          name="date"
          render={({ field }) => (
            <PickerInput
              type="date"
              ariaLabel="Date"
              iconRight={<CalendarDays className="size-[18px]" strokeWidth={1.5} />}
              placeholder="Pick a date"
              display={field.value ? longDate(combineDateTime(field.value, '00:00')) : ''}
              invalid={!!errors.date}
              {...field}
            />
          )}
        />
      </Field>

      <Controller
        control={control}
        name="priority"
        render={({ field }) => (
          <Field label="Priority (optional)">
            <Choice<Priority>
              name="Priority"
              value={field.value}
              onChange={(v) => field.onChange(v === field.value ? null : v)}
              options={(['low', 'medium', 'high'] as const).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
            />
          </Field>
        )}
      />

      {isEdit && (
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Field label="Status">
              <Choice<TaskStatus>
                name="Status"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
            </Field>
          )}
        />
      )}

      <Field label="Description" htmlFor="description" error={errors.description?.message}>
        <textarea
          id="description"
          rows={4}
          placeholder="Add Description"
          className={clsx(inputClass(!!errors.description), 'h-[100px] resize-none py-2.5 leading-5')}
          {...register('description')}
        />
      </Field>

      <div className="space-y-3 pt-2">
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Create task'}
        </PrimaryButton>
        {task && (
          <button
            type="button"
            onClick={() => {
              remove.mutate(task);
              onDone();
            }}
            className="h-11 w-full text-sm font-medium text-pending-ink"
          >
            Delete task
          </button>
        )}
      </div>
    </form>
  );
}

/* ───────────── building blocks ───────────── */

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="presentation">
      <div className="absolute inset-0 animate-[fade_.2s_ease-out] bg-black/30" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="relative max-h-[92dvh] w-full max-w-xl animate-[sheet_.25s_ease-out] overflow-y-auto bg-surface px-6 pt-6 pb-safe md:max-h-[90dvh]"
      >
        <div className="mb-8 flex items-center justify-between">
          <h2 id="sheet-title" className="text-lg font-medium text-ink">
            {title}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="-m-2 p-2 text-ink">
            <X className="size-6" strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass = (invalid: boolean) =>
  clsx(
    'h-10 w-full border bg-surface px-2.5 text-sm text-ink outline-none transition placeholder:text-faint',
    'focus:border-brand',
    invalid ? 'border-pending-ink' : 'border-line',
  );

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-xs font-medium text-label">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-pending-ink">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Native date/time picker dressed up as the Figma field: the real input is
 * invisible and covers the box, so tapping anywhere opens the OS picker.
 */
function PickerInput({
  type,
  ariaLabel,
  icon,
  iconRight,
  placeholder,
  display,
  invalid,
  value,
  onChange,
  onBlur,
  name,
  onClear,
  ref,
}: {
  type: 'date' | 'time';
  ariaLabel: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  placeholder: string;
  display: string;
  invalid: boolean;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  name: string;
  onClear?: () => void;
  ref?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div
      className={clsx(
        'relative flex h-10 items-center gap-3 border bg-surface px-2.5 text-sm text-ink focus-within:border-brand',
        invalid ? 'border-pending-ink' : 'border-line',
      )}
    >
      {icon}
      <span className={clsx('flex-1 truncate', !display && 'text-ink')}>{display || placeholder}</span>
      {iconRight}
      <input
        ref={ref}
        type={type}
        name={name}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* older browsers just focus the input */
          }
        }}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
      {onClear && (
        <button
          type="button"
          aria-label={`Clear ${ariaLabel}`}
          onClick={onClear}
          className="relative z-10 -mr-1 p-1 text-label hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function Choice<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex gap-3">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              'h-10 flex-1 border text-sm transition',
              active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:border-brand',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
