import type {
  DelegationStep,
  LoaderWorld,
  Outcome,
  RequestResult,
} from '@/simulators/classLoading';

/**
 * Words for each step of a delegation request: a short label for the step
 * list and one sentence that says what happened and why. Backticks mark code
 * (rendered by CodeText).
 */

const LOADER_NAMES: Record<string, string> = {
  bootstrap: 'the bootstrap loader',
  platform: 'the platform loader',
  app: 'the application loader',
  'parent-first': 'the parent-first loader',
  'child-first': 'the child-first loader',
};

export const loaderName = (id: string) => LOADER_NAMES[id] ?? `loader ${id}`;
const Capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** `com.example.shared.Message` → `Message`. */
export const shortName = (name: string) => name.slice(name.lastIndexOf('.') + 1);

/** `void com.example.shared.Bus.send(com.example.shared.Message)` → `Bus.send(Message)`. */
export const shortSignature = (signature: string) =>
  signature.replace(/^\S+\s+/, '').replace(/\b[a-z][\w$]*\./g, '');

/** `java.sql.Connection@platform` → `Connection@platform`. */
export const shortId = (id: string) => {
  const at = id.lastIndexOf('@');
  return `${shortName(id.slice(0, at))}${id.slice(at)}`;
};

const packageOf = (name: string) => name.slice(0, Math.max(0, name.lastIndexOf('.')));

export interface Narration {
  label: string;
  text: string;
  tone: 'flow' | 'ok' | 'miss' | 'warn' | 'neutral';
}

/** The narration of `step`, which belongs to `result` (for the request and its outcome). */
export function narrate(
  step: DelegationStep,
  world: LoaderWorld,
  result: Pick<RequestResult, 'request' | 'outcome'>,
): Narration {
  const who = loaderName(step.loader);
  const other = step.other ? loaderName(step.other) : '';
  const name = `\`${step.name}\``;
  switch (step.kind) {
    case 'request': {
      const { request } = result;
      const member =
        request.kind === 'member' ? world.members.find((m) => m.id === request.member) : undefined;
      if (member)
        return {
          label: 'Request',
          text: `\`${shortName(member.fromClass)}\` calls \`${member.signature.replace(/^\S+ /, '')}\`. To resolve the call, the JVM first asks ${who}, which defined \`${shortName(member.fromClass)}\`, for ${name}.`,
          tone: 'flow',
        };
      return { label: 'Request', text: `The JVM asks ${who} for ${name}.`, tone: 'flow' };
    }
    case 'check-loaded':
      return step.hit
        ? {
            label: 'findLoadedClass: found',
            text: `${Capital(who)} already has ${name}: \`findLoadedClass\` returns \`${shortId(step.classId!)}\`. No further search.`,
            tone: 'ok',
          }
        : {
            label: 'findLoadedClass: not yet',
            text: `${Capital(who)} has no record of ${name} yet: \`findLoadedClass\` returns null.`,
            tone: 'neutral',
          };
    case 'module-lookup':
      return step.module
        ? {
            label: 'Module lookup',
            text: `Package \`${packageOf(step.name)}\` belongs to module \`${step.module}\`, defined to ${loaderName(step.moduleLoader!)}.`,
            tone: 'flow',
          }
        : {
            label: 'Module lookup: none',
            text: `Package \`${packageOf(step.name) || '(default)'}\` is in no named module, so ${who} follows the classic order: parent first, then its own class path.`,
            tone: 'neutral',
          };
    case 'delegate': {
      const text =
        step.reason === 'module'
          ? `${Capital(who)} sends the request straight to ${other}, which owns the module${step.other === world.loaders.find((l) => l.id === step.loader)?.parent ? '' : ', even though it is not its parent'}.`
          : step.reason === 'java-prefix'
            ? `A \`java.*\` name: ${who} never defines these itself and asks its parent, ${other}.`
            : step.reason === 'child-miss'
              ? `Not in its own folder, so ${who} now asks its parent, ${other}.`
              : `${Capital(who)} asks its parent, ${other}, first.`;
      return { label: `Delegate to ${shortLoader(step.other!)}`, text, tone: 'flow' };
    }
    case 'search': {
      const source = world.sources.find((s) => s.id === step.source);
      const where = source ? source.label.replace(/ \(.*\)$/, '').toLowerCase() : 'its sources';
      return step.found
        ? {
            label: `Search: found`,
            text: `${Capital(who)} finds ${name} in the ${where}${source ? ` (\`${sourcePath(source.label)}\`)` : ''} and reads its bytes.`,
            tone: 'ok',
          }
        : {
            label: 'Search: not found',
            text: `${Capital(who)} searches the ${where} and finds no ${name}.`,
            tone: 'miss',
          };
    }
    case 'define':
      return {
        label: 'Define',
        text: `${Capital(who)} defines the class: a new run-time class \`${shortId(step.classId!)}\`, identified by its name and its defining loader.`,
        tone: 'ok',
      };
    case 'return':
      return {
        label: `Return to ${shortLoader(step.other!)}`,
        text: `${Capital(who)} hands \`${shortId(step.classId!)}\` back to ${other}.`,
        tone: 'ok',
      };
    case 'not-found':
      return {
        label: `Nothing for ${shortLoader(step.other!)}`,
        text: `${Capital(who)} has nothing; the request goes back to ${other}.`,
        tone: 'miss',
      };
    case 'record':
      return {
        label: 'Record initiating loader',
        text: `The JVM records ${who} as an initiating loader of \`${shortId(step.classId!)}\`. Loaders that only passed the request on record nothing.`,
        tone: 'ok',
      };
    case 'constraint':
      return step.satisfied
        ? {
            label: 'Loading constraint',
            text: `Constraint recorded: ${name} must mean the same class to ${who} and to ${other}.`,
            tone: 'neutral',
          }
        : {
            label: 'Constraint violated',
            text: `${name} means one class to ${who} and another to ${other}: the loading constraint fails.`,
            tone: 'warn',
          };
    case 'outcome':
      return outcomeNarration(result.outcome);
  }
}

/** `bootstrap`, `platform`, `application`, `parent-first`, `child-first`. */
export const shortLoader = (id: string) =>
  loaderName(id)
    .replace(/^the /, '')
    .replace(/ loader$/, '');

const sourcePath = (label: string) => label.match(/\(([^)]+)\)/)?.[1] ?? label;

export function outcomeNarration(outcome: Outcome): Narration {
  switch (outcome.kind) {
    case 'loaded':
      return {
        label: 'Result',
        text: `Done: \`${shortId(outcome.classId)}\`, defined by ${loaderName(outcome.definingLoader)}${outcome.alreadyLoaded ? ', which had defined it before this request' : ''}.`,
        tone: 'ok',
      };
    case 'not-found':
      return {
        label: 'ClassNotFoundException',
        text: `No loader has \`${outcome.name}\`. \`loadClass\` throws \`ClassNotFoundException\`; when the JVM was resolving a reference in your code, it reports \`NoClassDefFoundError\` with that exception as the cause.`,
        tone: 'warn',
      };
    case 'constraint-violation':
      return {
        label: 'LinkageError',
        text: `The JVM throws \`LinkageError: loader constraint violation\`: \`${shortName(outcome.name)}\` would mean \`${shortId(outcome.classes[0])}\` and \`${shortId(outcome.classes[1])}\` at once.`,
        tone: 'warn',
      };
  }
}
