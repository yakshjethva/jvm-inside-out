import { MEMORY_AREAS, type MemoryAreaId } from '@/content/labs/memory';
import type { LabLink, LabNode, LabScene, Vec3 } from './labScene';

/*
 * The memory observatory in 3D: the specification's run-time data areas on an
 * upper deck, the HotSpot structures that implement them on the floor below,
 * and memory outside the JVM's own structures to the front. Per-thread areas
 * appear once for each of two threads. Selecting an area draws links to the
 * areas of the other layer that correspond to it. Pure: a teaching layout,
 * never a memory map.
 */

const SPEC_BASE = 2.3;
const EXPLODE_RISE = 2.2;
const THREADS = [0, 1];

interface Placement {
  owner: MemoryAreaId;
  /** Per-thread areas have one placement per thread. */
  thread?: number;
  base: Vec3;
  size: Vec3;
  shape: 'box' | 'prism';
}

function placements(rise: number): Placement[] {
  const up = SPEC_BASE + rise;
  const column = (t: number) => 4.3 + t * 1.5;
  return [
    { owner: 'heap', base: [-3.0, up, -0.2], size: [4.0, 0.22, 3.0], shape: 'box' },
    { owner: 'method-area', base: [1.1, up, -0.9], size: [2.6, 0.22, 1.5], shape: 'box' },
    { owner: 'runtime-constant-pool', base: [1.1, up, 0.9], size: [2.6, 0.22, 1.3], shape: 'box' },
    ...THREADS.flatMap((t): Placement[] => [
      {
        owner: 'pc-register',
        thread: t,
        base: [column(t), up, 0],
        size: [1.1, 0.12, 1.1],
        shape: 'prism',
      },
      {
        owner: 'jvm-stack',
        thread: t,
        base: [column(t), up + 0.18, 0],
        size: [1.1, 0.6, 1.1],
        shape: 'prism',
      },
      {
        owner: 'native-method-stack',
        thread: t,
        base: [column(t), up + 0.84, 0],
        size: [1.1, 0.3, 1.1],
        shape: 'prism',
      },
    ]),
    { owner: 'java-heap', base: [-3.0, 0, -0.2], size: [4.0, 0.3, 3.0], shape: 'box' },
    { owner: 'metaspace', base: [0.6, 0, -0.9], size: [1.6, 0.3, 1.5], shape: 'box' },
    { owner: 'class-space', base: [2.4, 0, -0.9], size: [1.4, 0.3, 1.5], shape: 'box' },
    { owner: 'code-cache', base: [0.6, 0, 0.9], size: [1.6, 0.3, 1.3], shape: 'box' },
    { owner: 'gc-structures', base: [2.4, 0, 0.9], size: [1.4, 0.3, 1.3], shape: 'box' },
    ...THREADS.map((t): Placement => ({
      owner: 'thread-stacks',
      thread: t,
      base: [column(t), 0, 0],
      size: [1.1, 0.5, 1.1],
      shape: 'prism',
    })),
    { owner: 'native-allocations', base: [4.9, 0, 2.4], size: [2.8, 0.2, 1.2], shape: 'box' },
  ];
}

const areaOf = (id: MemoryAreaId) => MEMORY_AREAS.find((a) => a.id === id)!;

/** Areas that correspond to `id` in the other layer, in either direction. */
export function relatedAreas(id: MemoryAreaId): MemoryAreaId[] {
  return [
    ...new Set([
      ...areaOf(id).mapsTo,
      ...MEMORY_AREAS.filter((a) => a.mapsTo.includes(id)).map((a) => a.id),
    ]),
  ];
}

export function memoryScene({
  explode,
  selected,
  isolate,
}: {
  explode: number;
  selected: MemoryAreaId | null;
  isolate: boolean;
}): LabScene {
  const rise = EXPLODE_RISE * Math.min(1, Math.max(0, explode));
  const keep = isolate && selected ? new Set([selected, ...relatedAreas(selected)]) : null;
  const nodes: LabNode[] = placements(rise)
    .filter((p) => !keep || keep.has(p.owner))
    .map((p) => {
      const a = areaOf(p.owner);
      return {
        id: p.thread === undefined ? `area:${p.owner}` : `area:${p.owner}:${p.thread}`,
        shape: p.shape,
        sides: p.shape === 'prism' ? 6 : undefined,
        base: p.base,
        size: p.size,
        family: a.layer === 'platform' ? 'plat' : a.layer === 'hotspot' ? 'exec' : 'rt',
        provenance: a.provenance,
        owner: p.owner,
        role: 'part',
        // Per-thread areas are labelled once, on the first thread.
        label:
          p.thread === undefined || p.thread === 0
            ? `${a.title}${p.thread === 0 ? ' (per thread)' : ''}`
            : undefined,
      };
    });

  const links: LabLink[] = [];
  if (selected) {
    const from = nodes.filter((n) => n.owner === selected);
    for (const other of relatedAreas(selected)) {
      const targets = nodes.filter((n) => n.owner === other);
      for (const a of from)
        for (const b of targets) {
          // Per-thread areas link only within their own thread.
          const ta = a.id.split(':')[2];
          const tb = b.id.split(':')[2];
          if (ta !== undefined && tb !== undefined && ta !== tb) continue;
          const upper = a.base[1] >= b.base[1] ? a : b;
          const lower = upper === a ? b : a;
          links.push({
            id: `map:${a.id}>${b.id}`,
            from: [upper.base[0], upper.base[1], upper.base[2]],
            to: [lower.base[0], lower.base[1] + lower.size[1], lower.base[2]],
            tone: 'reference',
            lift: 0,
          });
        }
    }
  }
  return { nodes, links };
}
