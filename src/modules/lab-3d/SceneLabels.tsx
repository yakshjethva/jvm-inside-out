import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, type MutableRefObject } from 'react';
import { Vector3 } from 'three';
import { cn } from '@/lib/cn';
import type { NodePositions } from './SceneNodes';

export interface SceneLabel {
  /** The node the label stands on. */
  node: string;
  text: string;
  kind: 'part' | 'source' | 'item';
  emphasis?: boolean;
}

/**
 * HTML labels over the canvas: real text at a readable size whatever the
 * zoom. Their positions are written by SceneLabelProjector on rendered frames.
 */
export function SceneLabelLayer({
  labels,
  elements,
}: {
  labels: SceneLabel[];
  elements: MutableRefObject<Map<string, HTMLElement>>;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {labels.map((label) => (
        <span
          key={label.node}
          ref={(element) => {
            if (element) elements.current.set(label.node, element);
            else elements.current.delete(label.node);
          }}
          style={{ visibility: 'hidden' }}
          className={cn(
            'absolute top-0 left-0 max-w-[200px] truncate rounded border px-2 py-0.5 whitespace-nowrap will-change-transform',
            label.kind === 'part'
              ? 'border-ink-500 bg-ink-900 text-[12.5px] font-medium text-fg'
              : label.kind === 'source'
                ? 'border-dotted border-plat-500 bg-ink-900 text-[12px] text-fg-muted'
                : 'border-ink-600 bg-ink-850 font-mono text-[11.5px] text-fg-muted',
            label.emphasis && 'border-exec-400 text-fg',
          )}
        >
          {label.text}
        </span>
      ))}
    </div>
  );
}

/** Projects each label's anchor (the top centre of its node) to the screen. */
export function SceneLabelProjector({
  labels,
  elements,
  positionsRef,
}: {
  labels: SceneLabel[];
  elements: MutableRefObject<Map<string, HTMLElement>>;
  positionsRef: MutableRefObject<NodePositions>;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const point = useMemo(() => new Vector3(), []);

  useEffect(() => {
    invalidate();
    const settle = window.setTimeout(() => invalidate(), 150);
    return () => window.clearTimeout(settle);
  }, [labels, size, invalidate]);

  useFrame(({ camera, size }) => {
    for (const label of labels) {
      const element = elements.current.get(label.node);
      const position = positionsRef.current.get(label.node);
      if (!element || !position) continue;
      point.set(position.base[0], position.base[1] + position.size[1], position.base[2]);
      point.project(camera);
      const x = ((point.x + 1) / 2) * size.width;
      const y = ((1 - point.y) / 2) * size.height;
      const onScreen =
        point.z > -1 && point.z < 1 && x > -40 && x < size.width + 40 && y > 0 && y < size.height;
      element.style.visibility = onScreen ? 'visible' : 'hidden';
      element.style.transform = `translate(${x.toFixed(1)}px, ${(y - 6).toFixed(1)}px) translate(-50%, -100%)`;
    }
  });

  return null;
}
