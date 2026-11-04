import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export interface ArrowSpec {
  /** `data-anchor` value of the element holding the reference. */
  from: string;
  /** `data-anchor` value of the object referred to. */
  to: string;
  /** `active`: the reference the learner selected, or one that leads to the selected object. */
  tone?: 'normal' | 'muted' | 'warn' | 'active';
}

interface DrawnArrow extends ArrowSpec {
  d: string;
  x: number;
  y: number;
}

const TONES = {
  normal: 'var(--color-rt-300)',
  muted: 'var(--color-ink-400)',
  warn: 'var(--color-warn-400)',
  active: 'var(--color-exec-300)',
};

/**
 * Draws references as arrows between HTML elements inside `container`: a dot
 * where the reference is held and an arrowhead at the object, so the shape
 * carries the meaning as well as the colour. Positions are measured after
 * layout and again whenever the container resizes.
 *
 * On the first render the container's ref is still empty (a parent's ref is
 * attached after its children's layout effects run), so the SVG's own parent,
 * which is the container, is measured instead.
 */
export function ReferenceArrows({
  container,
  arrows,
  version,
}: {
  container: RefObject<HTMLElement | null>;
  arrows: ArrowSpec[];
  /** Changes whenever the layout may have moved (for example, the current step). */
  version: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState<DrawnArrow[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // A string key keeps the effect stable while the arrow list keeps its meaning.
  const key = arrows.map((a) => `${a.from}>${a.to}>${a.tone ?? 'normal'}`).join('|');

  useLayoutEffect(() => {
    const root = container.current ?? svgRef.current?.parentElement;
    if (!root) return;
    const measure = () => {
      const box = root.getBoundingClientRect();
      const find = (anchor: string) =>
        root.querySelector<HTMLElement>(`[data-anchor="${anchor}"]`)?.getBoundingClientRect();
      const specs: ArrowSpec[] = key
        ? key.split('|').map((part) => {
            const [from, to, tone] = part.split('>') as [string, string, ArrowSpec['tone']];
            return { from, to, tone };
          })
        : [];
      const next: DrawnArrow[] = [];
      for (const arrow of specs) {
        const a = find(arrow.from);
        const b = find(arrow.to);
        if (!a || !b) continue;
        const x1 = a.right - box.left - 10;
        const y1 = a.top + a.height / 2 - box.top;
        const y2 = b.top + Math.min(b.height / 2, 22) - box.top;
        let d: string;
        if (b.left - box.left > x1 + 8) {
          // Object to the right: enter its left side.
          const x2 = b.left - box.left - 2;
          const dx = Math.max(24, (x2 - x1) / 2);
          d = `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
        } else if (b.right - box.left < a.left - box.left) {
          // Object to the left: enter its right side.
          const x2 = b.right - box.left + 2;
          const dx = Math.max(24, (x1 - x2) / 2);
          d = `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 + dx} ${y2} ${x2} ${y2}`;
        } else {
          // Stacked layout: loop around the right-hand side and enter from the right.
          const x2 = b.right - box.left + 2;
          const xr = Math.max(a.right, b.right) - box.left + 26;
          d = `M ${x1} ${y1} C ${xr} ${y1} ${xr} ${y2} ${x2} ${y2}`;
        }
        next.push({ ...arrow, x: x1, y: y1, d });
      }
      setDrawn(next);
      setSize({ w: box.width, h: box.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    // Web fonts can move text without resizing the container.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [container, version, key]);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={size.w}
      height={size.h}
    >
      <defs>
        {(['normal', 'muted', 'warn', 'active'] as const).map((tone) => (
          <marker
            key={tone}
            id={`ref-arrow-${tone}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={TONES[tone]} />
          </marker>
        ))}
      </defs>
      {drawn.map((arrow) => {
        const tone = arrow.tone ?? 'normal';
        return (
          <g key={`${arrow.from}->${arrow.to}`}>
            <path
              d={arrow.d}
              fill="none"
              stroke={TONES[tone]}
              strokeWidth={tone === 'active' ? 2.6 : 1.6}
              strokeDasharray={tone === 'warn' ? '5 4' : undefined}
              markerEnd={`url(#ref-arrow-${tone})`}
            />
            <circle cx={arrow.x} cy={arrow.y} r={3.2} fill={TONES[tone]} />
          </g>
        );
      })}
    </svg>
  );
}
