import clsx from 'clsx';
import { ArrowLeft, Check, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Priority } from '../lib/types';

/** 20px square checkbox from the Figma task rows */
export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="grid size-5 shrink-0 place-items-center border border-brand bg-surface text-brand transition active:scale-90"
    >
      {checked && <Check className="size-3.5" strokeWidth={2} />}
    </button>
  );
}

export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => (to ? navigate(to) : window.history.length > 1 ? navigate(-1) : navigate('/'))}
      className="-m-2 grid size-10 place-items-center text-ink"
    >
      <ArrowLeft className="size-6" strokeWidth={1.75} />
    </button>
  );
}

/** The bordered search box (Figma "Group 43") */
export function SearchBox({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex h-[47px] items-center gap-3 rounded-[4px] border border-line-strong bg-surface pr-3.5 pl-5 focus-within:border-brand"
    >
      {children}
      <Search className="size-6 shrink-0 text-ink" strokeWidth={1.5} />
    </div>
  );
}

export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

const PRIORITY_TEXT: Record<Priority, string> = {
  high: 'text-high',
  medium: 'text-medium',
  low: 'text-low',
};

export function PriorityTag({ priority }: { priority: Priority | null }) {
  if (!priority) return null;
  return <span className={clsx('font-medium', PRIORITY_TEXT[priority])}>{PRIORITY_LABEL[priority]}</span>;
}

export function PrimaryButton({ className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={clsx(
        'flex h-12 w-full items-center justify-center gap-2 bg-brand text-base font-medium text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-60',
        className,
      )}
      {...rest}
    />
  );
}

export function SecondaryButton({ className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={clsx(
        'flex h-12 w-full items-center justify-center gap-2 border border-line bg-surface text-sm font-medium text-ink transition hover:border-brand hover:text-brand',
        className,
      )}
      {...rest}
    />
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-line/70', className)} />;
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-label">{children}</p>;
}
