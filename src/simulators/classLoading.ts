/**
 * A deterministic model of how class loaders find classes: the delegation
 * algorithms of JDK 25 and the bookkeeping the JVM does around them. Pure
 * functions, no DOM; every request returns the list of steps it took and the
 * runtime state after each one, so the lab can step through it, rewind it and
 * restore it from the URL by replaying the same requests.
 *
 * Three loading policies are modelled, because one generic algorithm does not
 * describe every loader:
 *
 *  - `module-aware`: the built-in platform and application loaders
 *    (`jdk.internal.loader.BuiltinClassLoader.loadClassOrNull`, JDK 9+). They
 *    first map the class's package to a named module; if the module is defined
 *    to another built-in loader, the request goes to that loader, which need
 *    not be the parent. Only packages in no named module go to the parent and
 *    then to the class path.
 *  - `parent-first`: the classic `java.lang.ClassLoader.loadClass` pattern that
 *    user-defined loaders such as `URLClassLoader` inherit: findLoadedClass,
 *    the parent, then findClass.
 *  - `child-first`: a representative user-defined loader that overrides
 *    loadClass to try its own sources first (java.* still goes to the parent,
 *    because only the platform loader may define classes in java.* packages).
 *
 * The JVM's own bookkeeping is modelled too (JVMS §5.3, §5.3.4): a run-time
 * class is its binary name plus its defining loader; the defining loader and
 * the loader the JVM asked (the initiating loader) both record it, the loaders
 * in between do not (they only passed the request on); and loading
 * constraints stop two loaders from disagreeing about a type that appears in
 * a member signature they share.
 */

export type LoaderKind = 'bootstrap' | 'builtin' | 'user';
export type LoaderPolicy = 'bootstrap' | 'module-aware' | 'parent-first' | 'child-first';
export type SourceKind = 'runtime-image' | 'class-path' | 'module-path' | 'directory';

export interface LoaderSpec {
  id: string;
  /** What `ClassLoader.getName()` returns; the bootstrap loader has no Java object and no name. */
  name: string;
  kind: LoaderKind;
  policy: LoaderPolicy;
  /** The loader requests are delegated to; null only for the bootstrap loader. */
  parent: string | null;
  /** Where this loader reads class bytes itself. */
  sources: string[];
}

export interface ClassSource {
  id: string;
  kind: SourceKind;
  label: string;
  /** Binary names of the classes this source can supply. */
  classes: string[];
}

/** A named module of the boot layer and the loader it is defined to. */
export interface NamedModule {
  name: string;
  loader: string;
  packages: string[];
}

/** A method reference whose resolution imposes loading constraints. */
export interface MemberRef {
  id: string;
  /** The class whose code contains the reference. */
  fromClass: string;
  /** The defining loader of that class. */
  fromLoader: string;
  /** The class that declares the member. */
  owner: string;
  signature: string;
  /** Class types named in the member's descriptor. */
  types: string[];
}

export interface LoaderWorld {
  loaders: LoaderSpec[];
  sources: ClassSource[];
  modules: NamedModule[];
  /** Classes already defined when the program starts (the JDK's core classes, the main class). */
  preloaded: { name: string; loader: string; source: string }[];
  members: MemberRef[];
}

export interface RuntimeClass {
  /** `${binaryName}@${definingLoader}`: the identity of a run-time class. */
  id: string;
  name: string;
  definingLoader: string;
  source: string;
}

/** Two loaders that must agree on which class a name means. */
export interface LoadingConstraint {
  name: string;
  loaders: [string, string];
}

export interface LoaderRuntime {
  /** Every class defined so far, in the order it was defined. */
  classes: RuntimeClass[];
  /**
   * Loader id → binary name → class id: the classes each loader is recorded as
   * an initiating loader of. The defining loader is always one (JVMS §5.3).
   * This is what `findLoadedClass` consults.
   */
  initiated: Record<string, Record<string, string>>;
  constraints: LoadingConstraint[];
}

export type LoadRequest =
  /** The JVM needs class `name` and asks `loader` for it (resolution, Class.forName). */
  | { kind: 'class'; loader: string; name: string }
  /** Code resolves a method reference (`MemberRef`): the owner class, then the constraints. */
  | { kind: 'member'; member: string };

export type StepKind =
  | 'request'
  | 'check-loaded'
  | 'module-lookup'
  | 'delegate'
  | 'search'
  | 'define'
  | 'return'
  | 'not-found'
  | 'record'
  | 'constraint'
  | 'outcome';

export interface DelegationStep {
  /** `r<request index>-<step index>`: stable for a given run. */
  id: string;
  kind: StepKind;
  /** The loader acting in this step. */
  loader: string;
  /** The other loader: who is delegated to, or who receives the answer. */
  other?: string;
  name: string;
  /** check-loaded: whether findLoadedClass found it. */
  hit?: boolean;
  /** module-lookup: the module the package belongs to (null: no named module). */
  module?: string | null;
  moduleLoader?: string;
  /** delegate: why this loader was chosen. */
  reason?: 'parent' | 'module' | 'java-prefix' | 'child-miss';
  /** search and define: the source read. */
  source?: string;
  found?: boolean;
  classId?: string;
  /** constraint: whether the two loaders agree (or cannot disagree yet). */
  satisfied?: boolean;
  /** Loaders currently inside loadClass for this request, outermost first. */
  path: string[];
  /** The runtime state after this step. */
  runtime: LoaderRuntime;
}

export type Outcome =
  | { kind: 'loaded'; classId: string; definingLoader: string; alreadyLoaded: boolean }
  /** loadClass throws ClassNotFoundException; while resolving, the JVM reports NoClassDefFoundError. */
  | { kind: 'not-found'; name: string; loader: string }
  /** The JVM throws LinkageError: loader constraint violation. */
  | {
      kind: 'constraint-violation';
      name: string;
      loaders: [string, string];
      classes: [string, string];
    };

export interface RequestResult {
  request: LoadRequest;
  steps: DelegationStep[];
  outcome: Outcome;
  runtime: LoaderRuntime;
}

export const classId = (name: string, loader: string) => `${name}@${loader}`;

const packageOf = (name: string) => {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(0, dot);
};

const BINARY_NAME = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;

export function moduleOf(world: LoaderWorld, name: string): NamedModule | undefined {
  const pkg = packageOf(name);
  return world.modules.find((module) => module.packages.includes(pkg));
}

function loaderOf(world: LoaderWorld, id: string): LoaderSpec {
  const loader = world.loaders.find((l) => l.id === id);
  if (!loader) throw new Error(`Unknown loader ${id}`);
  return loader;
}

export function initialRuntime(world: LoaderWorld): LoaderRuntime {
  const runtime: LoaderRuntime = { classes: [], initiated: {}, constraints: [] };
  for (const { name, loader, source } of world.preloaded) {
    const id = classId(name, loader);
    runtime.classes.push({ id, name, definingLoader: loader, source });
    runtime.initiated[loader] = { ...runtime.initiated[loader], [name]: id };
  }
  return runtime;
}

/** Problems with a runtime state (an empty list when it is consistent). */
export function validateRuntime(world: LoaderWorld, runtime: LoaderRuntime): string[] {
  const problems: string[] = [];
  const loaders = new Set(world.loaders.map((l) => l.id));
  const byId = new Map(runtime.classes.map((c) => [c.id, c]));
  if (byId.size !== runtime.classes.length) problems.push('a class is defined twice');
  for (const c of runtime.classes) {
    if (c.id !== classId(c.name, c.definingLoader)) problems.push(`${c.id}: id does not match`);
    if (!loaders.has(c.definingLoader)) problems.push(`${c.id}: unknown defining loader`);
    if (runtime.initiated[c.definingLoader]?.[c.name] !== c.id)
      problems.push(`${c.id}: not recorded by its defining loader`);
  }
  for (const [loader, names] of Object.entries(runtime.initiated)) {
    if (!loaders.has(loader)) problems.push(`unknown loader ${loader}`);
    for (const [name, id] of Object.entries(names)) {
      const c = byId.get(id);
      if (!c) problems.push(`${loader} records ${id}, which does not exist`);
      else if (c.name !== name) problems.push(`${loader} records ${id} as ${name}`);
    }
  }
  for (const {
    name,
    loaders: [a, b],
  } of runtime.constraints) {
    const x = runtime.initiated[a]?.[name];
    const y = runtime.initiated[b]?.[name];
    if (x && y && x !== y) problems.push(`constraint on ${name} between ${a} and ${b} is violated`);
  }
  return problems;
}

class StepRecorder {
  steps: DelegationStep[] = [];
  path: string[] = [];
  constructor(
    private prefix: string,
    public runtime: LoaderRuntime,
  ) {}

  emit(step: Omit<DelegationStep, 'id' | 'path' | 'runtime'>) {
    this.steps.push({
      ...step,
      id: `${this.prefix}-${this.steps.length}`,
      path: [...this.path],
      runtime: this.runtime,
    });
  }

  /** Applies an immutable update to the runtime. */
  update(change: (runtime: LoaderRuntime) => LoaderRuntime) {
    this.runtime = change(this.runtime);
  }
}

/** The class a loader has recorded under `name`, if any. */
const recorded = (runtime: LoaderRuntime, loader: string, name: string) =>
  runtime.initiated[loader]?.[name];

const withRecord = (runtime: LoaderRuntime, loader: string, name: string, id: string) => ({
  ...runtime,
  initiated: { ...runtime.initiated, [loader]: { ...runtime.initiated[loader], [name]: id } },
});

/** A constraint that recording `id` under `name` for `loader` would break. */
function brokenConstraint(runtime: LoaderRuntime, loader: string, name: string, id: string) {
  for (const constraint of runtime.constraints) {
    if (constraint.name !== name || !constraint.loaders.includes(loader)) continue;
    const other = constraint.loaders[0] === loader ? constraint.loaders[1] : constraint.loaders[0];
    const theirs = recorded(runtime, other, name);
    if (theirs && theirs !== id) return { other, theirs };
  }
  return null;
}

class ConstraintViolation {
  constructor(
    readonly name: string,
    readonly loaders: [string, string],
    readonly classes: [string, string],
  ) {}
}

/** Whether `loader` can read `name` from `source` itself. */
function supplies(world: LoaderWorld, source: ClassSource, loader: LoaderSpec, name: string) {
  if (!source.classes.includes(name)) return false;
  const module = moduleOf(world, name);
  if (source.kind === 'runtime-image' || source.kind === 'module-path')
    // A module's classes are found only by the loader the module is defined to.
    return module?.loader === loader.id;
  // Class path and plain directories hold classes in no named module.
  return !module || loader.kind === 'user';
}

function search(
  world: LoaderWorld,
  rec: StepRecorder,
  loader: LoaderSpec,
  name: string,
  kinds: SourceKind[],
): string | null {
  const sources = loader.sources
    .map((id) => world.sources.find((s) => s.id === id)!)
    .filter((s) => s && kinds.includes(s.kind));
  for (const source of sources) {
    if (!supplies(world, source, loader, name)) continue;
    rec.emit({ kind: 'search', loader: loader.id, name, source: source.id, found: true });
    return define(rec, loader, name, source.id);
  }
  rec.emit({
    kind: 'search',
    loader: loader.id,
    name,
    source: sources[0]?.id,
    found: false,
  });
  return null;
}

function define(rec: StepRecorder, loader: LoaderSpec, name: string, source: string): string {
  const id = classId(name, loader.id);
  const broken = brokenConstraint(rec.runtime, loader.id, name, id);
  if (broken) {
    rec.emit({
      kind: 'constraint',
      loader: loader.id,
      other: broken.other,
      name,
      satisfied: false,
    });
    throw new ConstraintViolation(name, [loader.id, broken.other], [id, broken.theirs]);
  }
  rec.update((runtime) =>
    withRecord(
      {
        ...runtime,
        classes: [...runtime.classes, { id, name, definingLoader: loader.id, source }],
      },
      loader.id,
      name,
      id,
    ),
  );
  rec.emit({ kind: 'define', loader: loader.id, name, source, classId: id });
  return id;
}

function delegate(
  world: LoaderWorld,
  rec: StepRecorder,
  from: LoaderSpec,
  to: string,
  name: string,
  reason: NonNullable<DelegationStep['reason']>,
): string | null {
  rec.emit({ kind: 'delegate', loader: from.id, other: to, name, reason });
  const id = loadIn(world, rec, to, name);
  rec.emit(
    id
      ? { kind: 'return', loader: to, other: from.id, name, classId: id }
      : { kind: 'not-found', loader: to, other: from.id, name },
  );
  return id;
}

/** One loader's loadClass (or loadClassOrNull): returns the class id or null. */
function loadIn(
  world: LoaderWorld,
  rec: StepRecorder,
  loaderId: string,
  name: string,
): string | null {
  const loader = loaderOf(world, loaderId);
  rec.path.push(loaderId);
  try {
    const known = recorded(rec.runtime, loaderId, name);
    rec.emit({ kind: 'check-loaded', loader: loaderId, name, hit: Boolean(known), classId: known });
    if (known) return known;

    switch (loader.policy) {
      case 'bootstrap':
        return search(world, rec, loader, name, ['runtime-image', 'class-path']);
      case 'module-aware': {
        const module = moduleOf(world, name);
        rec.emit({
          kind: 'module-lookup',
          loader: loaderId,
          name,
          module: module?.name ?? null,
          moduleLoader: module?.loader,
        });
        if (module) {
          return module.loader === loaderId
            ? search(world, rec, loader, name, ['runtime-image', 'module-path'])
            : delegate(world, rec, loader, module.loader, name, 'module');
        }
        let id = loader.parent ? delegate(world, rec, loader, loader.parent, name, 'parent') : null;
        if (
          !id &&
          loader.sources.some((s) => world.sources.find((x) => x.id === s)?.kind === 'class-path')
        )
          id = search(world, rec, loader, name, ['class-path']);
        return id;
      }
      case 'parent-first': {
        const id = delegate(world, rec, loader, loader.parent ?? 'bootstrap', name, 'parent');
        return id ?? search(world, rec, loader, name, ['directory', 'class-path', 'module-path']);
      }
      case 'child-first': {
        if (name.startsWith('java.'))
          return delegate(world, rec, loader, loader.parent ?? 'bootstrap', name, 'java-prefix');
        const own = search(world, rec, loader, name, ['directory', 'class-path', 'module-path']);
        return (
          own ?? delegate(world, rec, loader, loader.parent ?? 'bootstrap', name, 'child-miss')
        );
      }
    }
  } finally {
    rec.path.pop();
  }
}

/** The JVM asks `loader` for `name` and records it as an initiating loader of the answer. */
function vmLoad(world: LoaderWorld, rec: StepRecorder, loader: string, name: string) {
  const existed = new Set(rec.runtime.classes.map((c) => c.id));
  const id = loadIn(world, rec, loader, name);
  if (!id) return null;
  if (recorded(rec.runtime, loader, name) !== id) {
    const broken = brokenConstraint(rec.runtime, loader, name, id);
    if (broken) {
      rec.emit({ kind: 'constraint', loader, other: broken.other, name, satisfied: false });
      throw new ConstraintViolation(name, [loader, broken.other], [id, broken.theirs]);
    }
    rec.update((runtime) => withRecord(runtime, loader, name, id));
    rec.emit({ kind: 'record', loader, name, classId: id });
  }
  return { id, alreadyLoaded: existed.has(id) };
}

function memberOf(world: LoaderWorld, id: string): MemberRef {
  const member = world.members.find((m) => m.id === id);
  if (!member) throw new Error(`Unknown member ${id}`);
  return member;
}

/** Runs one request against `runtime` (never modified) and returns every step. */
export function runRequest(
  world: LoaderWorld,
  runtime: LoaderRuntime,
  request: LoadRequest,
  index = 0,
): RequestResult {
  const rec = new StepRecorder(`r${index}`, runtime);
  const member = request.kind === 'member' ? memberOf(world, request.member) : null;
  const loader = request.kind === 'class' ? request.loader : member!.fromLoader;
  const name = request.kind === 'class' ? request.name : member!.owner;
  rec.emit({ kind: 'request', loader, name });

  let outcome: Outcome;
  try {
    const loaded = vmLoad(world, rec, loader, name);
    if (!loaded) {
      outcome = { kind: 'not-found', name, loader };
    } else {
      const definingLoader = rec.runtime.classes.find((c) => c.id === loaded.id)!.definingLoader;
      if (member) checkSignature(rec, member, definingLoader);
      outcome = {
        kind: 'loaded',
        classId: loaded.id,
        definingLoader,
        alreadyLoaded: loaded.alreadyLoaded,
      };
    }
  } catch (error) {
    if (!(error instanceof ConstraintViolation)) throw error;
    outcome = {
      kind: 'constraint-violation',
      name: error.name,
      loaders: error.loaders,
      classes: error.classes,
    };
  }
  rec.emit({ kind: 'outcome', loader, name });
  return { request, steps: rec.steps, outcome, runtime: rec.runtime };
}

/**
 * Method resolution across loaders (JVMS §5.4.3.3, §5.3.4): each class type in
 * the signature must mean the same class to the referencing class's loader and
 * to the declaring class's loader. Both loaded and different: LinkageError.
 * Otherwise the constraint is recorded and enforced on later loads.
 */
function checkSignature(rec: StepRecorder, member: MemberRef, ownerLoader: string) {
  const a = member.fromLoader;
  const b = ownerLoader;
  if (a === b) return;
  for (const type of member.types) {
    const mine = recorded(rec.runtime, a, type);
    const theirs = recorded(rec.runtime, b, type);
    if (mine && theirs && mine !== theirs) {
      rec.emit({ kind: 'constraint', loader: a, other: b, name: type, satisfied: false });
      throw new ConstraintViolation(type, [a, b], [mine, theirs]);
    }
    const exists = rec.runtime.constraints.some(
      (c) => c.name === type && c.loaders.includes(a) && c.loaders.includes(b),
    );
    if (!exists)
      rec.update((runtime) => ({
        ...runtime,
        constraints: [...runtime.constraints, { name: type, loaders: [a, b] }],
      }));
    rec.emit({ kind: 'constraint', loader: a, other: b, name: type, satisfied: true });
  }
}

/** Runs requests one after another; each result carries the runtime after it. */
export function replay(world: LoaderWorld, requests: LoadRequest[]): RequestResult[] {
  const results: RequestResult[] = [];
  let runtime = initialRuntime(world);
  requests.forEach((request, index) => {
    const result = runRequest(world, runtime, request, index);
    results.push(result);
    runtime = result.runtime;
  });
  return results;
}

/** `loader:binary.Name` for class requests, `call:<member id>` for member resolution. */
export function serializeRun(requests: LoadRequest[]): string {
  return requests
    .map((r) => (r.kind === 'class' ? `${r.loader}:${r.name}` : `call:${r.member}`))
    .join(',');
}

/** The requests in a serialized run; anything that does not name a real loader, class or member is dropped. */
export function parseRun(world: LoaderWorld, text: string | null): LoadRequest[] {
  if (!text) return [];
  const requests: LoadRequest[] = [];
  for (const part of text.split(',')) {
    const colon = part.indexOf(':');
    if (colon <= 0) continue;
    const head = part.slice(0, colon);
    const tail = part.slice(colon + 1);
    if (head === 'call') {
      if (world.members.some((m) => m.id === tail)) requests.push({ kind: 'member', member: tail });
    } else if (world.loaders.some((l) => l.id === head) && BINARY_NAME.test(tail)) {
      requests.push({ kind: 'class', loader: head, name: tail });
    }
  }
  return requests;
}
