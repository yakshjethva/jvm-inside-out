import { cn } from '@/lib/cn';

/** Clickable step markers. The current step is announced as the current item. */
export function ExecutionTimeline({
  steps,
  current,
  furthest,
  onSeek,
}: {
  steps: { id: string; title: string }[];
  current: number;
  furthest: number;
  onSeek: (index: number) => void;
}) {
  return (
    <ol className="flex w-full items-center gap-1" aria-label="Steps">
      {steps.map((step, index) => {
        const isCurrent = index === current;
        const visited = index <= furthest;
        return (
          <li key={step.id} className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onSeek(index)}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Step ${index + 1}: ${step.title}`}
              title={`${index + 1}. ${step.title}`}
              className="group block min-h-6 w-full py-2"
            >
              <span
                className={cn(
                  'block h-1.5 rounded-full transition-colors',
                  isCurrent
                    ? 'bg-exec-400'
                    : visited
                      ? 'bg-exec-700 group-hover:bg-exec-500'
                      : 'bg-ink-600 group-hover:bg-ink-500',
                )}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
