import { useCallback, useMemo } from 'react';
import { MEMORY_AREAS, type MemoryAreaId } from '@/content/labs/memory';
import type { CameraHome } from '@/modules/anatomy-3d/controls/CameraRig';
import type { PartLook } from '@/modules/anatomy-3d/models/materials';
import type { LabNode, LabScene } from './data/labScene';
import { memoryScene, relatedAreas } from './data/memoryScene';
import LabViewer3D from './LabViewer3D';
import type { SceneLabel } from './SceneLabels';

const HOME: CameraHome = { target: [0.9, 1.3, 0.3], distance: 17, polar: 1.05, azimuth: -0.42 };
const titleOf = (id: string) => MEMORY_AREAS.find((a) => a.id === id)?.title ?? id;

/**
 * The memory observatory in 3D (lazy chunk): the specification's areas on an
 * upper deck, HotSpot's structures on the floor below, and links from the
 * selected area to what corresponds to it in the other layer. Selection is
 * shared with the 2D layers and the URL.
 */
export default function MemoryObservatory3D({
  selected,
  onSelect,
  reducedMotion,
  onUse2D,
}: {
  selected: MemoryAreaId | null;
  onSelect: (id: string | null) => void;
  reducedMotion: boolean;
  onUse2D: () => void;
}) {
  const build = useCallback(
    ({ explode, isolate }: { explode: number; isolate: string | null }): LabScene =>
      memoryScene({ explode, selected, isolate: Boolean(isolate) }),
    [selected],
  );
  const labels = useCallback(
    (scene: LabScene, current: string | null): SceneLabel[] =>
      scene.nodes
        .filter((n) => n.label)
        .map((n) => ({
          node: n.id,
          text: n.label!,
          kind: 'part' as const,
          emphasis: n.owner === current,
        })),
    [],
  );
  const related = useMemo(() => (selected ? new Set(relatedAreas(selected)) : null), [selected]);
  const lookOf = useCallback(
    (node: LabNode, base: PartLook): PartLook =>
      related?.has(node.owner as MemoryAreaId) ? 'hovered' : base,
    [related],
  );

  return (
    <LabViewer3D
      label="3D model of the memory of a running JVM"
      help="Drag to orbit, scroll or pinch to zoom, and drag with the right button or two fingers to pan. With the model focused, arrow keys orbit, plus and minus zoom, 0 resets the view, F frames the selected area and Escape clears the selection. The 2D layers show the same areas as text."
      build={build}
      selected={selected}
      ownerName={titleOf}
      onSelect={onSelect}
      lookOf={lookOf}
      labels={labels}
      home={HOME}
      reducedMotion={reducedMotion}
      onUse2D={onUse2D}
      twoD="the 2D layers"
      overlay={
        <div className="rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-[12.5px] text-fg-muted">
          <p>
            <span className="text-rt-200">Upper deck</span>: the specification’s areas (solid).
          </p>
          <p>
            <span className="text-fg">Floor</span>: HotSpot structures (dashed) and, in front,
            memory outside them (dotted).
          </p>
          {selected && (
            <p className="mt-1 text-exec-200">
              {titleOf(selected)}:{' '}
              {related && related.size > 0
                ? `linked to ${[...related].map(titleOf).join(', ')}`
                : 'no counterpart in the other layer'}
              .
            </p>
          )}
        </div>
      }
    />
  );
}
