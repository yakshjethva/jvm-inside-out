import { describe, expect, it } from 'vitest';
import {
  applyAction,
  currentPhase,
  formatStatics,
  lifecycleStart,
  lifecycleTimeline,
  LifecycleError,
  type ClassModel,
} from '@/simulators/classLifecycle';

/** The Config class of the lab, as javac 25.0.4 compiled it (javap -c -v). */
const CONFIG: ClassModel = {
  name: 'Config',
  fields: [
    { name: 'count', type: 'int', defaultValue: '0', value: '3' },
    { name: 'label', type: 'String', defaultValue: 'null', value: 'ready' },
    { name: 'LIMIT', type: 'int', defaultValue: '0', value: '42', constant: true },
  ],
  entries: [
    { index: 44, text: 'String LIMIT = 42' },
    { index: 46, text: 'Fieldref Config.count:I' },
    { index: 53, text: 'Fieldref Config.label:Ljava/lang/String;' },
  ],
};

describe('class lifecycle model', () => {
  it('starts with the class not loaded and nothing resolved', () => {
    const state = lifecycleStart(CONFIG);
    expect(state.status).toBe('not-loaded');
    expect(currentPhase(state)).toBe('none');
    expect(state.resolved).toEqual({ 44: false, 46: false, 53: false });
  });

  it('loads without initializing: Class.forName(name, false, loader)', () => {
    const state = applyAction(CONFIG, lifecycleStart(CONFIG), { kind: 'load' });
    expect(state.status).toBe('loaded');
    expect(state.verified).toBe(false);
    expect(Object.values(state.statics).every((v) => v === undefined)).toBe(true);
  });

  it('gives every static field its default value during preparation, constants included', () => {
    let state = applyAction(CONFIG, lifecycleStart(CONFIG), { kind: 'load' });
    state = applyAction(CONFIG, state, { kind: 'prepare' });
    expect(state.statics).toEqual({
      count: { value: '0', by: 'default' },
      label: { value: 'null', by: 'default' },
      LIMIT: { value: '0', by: 'default' },
    });
    expect(currentPhase(state)).toBe('preparation');
  });

  it('refuses to initialize a class that is not verified and prepared', () => {
    const loaded = applyAction(CONFIG, lifecycleStart(CONFIG), { kind: 'load' });
    expect(() => applyAction(CONFIG, loaded, { kind: 'begin-init' })).toThrow(LifecycleError);
    const prepared = applyAction(CONFIG, loaded, { kind: 'prepare' });
    expect(() => applyAction(CONFIG, prepared, { kind: 'begin-init' })).toThrow(/verified/);
    expect(() => applyAction(CONFIG, lifecycleStart(CONFIG), { kind: 'verify' })).toThrow(
      /not loaded/,
    );
  });

  it('assigns constants first, then runs initializers in textual order', () => {
    let state = lifecycleStart(CONFIG);
    for (const action of [
      { kind: 'load' },
      { kind: 'prepare' },
      { kind: 'verify' },
      { kind: 'begin-init' },
      { kind: 'assign-constants' },
    ] as const)
      state = applyAction(CONFIG, state, action);
    expect(state.statics.LIMIT).toEqual({ value: '42', by: 'constant' });
    expect(state.statics.count).toEqual({ value: '0', by: 'default' });
    expect(formatStatics(state, '<clinit> starts: count = {count}, label = {label}')).toBe(
      '<clinit> starts: count = 0, label = null',
    );
    state = applyAction(CONFIG, state, { kind: 'assign', field: 'count' });
    expect(state.statics.count).toEqual({ value: '3', by: 'initializer' });
    expect(() => applyAction(CONFIG, state, { kind: 'assign', field: 'LIMIT' })).toThrow(
      /constant/,
    );
    state = applyAction(CONFIG, state, { kind: 'finish-init' });
    expect(state.status).toBe('initialized');
    expect(() => applyAction(CONFIG, state, { kind: 'assign', field: 'label' })).toThrow(
      /initializing/,
    );
  });

  it('resolves one constant pool entry at a time, on first use', () => {
    let state = applyAction(CONFIG, lifecycleStart(CONFIG), { kind: 'load' });
    state = applyAction(CONFIG, state, { kind: 'resolve', entry: 46 });
    expect(state.resolved).toEqual({ 44: false, 46: true, 53: false });
    expect(currentPhase(state)).toBe('resolution');
    expect(() => applyAction(CONFIG, state, { kind: 'resolve', entry: 99 })).toThrow(/#99/);
  });

  it('marks a class whose initializer threw as erroneous', () => {
    let state = lifecycleStart(CONFIG);
    for (const action of [
      { kind: 'load' },
      { kind: 'prepare' },
      { kind: 'verify' },
      { kind: 'begin-init' },
    ] as const)
      state = applyAction(CONFIG, state, action);
    state = applyAction(CONFIG, state, { kind: 'fail', error: 'ArithmeticException' });
    expect(state.status).toBe('erroneous');
    expect(currentPhase(state)).toBe('initialization');
  });

  it('never changes the state it is given and records output and log lines', () => {
    const start = lifecycleStart(CONFIG);
    const copy = structuredClone(start);
    const next = applyAction(CONFIG, start, { kind: 'print', text: 'main started' });
    expect(start).toEqual(copy);
    expect(next.output).toEqual(['main started']);
    const loaded = applyAction(CONFIG, next, { kind: 'load', log: ['[class,load] Config'] });
    expect(loaded.log).toEqual(['[class,load] Config']);
    // One console, in the order the lines appeared.
    expect(loaded.console).toEqual([
      { kind: 'out', text: 'main started' },
      { kind: 'log', text: '[class,load] Config' },
    ]);
    expect(applyAction(CONFIG, loaded, { kind: 'log', lines: ['other'] }).status).toBe('loaded');
  });

  it('builds a timeline: the state after each step', () => {
    const states = lifecycleTimeline(CONFIG, [
      { actions: [{ kind: 'print', text: 'main started' }] },
      { actions: [{ kind: 'load' }, { kind: 'prepare' }] },
    ]);
    expect(states).toHaveLength(2);
    expect(states[0]!.status).toBe('not-loaded');
    expect(states[1]!.status).toBe('loaded');
    expect(states[1]!.prepared).toBe(true);
  });
});
