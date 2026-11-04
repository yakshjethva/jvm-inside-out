import { AlertTriangle, ChevronDown, Wrench } from 'lucide-react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { LevelText } from '@/components/learning/LevelText';
import { SourceList } from '@/components/learning/SourceReference';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  COLLECTORS,
  MEMORY_AREAS,
  MEMORY_ERRORS,
  WORKBENCH,
  type CollectorId,
} from '@/content/labs/memory';
import { usePreferences } from '@/hooks/useLearningState';
import { cn } from '@/lib/cn';
import { ExhibitFrame } from '@/modules/lesson/ExhibitFrame';
import { CodeText } from '@/modules/lesson/CodeText';
import { useMemoryLabState } from './useMemoryLabState';

/** Native Memory Tracking, from the real run in memoryEvidence.ts (KB). */
const NMT: { category: string; reserved: number; committed: number }[] = [
  { category: 'Java Heap', reserved: 262144, committed: 262144 },
  { category: 'GC', reserved: 46390, committed: 46390 },
  { category: 'Shared class space', reserved: 16384, committed: 13880 },
  { category: 'Other (direct buffers)', reserved: 8192, committed: 8192 },
  { category: 'Code', reserved: 247775, committed: 7631 },
  { category: 'Arena Chunk', reserved: 1790, committed: 1790 },
  { category: 'Internal', reserved: 1245, committed: 1245 },
  { category: 'Symbol', reserved: 1134, committed: 1134 },
  { category: 'Thread (20 threads)', reserved: 20545, committed: 1061 },
  { category: 'Class (Metaspace)', reserved: 1048645, committed: 197 },
];
const TOTAL_COMMITTED = 344462;

const kb = (n: number) =>
  n >= 10240 ? `${(n / 1024).toFixed(n >= 102400 ? 0 : 1)} MB` : `${n} KB`;

/** The heap of each collector, drawn from its real GC.heap_info output with -Xms64m -Xmx64m. */
function HeapDrawing({ id }: { id: CollectorId }) {
  if (id === 'serial' || id === 'parallel') {
    const parts =
      id === 'serial'
        ? [
            { label: 'eden', kb: 17472, young: true },
            { label: 'from', kb: 2176, young: true },
            { label: 'to', kb: 2176, young: true },
            { label: 'Tenured (old)', kb: 43712, young: false },
          ]
        : [
            { label: 'ParOldGen (old)', kb: 44032, young: false },
            { label: 'eden', kb: 16384, young: true },
            { label: 'to', kb: 2560, young: true },
            { label: 'from', kb: 2560, young: true },
          ];
    const total = parts.reduce((n, p) => n + p.kb, 0);
    return (
      <div>
        <div
          className="flex h-16 w-full overflow-hidden rounded-md border border-ink-500"
          aria-hidden
        >
          {parts.map((part) => (
            <span
              key={part.label}
              style={{ width: `${(part.kb / total) * 100}%` }}
              className={cn(
                'flex min-w-0 items-center justify-center border-r border-ink-950 text-[12px] last:border-r-0',
                part.young ? 'bg-ok-900/70 text-ok-300' : 'bg-rt-900 text-rt-200',
              )}
            >
              <span className="truncate px-1">{part.label}</span>
            </span>
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-fg-muted">
          {parts.map((part) => (
            <li key={part.label}>
              <span className="font-medium text-fg">{part.label}</span> {kb(part.kb)} ·{' '}
              {part.young ? 'young generation' : 'old generation'}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[12.5px] text-fg-subtle">
          Two contiguous generations, in address order
          {id === 'parallel' ? ': here the old generation comes first' : ''}.
        </p>
      </div>
    );
  }
  if (id === 'g1' || id === 'shenandoah') {
    const count = id === 'g1' ? 64 : 256;
    return (
      <div>
        <div
          aria-hidden
          className={cn('grid gap-[2px]', id === 'g1' ? 'grid-cols-16' : 'grid-cols-32')}
          style={{ gridTemplateColumns: `repeat(${id === 'g1' ? 16 : 32}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              className={cn(
                'aspect-square rounded-[2px] border',
                id === 'g1' && i < 4 ? 'border-ok-400 bg-ok-900/80' : 'border-ink-600 bg-ink-850',
              )}
            />
          ))}
        </div>
        <p className="mt-2 text-[12.5px] text-fg-muted">
          {id === 'g1'
            ? '64 regions of 1 MB. At this moment 4 are young (eden, green) and none is a survivor; GC.heap_info does not say which of the others hold old or humongous objects and which are free. Roles change at every collection.'
            : '256 regions of 256 KB, one generation (the default mode), 4096 KB used. The output does not say which regions are in use.'}
        </p>
      </div>
    );
  }
  return (
    <div>
      <div
        className="flex h-16 w-full items-center justify-center rounded-md border border-dashed border-ink-500 bg-ink-850 text-[12.5px] text-fg-muted"
        aria-hidden
      >
        64 MB capacity, 6 MB used · pages, no fixed young or old ranges
      </div>
      <p className="mt-2 text-[12.5px] text-fg-muted">
        ZGC is generational, but young and old objects live in pages allocated as needed, not in
        fixed address ranges; GC.heap_info reports only used and capacity.
      </p>
    </div>
  );
}

/**
 * Heap and native memory: the heap as each collector organizes it, the memory
 * a JVM uses outside the heap, the six memory errors and a workbench of real
 * diagnostic commands.
 */
export function HeapNativeMemory() {
  const state = useMemoryLabState();
  const { preferences } = usePreferences();
  const collector = COLLECTORS.find((c) => c.id === state.collector)!;
  const areaTitle = (id: string) => MEMORY_AREAS.find((a) => a.id === id)?.title ?? id;

  return (
    <div className="space-y-8">
      <ExhibitFrame
        title="The heap, collector by collector (-Xms64m -Xmx64m)"
        controls={
          <SegmentedControl
            label="Collector"
            size="sm"
            value={collector.id}
            onChange={(id: CollectorId) => state.setCollector(id)}
            segments={COLLECTORS.map((c) => ({ value: c.id, label: c.title, description: c.flag }))}
          />
        }
        caption={
          <>
            <span className="font-medium text-fg">{collector.title}.</span>{' '}
            <span className="text-fg-muted">{collector.generational}.</span>
          </>
        }
        note="Schematic drawings of real GC.heap_info output from OpenJDK 25.0.4 with a 64 MB heap; sizes and region counts change with the heap size and the machine. Generations are collector-dependent: never assume one young and one old area at fixed addresses."
      >
        <p className="mb-3 font-mono text-[12.5px] text-fg-subtle" translate="no">
          {collector.flag}
        </p>
        <HeapDrawing id={collector.id} />
        <div className="mt-4">
          <LevelText
            content={collector.text}
            level={preferences.level}
            className="prose-ij max-w-[46rem]"
          />
        </div>
        <div className="mt-4 grid gap-3 @[760px]:grid-cols-2">
          {collector.evidence.map((listing) => (
            <CodeBlock
              key={listing.id}
              code={listing.code}
              language="text"
              title={listing.title}
              verifiedWith={listing.verifiedWith}
            />
          ))}
        </div>
        <div className="mt-4">
          <SourceList citations={collector.references} />
        </div>
      </ExhibitFrame>

      <section aria-labelledby="outside-heap">
        <h4 id="outside-heap" className="text-[18px] font-semibold text-fg">
          Outside the heap: where the rest of the memory goes
        </h4>
        <p className="mt-1 max-w-[46rem] text-[15px] text-fg-muted">
          One real JVM with a 256 MB heap, 20 threads and an 8 MB direct buffer, measured with
          Native Memory Tracking. The heap is the largest committed part, but far from all of it;
          reserved address space is much larger than what is committed.
        </p>
        <div
          role="region"
          aria-label="Native Memory Tracking summary"
          // Focusable so a keyboard can scroll the table on a narrow screen.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="mt-3 overflow-x-auto rounded-lg border border-ink-600"
        >
          <table className="w-full min-w-[34rem] text-left text-[13px]">
            <caption className="sr-only">
              Native Memory Tracking summary, committed and reserved, in this run
            </caption>
            <thead className="bg-ink-850 text-[12px] text-fg-subtle">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-normal">
                  Category
                </th>
                <th scope="col" className="px-3 py-1.5 font-normal">
                  Committed
                </th>
                <th scope="col" className="w-2/5 px-3 py-1.5 font-normal">
                  Share of all committed memory
                </th>
                <th scope="col" className="px-3 py-1.5 font-normal">
                  Reserved
                </th>
              </tr>
            </thead>
            <tbody>
              {NMT.map((row) => (
                <tr key={row.category} className="border-t border-ink-700">
                  <th scope="row" className="px-3 py-1.5 font-normal text-fg">
                    {row.category}
                  </th>
                  <td className="px-3 py-1.5 font-mono tabular text-fg-muted">
                    {kb(row.committed)}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="block h-2 rounded-full bg-ink-750">
                      <span
                        className="block h-2 rounded-full bg-exec-500"
                        style={{
                          width: `${Math.max(0.6, (row.committed / TOTAL_COMMITTED) * 100)}%`,
                        }}
                      />
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono tabular text-fg-subtle">
                    {kb(row.reserved)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[12.5px] text-fg-subtle">
          Total committed {kb(TOTAL_COMMITTED)}, reserved 1.6 GB. Values from one run on OpenJDK
          25.0.4; smaller categories are left out. The workbench below shows the command and its
          full output.
        </p>
      </section>

      <section aria-labelledby="memory-errors">
        <h4
          id="memory-errors"
          className="flex items-center gap-2 text-[18px] font-semibold text-fg"
        >
          <AlertTriangle size={18} aria-hidden className="text-warn-300" /> Six ways to run out, and
          where each comes from
        </h4>
        <ul className="mt-3 grid gap-3 lg:grid-cols-2">
          {MEMORY_ERRORS.map((error) => (
            <li
              key={error.id}
              className="rounded-xl border border-warn-500/40 bg-warn-900/10 p-3.5"
            >
              <p className="font-mono text-[13px] break-words text-warn-300" translate="no">
                {error.message}
              </p>
              <dl className="mt-2 grid gap-1 text-[13.5px]">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-fg-subtle">Area</dt>
                  <dd className="text-fg">{areaTitle(error.area)}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-fg-subtle">Cause</dt>
                  <dd className="text-fg-muted">{error.cause}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-fg-subtle">Limit</dt>
                  <dd className="font-mono text-[12.5px] text-fg-muted">{error.limit}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-fg-subtle">Diagnose</dt>
                  <dd className="text-fg-muted">
                    <CodeText text={error.diagnose} />
                  </dd>
                </div>
              </dl>
              <details className="group mt-2">
                <summary className="flex min-h-6 cursor-pointer list-none items-center gap-1 text-[13px] text-exec-300 [&::-webkit-details-marker]:hidden">
                  <ChevronDown
                    size={14}
                    aria-hidden
                    className="transition-transform group-open:rotate-180"
                  />{' '}
                  The real output
                </summary>
                <div className="mt-2">
                  <CodeBlock
                    code={error.listing.code}
                    language="text"
                    title={error.listing.title}
                    verifiedWith={error.listing.verifiedWith}
                  />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="workbench">
        <h4 id="workbench" className="flex items-center gap-2 text-[18px] font-semibold text-fg">
          <Wrench size={18} aria-hidden className="text-exec-300" /> Diagnostic workbench
        </h4>
        <p className="mt-1 max-w-[46rem] text-[15px] text-fg-muted">
          The commands an engineer reaches for, each with its real output on JDK 25.0.4. Replace{' '}
          <code>{'<pid>'}</code> with the process id that <code>jcmd</code> lists.
        </p>
        <ul className="mt-3 space-y-2">
          {WORKBENCH.map((tool) => (
            <li key={tool.id}>
              <details className="group rounded-xl border border-ink-600 bg-ink-900/40">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-xl px-4 py-3 hover:bg-ink-850 [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="block text-[15.5px] font-medium text-fg">{tool.title}</span>
                    <span className="block text-[13.5px] text-fg-muted">
                      <CodeText text={tool.when} />
                    </span>
                  </span>
                  <ChevronDown
                    size={17}
                    aria-hidden
                    className="mt-1 shrink-0 text-fg-subtle transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="space-y-3 border-t border-ink-700 px-4 py-3">
                  <CodeBlock
                    code={tool.listing.code}
                    language="text"
                    title={tool.listing.title}
                    verifiedWith={tool.listing.verifiedWith}
                  />
                  <SourceList citations={tool.references} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
