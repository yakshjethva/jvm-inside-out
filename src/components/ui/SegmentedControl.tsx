import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  description?: string;
}

/**
 * Single-choice control rendered as a radio group (arrow keys move the
 * selection, as in a native radio group).
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  segments,
  onChange,
  className,
  size = 'md',
}: {
  label: string;
  value: T;
  segments: Segment<T>[];
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + segments.length) % segments.length;
    const segment = segments[next];
    if (segment) {
      onChange(segment.value);
      refs.current[next]?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-md border border-ink-600 bg-ink-850/90 p-0.5', className)}
    >
      {segments.map((segment, index) => {
        const checked = segment.value === value;
        return (
          <button
            key={segment.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            title={segment.description}
            onClick={() => onChange(segment.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'group inline-flex items-center gap-1.5 rounded-[5px] font-medium transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]',
              checked ? 'bg-raised text-fg shadow-raised' : 'text-fg-subtle hover:text-fg',
            )}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
