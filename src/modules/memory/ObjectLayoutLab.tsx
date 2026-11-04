import { useState } from 'react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LAYOUT_CONFIGS, LAYOUT_SUBJECTS, type LayoutSegment } from '@/content/labs/memory';
import * as E from '@/content/labs/memoryEvidence';
import { cn } from '@/lib/cn';
import { ExhibitFrame } from '@/modules/lesson/ExhibitFrame';
import { useMemoryLabState } from './useMemoryLabState';

const KIND: Record<LayoutSegment['kind'], { code: string; className: string; words: string }> = {
  mark: { code: 'M', className: 'border-rt-400 bg-rt-900 text-rt-200', words: 'Header: mark word' },
  class: {
    code: 'K',
    className: 'border-rt-500 bg-rt-900/60 text-rt-200',
    words: 'Header: class pointer',
  },
  length: {
    code: 'L',
    className: 'border-rt-500 bg-rt-900/40 text-rt-200',
    words: 'Header: array length',
  },
  field: { code: 'F', className: 'border-exec-400 bg-exec-900/60 text-exec-200', words: 'Field' },
  elements: {
    code: 'E',
    className: 'border-exec-400 bg-exec-900/40 text-exec-200',
    words: 'Array elements',
  },
  gap: {
    code: '·',
    className: 'border-dashed border-ink-500 bg-ink-900 text-fg-subtle',
    words: 'Padding or alignment gap',
  },
};

const EXPLAIN: Record<LayoutSegment['kind'], string> = {
  mark: 'HotSpot’s per-object bookkeeping: the identity hash code (once computed), the GC age, and lock bits. With compact headers the class pointer lives here too.',
  class:
    'A 32-bit compressed pointer to the object’s class metadata (its Klass) in the compressed class space.',
  length: 'Arrays carry their length in the header, as a 32-bit int.',
  field:
    'An instance field. A field of a class type holds a reference (4 bytes with compressed oops, 8 without), never the object.',
  elements:
    'The array’s elements, one after another, starting at the array base offset JOL reports.',
  gap: 'Bytes no field uses: alignment between fields, or padding to make the object a multiple of 8 bytes.',
};

/** 64-bit mark word layouts from markWord.hpp (jdk-25-ga), most significant bit first. */
const MARK_BITS = {
  normal: [
    { bits: 22, label: 'unused' },
    { bits: 31, label: 'hash' },
    { bits: 4, label: 'unused_gap' },
    { bits: 4, label: 'age' },
    { bits: 1, label: 'self-fwd' },
    { bits: 2, label: 'lock' },
  ],
  compact: [
    { bits: 22, label: 'klass' },
    { bits: 31, label: 'hash' },
    { bits: 4, label: 'unused_gap' },
    { bits: 4, label: 'age' },
    { bits: 1, label: 'self-fwd' },
    { bits: 2, label: 'lock' },
  ],
};

const EVIDENCE: Record<string, typeof E.JOL_DEFAULT> = {
  'person:default': E.JOL_DEFAULT,
  'person:compact': E.JOL_COMPACT,
  'person:nocoops': E.JOL_NO_COOPS,
  'mixed:default': E.JOL_MIXED,
};

/**
 * The object layout laboratory: an object's bytes as HotSpot (JDK 25, x64)
 * lays them out in three configurations, measured with JOL and
 * Instrumentation.getObjectSize. Selecting a band explains it; the mark word
 * opens into its bits.
 */
export function ObjectLayoutLab() {
  const state = useMemoryLabState();
  const subject = LAYOUT_SUBJECTS.find((s) => s.id === state.subject)!;
  const config = LAYOUT_CONFIGS.find((c) => c.id === state.config)!;
  const layout = subject.layouts[config.id];
  const [chosen, setChosen] = useState<number | null>(null);
  const segment = chosen !== null ? layout.segments[chosen] : undefined;
  const header = layout.segments
    .filter((s) => s.kind === 'mark' || s.kind === 'class' || s.kind === 'length')
    .reduce((n, s) => n + s.size, 0);
  const lost = layout.segments.filter((s) => s.kind === 'gap').reduce((n, s) => n + s.size, 0);
  const evidence = EVIDENCE[`${subject.id}:${config.id}`];

  return (
    <ExhibitFrame
      title="Object layout laboratory: HotSpot, JDK 25, x64"
      controls={
        <SegmentedControl
          label="Configuration"
          size="sm"
          value={config.id}
          onChange={(id) => {
            state.setConfig(id);
            setChosen(null);
          }}
          segments={LAYOUT_CONFIGS.map((c) => ({
            value: c.id,
            label:
              c.id === 'default'
                ? 'Default'
                : c.id === 'compact'
                  ? 'Compact headers'
                  : 'No compressed oops',
            description: c.flags,
          }))}
        />
      }
      caption={
        <span className="text-fg-muted">
          <span className="font-medium text-fg">
            {subject.title}: {layout.size} bytes
          </span>{' '}
          with {config.title.toLowerCase()} — {header}-byte header, {lost}{' '}
          {lost === 1 ? 'byte' : 'bytes'} of padding.{' '}
          {segment
            ? `${KIND[segment.kind].words} at offset ${segment.offset}, ${segment.size} ${segment.size === 1 ? 'byte' : 'bytes'}: ${EXPLAIN[segment.kind]}`
            : 'Select a band to read what it holds.'}
        </span>
      }
      note="Measured on OpenJDK 25.0.4 (x64) with JOL 0.17 and Instrumentation.getObjectSize. The JVM Specification mandates no layout (JVMS §2.7): this is HotSpot in one configuration. Array elements and their padding are derived from JOL’s measured base offset and element size, and add up to the measured size."
    >
      <fieldset>
        <legend className="text-[12.5px] text-fg-subtle">Object</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {LAYOUT_SUBJECTS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === subject.id}
              onClick={() => {
                state.setSubject(s.id);
                setChosen(null);
              }}
              className={cn(
                'min-h-8 rounded-md border px-2.5 font-mono text-[12.5px] transition-colors',
                s.id === subject.id
                  ? 'border-exec-400 bg-exec-900/60 text-exec-200'
                  : 'border-ink-600 text-fg-muted hover:text-fg',
              )}
              translate="no"
            >
              {s.title}
            </button>
          ))}
        </div>
        <p className="mt-1.5 font-mono text-[12px] text-fg-subtle" translate="no">
          {subject.declaration} · {config.flags}
        </p>
      </fieldset>

      <div className="mt-4">
        {/* The ruler is a picture of the bands; the list below is how they are chosen. */}
        <div
          aria-hidden
          className="flex h-14 w-full overflow-hidden rounded-md border border-ink-500"
        >
          {layout.segments.map((s, i) => (
            <span
              key={`${s.offset}-${s.label}`}
              style={{ width: `${(s.size / layout.size) * 100}%` }}
              className={cn(
                'flex min-w-0 items-center justify-center border-r border-ink-950 text-[12px] font-medium last:border-r-0',
                KIND[s.kind].className,
                chosen === i && 'outline-2 -outline-offset-2 outline-exec-300',
              )}
            >
              <span className="truncate px-0.5">{KIND[s.kind].code}</span>
            </span>
          ))}
        </div>
        <div aria-hidden className="relative mt-1 h-4 font-mono text-[11px] text-fg-subtle">
          {Array.from({ length: layout.size / 8 + 1 }, (_, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2"
              style={{ left: `${((i * 8) / layout.size) * 100}%` }}
            >
              {i * 8}
            </span>
          ))}
        </div>
      </div>

      <ol
        className="mt-4 grid gap-1 sm:grid-cols-2"
        aria-label={`The bands of ${subject.title}, ${layout.size} bytes in all`}
      >
        {layout.segments.map((s, i) => (
          <li key={`${s.offset}-${s.label}`}>
            <button
              type="button"
              onClick={() => setChosen(chosen === i ? null : i)}
              aria-pressed={chosen === i}
              className={cn(
                'flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left text-[13px]',
                chosen === i ? 'bg-exec-900/60 text-fg' : 'text-fg-muted hover:bg-ink-850',
              )}
            >
              <span className="w-14 shrink-0 font-mono text-[12px] text-fg-subtle tabular">
                {s.offset}–{s.offset + s.size}
              </span>
              <span
                className={cn(
                  'w-5 shrink-0 rounded-sm border text-center font-mono text-[11px]',
                  KIND[s.kind].className,
                )}
                aria-hidden
              >
                {KIND[s.kind].code}
              </span>
              <span className="min-w-0">
                {s.label}
                <span className="text-fg-subtle"> · {s.size} B</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {segment?.kind === 'mark' && (
        <div className="mt-4 rounded-lg border border-rt-500/40 bg-rt-900/20 p-3">
          <p className="text-[12.5px] font-medium text-fg">
            The 64 bits of the mark word{config.id === 'compact' ? ', with compact headers' : ''}{' '}
            (most significant first)
          </p>
          <div
            className="mt-2 flex h-9 w-full overflow-hidden rounded border border-ink-500"
            aria-hidden
          >
            {MARK_BITS[config.id === 'compact' ? 'compact' : 'normal'].map((part) => (
              <span
                key={part.label}
                style={{ width: `${(part.bits / 64) * 100}%` }}
                className={cn(
                  'flex min-w-0 items-center justify-center border-r border-ink-950 font-mono text-[11px] last:border-r-0',
                  part.label === 'klass'
                    ? 'bg-rt-900 text-rt-200'
                    : part.label === 'unused' || part.label === 'unused_gap'
                      ? 'bg-ink-900 text-fg-subtle'
                      : 'bg-exec-900/60 text-exec-200',
                )}
              >
                <span className="truncate px-0.5">{part.bits > 3 ? part.label : ''}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 font-mono text-[12px] text-fg-muted" translate="no">
            {MARK_BITS[config.id === 'compact' ? 'compact' : 'normal']
              .map((part) => `${part.label}:${part.bits}`)
              .join('  ')}
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-3 @[760px]:grid-cols-2">
        {evidence && (
          <CodeBlock
            code={evidence.code}
            language="text"
            title={evidence.title}
            verifiedWith={evidence.verifiedWith}
          />
        )}
        <CodeBlock
          code={E.SIZES_OUTPUT.code}
          language="text"
          title={E.SIZES_OUTPUT.title}
          verifiedWith={E.SIZES_OUTPUT.verifiedWith}
        />
        {segment?.kind === 'mark' && (
          <CodeBlock
            code={E.MARK_WORD_SOURCE.code}
            language="text"
            title={E.MARK_WORD_SOURCE.title}
            verifiedWith={E.MARK_WORD_SOURCE.verifiedWith}
          />
        )}
      </div>
    </ExhibitFrame>
  );
}
