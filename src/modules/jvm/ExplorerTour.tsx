import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

export const TOUR_ID = 'explorer-tour';

const TOUR_STEPS: { title: string; text: string }[] = [
  {
    title: 'A map of the Java Virtual Machine',
    text: 'Every shape is a real part of the software machine that runs Java programs. The layout is simplified: positions and sizes are schematic, not a picture of memory.',
  },
  {
    title: 'Six main parts',
    text: 'Class loading, memory, the execution engine, garbage collection and the native interface make up the JVM. The platform underneath is the operating system and processor it runs on.',
  },
  {
    title: 'Select a part to open it',
    text: 'Click or tap any part to see what is inside. With a keyboard, press Tab to reach the map, move with the arrow keys and press Enter.',
  },
  {
    title: 'Explanations appear in the panel',
    text: 'Whatever you select is explained in the panel beside the map (below it on small screens), starting with the simple version.',
  },
  {
    title: 'Go deeper whenever you like',
    text: 'Each explanation ends with “Explore the technical details”: specification sections, HotSpot internals, bytecode and sources. Switch between Simple, Developer and Deep dive at any time.',
  },
];

/**
 * A short, dismissible introduction to the explorer. It sits over a corner of
 * the map without blocking it, and is never shown again once dismissed.
 */
export function ExplorerTour({
  step,
  onStep,
  onClose,
  placement = 'overlay',
}: {
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
  /** "overlay" floats over a corner of the map; "inline" sits in the page flow (small screens). */
  placement?: 'overlay' | 'inline';
}) {
  const current = TOUR_STEPS[step]!;
  const last = step === TOUR_STEPS.length - 1;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step > 0) headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  return (
    <section
      data-explorer-tour
      aria-label="Guided tour of the explorer"
      className={cn(
        'rounded-xl border border-exec-500/50 bg-ink-900 p-4',
        placement === 'overlay'
          ? 'absolute bottom-3 left-3 z-20 max-w-[380px] shadow-overlay'
          : 'mx-3 mt-3',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] text-exec-300">
          Guided tour · {step + 1} of {TOUR_STEPS.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the tour"
          className="-mt-1 -mr-1 rounded p-1 text-fg-subtle hover:bg-ink-700 hover:text-fg"
        >
          <X size={15} aria-hidden />
        </button>
      </div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        aria-live="polite"
        className="mt-1 font-serif text-[20px] leading-snug text-fg outline-none"
      >
        {current.title}
      </h2>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-fg-muted">{current.text}</p>
      <div className="mt-3.5 flex items-center justify-between gap-2">
        <div className="flex gap-1" aria-hidden>
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={cn('h-1.5 w-5 rounded-full', i <= step ? 'bg-exec-400' : 'bg-ink-600')}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => onStep(step - 1)}
              className="h-9 rounded-md border border-ink-600 px-3 text-[13.5px] text-fg-muted hover:text-fg"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? onClose() : onStep(step + 1))}
            className="h-9 rounded-md border border-exec-400 bg-exec-500 px-3.5 text-[13.5px] font-medium text-ink-950 hover:bg-exec-400"
          >
            {last ? 'Start exploring' : 'Next'}
          </button>
        </div>
      </div>
    </section>
  );
}
