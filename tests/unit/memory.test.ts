import { describe, expect, it } from 'vitest';
import {
  applyOp,
  emptyMemory,
  MemoryError,
  memoryTimeline,
  reachableObjects,
  referencesOf,
  validateMemory,
  type MemoryState,
  type Op,
} from '@/simulators/memory';

const main = (locals: string[]) => ({
  id: 'f-main',
  method: 'main(String[])',
  owner: 'Main',
  maxLocals: 3,
  maxStack: 3,
  locals: locals.map((name, index) => ({ index, name, type: index === 0 ? 'String[]' : 'Person' })),
});

const start: Op[] = [
  {
    op: 'allocate',
    object: { id: 'o-args', className: 'String[]', label: 'String[0]', fields: [] },
  },
  { op: 'start-thread', thread: { id: 't-main', name: 'main' } },
  { op: 'push-frame', thread: 't-main', frame: main(['args', 'p1', 'p2']) },
  { op: 'set-local', thread: 't-main', slot: 0, value: { kind: 'ref', target: 'o-args' } },
];

const run = (ops: Op[], state: MemoryState = emptyMemory()) => ops.reduce(applyOp, state);

describe('memory model: frames and locals', () => {
  it('starts with a thread whose frame has slots but no values yet', () => {
    const state = run(start);
    const frame = state.threads[0]!.frames[0]!;
    expect(frame.locals.map((s) => s.value.kind)).toEqual(['ref', 'unset', 'unset']);
    expect(validateMemory(state)).toEqual([]);
  });

  it('pushes and pops frames on top of a thread’s stack only', () => {
    let state = run(start);
    state = applyOp(state, {
      op: 'push-frame',
      thread: 't-main',
      frame: {
        id: 'f-init',
        method: 'Person(String)',
        owner: 'Person',
        maxLocals: 2,
        maxStack: 2,
        locals: [
          { index: 0, name: 'this', type: 'Person' },
          { index: 1, name: 'name', type: 'String' },
        ],
      },
    });
    expect(state.threads[0]!.frames.map((f) => f.id)).toEqual(['f-main', 'f-init']);
    state = applyOp(state, { op: 'pop-frame', thread: 't-main' });
    expect(state.threads[0]!.frames.map((f) => f.id)).toEqual(['f-main']);
    expect(() => applyOp(state, { op: 'pop-frame', thread: 't-other' })).toThrow(MemoryError);
  });

  it('keeps the operand stack within max_stack and never below empty', () => {
    let state = run(start);
    for (let i = 0; i < 3; i++)
      state = applyOp(state, { op: 'push', thread: 't-main', value: { kind: 'null' } });
    expect(() => applyOp(state, { op: 'push', thread: 't-main', value: { kind: 'null' } })).toThrow(
      /max_stack/,
    );
    state = applyOp(state, { op: 'pop', thread: 't-main', count: 3 });
    expect(() => applyOp(state, { op: 'pop', thread: 't-main' })).toThrow(/empty/);
  });

  it('refuses references to objects that do not exist, and slots that do not exist', () => {
    const state = run(start);
    expect(() =>
      applyOp(state, {
        op: 'set-local',
        thread: 't-main',
        slot: 1,
        value: { kind: 'ref', target: 'o-nope' },
      }),
    ).toThrow(/o-nope/);
    expect(() =>
      applyOp(state, { op: 'set-local', thread: 't-main', slot: 7, value: { kind: 'null' } }),
    ).toThrow(/slot 7/);
  });
});

describe('memory model: objects, references and identity', () => {
  const withPerson = [
    ...start,
    {
      op: 'allocate',
      object: {
        id: 'o-person',
        className: 'Person',
        label: 'Person',
        fields: [{ name: 'name', type: 'String' }],
      },
    },
    {
      op: 'allocate',
      object: { id: 'o-alex', className: 'String', label: '"Alex"', root: 'literal', fields: [] },
    },
    {
      op: 'set-field',
      object: 'o-person',
      field: 'name',
      value: { kind: 'ref', target: 'o-alex' },
    },
    { op: 'set-local', thread: 't-main', slot: 1, value: { kind: 'ref', target: 'o-person' } },
    { op: 'set-local', thread: 't-main', slot: 2, value: { kind: 'ref', target: 'o-person' } },
  ] satisfies Op[];

  it('gives new objects default field values', () => {
    const state = run(withPerson.slice(0, 5));
    expect(state.objects.find((o) => o.id === 'o-person')!.fields[0]!.value).toEqual({
      kind: 'null',
    });
  });

  it('copies a reference, never the object: two variables, one object', () => {
    const state = run(withPerson);
    const refs = referencesOf(state).filter((r) => r.to === 'o-person');
    expect(refs.map((r) => r.from)).toEqual([
      { kind: 'local', thread: 't-main', frame: 'f-main', slot: 1 },
      { kind: 'local', thread: 't-main', frame: 'f-main', slot: 2 },
    ]);
    expect(state.objects.filter((o) => o.className === 'Person')).toHaveLength(1);
    // Stable ids for references.
    expect(refs.map((r) => r.id)).toEqual(['ref:t-main/f-main/1', 'ref:t-main/f-main/2']);
  });

  it('sees a field change through every reference, because there is one object', () => {
    let state = run(withPerson);
    state = applyOp(state, {
      op: 'allocate',
      object: { id: 'o-yaksh', className: 'String', label: '"Yaksh"', root: 'literal', fields: [] },
    });
    state = applyOp(state, {
      op: 'set-field',
      object: 'o-person',
      field: 'name',
      value: { kind: 'ref', target: 'o-yaksh' },
    });
    const person = state.objects.find((o) => o.id === 'o-person')!;
    expect(person.fields[0]!.value).toEqual({ kind: 'ref', target: 'o-yaksh' });
  });

  it('keeps an object reachable while any reference leads to it, and in the heap after the last one goes', () => {
    let state = run(withPerson);
    state = applyOp(state, { op: 'set-local', thread: 't-main', slot: 1, value: { kind: 'null' } });
    expect(reachableObjects(state).has('o-person')).toBe(true);
    state = applyOp(state, { op: 'set-local', thread: 't-main', slot: 2, value: { kind: 'null' } });
    expect(reachableObjects(state).has('o-person')).toBe(false);
    // Unreachable is not deleted: the object is still in the heap.
    expect(state.objects.some((o) => o.id === 'o-person')).toBe(true);
    // String literals stay reachable through the constant pool that holds them.
    expect(reachableObjects(state).has('o-alex')).toBe(true);
  });

  it('reclaims only unreachable objects when a collection runs', () => {
    let state = run(withPerson);
    state = applyOp(state, { op: 'set-local', thread: 't-main', slot: 1, value: { kind: 'null' } });
    state = applyOp(state, { op: 'set-local', thread: 't-main', slot: 2, value: { kind: 'null' } });
    state = applyOp(state, { op: 'collect' });
    expect(state.objects.map((o) => o.id)).toEqual(['o-args', 'o-alex']);
    expect(state.collected).toEqual(['o-person']);
    expect(validateMemory(state)).toEqual([]);
  });

  it('treats operand stack values and other threads’ frames as roots too', () => {
    let state = run(withPerson);
    state = applyOp(state, {
      op: 'push',
      thread: 't-main',
      value: { kind: 'ref', target: 'o-person' },
    });
    state = applyOp(state, { op: 'set-local', thread: 't-main', slot: 1, value: { kind: 'null' } });
    state = applyOp(state, { op: 'set-local', thread: 't-main', slot: 2, value: { kind: 'null' } });
    expect(reachableObjects(state).has('o-person')).toBe(true);
  });

  it('never changes the state it was given', () => {
    const state = run(withPerson);
    const copy = structuredClone(state);
    applyOp(state, { op: 'set-local', thread: 't-main', slot: 1, value: { kind: 'null' } });
    applyOp(state, { op: 'collect' });
    expect(state).toEqual(copy);
  });
});

describe('memory model: threads and timelines', () => {
  it('gives each thread its own stack', () => {
    let state = run(start);
    state = applyOp(state, { op: 'start-thread', thread: { id: 't-worker', name: 'worker' } });
    state = applyOp(state, {
      op: 'push-frame',
      thread: 't-worker',
      frame: {
        id: 'f-run',
        method: 'run()',
        owner: 'Renamer',
        maxLocals: 1,
        maxStack: 2,
        locals: [{ index: 0, name: 'this', type: 'Renamer' }],
      },
    });
    expect(state.threads.map((t) => [t.name, t.frames.length])).toEqual([
      ['main', 1],
      ['worker', 1],
    ]);
    state = applyOp(state, { op: 'pop-frame', thread: 't-worker' });
    state = applyOp(state, { op: 'thread-status', thread: 't-worker', status: 'terminated' });
    expect(state.threads[1]!.status).toBe('terminated');
  });

  it('builds the state after each step and reports which step went wrong', () => {
    const states = memoryTimeline([
      { id: 'a', ops: start },
      { id: 'b', ops: [{ op: 'pop-frame', thread: 't-main' }] },
    ]);
    expect(states).toHaveLength(2);
    expect(states[1]!.threads[0]!.frames).toHaveLength(0);
    expect(() =>
      memoryTimeline([{ id: 'bad', ops: [{ op: 'pop-frame', thread: 't-main' }] }]),
    ).toThrow(/bad/);
  });
});
