import { childrenOf, COMPONENT_IDS, COMPONENTS, isAncestor, type ComponentId } from '@/content/jvm';
import { ATLAS_AREAS } from '@/content/jvm/regions';
import { DIAGRAM_SIZE, NODE_RECTS } from '@/modules/jvm/layout';
import { depthOf, familyOf, type Family } from '@/modules/jvm/scene';

/*
 * Spatial metadata for the 3D anatomy, derived from the 2D plate so both views
 * agree: a part's footprint is its rectangle on the plate, and it stands on
 * top of the part that contains it. Positions are a teaching layout, not
 * memory addresses or physical locations. Pure functions, no Three.js.
 */

export type Vec3 = [number, number, number];

export interface Box3 {
  id: ComponentId;
  center: Vec3;
  size: Vec3;
  depth: number;
  family: Family;
  /** A part with no parts of its own: drawn as a block, not a slab. */
  leaf: boolean;
}

/** World units per diagram unit: the 1600-unit plate becomes 16 units wide. */
export const SCALE = 0.01;
/** Thickness of a part that holds other parts. */
const SLAB = 0.1;
/** Height of a part with no parts of its own. */
const BLOCK = 0.34;
/** Inset on every side, so neighbouring parts never touch. */
const INSET = 0.02;
/** Exploded: extra space between a part and the part it stands on. */
const LIFT = 0.6;
/** Exploded: how far the seven areas move away from the centre. */
const SPREAD = 0.18;
/** Space above the tallest part inside a closed area. */
const LID_MARGIN = 0.08;

const ORIGIN = { x: DIAGRAM_SIZE.w / 2, y: DIAGRAM_SIZE.h / 2 };
const AREA_IDS = new Set<ComponentId>(ATLAS_AREAS.map((area) => area.id));

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const isLeaf = (id: ComponentId) => childrenOf(id).length === 0;

/** The atlas area a part belongs to, or null for the process and the JVM themselves. */
export function areaOf(id: ComponentId): ComponentId | null {
  if (AREA_IDS.has(id)) return id;
  for (const area of AREA_IDS) if (isAncestor(area, id)) return area;
  return null;
}

/** Every part's box, with the given explode amount (0 assembled, 1 fully exploded). */
export function layoutBoxes(explode: number): Record<ComponentId, Box3> {
  const amount = clamp01(explode);
  const boxes = {} as Record<ComponentId, Box3>;
  const place = (id: ComponentId, base: number) => {
    const rect = NODE_RECTS[id];
    const height = isLeaf(id) ? BLOCK : SLAB;
    const area = areaOf(id);
    let x = (rect.x + rect.w / 2 - ORIGIN.x) * SCALE;
    let z = (rect.y + rect.h / 2 - ORIGIN.y) * SCALE;
    if (area) {
      const areaRect = NODE_RECTS[area];
      x += (areaRect.x + areaRect.w / 2 - ORIGIN.x) * SCALE * SPREAD * amount;
      z += (areaRect.y + areaRect.h / 2 - ORIGIN.y) * SCALE * SPREAD * amount;
    }
    boxes[id] = {
      id,
      center: [x, base + height / 2, z],
      size: [rect.w * SCALE - 2 * INSET, height, rect.h * SCALE - 2 * INSET],
      depth: depthOf(id),
      family: familyOf(id),
      leaf: isLeaf(id),
    };
    for (const child of childrenOf(id)) place(child.id, base + height + LIFT * amount);
  };
  for (const id of COMPONENT_IDS) if (!COMPONENTS[id].parent) place(id, 0);
  return boxes;
}

const ASSEMBLED = layoutBoxes(0);
const topOf = (box: Box3) => box.center[1] + box.size[1] / 2;
const bottomOf = (box: Box3) => box.center[1] - box.size[1] / 2;

/** Height of an area drawn closed: a case that holds everything inside it. */
export function caseHeight(area: ComponentId): number {
  const inside = COMPONENT_IDS.filter((id) => isAncestor(area, id));
  const highest = Math.max(topOf(ASSEMBLED[area]), ...inside.map((id) => topOf(ASSEMBLED[id])));
  return highest - bottomOf(ASSEMBLED[area]) + LID_MARGIN;
}

/**
 * Which parts are drawn. The overview shows each area closed, except the one
 * holding the selection and any inside an isolated part; isolating keeps the
 * selected part, the parts that contain it and the parts inside it.
 */
export function visibleIds({
  overview,
  selectedId,
  isolate,
}: {
  overview: boolean;
  selectedId: ComponentId | null;
  isolate: boolean;
}): Set<ComponentId> {
  const openArea = selectedId ? areaOf(selectedId) : null;
  const isolating = isolate && selectedId !== null;
  return new Set(
    COMPONENT_IDS.filter((id) => {
      if (overview) {
        const area = areaOf(id);
        // Closed, unless it holds the selection or lies inside an isolated part.
        if (area && area !== id) {
          const open =
            area === openArea ||
            (isolating && (area === selectedId || isAncestor(selectedId!, area)));
          if (!open) return false;
        }
      }
      if (isolating)
        return id === selectedId || isAncestor(id, selectedId!) || isAncestor(selectedId!, id);
      return true;
    }),
  );
}

/** A curved flow from the top of one part to the top of another. */
export function flowArc(from: Box3, to: Box3): { start: Vec3; control: Vec3; end: Vec3 } {
  const start: Vec3 = [from.center[0], topOf(from), from.center[2]];
  const end: Vec3 = [to.center[0], topOf(to), to.center[2]];
  const distance = Math.hypot(end[0] - start[0], end[2] - start[2]);
  const control: Vec3 = [
    (start[0] + end[0]) / 2,
    Math.max(start[1], end[1]) + 0.5 + distance * 0.15,
    (start[2] + end[2]) / 2,
  ];
  return { start, control, end };
}

/** Centre and radius of a sphere around the given boxes, for framing the camera. */
export function frameBoxes(list: Box3[]): { center: Vec3; radius: number } {
  if (list.length === 0) return { center: [0, 0.3, 0], radius: 9 };
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const box of list)
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis]!, box.center[axis]! - box.size[axis]! / 2);
      max[axis] = Math.max(max[axis]!, box.center[axis]! + box.size[axis]! / 2);
    }
  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const radius = Math.max(0.6, Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2);
  return { center, radius };
}

/** Height drawn for a part: a closed area becomes a case tall enough to hold its parts. */
export const drawnHeight = (box: Box3, closed: boolean) =>
  closed ? caseHeight(box.id) : box.size[1];
