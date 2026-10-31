import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, type MutableRefObject } from 'react';
import { Vector3 } from 'three';
import type { ComponentId } from '@/content/jvm';
import { cn } from '@/lib/cn';
import { drawnHeight, type Box3 } from '../data/layout3d';

export interface Label3D {
  id: ComponentId;
  text: string;
  /** Areas are always labelled; parts only when selected, hovered or active. */
  kind: 'area' | 'part';
  emphasis?: boolean;
}

/**
 * HTML labels over the canvas: real text at a readable size whatever the
 * zoom. Their positions are written by LabelProjector on rendered frames.
 */
export function LabelLayer({
  labels,
  elements,
}: {
  labels: Label3D[];
  elements: MutableRefObject<Map<ComponentId, HTMLElement>>;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {labels.map((label) => (
        <span
          key={label.id}
          ref={(element) => {
            if (element) elements.current.set(label.id, element);
            else elements.current.delete(label.id);
          }}
          style={{ visibility: 'hidden' }}
          className={cn(
            'absolute top-0 left-0 max-w-[180px] truncate rounded border px-2 py-0.5 whitespace-nowrap will-change-transform',
            label.kind === 'area'
              ? 'border-ink-500 bg-ink-900 text-[12.5px] font-medium text-fg'
              : 'border-ink-600 bg-ink-850 text-[12px] text-fg-muted',
            label.emphasis && 'border-exec-400 text-fg',
          )}
        >
          {label.text}
        </span>
      ))}
    </div>
  );
}

/** Projects each label's anchor (the top centre of its part) to the screen. */
export function LabelProjector({
  labels,
  elements,
  boxesRef,
  closed,
}: {
  labels: Label3D[];
  elements: MutableRefObject<Map<ComponentId, HTMLElement>>;
  boxesRef: MutableRefObject<Record<ComponentId, Box3>>;
  closed: ReadonlySet<ComponentId>;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const point = useMemo(() => new Vector3(), []);

  // New labels, or a canvas that has just been measured, need a frame to be
  // placed; a second, slightly later frame catches a camera set up after mount.
  useEffect(() => {
    invalidate();
    const settle = window.setTimeout(() => invalidate(), 150);
    return () => window.clearTimeout(settle);
  }, [labels, size, invalidate]);

  useFrame(({ camera, size }) => {
    for (const label of labels) {
      const element = elements.current.get(label.id);
      const box = boxesRef.current[label.id];
      if (!element || !box) continue;
      const bottom = box.center[1] - box.size[1] / 2;
      point.set(box.center[0], bottom + drawnHeight(box, closed.has(label.id)), box.center[2]);
      point.project(camera);
      const x = ((point.x + 1) / 2) * size.width;
      const y = ((1 - point.y) / 2) * size.height;
      // Inside the camera's view volume: between the near and far planes, and on screen.
      const onScreen =
        point.z > -1 && point.z < 1 && x > -40 && x < size.width + 40 && y > 0 && y < size.height;
      element.style.visibility = onScreen ? 'visible' : 'hidden';
      element.style.transform = `translate(${x.toFixed(1)}px, ${(y - 6).toFixed(1)}px) translate(-50%, -100%)`;
    }
  });

  return null;
}
