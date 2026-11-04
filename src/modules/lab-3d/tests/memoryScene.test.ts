import { describe, expect, it } from 'vitest';
import { MEMORY_AREAS } from '@/content/labs/memory';
import { memoryScene, relatedAreas } from '../data/memoryScene';

describe('the 3D memory observatory layout', () => {
  const scene = memoryScene({ explode: 0, selected: null, isolate: false });

  it('draws every area, and per-thread areas once per thread', () => {
    for (const area of MEMORY_AREAS)
      expect(
        scene.nodes.some((n) => n.owner === area.id),
        area.id,
      ).toBe(true);
    for (const id of ['pc-register', 'jvm-stack', 'native-method-stack', 'thread-stacks'])
      expect(
        scene.nodes.filter((n) => n.owner === id),
        id,
      ).toHaveLength(2);
  });

  it('puts the specification above HotSpot and outlines each by its provenance', () => {
    const lowestSpec = Math.min(
      ...scene.nodes.filter((n) => n.provenance === 'spec').map((n) => n.base[1]),
    );
    const highestImpl = Math.max(
      ...scene.nodes.filter((n) => n.provenance !== 'spec').map((n) => n.base[1] + n.size[1]),
    );
    expect(lowestSpec).toBeGreaterThan(highestImpl);
    expect(scene.nodes.find((n) => n.owner === 'metaspace')!.provenance).toBe('hotspot');
    expect(scene.nodes.find((n) => n.owner === 'native-allocations')!.provenance).toBe('platform');
  });

  it('raises the specification deck when exploded, and leaves HotSpot in place', () => {
    const exploded = memoryScene({ explode: 1, selected: null, isolate: false });
    const heapY = (s: typeof scene) => s.nodes.find((n) => n.owner === 'heap')!.base[1];
    expect(heapY(exploded)).toBeGreaterThan(heapY(scene));
    expect(exploded.nodes.find((n) => n.owner === 'java-heap')!.base).toEqual(
      scene.nodes.find((n) => n.owner === 'java-heap')!.base,
    );
  });

  it('links the selection to the areas that correspond to it, thread by thread', () => {
    expect(scene.links).toEqual([]);
    const selected = memoryScene({ explode: 0, selected: 'jvm-stack', isolate: false });
    expect(relatedAreas('jvm-stack')).toEqual(['thread-stacks']);
    expect(selected.links.map((l) => l.id)).toEqual([
      'map:area:jvm-stack:0>area:thread-stacks:0',
      'map:area:jvm-stack:1>area:thread-stacks:1',
    ]);
    for (const link of selected.links) expect(link.from[1]).toBeGreaterThan(link.to[1]);
    const method = memoryScene({ explode: 0, selected: 'method-area', isolate: false });
    expect(method.links).toHaveLength(3);
  });

  it('isolates a selected area with the areas that correspond to it', () => {
    const isolated = memoryScene({ explode: 0, selected: 'heap', isolate: true });
    expect([...new Set(isolated.nodes.map((n) => n.owner))].sort()).toEqual(['heap', 'java-heap']);
  });
});
