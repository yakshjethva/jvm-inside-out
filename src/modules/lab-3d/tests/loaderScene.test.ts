import { describe, expect, it } from 'vitest';
import { LOADER_IDS, LOADER_WORLD } from '@/content/labs/classLoading';
import { initialRuntime, replay } from '@/simulators/classLoading';
import { frameNodes, insideFootprint, topOf } from '../data/labScene';
import { loaderNode, loaderScene, visibleLoaders } from '../data/loaderScene';

const RUNTIME = replay(LOADER_WORLD, [
  { kind: 'class', loader: 'app', name: 'java.sql.Connection' },
  { kind: 'class', loader: 'child-first', name: 'com.example.shared.Message' },
]).at(-1)!.runtime;

describe('the 3D loader observatory layout', () => {
  it('draws one prism per loader, each selectable as that loader', () => {
    const scene = loaderScene({ runtime: initialRuntime(LOADER_WORLD), explode: 0, isolate: null });
    const parts = scene.nodes.filter((n) => n.role === 'part');
    expect(parts.map((n) => n.owner)).toEqual(LOADER_IDS);
    for (const part of parts) expect(part.shape).toBe('prism');
    // Distinct shapes, not identical boxes.
    expect(new Set(parts.slice(0, 3).map((n) => n.sides)).size).toBe(3);
  });

  it('stands every loader above its parent, with the bootstrap loader as the foundation', () => {
    for (const loader of LOADER_WORLD.loaders) {
      if (!loader.parent) continue;
      const child = loaderNode(loader.id as never, 0);
      const parent = loaderNode(loader.parent as never, 0);
      expect(child.base[1], loader.id).toBeGreaterThan(topOf(parent)[1]);
    }
    expect(loaderNode('bootstrap', 0).base[1]).toBe(0);
  });

  it('explodes vertically without moving anything sideways', () => {
    for (const id of LOADER_IDS) {
      const assembled = loaderNode(id, 0);
      const exploded = loaderNode(id, 1);
      expect(exploded.base[0]).toBe(assembled.base[0]);
      expect(exploded.base[2]).toBe(assembled.base[2]);
      if (id !== 'bootstrap') expect(exploded.base[1], id).toBeGreaterThan(assembled.base[1]);
    }
  });

  it('stands each class on the loader that holds it, inside its footprint', () => {
    const scene = loaderScene({ runtime: RUNTIME, explode: 0, isolate: null });
    for (const id of LOADER_IDS) {
      const loader = scene.nodes.find((n) => n.id === `loader:${id}`)!;
      const chips = scene.nodes.filter((n) => n.role === 'item' && n.owner === id);
      const held = new Set([
        ...RUNTIME.classes.filter((c) => c.definingLoader === id).map((c) => c.id),
        ...Object.values(RUNTIME.initiated[id] ?? {}),
      ]);
      expect(chips.length, id).toBe(held.size);
      for (const chip of chips) {
        expect(chip.base[1], chip.id).toBeCloseTo(topOf(loader)[1]);
        expect(insideFootprint(loader, chip.base, 0.1), chip.id).toBe(true);
      }
    }
    // The application loader defined nothing new, but is recorded for Connection.
    expect(scene.nodes.some((n) => n.id === 'class:app:java.sql.Connection@platform')).toBe(true);
  });

  it('isolates a loader with its ancestors and the loaders that name it as parent', () => {
    expect(visibleLoaders('platform')).toEqual(['bootstrap', 'platform', 'app']);
    expect(visibleLoaders('child-first')).toEqual(['bootstrap', 'platform', 'app', 'child-first']);
    const scene = loaderScene({ runtime: RUNTIME, explode: 0, isolate: 'platform' });
    expect(scene.nodes.some((n) => n.owner === 'parent-first')).toBe(false);
    expect(scene.nodes.some((n) => n.id === 'source:plugin-dir')).toBe(false);
  });

  it('links each loader to its parent and draws a request’s hops between the right loaders', () => {
    const scene = loaderScene({
      runtime: RUNTIME,
      explode: 0.5,
      isolate: null,
      hops: [
        { id: 'h1', from: 'app', to: 'bootstrap', tone: 'flow' },
        { id: 'h2', from: 'bootstrap', to: 'app', tone: 'ok' },
      ],
    });
    const parents = scene.links.filter((l) => l.tone === 'parent');
    expect(parents.map((l) => l.id).sort()).toEqual(
      ['parent:app', 'parent:child-first', 'parent:parent-first', 'parent:platform'].sort(),
    );
    for (const link of parents) expect(link.from[1]).toBeGreaterThan(link.to[1]);
    const app = loaderNode('app', 0.5);
    const boot = loaderNode('bootstrap', 0.5);
    const h1 = scene.links.find((l) => l.id === 'h1')!;
    expect(h1.from[1]).toBeCloseTo(topOf(app)[1]);
    expect(h1.to[1]).toBeCloseTo(topOf(boot)[1]);
    const h2 = scene.links.find((l) => l.id === 'h2')!;
    expect(h2.from[2]).not.toBe(h1.from[2]);
  });

  it('frames every node it draws', () => {
    const scene = loaderScene({ runtime: RUNTIME, explode: 0, isolate: null });
    const { center, radius } = frameNodes(scene.nodes);
    for (const node of scene.nodes)
      expect(
        Math.hypot(node.base[0] - center[0], node.base[1] - center[1], node.base[2] - center[2]),
      ).toBeLessThanOrEqual(radius + 0.001);
  });
});
