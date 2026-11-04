/**
 * A model of what a running Java program keeps in memory, in the JVM
 * Specification's terms (JVMS §2.5–§2.6): threads, each with its own stack of
 * frames; every frame with its local variable array and operand stack; and
 * one heap of objects shared by all threads. References connect variables and
 * fields to objects; an object is never stored in a variable.
 *
 * Every operation is pure and validated: it returns a new state or throws a
 * MemoryError for something the JVM could never do (pop an empty operand
 * stack, store a reference to an object that does not exist, return from a
 * frame that is not on top). A walkthrough is a list of steps of operations,
 * so stepping backwards is replaying the recorded states, never undoing
 * anything inside a JVM: a real JVM only ever runs forwards.
 *
 * Reachability follows the rule of tracing collectors (JLS §12.6.1): roots are
 * the locals and operand stack values of every live frame, plus objects held
 * by static fields and interned string literals, which the class's constant
 * pool keeps alive. Becoming
 * unreachable does not remove an object; only a collection does, at a time
 * the collector chooses.
 */

export type Value =
  | { kind: 'ref'; target: string }
  | { kind: 'null' }
  | { kind: 'int'; value: number }
  /** A slot that exists in the frame but has not been assigned yet. */
  | { kind: 'unset' };

export interface SlotSpec {
  index: number;
  name: string;
  type: string;
}

export interface Slot extends SlotSpec {
  value: Value;
}

export interface FrameSpec {
  id: string;
  /** e.g. "main(String[])". */
  method: string;
  /** The class whose method this is (its run-time constant pool is the frame's). */
  owner: string;
  maxLocals: number;
  maxStack: number;
  locals: SlotSpec[];
}

export interface Frame extends Omit<FrameSpec, 'locals'> {
  locals: Slot[];
  /** Operand stack, bottom first. */
  stack: Value[];
}

export interface ThreadSpec {
  id: string;
  name: string;
}

export interface ThreadState extends ThreadSpec {
  status: 'running' | 'waiting' | 'terminated';
  /** Bottom frame first; the last frame is the current one. */
  frames: Frame[];
}

export interface FieldSpec {
  name: string;
  type: string;
  value?: Value;
}

export interface ObjectSpec {
  id: string;
  className: string;
  label: string;
  fields: FieldSpec[];
  /**
   * Reachable whatever the frames hold: an interned string literal (kept alive
   * by the constant pool that refers to it) or an object a static field holds.
   */
  root?: 'literal' | 'static';
}

export interface HeapObject {
  id: string;
  className: string;
  label: string;
  fields: { name: string; type: string; value: Value }[];
  root?: 'literal' | 'static';
}

export interface MemoryState {
  threads: ThreadState[];
  objects: HeapObject[];
  /** Objects reclaimed by the most recent collection. */
  collected: string[];
}

export type Op =
  | { op: 'allocate'; object: ObjectSpec }
  | { op: 'start-thread'; thread: ThreadSpec }
  | { op: 'thread-status'; thread: string; status: ThreadState['status'] }
  | { op: 'push-frame'; thread: string; frame: FrameSpec }
  | { op: 'pop-frame'; thread: string }
  /** Sets a local of the thread's current frame. */
  | { op: 'set-local'; thread: string; slot: number; value: Value }
  | { op: 'push'; thread: string; value: Value }
  | { op: 'pop'; thread: string; count?: number }
  | { op: 'set-field'; object: string; field: string; value: Value }
  | { op: 'collect' };

export class MemoryError extends Error {}

const PRIMITIVES = new Set(['int', 'long', 'short', 'byte', 'char', 'boolean', 'float', 'double']);

export const emptyMemory = (): MemoryState => ({ threads: [], objects: [], collected: [] });

const fail = (message: string): never => {
  throw new MemoryError(message);
};

function checkValue(state: MemoryState, value: Value, where: string) {
  if (value.kind === 'ref' && !state.objects.some((o) => o.id === value.target))
    fail(`${where}: no object ${value.target}`);
}

function threadOf(state: MemoryState, id: string): ThreadState {
  return state.threads.find((t) => t.id === id) ?? fail(`no thread ${id}`);
}

function topFrame(thread: ThreadState): Frame {
  return thread.frames.at(-1) ?? fail(`thread ${thread.name} has no frame`);
}

/** Replaces the thread's current frame. */
function withTop(
  state: MemoryState,
  threadId: string,
  change: (frame: Frame) => Frame,
): MemoryState {
  const thread = threadOf(state, threadId);
  const frame = change(topFrame(thread));
  return {
    ...state,
    threads: state.threads.map((t) =>
      t.id === threadId ? { ...t, frames: [...t.frames.slice(0, -1), frame] } : t,
    ),
  };
}

export function applyOp(state: MemoryState, op: Op): MemoryState {
  switch (op.op) {
    case 'allocate': {
      if (state.objects.some((o) => o.id === op.object.id))
        fail(`object ${op.object.id} exists already`);
      const object: HeapObject = {
        id: op.object.id,
        className: op.object.className,
        label: op.object.label,
        ...(op.object.root ? { root: op.object.root } : {}),
        fields: op.object.fields.map((field) => ({
          name: field.name,
          type: field.type,
          value:
            field.value ??
            (PRIMITIVES.has(field.type) ? { kind: 'int', value: 0 } : { kind: 'null' }),
        })),
      };
      for (const field of object.fields)
        checkValue(state, field.value, `${object.id}.${field.name}`);
      return { ...state, objects: [...state.objects, object] };
    }
    case 'start-thread':
      if (state.threads.some((t) => t.id === op.thread.id))
        fail(`thread ${op.thread.id} exists already`);
      return {
        ...state,
        threads: [...state.threads, { ...op.thread, status: 'running', frames: [] }],
      };
    case 'thread-status':
      threadOf(state, op.thread);
      return {
        ...state,
        threads: state.threads.map((t) => (t.id === op.thread ? { ...t, status: op.status } : t)),
      };
    case 'push-frame': {
      const thread = threadOf(state, op.thread);
      if (thread.status === 'terminated') fail(`thread ${thread.name} has terminated`);
      if (state.threads.some((t) => t.frames.some((f) => f.id === op.frame.id)))
        fail(`frame ${op.frame.id} exists already`);
      if (op.frame.locals.length > op.frame.maxLocals)
        fail(`${op.frame.method}: more locals than max_locals`);
      const frame: Frame = {
        ...op.frame,
        locals: op.frame.locals.map((slot) => ({ ...slot, value: { kind: 'unset' } })),
        stack: [],
      };
      return {
        ...state,
        threads: state.threads.map((t) =>
          t.id === op.thread ? { ...t, frames: [...t.frames, frame] } : t,
        ),
      };
    }
    case 'pop-frame': {
      const thread = threadOf(state, op.thread);
      topFrame(thread);
      return {
        ...state,
        threads: state.threads.map((t) =>
          t.id === op.thread ? { ...t, frames: t.frames.slice(0, -1) } : t,
        ),
      };
    }
    case 'set-local':
      checkValue(state, op.value, `local ${op.slot}`);
      return withTop(state, op.thread, (frame) => {
        if (!frame.locals.some((slot) => slot.index === op.slot))
          fail(`${frame.method} has no slot ${op.slot}`);
        return {
          ...frame,
          locals: frame.locals.map((slot) =>
            slot.index === op.slot ? { ...slot, value: op.value } : slot,
          ),
        };
      });
    case 'push':
      checkValue(state, op.value, 'operand stack');
      return withTop(state, op.thread, (frame) => {
        if (frame.stack.length >= frame.maxStack)
          fail(`${frame.method}: operand stack would exceed max_stack`);
        return { ...frame, stack: [...frame.stack, op.value] };
      });
    case 'pop':
      return withTop(state, op.thread, (frame) => {
        const count = op.count ?? 1;
        if (frame.stack.length < count) fail(`${frame.method}: operand stack is empty`);
        return { ...frame, stack: frame.stack.slice(0, frame.stack.length - count) };
      });
    case 'set-field': {
      const object =
        state.objects.find((o) => o.id === op.object) ?? fail(`no object ${op.object}`);
      if (!object.fields.some((f) => f.name === op.field))
        fail(`${object.className} has no field ${op.field}`);
      checkValue(state, op.value, `${object.id}.${op.field}`);
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === op.object
            ? {
                ...o,
                fields: o.fields.map((f) => (f.name === op.field ? { ...f, value: op.value } : f)),
              }
            : o,
        ),
      };
    }
    case 'collect': {
      const live = reachableObjects(state);
      return {
        ...state,
        objects: state.objects.filter((o) => live.has(o.id)),
        collected: state.objects.filter((o) => !live.has(o.id)).map((o) => o.id),
      };
    }
  }
}

export type RefSource =
  | { kind: 'local'; thread: string; frame: string; slot: number }
  | { kind: 'stack'; thread: string; frame: string; index: number }
  | { kind: 'field'; object: string; field: string };

export interface Reference {
  /** Stable id: where the reference is held. */
  id: string;
  from: RefSource;
  to: string;
}

/** Every reference in the state, in a stable order: locals, operand stacks, then fields. */
export function referencesOf(state: MemoryState): Reference[] {
  const refs: Reference[] = [];
  for (const thread of state.threads)
    for (const frame of thread.frames) {
      for (const slot of frame.locals)
        if (slot.value.kind === 'ref')
          refs.push({
            id: `ref:${thread.id}/${frame.id}/${slot.index}`,
            from: { kind: 'local', thread: thread.id, frame: frame.id, slot: slot.index },
            to: slot.value.target,
          });
      frame.stack.forEach((value, index) => {
        if (value.kind === 'ref')
          refs.push({
            id: `ref:${thread.id}/${frame.id}/stack/${index}`,
            from: { kind: 'stack', thread: thread.id, frame: frame.id, index },
            to: value.target,
          });
      });
    }
  for (const object of state.objects)
    for (const field of object.fields)
      if (field.value.kind === 'ref')
        refs.push({
          id: `ref:${object.id}.${field.name}`,
          from: { kind: 'field', object: object.id, field: field.name },
          to: field.value.target,
        });
  return refs;
}

/** Objects a chain of references from a root reaches. */
export function reachableObjects(state: MemoryState): Set<string> {
  const refs = referencesOf(state);
  const pending = [
    ...refs.filter((r) => r.from.kind !== 'field').map((r) => r.to),
    ...state.objects.filter((o) => o.root).map((o) => o.id),
  ];
  const reached = new Set<string>();
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (reached.has(id)) continue;
    reached.add(id);
    for (const ref of refs)
      if (ref.from.kind === 'field' && ref.from.object === id) pending.push(ref.to);
  }
  return reached;
}

/** Problems with a state (an empty list when it is consistent). */
export function validateMemory(state: MemoryState): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const object of state.objects) {
    if (ids.has(object.id)) problems.push(`object ${object.id} twice`);
    ids.add(object.id);
  }
  for (const ref of referencesOf(state))
    if (!ids.has(ref.to)) problems.push(`${ref.id} points at a missing object`);
  const frames = new Set<string>();
  for (const thread of state.threads)
    for (const frame of thread.frames) {
      if (frames.has(frame.id)) problems.push(`frame ${frame.id} twice`);
      frames.add(frame.id);
      if (frame.stack.length > frame.maxStack) problems.push(`${frame.id}: operand stack too deep`);
      if (frame.locals.length > frame.maxLocals) problems.push(`${frame.id}: too many locals`);
    }
  return problems;
}

/** The state after each step; a step that the JVM could not perform names itself in the error. */
export function memoryTimeline(
  steps: { id: string; ops: Op[] }[],
  start = emptyMemory(),
): MemoryState[] {
  const states: MemoryState[] = [];
  let state = start;
  for (const step of steps) {
    try {
      state = step.ops.reduce(applyOp, state);
    } catch (error) {
      throw new MemoryError(`step ${step.id}: ${(error as Error).message}`);
    }
    states.push(state);
  }
  return states;
}
