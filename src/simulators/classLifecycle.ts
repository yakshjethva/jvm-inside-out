/**
 * The life of one class, from loading to initialization, as the JVM
 * Specification orders it (JVMS §5.3–§5.5): loading creates the class;
 * linking verifies it, prepares it (static fields with default values) and
 * resolves symbolic references, possibly much later and one at a time;
 * initialization assigns constants, then runs <clinit>.
 *
 * Pure and immutable: `applyAction` returns a new state or throws a
 * LifecycleError for a transition the JVM would never make, so a walkthrough
 * written in the content layer cannot show an impossible order.
 */

export interface StaticFieldSpec {
  name: string;
  type: string;
  /** The value preparation gives the field (JVMS §5.4.2). */
  defaultValue: string;
  /** The value its initializer, or its ConstantValue attribute, gives it. */
  value: string;
  /** A constant variable: assigned from its ConstantValue attribute, not by <clinit>. */
  constant?: boolean;
}

/** A symbolic reference in the class that uses this one (resolved there, on first use). */
export interface ConstantPoolEntry {
  index: number;
  text: string;
}

export interface ClassModel {
  name: string;
  fields: StaticFieldSpec[];
  entries: ConstantPoolEntry[];
}

export type ClassStatus = 'not-loaded' | 'loaded' | 'initializing' | 'initialized' | 'erroneous';
export type LifecyclePhase =
  'none' | 'loading' | 'verification' | 'preparation' | 'resolution' | 'initialization';

export interface StaticValue {
  value: string;
  by: 'default' | 'constant' | 'initializer';
}

export interface ClassLifecycleState {
  status: ClassStatus;
  verified: boolean;
  prepared: boolean;
  statics: Record<string, StaticValue | undefined>;
  /** Constant pool index → resolved yet? */
  resolved: Record<number, boolean>;
  /** What the program has printed so far. */
  output: string[];
  /** Log lines (-Xlog) so far. */
  log: string[];
  /** Output and log lines interleaved, as one console shows them. */
  console: { kind: 'out' | 'log'; text: string }[];
  /** The phase the last action belonged to. */
  last: LifecyclePhase;
}

export type LifecycleAction =
  | { kind: 'print'; text: string }
  /** Log lines about other classes (they do not change this class). */
  | { kind: 'log'; lines: string[] }
  /** Prints a line with {field} replaced by the field's current value. */
  | { kind: 'print-statics'; template: string }
  | { kind: 'load'; log?: string[] }
  | { kind: 'prepare' }
  | { kind: 'verify'; log?: string[] }
  | { kind: 'resolve'; entry: number }
  | { kind: 'begin-init'; log?: string[] }
  /** JVMS §5.5 step 6: final static fields with a ConstantValue attribute, before <clinit>. */
  | { kind: 'assign-constants' }
  | { kind: 'assign'; field: string }
  | { kind: 'finish-init' }
  | { kind: 'fail'; error: string };

export class LifecycleError extends Error {}

export function lifecycleStart(model: ClassModel): ClassLifecycleState {
  return {
    status: 'not-loaded',
    verified: false,
    prepared: false,
    statics: Object.fromEntries(model.fields.map((field) => [field.name, undefined])),
    resolved: Object.fromEntries(model.entries.map((entry) => [entry.index, false])),
    output: [],
    log: [],
    console: [],
    last: 'none',
  };
}

/** The phase to highlight: the one the most recent action belonged to. */
export const currentPhase = (state: ClassLifecycleState): LifecyclePhase => state.last;

/** Replaces each {field} in `template` with the field's current value. */
export function formatStatics(state: ClassLifecycleState, template: string): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = state.statics[name];
    if (!value) throw new LifecycleError(`${name} has no value yet: the class is not prepared`);
    return value.value;
  });
}

function fieldOf(model: ClassModel, name: string): StaticFieldSpec {
  const field = model.fields.find((f) => f.name === name);
  if (!field) throw new LifecycleError(`${model.name} has no static field ${name}`);
  return field;
}

const out = (state: ClassLifecycleState, text: string): ClassLifecycleState => ({
  ...state,
  output: [...state.output, text],
  console: [...state.console, { kind: 'out', text }],
});

const logged = (state: ClassLifecycleState, lines: string[] = []): ClassLifecycleState =>
  lines.length === 0
    ? state
    : {
        ...state,
        log: [...state.log, ...lines],
        console: [...state.console, ...lines.map((text) => ({ kind: 'log' as const, text }))],
      };

export function applyAction(
  model: ClassModel,
  state: ClassLifecycleState,
  action: LifecycleAction,
): ClassLifecycleState {
  const fail = (message: string): never => {
    throw new LifecycleError(`${model.name}: ${message}`);
  };
  const requireLoaded = () => {
    if (state.status === 'not-loaded') fail('is not loaded yet');
  };
  const requireInitializing = () => {
    if (state.status !== 'initializing') fail('is not initializing');
  };
  switch (action.kind) {
    case 'print':
      return out(state, action.text);
    case 'print-statics':
      return out(state, formatStatics(state, action.template));
    case 'log':
      return logged(state, action.lines);
    case 'load':
      if (state.status !== 'not-loaded') fail('is already loaded');
      return { ...logged(state, action.log), status: 'loaded', last: 'loading' };
    case 'prepare':
      requireLoaded();
      if (state.prepared) fail('is already prepared');
      return {
        ...state,
        prepared: true,
        statics: Object.fromEntries(
          model.fields.map((field) => [
            field.name,
            { value: field.defaultValue, by: 'default' as const },
          ]),
        ),
        last: 'preparation',
      };
    case 'verify':
      requireLoaded();
      if (state.verified) fail('is already verified');
      return { ...logged(state, action.log), verified: true, last: 'verification' };
    case 'resolve':
      if (!(action.entry in state.resolved)) fail(`no constant pool entry #${action.entry}`);
      requireLoaded();
      // Resolution belongs to linking, but of the class that holds the reference.
      return {
        ...state,
        resolved: { ...state.resolved, [action.entry]: true },
        last: 'resolution',
      };
    case 'begin-init':
      if (state.status !== 'loaded') fail(`cannot start initialization while ${state.status}`);
      if (!state.verified) fail('must be verified before it is initialized');
      if (!state.prepared) fail('must be prepared before it is initialized');
      return { ...logged(state, action.log), status: 'initializing', last: 'initialization' };
    case 'assign-constants': {
      requireInitializing();
      const statics = { ...state.statics };
      for (const field of model.fields)
        if (field.constant) statics[field.name] = { value: field.value, by: 'constant' };
      return { ...state, statics, last: 'initialization' };
    }
    case 'assign': {
      requireInitializing();
      const field = fieldOf(model, action.field);
      if (field.constant) fail(`${field.name} is a constant: it has no initializer in <clinit>`);
      return {
        ...state,
        statics: { ...state.statics, [field.name]: { value: field.value, by: 'initializer' } },
        last: 'initialization',
      };
    }
    case 'finish-init':
      requireInitializing();
      return { ...state, status: 'initialized', last: 'initialization' };
    case 'fail':
      requireInitializing();
      return { ...state, status: 'erroneous', last: 'initialization' };
  }
}

/** The state after each step of a walkthrough (each step is a list of actions). */
export function lifecycleTimeline(
  model: ClassModel,
  steps: { actions: LifecycleAction[] }[],
): ClassLifecycleState[] {
  const states: ClassLifecycleState[] = [];
  let state = lifecycleStart(model);
  for (const step of steps) {
    for (const action of step.actions) state = applyAction(model, state, action);
    states.push(state);
  }
  return states;
}
