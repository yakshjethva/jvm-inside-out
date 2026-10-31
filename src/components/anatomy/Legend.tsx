import { X } from 'lucide-react';
import { EDGE_STYLES } from '@/components/diagrams/edgeStyles';
import type { RelationshipKind } from '@/types/content';

const SWATCHES = [
  { label: 'Runtime component', color: 'var(--color-rt-500)' },
  { label: 'Execution / control', color: 'var(--color-exec-500)' },
  { label: 'Platform / outside JVM', color: 'var(--color-plat-500)', dash: '1.2 3.4' },
  { label: 'Exceptional path', color: 'var(--color-warn-500)' },
];

const OUTLINES = [
  { label: 'JVM Specification concept', dash: undefined },
  { label: 'HotSpot (JDK 25) structure · HS', dash: '6 3.5' },
  { label: 'Platform / build time', dash: '1.2 3.4' },
];

const STATES = [
  { glyph: '▶', label: 'Active in this step', color: 'var(--color-exec-300)' },
  { glyph: '✓', label: 'Completed / successful', color: 'var(--color-ok-400)' },
  { glyph: '!', label: 'Warning / exceptional', color: 'var(--color-warn-400)' },
];

/** Key for the anatomy plates. Every colour is paired with a shape, line style or glyph. */
export function Legend({ onClose, showStates }: { onClose: () => void; showStates: boolean }) {
  return (
    <section
      aria-label="Diagram legend"
      className="w-[min(300px,calc(100vw-2rem))] rounded-lg border border-ink-600 bg-ink-900 p-3 text-[12px] shadow-overlay"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="kicker">Legend</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide legend"
          className="rounded p-0.5 text-fg-subtle hover:text-fg"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
      <p className="mb-1 text-fg-subtle">Outline = where it is defined</p>
      <ul className="mb-2.5 space-y-1">
        {OUTLINES.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-fg-muted">
            <svg width="26" height="12" aria-hidden>
              <rect
                x="1"
                y="1"
                width="24"
                height="10"
                rx="2"
                fill="none"
                stroke="var(--color-fg-muted)"
                strokeWidth="1.3"
                strokeDasharray={item.dash}
                strokeLinecap="round"
              />
            </svg>
            {item.label}
          </li>
        ))}
      </ul>
      <p className="mb-1 text-fg-subtle">Colour = role</p>
      <ul className="mb-2.5 grid grid-cols-2 gap-1">
        {SWATCHES.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 text-fg-muted">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-[2px] border-[1.5px]"
              style={{ borderColor: item.color }}
            />
            {item.label}
          </li>
        ))}
      </ul>
      <p className="mb-1 text-fg-subtle">Connectors</p>
      <ul className="space-y-1">
        {(Object.keys(EDGE_STYLES) as RelationshipKind[]).map((kind) => {
          const style = EDGE_STYLES[kind];
          return (
            <li key={kind} className="flex items-center gap-2 text-fg-muted">
              <svg width="28" height="8" aria-hidden>
                <line
                  x1="0"
                  y1="4"
                  x2="21"
                  y2="4"
                  stroke={style.color}
                  strokeWidth="1.6"
                  strokeDasharray={style.dash}
                />
                {kind === 'data' ? (
                  <path d="M20 1 L26 4 L20 7" fill="none" stroke={style.color} strokeWidth="1.3" />
                ) : (
                  <path d="M20 1 L27 4 L20 7 Z" fill={style.color} />
                )}
              </svg>
              <span>
                {style.label} <span className="text-fg-subtle">· {style.description}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {showStates && (
        <>
          <p className="mt-2.5 mb-1 text-fg-subtle">Execution states</p>
          <ul className="space-y-1">
            {STATES.map((state) => (
              <li key={state.label} className="flex items-center gap-2 text-fg-muted">
                <span
                  aria-hidden
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold"
                  style={{ borderColor: state.color, color: state.color }}
                >
                  {state.glyph}
                </span>
                {state.label}
              </li>
            ))}
            <li className="flex items-center gap-2 text-fg-muted">
              <span
                aria-hidden
                className="inline-block h-3 w-4 rounded-[2px] border border-idle-500 opacity-40"
              />
              Inactive structure (faded)
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
