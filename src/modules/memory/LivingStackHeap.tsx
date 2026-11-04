import { Recycle } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { LevelText } from '@/components/learning/LevelText';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { MEMORY_PROGRAMS, type MemoryProgramId } from '@/content/labs/memoryPrograms';
import { usePlayback } from '@/hooks/usePlayback';
import { usePreferences } from '@/hooks/useLearningState';
import { cn } from '@/lib/cn';
import { CodeText } from '@/modules/lesson/CodeText';
import { ExhibitFrame } from '@/modules/lesson/ExhibitFrame';
import { ReferenceArrows, type ArrowSpec } from '@/modules/lesson/ReferenceArrows';
import { StepControls } from '@/modules/lesson/StepControls';
import {
  applyOp,
  reachableObjects,
  referencesOf,
  type Frame,
  type MemoryState,
  type Reference,
  type Value,
} from '@/simulators/memory';
import { useMemoryLabState } from './useMemoryLabState';
import { describeValue, PROGRAM_LABEL } from './values';

const anchorOf = (ref: Reference) =>
  ref.from.kind === 'local'
    ? `local-${ref.from.frame}-${ref.from.slot}`
    : ref.from.kind === 'stack'
      ? `stack-${ref.from.frame}-${ref.from.index}`
      : `field-${ref.from.object}-${ref.from.field}`;

/** What the selection lights up: the selected reference and its target, or an object and every reference to it. */
function highlight(state: MemoryState, selected: string | null) {
  const refs = referencesOf(state);
  if (!selected) return { refs: new Set<string>(), objects: new Set<string>() };
  if (selected.startsWith('ref:')) {
    const ref = refs.find((r) => r.id === selected);
    return { refs: new Set(ref ? [ref.id] : []), objects: new Set(ref ? [ref.to] : []) };
  }
  if (selected.startsWith('obj:')) {
    const id = selected.slice(4);
    return {
      refs: new Set(refs.filter((r) => r.to === id).map((r) => r.id)),
      objects: new Set([id]),
    };
  }
  return { refs: new Set<string>(), objects: new Set<string>() };
}

/**
 * The living stack and heap: a real program, step by step, with every
 * thread's frames, the heap's objects and the references between them.
 * Selecting a reference lights up the object it refers to; selecting an
 * object lights up every reference to it. A collection can be run at any
 * step: only unreachable objects disappear.
 */
export function LivingStackHeap() {
  const state = useMemoryLabState();
  const { preferences } = usePreferences();
  const { program, states } = state;
  const total = program.steps.length;
  const index = state.step;
  const playback = usePlayback({
    step: index,
    total,
    onStep: state.setStep,
    resetKey: program.id,
    stepMs: 2600,
  });
  const stepper = { step: index, total, ...playback };
  const step = program.steps[index]!;
  const recorded = states[index]!;
  const container = useRef<HTMLDivElement>(null);

  // A collection the learner asked for, at this step only: a what-if on top of the recorded state.
  const [collectedAt, setCollectedAt] = useState<string | null>(null);
  const key = `${program.id}:${index}`;
  const memory = useMemo(
    () => (collectedAt === key ? applyOp(recorded, { op: 'collect' }) : recorded),
    [collectedAt, key, recorded],
  );
  const reclaimed =
    collectedAt === key ? recorded.objects.filter((o) => memory.collected.includes(o.id)) : [];

  const live = reachableObjects(memory);
  const refs = referencesOf(memory);
  const lit = highlight(memory, state.selected);
  const previous = index > 0 ? states[index - 1]! : null;
  const fresh = new Set(
    memory.objects.filter((o) => !previous?.objects.some((p) => p.id === o.id)).map((o) => o.id),
  );

  const arrows: ArrowSpec[] = refs.map((ref) => ({
    from: anchorOf(ref),
    to: `obj-${ref.to}`,
    tone: lit.refs.has(ref.id)
      ? 'active'
      : ref.from.kind === 'field' && !live.has(ref.from.object)
        ? 'warn'
        : 'normal',
  }));
  const unreachable = memory.objects.filter((o) => !live.has(o.id));

  const valueChip = (value: Value, refId: string, anchor: string) => {
    const text = describeValue(value, memory.objects);
    if (value.kind !== 'ref')
      return (
        <span data-anchor={anchor} className="font-mono text-[12px] text-fg-muted" translate="no">
          {text}
        </span>
      );
    const on = lit.refs.has(refId);
    return (
      <button
        type="button"
        data-anchor={anchor}
        onClick={() => state.select(state.selected === refId ? null : refId)}
        aria-pressed={state.selected === refId}
        aria-label={`Reference ${text.replace('→ ', 'to ')}`}
        className={cn(
          'min-h-6 rounded border px-1.5 pr-4 text-left font-mono text-[12px] transition-colors',
          on
            ? 'border-exec-400 bg-exec-900/70 text-exec-200'
            : 'border-rt-500/50 bg-rt-900/30 text-rt-200 hover:border-rt-400',
        )}
        translate="no"
      >
        {text}
      </button>
    );
  };

  const frameCard = (frame: Frame, top: boolean, threadId: string) => (
    <li
      key={frame.id}
      className={cn(
        'rounded-lg border p-2.5',
        top ? 'border-exec-500/60 bg-exec-900/25' : 'border-ink-600 bg-ink-900/70',
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="font-mono text-[12.5px] text-fg" translate="no">
          {frame.owner === 'java.lang.Thread' ? 'Thread.' : `${frame.owner}.`}
          {frame.method}
        </p>
        <span className={cn('text-[11.5px]', top ? 'text-exec-300' : 'text-fg-subtle')}>
          {top ? 'current frame' : 'waiting for the call above'}
        </span>
      </div>
      <div className="mt-2 grid gap-2 @[340px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <p className="text-[11.5px] text-fg-subtle">Local variables ({frame.maxLocals} slots)</p>
          <ul className="mt-1 space-y-1">
            {frame.locals.map((slot) => (
              <li
                key={slot.index}
                className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1"
              >
                <span className="font-mono text-[12px] text-fg-muted" translate="no">
                  {slot.index} · {slot.name}
                </span>
                {valueChip(
                  slot.value,
                  `ref:${threadId}/${frame.id}/${slot.index}`,
                  `local-${frame.id}-${slot.index}`,
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11.5px] text-fg-subtle">Operand stack (max {frame.maxStack})</p>
          <ul className="mt-1 flex min-h-7 flex-col-reverse gap-1">
            {frame.stack.length === 0 ? (
              <li className="rounded border border-dashed border-ink-600 px-2 py-0.5 text-[12px] text-fg-subtle">
                empty
              </li>
            ) : (
              frame.stack.map((value, i) => (
                <li key={i}>
                  {valueChip(
                    value,
                    `ref:${threadId}/${frame.id}/stack/${i}`,
                    `stack-${frame.id}-${i}`,
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </li>
  );

  return (
    <ExhibitFrame
      title={`Living stack and heap: ${program.title}`}
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Program"
            size="sm"
            value={program.id}
            onChange={(id: MemoryProgramId) => state.setProgram(id)}
            segments={MEMORY_PROGRAMS.map((p) => ({
              value: p.id,
              label: PROGRAM_LABEL[p.id],
            }))}
          />
          <StepControls stepper={stepper} />
        </div>
      }
      caption={
        <>
          <span className="font-medium text-fg">{step.title}.</span>
          {step.instruction && (
            <code translate="no" className="ml-2 font-mono text-[12.5px] text-exec-300">
              {step.instruction}
            </code>
          )}
          <LevelText
            content={step.text}
            level={preferences.level}
            className="prose-ij mt-1 text-[15px]"
            fallbackStyle="tag"
          />
          {reclaimed.length > 0 && (
            <p className="mt-2 text-[14px] text-ok-300">
              A collection ran: it reclaimed {reclaimed.map((o) => o.label).join(', ')}, which
              nothing could reach. Reachable objects were not touched.
            </p>
          )}
          {collectedAt === key && reclaimed.length === 0 && (
            <p className="mt-2 text-[14px] text-fg-muted">
              A collection ran and found nothing to reclaim: every object is reachable.
            </p>
          )}
        </>
      }
      note={program.accuracyNote}
    >
      <div className="@container">
        <div
          ref={container}
          className="relative grid gap-x-14 gap-y-5 @[640px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
        >
          <section aria-label="Threads and their stacks" className="min-w-0 space-y-4">
            {memory.threads.map((thread) => (
              <div key={thread.id}>
                <p className="flex flex-wrap items-baseline gap-x-2 text-[12.5px]">
                  <span className="font-medium text-fg">Thread {thread.name}</span>
                  <span
                    className={
                      thread.status === 'running'
                        ? 'text-ok-300'
                        : thread.status === 'waiting'
                          ? 'text-warn-300'
                          : 'text-fg-subtle'
                    }
                  >
                    {thread.status === 'waiting' ? 'waiting in join()' : thread.status}
                  </span>
                  <span className="text-fg-subtle">· its own stack, newest frame first</span>
                </p>
                {thread.frames.length === 0 ? (
                  <p className="mt-1.5 rounded-lg border border-dashed border-ink-600 px-3 py-2 text-[12.5px] text-fg-subtle">
                    No frames:{' '}
                    {thread.status === 'terminated' ? 'the thread has ended' : 'nothing is running'}
                    .
                  </p>
                ) : (
                  <ol className="mt-1.5 space-y-2" aria-label={`Frames of thread ${thread.name}`}>
                    {[...thread.frames]
                      .reverse()
                      .map((frame, i) => frameCard(frame, i === 0, thread.id))}
                  </ol>
                )}
              </div>
            ))}
          </section>

          <section aria-label="Heap: shared by every thread" className="min-w-0">
            <p className="text-[12.5px]">
              <span className="font-medium text-fg">Heap</span>{' '}
              <span className="text-fg-subtle">· shared by every thread</span>
            </p>
            <ul className="mt-1.5 space-y-2">
              {memory.objects.map((object) => {
                const reachable = live.has(object.id);
                const on = lit.objects.has(object.id);
                return (
                  <li
                    key={object.id}
                    data-anchor={`obj-${object.id}`}
                    className={cn(
                      'rounded-lg border p-2.5 transition-colors',
                      on
                        ? 'border-exec-400 bg-exec-900/50 ring-2 ring-exec-400/30'
                        : reachable
                          ? 'border-ok-500/50 bg-ok-900/20'
                          : 'border-dashed border-warn-400/80 bg-warn-900/25',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        state.select(
                          state.selected === `obj:${object.id}` ? null : `obj:${object.id}`,
                        )
                      }
                      aria-pressed={state.selected === `obj:${object.id}`}
                      className="flex w-full flex-wrap items-baseline justify-between gap-2 rounded-sm text-left"
                    >
                      <span className="font-mono text-[12.5px] text-fg" translate="no">
                        {object.label}
                        {object.className !== object.label &&
                          !object.label.startsWith(object.className) && (
                            <span className="text-fg-subtle"> · {object.className}</span>
                          )}
                      </span>
                      <span
                        className={cn(
                          'text-[11.5px] font-medium',
                          reachable ? 'text-ok-300' : 'text-warn-300',
                        )}
                      >
                        {reachable
                          ? object.root
                            ? `reachable (${object.root === 'literal' ? 'string literal' : 'static field'})`
                            : 'reachable'
                          : 'unreachable: eligible for collection'}
                        {fresh.has(object.id) && index > 0 && (
                          <span className="text-exec-300"> · new</span>
                        )}
                      </span>
                    </button>
                    {object.fields.length > 0 && (
                      <ul className="mt-1.5 space-y-1">
                        {object.fields.map((field) => (
                          <li
                            key={field.name}
                            className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1"
                          >
                            <span className="font-mono text-[12px] text-fg-muted" translate="no">
                              {field.name}
                            </span>
                            {valueChip(
                              field.value,
                              `ref:${object.id}.${field.name}`,
                              `field-${object.id}-${field.name}`,
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
              {reclaimed.map((object) => (
                <li
                  key={`gone-${object.id}`}
                  className="rounded-lg border border-dashed border-ink-600 p-2.5 text-[12.5px] text-fg-subtle"
                >
                  <span className="font-mono line-through" translate="no">
                    {object.label}
                  </span>{' '}
                  · reclaimed: its memory can be reused
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setCollectedAt(key)}
              disabled={collectedAt === key}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-warn-500/70 bg-warn-900/40 px-3 text-[13px] text-warn-300 hover:border-warn-400 disabled:opacity-45"
            >
              <Recycle size={14} aria-hidden /> Run a collection here
              {unreachable.length > 0 && (
                <span className="text-warn-300/80">({unreachable.length} unreachable)</span>
              )}
            </button>
          </section>
          <ReferenceArrows
            container={container}
            arrows={arrows}
            version={`${key}:${state.selected ?? ''}:${collectedAt === key}`}
          />
        </div>

        <div className="mt-5 grid gap-3 @[760px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <CodeBlock
            code={program.source.code}
            language="java"
            title={program.source.title}
            highlightLines={step.lines}
          />
          <div className="rounded-lg border border-ink-600 bg-ink-900/60 p-3 text-[13.5px] text-fg-muted">
            <p className="font-medium text-fg">What to look at</p>
            <p className="mt-1">
              <CodeText text="Select a reference (an arrow’s start) to light up its object, or an object to light up every reference to it. Objects never sit in frames: frames hold references." />
            </p>
            {state.selected && (
              <p className="mt-2 text-exec-200">
                {lit.objects.size > 0
                  ? `Lit: ${[...lit.objects].map((id) => memory.objects.find((o) => o.id === id)?.label).join(', ')}, and ${lit.refs.size === 1 ? '1 reference' : `${lit.refs.size} references`} to it.`
                  : 'The selection is not in memory at this step.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </ExhibitFrame>
  );
}
