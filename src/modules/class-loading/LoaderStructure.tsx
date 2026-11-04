import { Badge } from '@/components/ui/Badge';
import {
  LOADER_PROFILES,
  LOADER_WORLD,
  SOURCE_PROFILES,
  type LoaderId,
} from '@/content/labs/classLoading';
import { cn } from '@/lib/cn';
import type { DelegationStep, LoaderRuntime } from '@/simulators/classLoading';
import { ConduitLayer, type Conduit } from './ConduitLayer';
import { shortId, shortName } from './narration';

const ROWS: { loaders: LoaderId[]; sources: string[] }[] = [
  { loaders: ['bootstrap'], sources: ['runtime-image', 'cds'] },
  { loaders: ['platform'], sources: [] },
  { loaders: ['app'], sources: ['class-path'] },
  { loaders: ['parent-first', 'child-first'], sources: ['plugin-dir'] },
];

const PARENT_LINKS: Conduit[] = LOADER_WORLD.loaders
  .filter((l) => l.parent)
  .map((l) => ({
    from: `loader-${l.id}`,
    to: `loader-${l.parent}`,
    tone: 'parent',
    key: 'parent',
  }));

/** Distinct marks for each kind of loader, so the structure is not a stack of identical boxes. */
function LoaderGlyph({ id }: { id: LoaderId }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 } as const;
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className="shrink-0 text-rt-300">
      {id === 'bootstrap' && (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <circle cx="12" cy="12" r="3.6" fill="currentColor" />
        </>
      )}
      {id === 'platform' && (
        <>
          <polygon points="12,2.5 20.5,7.2 20.5,16.8 12,21.5 3.5,16.8 3.5,7.2" {...common} />
          <polygon points="12,7.5 16.4,10 16.4,14 12,16.5 7.6,14 7.6,10" {...common} />
        </>
      )}
      {id === 'app' && (
        <>
          <polygon points="12,2.5 20.5,7.2 20.5,16.8 12,21.5 3.5,16.8 3.5,7.2" {...common} />
          <circle cx="12" cy="12" r="2.6" fill="currentColor" />
        </>
      )}
      {(id === 'parent-first' || id === 'child-first') && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" {...common} />
          <path
            d={
              id === 'parent-first'
                ? 'M12 16V8m-3.5 3.5L12 8l3.5 3.5'
                : 'M12 8v8m-3.5-3.5L12 16l3.5-3.5'
            }
            {...common}
          />
        </>
      )}
    </svg>
  );
}

const SOURCE_EXTRA: Record<string, { title: string; provenance: 'hotspot'; text: string }> = {
  cds: {
    title: 'CDS archive',
    provenance: 'hotspot',
    text: 'HotSpot maps most core classes from its class data sharing archive: the log says `source: shared objects file`.',
  },
};

function SourcePlate({ id, state }: { id: string; state: 'found' | 'missed' | null }) {
  const profile = SOURCE_PROFILES[id] ?? SOURCE_EXTRA[id];
  if (!profile) return null;
  const label = LOADER_WORLD.sources.find((s) => s.id === id)?.label;
  return (
    <div
      className={cn(
        'rounded-md border-2 px-3 py-2 text-[12.5px] transition-colors',
        profile.provenance === 'hotspot' ? 'border-dashed' : 'border-dotted',
        state === 'found'
          ? 'border-ok-400 bg-ok-900/40'
          : state === 'missed'
            ? 'border-warn-400 bg-warn-900/30'
            : 'border-plat-500/70 bg-ink-900/60',
      )}
    >
      <p className="flex flex-wrap items-center gap-1.5 font-medium text-fg">
        {profile.title}
        {profile.provenance === 'hotspot' && (
          <Badge tone="neutral" dashed className="text-[11px]">
            HS
          </Badge>
        )}
        {state && (
          <span className={state === 'found' ? 'text-ok-300' : 'text-warn-300'}>
            · {state === 'found' ? 'found here' : 'not here'}
          </span>
        )}
      </p>
      {label && (
        <p className="font-mono text-[11.5px] text-fg-subtle" translate="no">
          {label.match(/\(([^)]+)\)/)?.[1] ?? label}
        </p>
      )}
    </div>
  );
}

/**
 * The class loaders of one JVM, drawn as an instrument: each loader a plate
 * with its own mark, its parent link pointing up, the sources it reads, and
 * the classes it has defined or been recorded for. During a delegation step
 * the acting loader lights up, the loaders waiting for an answer are marked,
 * and the hop being made draws itself between them.
 */
export function LoaderStructure({
  runtime,
  selected,
  onSelect,
  step,
}: {
  runtime: LoaderRuntime;
  selected: LoaderId | null;
  onSelect: (id: LoaderId) => void;
  step?: DelegationStep | null;
}) {
  const hop: Conduit[] =
    step &&
    step.other &&
    (step.kind === 'delegate' || step.kind === 'return' || step.kind === 'not-found')
      ? [
          {
            from: `loader-${step.loader}`,
            to: `loader-${step.other}`,
            tone: step.kind === 'delegate' ? 'flow' : step.kind === 'return' ? 'ok' : 'miss',
            key: step.id,
          },
        ]
      : [];

  const sourceState = (id: string): 'found' | 'missed' | null => {
    if (step?.kind === 'search' && step.source === id) return step.found ? 'found' : 'missed';
    if (step?.kind === 'define' && step.source === id) return 'found';
    return null;
  };

  const plate = (id: LoaderId) => {
    const profile = LOADER_PROFILES[id];
    const defined = runtime.classes.filter((c) => c.definingLoader === id);
    const recorded = Object.entries(runtime.initiated[id] ?? {})
      .map(([, classId]) => runtime.classes.find((c) => c.id === classId)!)
      .filter((c) => c && c.definingLoader !== id);
    const acting = step?.loader === id && step.kind !== 'outcome';
    const waiting = !acting && Boolean(step?.path.includes(id));
    const state = acting ? 'acting' : waiting ? 'path' : selected === id ? 'selected' : undefined;
    const fresh = step?.kind === 'define' || step?.kind === 'record' ? step.classId : undefined;
    return (
      <div
        key={id}
        data-plate
        data-anchor={`loader-${id}`}
        data-state={state}
        className="lab-plate min-w-0"
      >
        <div className="lab-plate-fill px-3.5 pt-2.5 pb-3">
          <button
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={selected === id}
            className="flex w-full items-start gap-2.5 rounded-sm text-left"
          >
            <LoaderGlyph id={id} />
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-[17px] leading-snug text-fg">
                {profile.plateTitle}
              </span>
              <span className="mt-0.5 block text-[12px] text-rt-200">
                {profile.kindLabel}
                {selected === id && <span className="text-fg"> · Selected</span>}
              </span>
              <span
                className="mt-0.5 block font-mono text-[11.5px] text-fg-subtle [overflow-wrap:anywhere]"
                translate="no"
              >
                {profile.javaView}
              </span>
            </span>
          </button>
          {(acting || waiting) && (
            <p
              className={cn(
                'mt-1.5 text-[12px] font-medium',
                acting ? 'text-exec-200' : 'text-exec-300',
              )}
            >
              {acting ? '● Working on the request' : '○ Waiting for an answer'}
            </p>
          )}
          <p className="mt-1.5 text-[12.5px] text-fg-muted">{profile.policyLabel}</p>
          <div className="mt-2">
            <p className="text-[11.5px] text-fg-subtle">
              Defined {defined.length === 1 ? '1 class' : `${defined.length} classes`}
            </p>
            {defined.length > 0 && (
              <ul
                className="mt-1 flex flex-wrap gap-1"
                aria-label={`Classes defined by the ${profile.title.toLowerCase()}`}
              >
                {defined.map((c) => (
                  <li
                    key={c.id}
                    title={c.id}
                    className={cn(
                      'rounded-[3px] border px-1.5 py-px font-mono text-[11.5px]',
                      c.id === fresh
                        ? 'border-ok-400 bg-ok-900/50 text-ok-300'
                        : 'border-rt-500/50 bg-rt-900/40 text-rt-200',
                    )}
                    translate="no"
                  >
                    {shortName(c.name)}
                  </li>
                ))}
              </ul>
            )}
            {recorded.length > 0 && (
              <>
                <p className="mt-1.5 text-[11.5px] text-fg-subtle">
                  Also recorded as initiating loader of
                </p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {recorded.map((c) => (
                    <li
                      key={c.id}
                      title={c.id}
                      className={cn(
                        'rounded-[3px] border border-dashed px-1.5 py-px font-mono text-[11.5px]',
                        c.id === fresh
                          ? 'border-ok-400 text-ok-300'
                          : 'border-ink-500 text-fg-muted',
                      )}
                      translate="no"
                    >
                      {shortId(c.id)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const lookup = step?.kind === 'module-lookup' ? step.module : undefined;

  return (
    <div className="@container">
      <div className="relative grid gap-6 @[1080px]:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="@container/tower grid min-w-0 gap-8">
          {ROWS.map((row) => (
            <div
              key={row.loaders.join('-')}
              className="grid min-w-0 items-start gap-x-6 gap-y-3 @[560px]/tower:grid-cols-[minmax(0,1fr)_12rem]"
            >
              <div
                className={cn(
                  'grid min-w-0 gap-4',
                  row.loaders.length > 1 && '@[720px]/tower:grid-cols-2',
                )}
              >
                {row.loaders.map(plate)}
              </div>
              {row.sources.length > 0 && (
                <div
                  role="group"
                  className="grid gap-2"
                  aria-label="Where these loaders read classes"
                >
                  {row.sources.map((source) => (
                    <SourcePlate key={source} id={source} state={sourceState(source)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <aside aria-label="Module routing and key" className="min-w-0 space-y-4 text-[12.5px]">
          <div>
            <table className="w-full border-collapse text-left">
              <caption className="pb-1.5 text-left text-[12.5px] font-medium text-fg-muted">
                Boot layer: which loader owns a package
              </caption>
              <thead>
                <tr className="text-[11.5px] text-fg-subtle">
                  <th scope="col" className="py-1 pr-2 font-normal">
                    Package
                  </th>
                  <th scope="col" className="py-1 pr-2 font-normal">
                    Module
                  </th>
                  <th scope="col" className="py-1 font-normal">
                    Loader
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono text-[11.5px]" translate="no">
                {LOADER_WORLD.modules.map((module) => {
                  const active = lookup === module.name;
                  return (
                    <tr
                      key={module.name}
                      className={cn(
                        'border-t border-ink-700',
                        active ? 'bg-exec-900/70 text-exec-200' : 'text-fg-muted',
                      )}
                    >
                      <td className="py-1 pr-2 [overflow-wrap:anywhere]">
                        {module.packages.join(', ')}
                      </td>
                      <td className="py-1 pr-2 whitespace-nowrap">{module.name}</td>
                      <td className="py-1 whitespace-nowrap">
                        {module.loader}
                        {active && <span className="sr-only"> (being looked up now)</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-1.5 text-fg-subtle">
              Packages in no named module (the class path) are not in this table: the built-in
              loaders ask their parent first, then the class path.
            </p>
          </div>
          <dl className="space-y-1.5 text-fg-muted">
            <div className="flex items-center gap-2">
              <dt className="flex w-9 shrink-0 justify-center" aria-hidden>
                <svg width="30" height="8">
                  <path d="M1 4h26" stroke="var(--color-ink-500)" strokeWidth="1.4" />
                  <path d="M24 1l4 3-4 3z" fill="var(--color-ink-500)" />
                </svg>
              </dt>
              <dd>Parent link, pointing to the parent</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="flex w-9 shrink-0 justify-center" aria-hidden>
                <svg width="30" height="8">
                  <path d="M1 4h26" stroke="var(--color-exec-400)" strokeWidth="2.4" />
                </svg>
              </dt>
              <dd>A request travelling (blue)</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="flex w-9 shrink-0 justify-center" aria-hidden>
                <svg width="30" height="8">
                  <path d="M1 4h26" stroke="var(--color-ok-400)" strokeWidth="2.4" />
                </svg>
              </dt>
              <dd>A class handed back (green)</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="flex w-9 shrink-0 justify-center" aria-hidden>
                <svg width="30" height="8">
                  <path
                    d="M1 4h26"
                    stroke="var(--color-warn-400)"
                    strokeWidth="2.4"
                    strokeDasharray="4 3"
                  />
                </svg>
              </dt>
              <dd>Nothing found, back to the caller (orange, dashed)</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="flex w-9 shrink-0 justify-center" aria-hidden>
                <span className="h-4 w-7 rounded-sm border-2 border-dotted border-plat-500" />
              </dt>
              <dd>Files outside the JVM (dotted); dashed with HS: HotSpot</dd>
            </div>
          </dl>
        </aside>
        <ConduitLayer conduits={[...PARENT_LINKS, ...hop]} version={step?.id ?? 'rest'} />
      </div>
    </div>
  );
}
