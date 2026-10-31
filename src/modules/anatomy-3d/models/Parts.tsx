import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { BoxGeometry, EdgesGeometry, type Group, type LineSegments } from 'three';
import { COMPONENTS, type ComponentId } from '@/content/jvm';
import { drawnHeight, layoutBoxes, type Box3 } from '../data/layout3d';
import type { MaterialLibrary, PartLook } from './materials';

export interface PartsProps {
  /** The layout as currently drawn; read by labels and flows on rendered frames. */
  boxesRef: MutableRefObject<Record<ComponentId, Box3>>;
  /** Set while the explode animation runs. */
  movingRef: MutableRefObject<boolean>;
  explode: number;
  visible: ReadonlySet<ComponentId>;
  closed: ReadonlySet<ComponentId>;
  lookOf: (id: ComponentId) => PartLook;
  materials: MaterialLibrary;
  reducedMotion: boolean;
  onHover: (id: ComponentId | null) => void;
  onPick: (id: ComponentId, additive: boolean) => void;
}

/**
 * Every visible part as a block (or, for a closed area, a case) with an
 * outline in its provenance line style. React places the parts at the target
 * explode amount; the animation towards it moves the groups directly on each
 * rendered frame, outside React.
 */
export function Parts({
  boxesRef,
  movingRef,
  explode,
  visible,
  closed,
  lookOf,
  materials,
  reducedMotion,
  onHover,
  onPick,
}: PartsProps) {
  const get = useThree((state) => state.get);
  const groups = useRef(new Map<ComponentId, Group>());
  const shown = useRef(explode);
  const unitBox = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const layout = useMemo(() => layoutBoxes(explode), [explode]);

  // Outline geometry depends only on a part's size and whether it is closed.
  const outlines = useMemo(() => {
    const map = new Map<ComponentId, EdgesGeometry>();
    const boxes = layoutBoxes(0);
    for (const id of visible) {
      const box = boxes[id];
      const shape = new BoxGeometry(box.size[0], drawnHeight(box, closed.has(id)), box.size[2]);
      map.set(id, new EdgesGeometry(shape));
      shape.dispose();
    }
    return map;
  }, [visible, closed]);

  useEffect(() => () => unitBox.dispose(), [unitBox]);
  useEffect(() => () => outlines.forEach((geometry) => geometry.dispose()), [outlines]);

  useEffect(() => {
    get().invalidate();
  }, [explode, visible, closed, lookOf, get]);

  // A hovered part that disappears never receives pointer-out: reset the cursor.
  useEffect(() => {
    get().gl.domElement.style.cursor = '';
  }, [visible, get]);

  useFrame((_, delta) => {
    const target = explode;
    if (Math.abs(shown.current - target) < 0.001) {
      if (shown.current !== target || movingRef.current) {
        shown.current = target;
        boxesRef.current = layout;
        movingRef.current = false;
        for (const [id, group] of groups.current) place(group, layout[id]);
        get().invalidate();
      }
      return;
    }
    shown.current = reducedMotion
      ? target
      : shown.current + (target - shown.current) * Math.min(1, delta * 7);
    const now = layoutBoxes(shown.current);
    boxesRef.current = now;
    movingRef.current = true;
    for (const [id, group] of groups.current) place(group, now[id]);
    get().invalidate();
  });

  const setCursor = (pointer: boolean) => {
    get().gl.domElement.style.cursor = pointer ? 'pointer' : '';
  };

  return (
    <group>
      {[...visible].map((id) => {
        const box = layout[id];
        const isClosed = closed.has(id);
        const height = drawnHeight(box, isClosed);
        const look = lookOf(id);
        return (
          <group
            key={id}
            ref={(group) => {
              if (group) groups.current.set(id, group);
              else groups.current.delete(id);
            }}
            position={[box.center[0], box.center[1] - box.size[1] / 2, box.center[2]]}
          >
            <mesh
              name={id}
              geometry={unitBox}
              material={materials.surface(box.family, look, box.leaf || isClosed)}
              position={[0, height / 2, 0]}
              scale={[box.size[0], height, box.size[2]]}
              onPointerOver={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation();
                setCursor(true);
                onHover(id);
              }}
              onPointerOut={() => {
                setCursor(false);
                onHover(null);
              }}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                onPick(id, event.shiftKey || event.metaKey || event.ctrlKey);
              }}
            />
            <lineSegments
              geometry={outlines.get(id)}
              material={materials.edge(box.family, COMPONENTS[id].provenance, look)}
              position={[0, height / 2, 0]}
              ref={(lines: LineSegments | null) => {
                lines?.computeLineDistances();
              }}
            />
          </group>
        );
      })}
    </group>
  );
}

/** Stands a part's group on the bottom of its box. */
function place(group: Group, box: Box3) {
  group.position.set(box.center[0], box.center[1] - box.size[1] / 2, box.center[2]);
}
