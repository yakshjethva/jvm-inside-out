import { Box, Map as MapIcon } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

/** What the viewer shows instead of the 3D model, with a way back to the 2D map. */
export function Notice3D({
  title,
  children,
  onUse2D,
  action,
}: {
  title: string;
  children: ReactNode;
  onUse2D: () => void;
  action?: ReactNode;
}) {
  return (
    <div role="status" className="flex h-full items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <Box className="mx-auto text-exec-300" aria-hidden />
        <p className="mt-3 font-serif text-xl text-fg">{title}</p>
        <div className="mt-2 text-[14px] leading-relaxed text-fg-muted">{children}</div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {action}
          <button
            type="button"
            onClick={onUse2D}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-ink-500 bg-raised px-3 text-[13.5px] text-fg hover:border-exec-400"
          >
            <MapIcon size={15} aria-hidden /> Use the 2D map
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Shown while the 3D code loads: a light, original drawing of the stacked
 * areas, so the space is never blank and nothing shifts when the model arrives.
 */
export function Loading3D() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6" role="status">
      <svg viewBox="0 0 120 96" width="120" height="96" aria-hidden className="opacity-80">
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 18 + i * 14;
          return (
            <polygon
              key={i}
              points={`60,${y} 104,${y + 18} 60,${y + 36} 16,${y + 18}`}
              fill="none"
              stroke={i === 2 ? 'var(--color-exec-400)' : 'var(--color-rt-400)'}
              strokeOpacity={0.35 + i * 0.12}
              strokeWidth="1.4"
              strokeDasharray={i === 0 || i === 4 ? '2 3' : undefined}
            />
          );
        })}
      </svg>
      <p className="text-[14px] text-fg-subtle">Loading the 3D model…</p>
    </div>
  );
}

interface BoundaryProps {
  fallback: (error: Error) => ReactNode;
  children: ReactNode;
}

/**
 * Catches a failed chunk load or renderer start. The fallback offers the way
 * out: re-rendering cannot retry a failed download, because the browser keeps
 * a failed module import failed until the page is loaded again.
 */
export class Viewer3DBoundary extends Component<BoundaryProps, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Reported for developers; the learner sees the fallback and a way back to 2D.
    console.info('The 3D view could not start:', error.message, info.componentStack);
  }

  override render() {
    if (this.state.error) return this.props.fallback(this.state.error);
    return this.props.children;
  }
}
