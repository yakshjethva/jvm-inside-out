import { useLayoutEffect, useRef, useState } from 'react';

export type ConduitTone = 'parent' | 'flow' | 'ok' | 'miss';

export interface Conduit {
  /** `data-anchor` of the element the conduit starts at. */
  from: string;
  /** `data-anchor` of the element it ends at (with an arrowhead, unless it is a parent link). */
  to: string;
  tone: ConduitTone;
  /** Changes when the conduit should draw itself again (a new step). */
  key: string;
}

interface Drawn extends Conduit {
  d: string;
}

const STROKE: Record<ConduitTone, string> = {
  parent: 'var(--color-ink-500)',
  flow: 'var(--color-exec-400)',
  ok: 'var(--color-ok-400)',
  miss: 'var(--color-warn-400)',
};

type Box = { left: number; right: number; top: number; bottom: number };

/** Whether the vertical segment at `x` from `y1` to `y2` passes through `box`. */
const crosses = (box: Box, x: number, y1: number, y2: number) =>
  x > box.left && x < box.right && Math.max(y1, y2) > box.top && Math.min(y1, y2) < box.bottom;

/**
 * Draws the delegation conduits between loader plates: thin parent links that
 * point up to each loader's parent, and the active hop of the current step,
 * which draws itself from the acting loader to the other one (blue for a
 * request, green for an answer, orange and dashed for "nothing found"). A hop
 * that would cross another plate is routed around the right-hand side.
 * Positions are measured after layout and whenever the container resizes.
 * The container is the SVG's own parent: a parent's ref is attached only
 * after its children's layout effects have run, so it is not passed in.
 */
export function ConduitLayer({ conduits, version }: { conduits: Conduit[]; version: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState<Drawn[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const signature = conduits.map((c) => `${c.from}>${c.to}>${c.tone}>${c.key}`).join('|');

  useLayoutEffect(() => {
    const root = svgRef.current?.parentElement;
    if (!root) return;
    const measure = () => {
      const frame = root.getBoundingClientRect();
      const plates = [...root.querySelectorAll<HTMLElement>('[data-plate]')].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          anchor: el.dataset.anchor ?? '',
          left: r.left - frame.left,
          right: r.right - frame.left,
          top: r.top - frame.top,
          bottom: r.bottom - frame.top,
        };
      });
      const find = (anchor: string) => plates.find((p) => p.anchor === anchor);
      const next: Drawn[] = [];
      for (const conduit of conduits) {
        const a = find(conduit.from);
        const b = find(conduit.to);
        if (!a || !b) continue;
        const ax = (a.left + a.right) / 2;
        const bx = (b.left + b.right) / 2;
        const aboveB = a.top >= b.bottom - 1;
        const [y1, y2] = aboveB ? [a.top, b.bottom] : [a.bottom, b.top];
        const blocked = plates.some(
          (p) => p !== a && p !== b && (crosses(p, ax, y1, y2) || crosses(p, bx, y1, y2)),
        );
        let d: string;
        if (!blocked) {
          const mid = (y1 + y2) / 2;
          d = `M ${ax} ${y1} C ${ax} ${mid} ${bx} ${mid} ${bx} ${y2}`;
        } else {
          // Around the right-hand side of every plate in between.
          const between = plates.filter(
            (p) => p.bottom > Math.min(a.top, b.top) && p.top < Math.max(a.bottom, b.bottom),
          );
          // Half the gap to the next column, so the route never runs over another part.
          const x = Math.max(...between.map((p) => p.right)) + 12;
          const ya = (a.top + a.bottom) / 2;
          const yb = (b.top + b.bottom) / 2;
          d = `M ${a.right} ${ya} C ${x} ${ya} ${x} ${ya} ${x} ${(ya + yb) / 2} S ${x} ${yb} ${b.right} ${yb}`;
        }
        next.push({ ...conduit, d });
      }
      setDrawn(next);
      setSize({ w: frame.width, h: frame.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // The signature captures everything about the conduits that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, version]);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={size.w}
      height={size.h}
    >
      <defs>
        {(['flow', 'ok', 'miss', 'parent'] as const).map((tone) => (
          <marker
            key={tone}
            id={`conduit-${tone}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={STROKE[tone]} />
          </marker>
        ))}
      </defs>
      {drawn.map((conduit) =>
        conduit.tone === 'parent' ? (
          <path
            key={`${conduit.from}-${conduit.to}-${conduit.key}`}
            d={conduit.d}
            fill="none"
            stroke={STROKE.parent}
            strokeWidth={1.4}
            markerEnd="url(#conduit-parent)"
          />
        ) : (
          <path
            key={`${conduit.from}-${conduit.to}-${conduit.key}`}
            d={conduit.d}
            fill="none"
            stroke={STROKE[conduit.tone]}
            strokeWidth={2.6}
            pathLength={1}
            className={conduit.tone === 'miss' ? 'lab-conduit-miss' : 'lab-conduit-draw'}
            markerEnd={`url(#conduit-${conduit.tone})`}
          />
        ),
      )}
    </svg>
  );
}
