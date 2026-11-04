import { LOADER_PROFILES, LOADER_WORLD, type LoaderId } from '@/content/labs/classLoading';
import type { LoaderRuntime } from '@/simulators/classLoading';
import type { LabLink, LabNode, LabScene, LinkTone, Vec3 } from './labScene';

/*
 * The loader observatory in 3D: the delegation hierarchy as terraces rising
 * away from the viewer, with the bootstrap loader as the foundation in front.
 * Each loader is a prism with its own number of sides, the sources it reads
 * stand beside it, and the classes it holds stand on it (cubes for classes it
 * defined, flat tiles for classes it is recorded as an initiating loader of).
 * Pure: the same input gives the same scene.
 */

export interface LoaderHop {
  id: string;
  from: LoaderId;
  to: LoaderId;
  tone: Extract<LinkTone, 'flow' | 'ok' | 'miss'>;
}

const LEVEL: Record<LoaderId, number> = {
  bootstrap: 0,
  platform: 1,
  app: 2,
  'parent-first': 3,
  'child-first': 3,
};

const SHAPE: Record<LoaderId, { sides: number; diameter: number; height: number; x: number }> = {
  bootstrap: { sides: 6, diameter: 3.2, height: 0.55, x: 0 },
  platform: { sides: 8, diameter: 2.8, height: 0.45, x: 0 },
  app: { sides: 12, diameter: 3.0, height: 0.45, x: 0 },
  'parent-first': { sides: 4, diameter: 2.2, height: 0.4, x: -1.5 },
  'child-first': { sides: 4, diameter: 2.2, height: 0.4, x: 1.5 },
};

/** Each level stands further back than the one below it, like terraces. */
const TERRACE_Z = [2.7, 0.6, -1.5, -3.6];
const GAP = 0.35;
const EXPLODE_GAP = 1.4;
const CHIP = 0.34;
const CHIP_STEP = 0.52;

/** Base height of each level of the tower. */
function levelBases(explode: number): number[] {
  const gap = GAP + EXPLODE_GAP * Math.min(1, Math.max(0, explode));
  const heights = [0.55, 0.45, 0.45, 0.4];
  const bases = [0];
  for (let i = 1; i < heights.length; i++) bases.push(bases[i - 1]! + heights[i - 1]! + gap);
  return bases;
}

const ancestorsOf = (id: LoaderId): LoaderId[] => {
  const chain: LoaderId[] = [];
  let parent = LOADER_WORLD.loaders.find((l) => l.id === id)?.parent as LoaderId | null;
  while (parent) {
    chain.push(parent);
    parent = LOADER_WORLD.loaders.find((l) => l.id === parent)?.parent as LoaderId | null;
  }
  return chain;
};

/** Which loaders are drawn: all, or an isolated loader with its ancestors and children. */
export function visibleLoaders(isolate: LoaderId | null): LoaderId[] {
  const all = LOADER_WORLD.loaders.map((l) => l.id as LoaderId);
  if (!isolate) return all;
  const keep = new Set<LoaderId>([isolate, ...ancestorsOf(isolate)]);
  for (const loader of LOADER_WORLD.loaders)
    if (loader.parent === isolate) keep.add(loader.id as LoaderId);
  return all.filter((id) => keep.has(id));
}

export function loaderNode(id: LoaderId, explode: number): LabNode {
  const shape = SHAPE[id];
  const base = levelBases(explode)[LEVEL[id]]!;
  return {
    id: `loader:${id}`,
    shape: 'prism',
    sides: shape.sides,
    base: [shape.x, base, TERRACE_Z[LEVEL[id]]!],
    size: [shape.diameter, shape.height, shape.diameter],
    family: 'rt',
    provenance: LOADER_PROFILES[id].provenance,
    owner: id,
    role: 'part',
    label: LOADER_PROFILES[id].plateTitle,
  };
}

const SOURCES: {
  id: string;
  owner: LoaderId;
  label: string;
  provenance: 'platform' | 'hotspot';
  offset: Vec3;
  size: Vec3;
}[] = [
  {
    id: 'runtime-image',
    owner: 'bootstrap',
    label: 'Runtime image',
    provenance: 'platform',
    offset: [3.2, 0, -0.65],
    size: [2.0, 0.16, 1.1],
  },
  {
    id: 'cds',
    owner: 'bootstrap',
    label: 'CDS archive (HS)',
    provenance: 'hotspot',
    offset: [3.2, 0, 0.75],
    size: [2.0, 0.16, 1.0],
  },
  {
    id: 'class-path',
    owner: 'app',
    label: 'Class path',
    provenance: 'platform',
    offset: [3.1, 0, 0],
    size: [1.9, 0.14, 1.2],
  },
  {
    id: 'plugin-dir',
    owner: 'child-first',
    label: 'plugin/',
    provenance: 'platform',
    offset: [2.9, 0, 0],
    size: [1.6, 0.14, 1.2],
  },
];

export function loaderScene({
  runtime,
  explode,
  isolate,
  hops = [],
}: {
  runtime: LoaderRuntime;
  explode: number;
  isolate: LoaderId | null;
  hops?: LoaderHop[];
}): LabScene {
  const shown = visibleLoaders(isolate);
  const nodes: LabNode[] = [];
  const links: LabLink[] = [];
  const nodeOf = (id: LoaderId) => loaderNode(id, explode);

  for (const id of shown) {
    const node = nodeOf(id);
    nodes.push(node);

    // The classes it holds, standing on it.
    const defined = runtime.classes
      .filter((c) => c.definingLoader === id)
      .map((c) => ({ id: c.id, flat: false }));
    const recorded = Object.values(runtime.initiated[id] ?? {})
      .filter((classId) => !defined.some((d) => d.id === classId))
      .map((classId) => ({ id: classId, flat: true }));
    const chips = [...defined, ...recorded];
    const columns = Math.min(3, Math.max(1, chips.length));
    const rows = Math.ceil(chips.length / columns);
    chips.forEach((chip, i) => {
      const column = i % columns;
      const row = Math.floor(i / columns);
      nodes.push({
        id: `class:${id}:${chip.id}`,
        shape: 'box',
        base: [
          node.base[0] + (column - (columns - 1) / 2) * CHIP_STEP,
          node.base[1] + node.size[1],
          node.base[2] + (row - (rows - 1) / 2) * CHIP_STEP,
        ],
        size: chip.flat ? [CHIP, 0.06, CHIP] : [CHIP, CHIP * 0.8, CHIP],
        family: 'rt',
        provenance: 'spec',
        owner: id,
        role: 'item',
        label: chip.id,
      });
    });

    // The link to its parent: from its base down to the parent's top.
    const parent = LOADER_WORLD.loaders.find((l) => l.id === id)?.parent as LoaderId | null;
    if (parent && shown.includes(parent)) {
      const p = nodeOf(parent);
      links.push({
        id: `parent:${id}`,
        from: [node.base[0] * 0.6, node.base[1], node.base[2]],
        to: [p.base[0], p.base[1] + p.size[1], p.base[2]],
        tone: 'parent',
        lift: 0,
      });
    }
  }

  for (const source of SOURCES) {
    if (!shown.includes(source.owner)) continue;
    const owner = nodeOf(source.owner);
    nodes.push({
      id: `source:${source.id}`,
      shape: 'box',
      base: [owner.base[0] + source.offset[0], owner.base[1], owner.base[2] + source.offset[2]],
      size: source.size,
      family: 'plat',
      provenance: source.provenance,
      owner: '',
      role: 'source',
      label: source.label,
    });
  }

  // A request's hops run along the outside of the tower, so they never hide the parent links.
  for (const hop of hops) {
    if (!shown.includes(hop.from) || !shown.includes(hop.to)) continue;
    const a = nodeOf(hop.from);
    const b = nodeOf(hop.to);
    const side = hop.tone === 'flow' ? -1 : 1;
    const rim = (n: LabNode): Vec3 => [
      n.base[0] - n.size[0] * 0.42,
      n.base[1] + n.size[1],
      n.base[2] + side * n.size[2] * 0.3,
    ];
    links.push({ id: hop.id, from: rim(a), to: rim(b), tone: hop.tone, lift: 0.35 });
  }

  return { nodes, links };
}
