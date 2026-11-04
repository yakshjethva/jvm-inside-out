import { describe, expect, it } from 'vitest';
import { COMPONENT_IDS } from '@/content/jvm/ids';
import {
  CLASS_CHOICES,
  CLASS_LOADING_INVESTIGATIONS,
  CLASS_LOADING_LISTINGS,
  CLASS_LOADING_QUIZ,
  CLASS_LOADING_STATIONS,
  CONFIG_MODEL,
  DELEGATION_EXPERIMENTS,
  LIFECYCLE_STEPS,
  LOADER_IDS,
  LOADER_PROFILES,
  LOADER_WORLD,
} from '@/content/labs/classLoading';
import {
  LIFECYCLE_LOG,
  LIFECYCLE_OUTPUT,
  LOADERS_OUTPUT,
} from '@/content/labs/classLoadingEvidence';
import { getGlossaryEntry } from '@/glossary';
import { shortId, shortName, shortSignature } from '@/modules/class-loading/narration';
import { lifecycleTimeline } from '@/simulators/classLifecycle';
import { initialRuntime, replay, runRequest, validateRuntime } from '@/simulators/classLoading';

const exactlyOneCorrect = (options: { correct: boolean }[]) =>
  options.filter((o) => o.correct).length;

describe('class loading lab: the simulator agrees with the real JDK 25.0.4 runs', () => {
  // From `java -cp . Loaders` (LOADERS_OUTPUT).
  it.each([
    ['app', 'java.lang.String', 'bootstrap'],
    ['app', 'java.util.logging.Logger', 'bootstrap'],
    ['app', 'java.sql.Connection', 'platform'],
    ['app', 'com.sun.tools.javac.Main', 'app'],
    ['platform', 'com.sun.tools.javac.Main', 'app'],
  ])('%s asked for %s: defined by %s', (loader, name, expected) => {
    const result = runRequest(LOADER_WORLD, initialRuntime(LOADER_WORLD), {
      kind: 'class',
      loader,
      name,
    });
    expect(result.outcome).toMatchObject({ kind: 'loaded', definingLoader: expected });
    const shown = expected === 'bootstrap' ? 'the bootstrap loader (null)' : expected;
    expect(LOADERS_OUTPUT.code).toContain(`${name} | module`);
    if (loader === 'app') expect(LOADERS_OUTPUT.code).toContain(`defined by ${shown}`);
  });

  it('reproduces Delegation.java line by line', () => {
    // The same requests, in the same order, as the real program.
    const results = replay(LOADER_WORLD, [
      { kind: 'class', loader: 'parent-first', name: 'com.example.shared.Message' },
      { kind: 'class', loader: 'parent-first', name: 'com.example.plugin.Greeter' },
      { kind: 'class', loader: 'child-first', name: 'com.example.shared.Message' },
      { kind: 'class', loader: 'child-first', name: 'java.lang.String' },
      { kind: 'class', loader: 'parent-first', name: 'com.example.Missing' },
      { kind: 'class', loader: 'child-first', name: 'com.example.plugin.Greeter' },
      { kind: 'member', member: 'bus-send' },
    ]);
    expect(
      results.map((r) => (r.outcome.kind === 'loaded' ? r.outcome.definingLoader : r.outcome.kind)),
    ).toEqual([
      'app',
      'parent-first',
      'child-first',
      'bootstrap',
      'not-found',
      'child-first',
      'constraint-violation',
    ]);
    // The real program loads Bus from app/ while resolving Greeter's call.
    expect(results.at(-1)!.runtime.classes.map((c) => c.id)).toContain(
      'com.example.shared.Bus@app',
    );
    for (const r of results) expect(validateRuntime(LOADER_WORLD, r.runtime)).toEqual([]);
  });

  it('runs every guided experiment to the outcome its prediction calls correct', () => {
    for (const experiment of DELEGATION_EXPERIMENTS) {
      const results = replay(LOADER_WORLD, [...experiment.setup, experiment.request]);
      const outcome = results.at(-1)!.outcome;
      expect(exactlyOneCorrect(experiment.prediction.options), experiment.id).toBe(1);
      const correct = experiment.prediction.options.find((o) => o.correct)!;
      if (LOADER_IDS.includes(correct.id as never))
        expect(outcome, experiment.id).toMatchObject({
          kind: 'loaded',
          definingLoader: correct.id,
        });
      if (correct.id === 'none') expect(outcome.kind, experiment.id).toBe('not-found');
      if (correct.id === 'linkage')
        expect(outcome.kind, experiment.id).toBe('constraint-violation');
      for (const id of experiment.evidence)
        expect(CLASS_LOADING_LISTINGS[id], `${experiment.id}: ${id}`).toBeDefined();
    }
  });

  it('offers only loaders and classes the world knows', () => {
    expect(LOADER_WORLD.loaders.map((l) => l.id)).toEqual(LOADER_IDS);
    for (const id of LOADER_IDS) {
      expect(LOADER_PROFILES[id].id).toBe(id);
      expect(COMPONENT_IDS).toContain(LOADER_PROFILES[id].component);
      for (const listing of LOADER_PROFILES[id].evidence)
        expect(CLASS_LOADING_LISTINGS[listing], listing).toBeDefined();
    }
    const known = new Set(LOADER_WORLD.sources.flatMap((s) => s.classes));
    for (const choice of CLASS_CHOICES)
      if (choice.name !== 'com.example.Missing')
        expect(known.has(choice.name), choice.name).toBe(true);
  });
});

describe('class loading lab: the lifecycle microscope replays the real run', () => {
  const states = lifecycleTimeline(CONFIG_MODEL, LIFECYCLE_STEPS);
  const last = states.at(-1)!;

  it('prints exactly what java -cp . Lifecycle printed', () => {
    expect(last.output).toEqual(LIFECYCLE_OUTPUT.code.split('\n'));
  });

  it('shows the log and the output interleaved as -Xlog:class+load,class+init did', () => {
    expect(last.console.map((line) => line.text)).toEqual(LIFECYCLE_LOG.code.split('\n'));
  });

  it('ends with Config initialized and every reference resolved on its first use', () => {
    expect(last.status).toBe('initialized');
    expect(last.statics).toEqual({
      count: { value: '3', by: 'initializer' },
      label: { value: 'ready', by: 'initializer' },
      LIMIT: { value: '42', by: 'constant' },
    });
    expect(last.resolved).toEqual({ 44: true, 46: true, 53: true });
    // Lazy resolution: #53 is still symbolic while Config is being initialized.
    const clinit = states[LIFECYCLE_STEPS.findIndex((s) => s.id === 'clinit')]!;
    expect(clinit.resolved[53]).toBe(false);
  });

  it('loads Config before it is verified, and verifies it only before initialization', () => {
    const index = (id: string) => LIFECYCLE_STEPS.findIndex((s) => s.id === id);
    expect(states[index('load')]!.verified).toBe(false);
    expect(states[index('constant')]!.status).toBe('loaded');
    expect(index('verify')).toBeGreaterThan(index('constant'));
    expect(states[index('verify')]!.verified).toBe(true);
    expect(index('clinit')).toBe(index('verify') + 1);
  });

  it('highlights lines that exist in Lifecycle.java', () => {
    const lines = CLASS_LOADING_LISTINGS['lifecycle-java']!.code.split('\n').length;
    for (const step of LIFECYCLE_STEPS)
      for (const line of step.lines) expect(line, step.id).toBeLessThanOrEqual(lines);
  });
});

describe('class loading lab: teaching content', () => {
  it('gives every station a question, one right prediction, one right answer and sources', () => {
    expect(CLASS_LOADING_STATIONS.map((s) => s.id)).toEqual([
      'observatory',
      'delegation',
      'lifecycle',
    ]);
    // The delegation laboratory asks its predictions per experiment.
    expect(CLASS_LOADING_STATIONS.find((s) => s.id === 'delegation')!.prediction).toBeUndefined();
    for (const station of CLASS_LOADING_STATIONS) {
      if (station.prediction)
        expect(exactlyOneCorrect(station.prediction.options), station.id).toBe(1);
      expect(exactlyOneCorrect(station.check.options), station.id).toBe(1);
      expect(station.explanation.developer, station.id).toBeTruthy();
      expect(station.references.length, station.id).toBeGreaterThan(0);
      expect(getGlossaryEntry(station.term.glossaryId), station.term.glossaryId).toBeDefined();
      expect(COMPONENT_IDS).toContain(station.component);
      for (const listing of station.listings)
        expect(listing.verifiedWith, listing.id).toMatch(/OpenJDK 25\.0\.4/);
    }
  });

  it('backs every investigation with real output and sources', () => {
    const ids = CLASS_LOADING_INVESTIGATIONS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const investigation of CLASS_LOADING_INVESTIGATIONS) {
      expect(investigation.listings.length, investigation.id).toBeGreaterThan(0);
      expect(investigation.references.length, investigation.id).toBeGreaterThan(0);
      for (const listing of investigation.listings)
        expect(listing.verifiedWith, listing.id).toMatch(/OpenJDK 25\.0\.4/);
    }
  });

  it('has a quiz with exactly one right answer per question', () => {
    for (const q of CLASS_LOADING_QUIZ.questions)
      expect(exactlyOneCorrect(q.options), q.id).toBe(1);
  });

  it('gives every listing a unique id', () => {
    const listings = Object.values(CLASS_LOADING_LISTINGS);
    expect(new Set(listings.map((l) => l.id)).size).toBe(listings.length);
  });
});

describe('the explorer’s short names', () => {
  it('shortens class names, class ids and member signatures', () => {
    expect(shortName('java.sql.Connection')).toBe('Connection');
    expect(shortId('java.sql.Connection@platform')).toBe('Connection@platform');
    expect(shortSignature('void com.example.shared.Bus.send(com.example.shared.Message)')).toBe(
      'Bus.send(Message)',
    );
    for (const member of LOADER_WORLD.members)
      expect(shortSignature(member.signature), member.id).toMatch(/^[A-Z][\w$]*\.[\w$]+\(.*\)$/);
  });
});
