import { describe, expect, it } from 'vitest';
import {
  classId,
  initialRuntime,
  parseRun,
  replay,
  runRequest,
  serializeRun,
  validateRuntime,
  type LoaderWorld,
  type LoadRequest,
} from '@/simulators/classLoading';

/**
 * A small world with every kind of loader the lab shows. The expectations
 * below are the results the real JDK 25.0.4 programs printed (see the
 * evidence in src/content/labs/classLoading.ts).
 */
const WORLD: LoaderWorld = {
  loaders: [
    {
      id: 'bootstrap',
      name: '',
      kind: 'bootstrap',
      policy: 'bootstrap',
      parent: null,
      sources: ['image'],
    },
    {
      id: 'platform',
      name: 'platform',
      kind: 'builtin',
      policy: 'module-aware',
      parent: 'bootstrap',
      sources: ['image'],
    },
    {
      id: 'app',
      name: 'app',
      kind: 'builtin',
      policy: 'module-aware',
      parent: 'platform',
      sources: ['image', 'cp'],
    },
    {
      id: 'parent-first',
      name: 'parent-first',
      kind: 'user',
      policy: 'parent-first',
      parent: 'app',
      sources: ['plugin'],
    },
    {
      id: 'child-first',
      name: 'child-first',
      kind: 'user',
      policy: 'child-first',
      parent: 'app',
      sources: ['plugin'],
    },
  ],
  sources: [
    {
      id: 'image',
      kind: 'runtime-image',
      label: 'lib/modules',
      classes: [
        'java.lang.Object',
        'java.lang.String',
        'java.util.logging.Logger',
        'java.sql.Connection',
        'com.sun.tools.javac.Main',
      ],
    },
    {
      id: 'cp',
      kind: 'class-path',
      label: 'app/',
      classes: ['Main', 'com.example.shared.Message', 'com.example.shared.Bus'],
    },
    {
      id: 'plugin',
      kind: 'directory',
      label: 'plugin/',
      classes: ['com.example.plugin.Greeter', 'com.example.shared.Message'],
    },
  ],
  modules: [
    { name: 'java.base', loader: 'bootstrap', packages: ['java.lang'] },
    { name: 'java.logging', loader: 'bootstrap', packages: ['java.util.logging'] },
    { name: 'java.sql', loader: 'platform', packages: ['java.sql'] },
    { name: 'jdk.compiler', loader: 'app', packages: ['com.sun.tools.javac'] },
  ],
  preloaded: [
    { name: 'java.lang.Object', loader: 'bootstrap', source: 'image' },
    { name: 'java.lang.String', loader: 'bootstrap', source: 'image' },
    { name: 'Main', loader: 'app', source: 'cp' },
  ],
  members: [
    {
      id: 'bus-send',
      fromClass: 'com.example.plugin.Greeter',
      fromLoader: 'child-first',
      owner: 'com.example.shared.Bus',
      signature: 'void com.example.shared.Bus.send(com.example.shared.Message)',
      types: ['com.example.shared.Message'],
    },
  ],
};

const ask = (loader: string, name: string): LoadRequest => ({ kind: 'class', loader, name });
const definer = (result: ReturnType<typeof runRequest>) =>
  result.outcome.kind === 'loaded' ? result.outcome.definingLoader : result.outcome.kind;
const kinds = (result: ReturnType<typeof runRequest>) => result.steps.map((step) => step.kind);

describe('class loading: identities', () => {
  it('identifies a run-time class by its binary name and its defining loader', () => {
    expect(classId('com.example.shared.Message', 'app')).toBe('com.example.shared.Message@app');
    expect(classId('com.example.shared.Message', 'child-first')).not.toBe(
      classId('com.example.shared.Message', 'app'),
    );
  });

  it('starts with the classes loaded at startup, each recorded for its defining loader', () => {
    const runtime = initialRuntime(WORLD);
    expect(runtime.classes.map((c) => c.id)).toEqual([
      'java.lang.Object@bootstrap',
      'java.lang.String@bootstrap',
      'Main@app',
    ]);
    expect(runtime.initiated.app).toEqual({ Main: 'Main@app' });
    expect(validateRuntime(WORLD, runtime)).toEqual([]);
  });
});

describe('class loading: built-in, module-aware loaders (BuiltinClassLoader.loadClassOrNull)', () => {
  it('routes java.lang.String from the application loader straight to the boot loader', () => {
    const result = runRequest(WORLD, initialRuntime(WORLD), ask('app', 'java.lang.String'));
    expect(definer(result)).toBe('bootstrap');
    const lookup = result.steps.find((s) => s.kind === 'module-lookup')!;
    expect(lookup).toMatchObject({ loader: 'app', module: 'java.base', moduleLoader: 'bootstrap' });
    // Not through the platform loader: the module decides, not the parent.
    expect(result.steps.some((s) => s.loader === 'platform')).toBe(false);
    expect(result.outcome).toMatchObject({ kind: 'loaded', alreadyLoaded: true });
  });

  it('skips the platform loader for a boot module such as java.logging', () => {
    const result = runRequest(WORLD, initialRuntime(WORLD), ask('app', 'java.util.logging.Logger'));
    expect(definer(result)).toBe('bootstrap');
    expect(result.steps.find((s) => s.kind === 'delegate')).toMatchObject({
      loader: 'app',
      other: 'bootstrap',
      reason: 'module',
    });
    expect(result.steps.find((s) => s.kind === 'define')).toMatchObject({
      loader: 'bootstrap',
      source: 'image',
    });
  });

  it('defines java.sql.Connection in the platform loader, which owns module java.sql', () => {
    const result = runRequest(WORLD, initialRuntime(WORLD), ask('app', 'java.sql.Connection'));
    expect(definer(result)).toBe('platform');
    expect(kinds(result)).toEqual([
      'request',
      'check-loaded',
      'module-lookup',
      'delegate',
      'check-loaded',
      'module-lookup',
      'search',
      'define',
      'return',
      'record',
      'outcome',
    ]);
  });

  it('lets the platform loader delegate to its child when the module belongs to the child', () => {
    // Real JDK 25 output: platform.loadClass("com.sun.tools.javac.Main") is defined by app.
    const result = runRequest(
      WORLD,
      initialRuntime(WORLD),
      ask('platform', 'com.sun.tools.javac.Main'),
    );
    expect(definer(result)).toBe('app');
    expect(result.steps.find((s) => s.kind === 'delegate')).toMatchObject({
      loader: 'platform',
      other: 'app',
      reason: 'module',
    });
  });

  it('finds an application class on the class path after both parents miss', () => {
    const result = runRequest(
      WORLD,
      initialRuntime(WORLD),
      ask('app', 'com.example.shared.Message'),
    );
    expect(definer(result)).toBe('app');
    const searched = result.steps
      .filter((s) => s.kind === 'search')
      .map((s) => [s.loader, s.found]);
    expect(searched).toEqual([
      ['bootstrap', false],
      ['app', true],
    ]);
    // The platform loader has no class path of its own; it passes the request to its parent.
    expect(
      result.steps.filter((s) => s.kind === 'delegate').map((s) => [s.loader, s.other]),
    ).toEqual([
      ['app', 'platform'],
      ['platform', 'bootstrap'],
    ]);
  });
});

describe('class loading: user-defined loaders', () => {
  it('parent-first: the parent wins when it can supply the class', () => {
    const result = runRequest(
      WORLD,
      initialRuntime(WORLD),
      ask('parent-first', 'com.example.shared.Message'),
    );
    expect(definer(result)).toBe('app');
    // The plugin directory also holds Message, but it is never searched.
    expect(result.steps.some((s) => s.kind === 'search' && s.loader === 'parent-first')).toBe(
      false,
    );
  });

  it('parent-first: defines the class itself only when every parent misses', () => {
    const result = runRequest(
      WORLD,
      initialRuntime(WORLD),
      ask('parent-first', 'com.example.plugin.Greeter'),
    );
    expect(definer(result)).toBe('parent-first');
    expect(result.steps.at(-2)).toMatchObject({
      kind: 'define',
      loader: 'parent-first',
      source: 'plugin',
    });
  });

  it('child-first: defines its own copy, a different run-time class with the same name', () => {
    let runtime = initialRuntime(WORLD);
    runtime = runRequest(WORLD, runtime, ask('app', 'com.example.shared.Message')).runtime;
    const result = runRequest(WORLD, runtime, ask('child-first', 'com.example.shared.Message'));
    expect(definer(result)).toBe('child-first');
    const named = result.runtime.classes.filter((c) => c.name === 'com.example.shared.Message');
    expect(named.map((c) => c.id)).toEqual([
      'com.example.shared.Message@app',
      'com.example.shared.Message@child-first',
    ]);
  });

  it('child-first: still sends java.* to the parent', () => {
    const result = runRequest(WORLD, initialRuntime(WORLD), ask('child-first', 'java.lang.String'));
    expect(definer(result)).toBe('bootstrap');
    expect(result.steps.find((s) => s.kind === 'delegate')).toMatchObject({
      loader: 'child-first',
      other: 'app',
      reason: 'java-prefix',
    });
  });

  it('reports a class nobody can find as not found, after every loader looked', () => {
    const result = runRequest(
      WORLD,
      initialRuntime(WORLD),
      ask('parent-first', 'com.example.Missing'),
    );
    expect(result.outcome).toEqual({
      kind: 'not-found',
      name: 'com.example.Missing',
      loader: 'parent-first',
    });
    expect(result.steps.filter((s) => s.kind === 'search').map((s) => s.loader)).toEqual([
      'bootstrap',
      'app',
      'parent-first',
    ]);
    expect(result.runtime).toEqual(initialRuntime(WORLD));
  });
});

describe('class loading: already-loaded checks and initiating loaders', () => {
  it('a second request is answered by findLoadedClass without delegating', () => {
    const first = runRequest(WORLD, initialRuntime(WORLD), ask('app', 'java.sql.Connection'));
    const second = runRequest(WORLD, first.runtime, ask('app', 'java.sql.Connection'));
    expect(kinds(second)).toEqual(['request', 'check-loaded', 'outcome']);
    expect(second.steps[1]).toMatchObject({ hit: true, classId: 'java.sql.Connection@platform' });
    expect(second.outcome).toMatchObject({ kind: 'loaded', alreadyLoaded: true });
  });

  it('records the initiating loader, but not the loaders that only passed the request on', () => {
    const result = runRequest(
      WORLD,
      initialRuntime(WORLD),
      ask('parent-first', 'com.example.shared.Message'),
    );
    const id = 'com.example.shared.Message@app';
    expect(result.runtime.initiated['parent-first']?.['com.example.shared.Message']).toBe(id);
    expect(result.runtime.initiated.app?.['com.example.shared.Message']).toBe(id); // the definer
    expect(result.runtime.initiated.platform?.['com.example.shared.Message']).toBeUndefined();
  });

  it('never changes the runtime it was given', () => {
    const runtime = initialRuntime(WORLD);
    const copy = structuredClone(runtime);
    runRequest(WORLD, runtime, ask('child-first', 'com.example.shared.Message'));
    expect(runtime).toEqual(copy);
  });

  it('gives every step a stable id and a valid runtime', () => {
    const result = runRequest(WORLD, initialRuntime(WORLD), ask('app', 'java.sql.Connection'), 3);
    expect(result.steps.map((s) => s.id)).toEqual(result.steps.map((_, i) => `r3-${i}`));
    for (const step of result.steps)
      expect(validateRuntime(WORLD, step.runtime), step.id).toEqual([]);
  });

  it('keeps the path of loaders that are inside loadClass at each step', () => {
    const result = runRequest(WORLD, initialRuntime(WORLD), ask('app', 'java.sql.Connection'));
    const define = result.steps.find((s) => s.kind === 'define')!;
    expect(define.path).toEqual(['app', 'platform']);
    expect(result.steps.at(-1)!.path).toEqual([]);
  });
});

describe('class loading: loading constraints (JVMS §5.3.4)', () => {
  it('detects two loaders that disagree about a type in a method signature', () => {
    const request: LoadRequest = { kind: 'member', member: 'bus-send' };
    let runtime = initialRuntime(WORLD);
    for (const r of [
      ask('app', 'com.example.shared.Message'),
      ask('child-first', 'com.example.plugin.Greeter'),
    ])
      runtime = runRequest(WORLD, runtime, r).runtime;
    runtime = runRequest(WORLD, runtime, ask('child-first', 'com.example.shared.Message')).runtime;
    const result = runRequest(WORLD, runtime, request);
    expect(result.outcome).toEqual({
      kind: 'constraint-violation',
      name: 'com.example.shared.Message',
      loaders: ['child-first', 'app'],
      classes: ['com.example.shared.Message@child-first', 'com.example.shared.Message@app'],
    });
    expect(result.steps.find((s) => s.kind === 'constraint')).toMatchObject({ satisfied: false });
  });

  it('records a constraint that holds, and enforces it on a later definition', () => {
    let runtime = initialRuntime(WORLD);
    runtime = runRequest(WORLD, runtime, ask('child-first', 'com.example.plugin.Greeter')).runtime;
    // Nobody has loaded Message yet: the constraint is only recorded.
    const call = runRequest(WORLD, runtime, { kind: 'member', member: 'bus-send' });
    expect(call.outcome).toMatchObject({ kind: 'loaded', definingLoader: 'app' });
    expect(call.runtime.constraints).toEqual([
      { name: 'com.example.shared.Message', loaders: ['child-first', 'app'] },
    ]);
    // The application loader loads Message: no conflict yet.
    runtime = runRequest(WORLD, call.runtime, ask('app', 'com.example.shared.Message')).runtime;
    // The child-first loader would now define a second Message: the constraint forbids it.
    const late = runRequest(WORLD, runtime, ask('child-first', 'com.example.shared.Message'));
    expect(late.outcome).toMatchObject({
      kind: 'constraint-violation',
      name: 'com.example.shared.Message',
    });
    expect(
      late.runtime.classes.some((c) => c.id === 'com.example.shared.Message@child-first'),
    ).toBe(false);
  });
});

describe('class loading: URL state', () => {
  it('serializes a run and restores the same runtime by replaying it', () => {
    const requests: LoadRequest[] = [
      ask('app', 'com.example.shared.Message'),
      ask('child-first', 'com.example.shared.Message'),
      { kind: 'member', member: 'bus-send' },
    ];
    const text = serializeRun(requests);
    expect(text).toBe(
      'app:com.example.shared.Message,child-first:com.example.shared.Message,call:bus-send',
    );
    expect(parseRun(WORLD, text)).toEqual(requests);
    const replayed = replay(WORLD, parseRun(WORLD, text));
    let runtime = initialRuntime(WORLD);
    for (const request of requests) runtime = runRequest(WORLD, runtime, request).runtime;
    expect(replayed.at(-1)!.runtime).toEqual(runtime);
  });

  it('drops requests that name unknown loaders, classes or members', () => {
    expect(
      parseRun(WORLD, 'nobody:java.lang.String,app:,call:nope,app:java.sql.Connection'),
    ).toEqual([ask('app', 'java.sql.Connection')]);
    expect(parseRun(WORLD, null)).toEqual([]);
  });
});
