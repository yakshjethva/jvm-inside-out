import { describe, expect, it } from 'vitest';
import { COMPONENT_IDS } from '@/content/jvm/ids';
import {
  COLLECTORS,
  LAYOUT_CONFIGS,
  LAYOUT_SUBJECTS,
  MEMORY_AREAS,
  MEMORY_ERRORS,
  MEMORY_INVESTIGATIONS,
  MEMORY_LISTINGS,
  MEMORY_QUIZ,
  MEMORY_STATIONS,
} from '@/content/labs/memory';
import { SIZES_OUTPUT } from '@/content/labs/memoryEvidence';
import { MEMORY_PROGRAMS } from '@/content/labs/memoryPrograms';
import { getGlossaryEntry } from '@/glossary';
import {
  memoryTimeline,
  reachableObjects,
  referencesOf,
  validateMemory,
  type MemoryState,
} from '@/simulators/memory';

const timeline = (id: string) => {
  const program = MEMORY_PROGRAMS.find((p) => p.id === id)!;
  const states = memoryTimeline(program.steps);
  return (stepId: string): MemoryState => states[program.steps.findIndex((s) => s.id === stepId)]!;
};
const object = (state: MemoryState, id: string) => state.objects.find((o) => o.id === id);
const exactlyOneCorrect = (options: { correct: boolean }[]) =>
  options.filter((o) => o.correct).length;

describe('memory lab programs replay their real bytecode without an impossible step', () => {
  it.each(MEMORY_PROGRAMS.map((p) => [p.id, p] as const))('%s', (_, program) => {
    const states = memoryTimeline(program.steps);
    expect(states).toHaveLength(program.steps.length);
    states.forEach((state, i) => expect(validateMemory(state), program.steps[i]!.id).toEqual([]));
    const ids = program.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const lines = program.source.code.split('\n').length;
    program.steps.forEach((step, i) => {
      for (const line of step.lines) expect(line, step.id).toBeLessThanOrEqual(lines);
      // Whatever a step points the learner at exists at that step.
      const focus = step.focus;
      if (!focus) return;
      const state = states[i]!;
      if (focus.kind === 'object') expect(object(state, focus.id), step.id).toBeDefined();
      if (focus.kind === 'frame')
        expect(
          state.threads.some((t) => t.frames.some((f) => f.id === focus.id)),
          step.id,
        ).toBe(true);
      if (focus.kind === 'reference')
        expect(
          referencesOf(state).some((r) => r.id === focus.id),
          step.id,
        ).toBe(true);
    });
  });
});

describe('Person p1 = new Person("Alex"); … p2 = null;', () => {
  const at = timeline('core');

  it('allocates the object before the constructor frame exists, and runs the constructor in its own frame', () => {
    expect(object(at('new'), 'o-person')!.fields[0]!.value).toEqual({ kind: 'null' });
    expect(at('init').threads[0]!.frames.map((f) => f.method)).toEqual([
      'main(String[])',
      'Person(String)',
    ]);
    expect(at('return-init').threads[0]!.frames.map((f) => f.method)).toEqual(['main(String[])']);
    // The reference dup kept is still on main's operand stack after the constructor returns.
    expect(at('return-init').threads[0]!.frames[0]!.stack).toEqual([
      { kind: 'ref', target: 'o-person' },
    ]);
  });

  it('copies the reference: p1 and p2 refer to one object', () => {
    const state = at('copy');
    const main = state.threads[0]!.frames[0]!;
    expect(main.locals[1]!.value).toEqual({ kind: 'ref', target: 'o-person' });
    expect(main.locals[2]!.value).toEqual({ kind: 'ref', target: 'o-person' });
    expect(state.objects.filter((o) => o.className === 'Person')).toHaveLength(1);
  });

  it('changes the one object through p2, which is why p1.getName() prints Yaksh', () => {
    expect(object(at('mutate'), 'o-person')!.fields[0]!.value).toEqual({
      kind: 'ref',
      target: 'o-yaksh',
    });
    expect(at('return-set').threads[0]!.frames).toHaveLength(1);
  });

  it('keeps the object reachable after p1 = null, and in the heap but unreachable after p2 = null', () => {
    expect(reachableObjects(at('p1-null')).has('o-person')).toBe(true);
    expect(reachableObjects(at('p2-null')).has('o-person')).toBe(false);
    expect(object(at('p2-null'), 'o-person')).toBeDefined();
    expect(reachableObjects(at('p2-null')).has('o-alex')).toBe(true);
    expect(at('return-main').threads[0]!.frames).toHaveLength(0);
  });
});

describe('two threads, one heap', () => {
  const at = timeline('threads');

  it('gives the worker its own stack with the frames a thread dump shows', () => {
    const state = at('start-worker');
    expect(state.threads.map((t) => t.name)).toEqual(['main', 'worker']);
    expect(state.threads[1]!.frames.map((f) => `${f.owner}.${f.method}`)).toEqual([
      'java.lang.Thread.run()',
      'java.lang.Thread.runWith(Object, Runnable)',
      'Renamer.run()',
    ]);
    expect(state.threads[0]!.status).toBe('waiting');
  });

  it('lets the worker change the object main refers to', () => {
    expect(object(at('worker-set'), 'o-person')!.fields[0]!.value).toEqual({
      kind: 'ref',
      target: 'o-yaksh',
    });
    const done = at('worker-done');
    expect(done.threads[1]!.status).toBe('terminated');
    expect(done.threads[1]!.frames).toHaveLength(0);
    expect(done.threads[0]!.status).toBe('running');
  });
});

describe('recursion', () => {
  const at = timeline('recursion');

  it('piles up one frame per call, each with its own n', () => {
    const deepest = at('call-0').threads[0]!.frames;
    expect(deepest.map((f) => f.method)).toEqual([
      'main(String[])',
      ...Array(4).fill('countdown(int)'),
    ]);
    expect(deepest.slice(1).map((f) => f.locals[0]!.value)).toEqual(
      [3, 2, 1, 0].map((value) => ({ kind: 'int', value })),
    );
  });

  it('unwinds with the right values and leaves 3 for println', () => {
    expect(at('return-0').threads[0]!.frames.at(-1)!.stack).toEqual([{ kind: 'int', value: 1 }]);
    expect(at('return-3').threads[0]!.frames[0]!.stack).toEqual([
      { kind: 'ref', target: 'o-out' },
      { kind: 'int', value: 3 },
    ]);
    expect(at('print').threads[0]!.frames).toHaveLength(0);
  });
});

describe('object layouts agree with the measurements', () => {
  const sizes = SIZES_OUTPUT.code.split('\n').slice(1);
  const measured = (label: string, column: number) => {
    const row = sizes.find((line) => line.startsWith(label))!;
    return Number(row.trim().split(/\s+/).slice(-3)[column]);
  };
  const LABELS: Record<string, string> = {
    object: 'new Object()',
    person: 'new Person("Alex")',
    point: 'new Point()',
    mixed: 'new Mixed()',
    string: '"Alex"',
    int3: 'new int[3]',
    person2: 'new Person[2]',
  };

  it.each(LAYOUT_SUBJECTS.flatMap((s) => LAYOUT_CONFIGS.map((c, i) => [s.id, c.id, i] as const)))(
    '%s with %s: bands cover the object exactly and match the measured size',
    (subjectId, configId, column) => {
      const subject = LAYOUT_SUBJECTS.find((s) => s.id === subjectId)!;
      const layout = subject.layouts[configId];
      let offset = 0;
      for (const segment of layout.segments) {
        expect(segment.offset, `${segment.label}`).toBe(offset);
        expect(segment.size).toBeGreaterThan(0);
        offset += segment.size;
      }
      expect(offset).toBe(layout.size);
      expect(layout.size % 8).toBe(0);
      expect(layout.size).toBe(measured(LABELS[subjectId]!, column));
    },
  );
});

describe('memory lab teaching content', () => {
  it('gives every station a question, one right prediction, one right answer and sources', () => {
    expect(MEMORY_STATIONS.map((s) => s.id)).toEqual([
      'observatory',
      'living',
      'frames',
      'layout',
      'heap',
    ]);
    for (const station of MEMORY_STATIONS) {
      if (station.prediction)
        expect(exactlyOneCorrect(station.prediction.options), station.id).toBe(1);
      expect(exactlyOneCorrect(station.check.options), station.id).toBe(1);
      expect(getGlossaryEntry(station.term.glossaryId), station.term.glossaryId).toBeDefined();
      expect(COMPONENT_IDS).toContain(station.component);
      expect(station.references.length).toBeGreaterThan(0);
      for (const listing of station.listings)
        expect(listing.verifiedWith, listing.id).toMatch(/OpenJDK 25\.0\.4|jdk-25-ga/);
    }
  });

  it('maps every specification area to the HotSpot structures that implement it, both ways', () => {
    const byId = new Map(MEMORY_AREAS.map((a) => [a.id, a]));
    for (const area of MEMORY_AREAS) {
      for (const target of area.mapsTo) {
        const other = byId.get(target);
        expect(other, `${area.id} → ${target}`).toBeDefined();
        expect(other!.layer, `${area.id} → ${target}`).not.toBe(area.layer);
      }
      if (area.layer === 'spec') expect(area.mapsTo.length, area.id).toBeGreaterThan(0);
      if (area.component) expect(COMPONENT_IDS).toContain(area.component);
    }
    for (const area of MEMORY_AREAS.filter((a) => a.layer === 'spec'))
      for (const target of area.mapsTo)
        expect(byId.get(target)!.mapsTo, `${target} ↔ ${area.id}`).toContain(area.id);
  });

  it('backs collectors, errors and investigations with real output', () => {
    for (const collector of COLLECTORS)
      expect(collector.evidence.length, collector.id).toBeGreaterThan(0);
    for (const error of MEMORY_ERRORS)
      expect(error.listing.verifiedWith, error.id).toMatch(/OpenJDK 25\.0\.4/);
    for (const investigation of MEMORY_INVESTIGATIONS)
      expect(investigation.listings.length).toBeGreaterThan(0);
    for (const q of MEMORY_QUIZ.questions) expect(exactlyOneCorrect(q.options), q.id).toBe(1);
    const ids = Object.keys(MEMORY_LISTINGS);
    expect(ids.length).toBeGreaterThan(30);
  });
});
