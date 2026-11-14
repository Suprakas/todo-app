import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import clsx from 'clsx';

export interface SwipeAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone: 'neutral' | 'danger';
}

interface Props {
  actions: SwipeAction[];
  children: ReactNode;
  className?: string;
}

const ACTION_WIDTH = 76;
const DRAG_THRESHOLD = 6;

/**
 * Swipe left to reveal actions (works with touch, pen and mouse drag).
 * Vertical scrolling is left to the browser via `touch-action: pan-y`.
 */
export function SwipeableRow({ actions, children, className }: Props) {
  const maxOffset = actions.length * ACTION_WIDTH;
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ startX: 0, startOffset: 0, moved: false, active: false });

  const isOpen = offset !== 0;

  // Close when tapping anywhere else
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOffset(0);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [isOpen]);

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { startX: e.clientX, startOffset: offset, moved: false, active: true };
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    // rubber-band a little past the end
    const next = d.startOffset + dx;
    const clamped = next < -maxOffset ? -maxOffset + (next + maxOffset) * 0.2 : Math.min(0, next);
    setOffset(clamped);
  };

  const endDrag = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    setDragging(false);
    if (d.moved) setOffset((o) => (o < -maxOffset / 2 ? -maxOffset : 0));
  };

  return (
    <div ref={rootRef} className={clsx('relative overflow-hidden', className)}>
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{ width: maxOffset }}
        aria-hidden={!isOpen}
      >
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            tabIndex={isOpen ? 0 : -1}
            onClick={() => {
              setOffset(0);
              a.onClick();
            }}
            className={clsx(
              'flex h-full flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold text-white',
              a.tone === 'danger' ? 'bg-pending-ink' : 'bg-label',
            )}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>

      <div
        className={clsx(
          'relative touch-pan-y bg-canvas select-none',
          !dragging && 'transition-transform duration-200 ease-out',
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          // a drag shouldn't count as a tap; a tap on an open row just closes it
          if (drag.current.moved) {
            // the click that ends a drag is not a tap
            e.stopPropagation();
            e.preventDefault();
            drag.current.moved = false;
          } else if (isOpen) {
            e.stopPropagation();
            e.preventDefault();
            setOffset(0);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setOffset(-maxOffset);
          if (e.key === 'ArrowRight' || e.key === 'Escape') setOffset(0);
        }}
      >
        {children}
      </div>
    </div>
  );
}
