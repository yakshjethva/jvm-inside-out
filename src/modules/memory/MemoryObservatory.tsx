import { Box, Compass, Map as MapIcon, X } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { CodeBlock } from '@/components/code/CodeBlock';
import { LevelText } from '@/components/learning/LevelText';
import { SourceList } from '@/components/learning/SourceReference';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { getComponentDoc } from '@/content/jvm';
import { MEMORY_AREAS, type MemoryArea, type MemoryAreaId } from '@/content/labs/memory';
import { usePreferences } from '@/hooks/useLearningState';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';
import { Loading3D, Notice3D, Viewer3DBoundary } from '@/modules/anatomy-3d/fallback/Fallback3D';
import { ConduitLayer, type Conduit } from '@/modules/class-loading/ConduitLayer';
import { ExhibitFrame } from '@/modules/lesson/ExhibitFrame';
import { useMemoryLabState } from './useMemoryLabState';

// Three.js and the 3D memory model load only when a learner chooses the 3D model.
const MemoryObservatory3D = lazy(() => import('@/modules/lab-3d/MemoryObservatory3D'));

const area = (id: MemoryAreaId) => MEMORY_AREAS.find((a) => a.id === id)!;
const LAYER_LABEL = {
  spec: 'JVM Specification',
  hotspot: 'HotSpot (JDK 25)',
  platform: 'Outside the JVM’s own structures',
};
const SCOPE_LABEL = {
  shared: 'shared by all threads',
  'per-thread': 'one per thread',
  process: 'one per process',
};

function AreaButton({
  item,
  selected,
  related,
  onSelect,
  className,
}: {
  item: MemoryArea;
  selected: boolean;
  related: boolean;
  onSelect: (id: MemoryAreaId) => void;
  className?: string;
}) {
  const border =
    item.layer === 'spec'
      ? 'border-solid'
      : item.layer === 'hotspot'
        ? 'border-dashed'
        : 'border-dotted';
  return (
    <div
      data-plate
      data-anchor={`area-${item.id}`}
      className={cn(
        'min-w-0 rounded-lg border-2 transition-colors',
        border,
        selected
          ? 'border-exec-400 bg-exec-900/50'
          : related
            ? 'border-exec-500/70 bg-exec-900/25'
            : item.layer === 'spec'
              ? 'border-rt-500/60 bg-rt-900/25'
              : item.layer === 'hotspot'
                ? 'border-ink-400 bg-ink-850'
                : 'border-plat-500 bg-ink-900',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-pressed={selected}
        className="block h-full w-full rounded-md px-3 py-2 text-left"
      >
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-serif text-[16px] leading-snug text-fg">{item.title}</span>
          {item.layer === 'hotspot' && (
            <Badge dashed className="text-[11px]">
              HS
            </Badge>
          )}
          {selected && <span className="text-[12px] text-exec-200">Selected</span>}
          {!selected && related && <span className="text-[12px] text-exec-300">Related</span>}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-fg-muted">{item.summary}</span>
        <span className="mt-0.5 block text-[11.5px] text-fg-subtle">{SCOPE_LABEL[item.scope]}</span>
      </button>
    </div>
  );
}

function AreaInspector({
  id,
  onClose,
  onSelect,
}: {
  id: MemoryAreaId;
  onClose: () => void;
  onSelect: (id: MemoryAreaId) => void;
}) {
  const { preferences } = usePreferences();
  const item = area(id);
  const reverse = MEMORY_AREAS.filter((other) => other.mapsTo.includes(id));
  const links = [...new Set([...item.mapsTo, ...reverse.map((r) => r.id)])];
  return (
    <section
      aria-labelledby={`area-${id}-title`}
      className="rounded-xl border border-ink-600 bg-ink-900/60 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] text-fg-subtle">
            {LAYER_LABEL[item.layer]} · {SCOPE_LABEL[item.scope]}
            {item.nmt && <> · NMT: {item.nmt}</>}
          </p>
          <h3 id={`area-${id}-title`} className="font-serif text-[24px] leading-tight text-fg">
            {item.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the area details"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ink-600 text-fg-muted hover:text-fg"
        >
          <X size={15} aria-hidden />
        </button>
      </div>
      <div className="mt-3">
        <LevelText content={item.role} level={preferences.level} className="prose-ij" />
      </div>
      {links.length > 0 && (
        <div className="mt-4">
          <p className="text-[12.5px] text-fg-subtle">
            {item.layer === 'spec'
              ? 'Implemented in HotSpot by'
              : 'Implements, from the specification'}
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {links.map((other) => (
              <li key={other}>
                <button
                  type="button"
                  onClick={() => onSelect(other)}
                  className="min-h-6 text-[14px] text-exec-300 underline underline-offset-2 hover:text-exec-200"
                >
                  {area(other).title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {links.length === 0 && (
        <p className="mt-4 text-[13.5px] text-fg-muted">
          No specification area corresponds to it: the specification does not describe this part of
          memory.
        </p>
      )}
      <div className="mt-5 space-y-3">
        <h4 className="text-[14px] font-medium text-fg-muted">Evidence from a real JVM</h4>
        {item.evidence.map((listing) => (
          <CodeBlock
            key={listing.id}
            code={listing.code}
            language="text"
            title={listing.title}
            verifiedWith={listing.verifiedWith}
          />
        ))}
      </div>
      <div className="mt-5">
        <h4 className="mb-2 text-[14px] font-medium text-fg-muted">Sources</h4>
        <SourceList citations={item.references} />
      </div>
      {item.component && (
        <Link
          to={`/anatomy?c=${item.component}`}
          className="mt-4 inline-flex min-h-6 items-center gap-2 text-[14.5px] text-exec-300 underline underline-offset-4 hover:text-exec-200"
        >
          <Compass size={15} aria-hidden />
          {getComponentDoc(item.component).name} on the JVM map
        </Link>
      )}
    </section>
  );
}

/**
 * The memory observatory: the specification's run-time data areas above, the
 * HotSpot structures that implement them below, and lines between the two for
 * the selected area. The 3D model shows the same two layers.
 */
export function MemoryObservatory() {
  const state = useMemoryLabState();
  const reducedMotion = useReducedMotion();
  const selected = state.area;
  const related = new Set<MemoryAreaId>(
    selected
      ? [
          ...area(selected).mapsTo,
          ...MEMORY_AREAS.filter((a) => a.mapsTo.includes(selected)).map((a) => a.id),
        ]
      : [],
  );
  const toggle = (id: MemoryAreaId) => state.selectArea(selected === id ? null : id);
  const button = (id: MemoryAreaId, className?: string) => (
    <AreaButton
      item={area(id)}
      selected={selected === id}
      related={related.has(id)}
      onSelect={toggle}
      className={className}
    />
  );

  const conduits: Conduit[] = selected
    ? [...related].map((other) => {
        const spec = area(selected).layer === 'spec' ? selected : other;
        const impl = spec === selected ? other : selected;
        return {
          from: `area-${impl}`,
          to: `area-${spec}`,
          tone: 'flow',
          key: `${selected}-${other}`,
        };
      })
    : [];

  return (
    <div className="space-y-5">
      <ExhibitFrame
        title="Memory observatory: specification areas and HotSpot structures"
        controls={
          <SegmentedControl
            label="Viewer"
            size="sm"
            value={state.viewer}
            onChange={state.setViewer}
            segments={[
              {
                value: '2d',
                label: (
                  <>
                    <MapIcon size={14} aria-hidden /> Layers
                  </>
                ),
              },
              {
                value: '3d',
                label: (
                  <>
                    <Box size={14} aria-hidden /> 3D model
                  </>
                ),
              },
            ]}
          />
        }
        caption={
          selected ? (
            <span className="text-fg-muted">
              {area(selected).title} selected:{' '}
              {related.size === 0
                ? 'no area of the other layer corresponds to it.'
                : `the lines lead to the ${related.size === 1 ? 'area' : `${related.size} areas`} of the other layer that correspond to it.`}{' '}
              Its details are below.
            </span>
          ) : (
            <span className="text-fg-muted">
              Above, what the specification defines; below, what HotSpot actually allocates. Select
              an area to see what corresponds to it.
            </span>
          )
        }
        note="Not to scale and not a memory map. Solid outlines: JVM Specification areas; dashed (HS): OpenJDK HotSpot JDK 25 structures; dotted: memory outside the JVM’s own structures. Per-thread areas are drawn once; every thread has its own set."
      >
        {state.viewer === '3d' ? (
          <div className="h-[min(72vh,620px)] min-h-[420px] overflow-hidden rounded-lg border border-ink-700">
            <Viewer3DBoundary
              fallback={() => (
                <Notice3D
                  title="The 3D model could not start"
                  onUse2D={() => state.setViewer('2d')}
                  use2DLabel="Use the 2D layers"
                >
                  It may not have downloaded (for example while offline before it was ever opened),
                  or this device could not create a 3D view. The layers show the same areas.
                </Notice3D>
              )}
            >
              <Suspense fallback={<Loading3D />}>
                <MemoryObservatory3D
                  selected={selected}
                  onSelect={(id) => state.selectArea(id as MemoryAreaId | null)}
                  reducedMotion={reducedMotion}
                  onUse2D={() => state.setViewer('2d')}
                />
              </Suspense>
            </Viewer3DBoundary>
          </div>
        ) : (
          <div className="@container">
            <div className="relative space-y-10">
              <section aria-label="JVM Specification: run-time data areas (Java SE 25)">
                <p className="mb-2 text-[12.5px] font-medium text-rt-200">
                  JVM Specification · run-time data areas (Java SE 25)
                </p>
                <div className="grid gap-3 @[720px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <div className="grid gap-3">
                    {button('heap')}
                    <div className="grid gap-3 @[480px]:grid-cols-2">
                      {button('method-area')}
                      {button('runtime-constant-pool')}
                    </div>
                  </div>
                  <div className="rounded-lg border border-dashed border-ink-600 p-2">
                    <p className="mb-1.5 text-[12px] text-fg-subtle">
                      Per thread (one set for every thread)
                    </p>
                    <div className="grid gap-2">
                      {button('pc-register')}
                      {button('jvm-stack')}
                      {button('native-method-stack')}
                    </div>
                  </div>
                </div>
              </section>
              <section aria-label="OpenJDK HotSpot structures (JDK 25)">
                <p className="mb-2 text-[12.5px] font-medium text-fg-muted">
                  OpenJDK HotSpot · what is really allocated (JDK 25)
                </p>
                <div className="grid gap-3 @[720px]:grid-cols-3">
                  {button('java-heap')}
                  {button('metaspace')}
                  {button('class-space')}
                  {button('thread-stacks')}
                  {button('code-cache')}
                  {button('gc-structures')}
                </div>
              </section>
              <section aria-label="Memory outside the JVM’s own structures">
                <p className="mb-2 text-[12.5px] font-medium text-plat-400">
                  Outside the JVM’s own structures
                </p>
                <div className="grid gap-3 @[720px]:grid-cols-3">
                  {button('native-allocations')}
                </div>
              </section>
              <ConduitLayer conduits={conduits} version={selected ?? 'none'} />
            </div>
          </div>
        )}
      </ExhibitFrame>
      {selected && (
        <AreaInspector
          id={selected}
          onClose={() => state.selectArea(null)}
          onSelect={(id) => state.selectArea(id)}
        />
      )}
    </div>
  );
}
