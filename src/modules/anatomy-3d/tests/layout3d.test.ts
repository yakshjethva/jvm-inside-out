import { describe, expect, it } from 'vitest';
import { COMPONENT_IDS, COMPONENTS, type ComponentId } from '@/content/jvm';
import { ATLAS_AREAS } from '@/content/jvm/regions';
import { areaOf, caseHeight, flowArc, frameBoxes, layoutBoxes, visibleIds } from '../data/layout3d';

const EPS = 1e-9;
const top = (box: { center: number[]; size: number[] }) => box.center[1]! + box.size[1]! / 2;
const bottom = (box: { center: number[]; size: number[] }) => box.center[1]! - box.size[1]! / 2;

describe('3D layout', () => {
  const boxes = layoutBoxes(0);

  it('gives every component a box with a positive size', () => {
    expect(Object.keys(boxes).sort()).toEqual([...COMPONENT_IDS].sort());
    for (const id of COMPONENT_IDS)
      for (const n of boxes[id].size) expect(n, id).toBeGreaterThan(0);
  });

  it('stands every part on top of the part that contains it', () => {
    for (const id of COMPONENT_IDS) {
      const parent = COMPONENTS[id].parent;
      if (!parent) expect(bottom(boxes[id]), id).toBeCloseTo(0);
      else expect(bottom(boxes[id]), id).toBeCloseTo(top(boxes[parent]));
    }
  });

  it('keeps every footprint inside its parent, as on the 2D plate', () => {
    for (const id of COMPONENT_IDS) {
      const parent = COMPONENTS[id].parent;
      if (!parent) continue;
      const [cx, , cz] = boxes[id].center;
      const [w, , d] = boxes[id].size;
      const [px, , pz] = boxes[parent].center;
      const [pw, , pd] = boxes[parent].size;
      expect(cx! - w! / 2, id).toBeGreaterThanOrEqual(px! - pw! / 2 - EPS);
      expect(cx! + w! / 2, id).toBeLessThanOrEqual(px! + pw! / 2 + EPS);
      expect(cz! - d! / 2, id).toBeGreaterThanOrEqual(pz! - pd! / 2 - EPS);
      expect(cz! + d! / 2, id).toBeLessThanOrEqual(pz! + pd! / 2 + EPS);
    }
  });

  it('puts build time at the back and the platform at the front', () => {
    expect(boxes['build-time'].center[2]).toBeLessThan(boxes.jvm.center[2]!);
    expect(boxes.platform.center[2]).toBeGreaterThan(boxes.jvm.center[2]!);
  });

  it('lifts deeper parts further and moves the areas apart when exploded', () => {
    const exploded = layoutBoxes(1);
    for (const id of COMPONENT_IDS) {
      const parent = COMPONENTS[id].parent;
      if (parent) expect(bottom(exploded[id]) - top(exploded[parent]), id).toBeGreaterThan(0.1);
    }
    const spread = (b: typeof boxes) =>
      Math.hypot(
        b['execution-engine'].center[0]! - b['class-loader-subsystem'].center[0]!,
        b['execution-engine'].center[2]! - b['class-loader-subsystem'].center[2]!,
      );
    expect(spread(exploded)).toBeGreaterThan(spread(boxes));
    // Halfway is between the two.
    const half = layoutBoxes(0.5);
    expect(half.heap.center[1]).toBeGreaterThan(boxes.heap.center[1]!);
    expect(half.heap.center[1]).toBeLessThan(exploded.heap.center[1]!);
  });

  it('clamps the explode amount', () => {
    expect(layoutBoxes(-1)).toEqual(layoutBoxes(0));
    expect(layoutBoxes(3)).toEqual(layoutBoxes(1));
  });
});

describe('areas', () => {
  it('assigns each part of an area to that area, and nothing else', () => {
    expect(areaOf('eden')).toBe('runtime-data-areas');
    expect(areaOf('c2')).toBe('execution-engine');
    expect(areaOf('javac')).toBe('build-time');
    expect(areaOf('cpu')).toBe('platform');
    expect(areaOf('runtime-data-areas')).toBe('runtime-data-areas');
    expect(areaOf('jvm')).toBeNull();
    expect(areaOf('launcher')).toBeNull();
  });

  it('closes an area into a case tall enough to hold everything inside it', () => {
    const boxes = layoutBoxes(0);
    for (const area of ATLAS_AREAS) {
      const inside = COMPONENT_IDS.filter((id) => id !== area.id && areaOf(id) === area.id);
      const highest = Math.max(top(boxes[area.id]), ...inside.map((id) => top(boxes[id])));
      expect(bottom(boxes[area.id]) + caseHeight(area.id), area.id).toBeGreaterThan(highest);
    }
  });

  it('shows the areas closed in the overview, except the one holding the selection', () => {
    const closed = visibleIds({ overview: true, selectedId: null, isolate: false });
    for (const area of ATLAS_AREAS) expect(closed.has(area.id)).toBe(true);
    expect(closed.has('eden')).toBe(false);

    const open = visibleIds({ overview: true, selectedId: 'eden', isolate: false });
    expect(open.has('eden')).toBe(true);
    expect(open.has('c2')).toBe(false);

    const full = visibleIds({ overview: false, selectedId: null, isolate: false });
    expect(full.size).toBe(COMPONENT_IDS.length);
  });

  it('isolates the selected part with what contains it and what it contains', () => {
    const isolated = visibleIds({ overview: false, selectedId: 'heap', isolate: true });
    for (const id of ['heap', 'young-generation', 'eden', 'survivor', 'old-generation'])
      expect(isolated.has(id as ComponentId), id).toBe(true);
    for (const id of ['runtime-data-areas', 'jvm', 'java-process'])
      expect(isolated.has(id as ComponentId), id).toBe(true);
    expect(isolated.has('method-area')).toBe(false);
    expect(isolated.has('interpreter')).toBe(false);
  });

  it('keeps everything inside an isolated part open in the overview', () => {
    const jvm = visibleIds({ overview: true, selectedId: 'jvm', isolate: true });
    for (const id of ['runtime-data-areas', 'heap', 'eden', 'interpreter', 'jni'])
      expect(jvm.has(id as ComponentId), id).toBe(true);
    expect(jvm.has('cpu')).toBe(false);
    expect(jvm.has('javac')).toBe(false);
  });
});

describe('arcs and framing', () => {
  const boxes = layoutBoxes(0);

  it('draws a flow from the top of one part to the top of another, rising between them', () => {
    const arc = flowArc(boxes.interpreter, boxes['jit-compiler']);
    expect(arc.start[1]).toBeCloseTo(top(boxes.interpreter));
    expect(arc.end[1]).toBeCloseTo(top(boxes['jit-compiler']));
    expect(arc.control[1]).toBeGreaterThan(Math.max(arc.start[1]!, arc.end[1]!));
  });

  it('frames a set of parts with a centre inside them and a radius that covers them', () => {
    const frame = frameBoxes([boxes.heap, boxes['method-area']]);
    expect(frame.center[0]).toBeGreaterThan(boxes['method-area'].center[0]!);
    expect(frame.center[0]).toBeLessThan(boxes.heap.center[0]!);
    expect(frame.radius).toBeGreaterThan(boxes.heap.size[0]!);
    expect(frameBoxes([]).radius).toBeGreaterThan(0);
  });
});
