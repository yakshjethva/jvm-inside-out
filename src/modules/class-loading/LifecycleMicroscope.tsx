import { Check, Circle, CircleDot } from 'lucide-react';
import { useMemo } from 'react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { LevelText } from '@/components/learning/LevelText';
import { CONFIG_MODEL, LIFECYCLE_STEPS, type LifecycleStep } from '@/content/labs/classLoading';
import { LIFECYCLE_JAVA } from '@/content/labs/classLoadingEvidence';
import { usePlayback } from '@/hooks/usePlayback';
import { usePreferences } from '@/hooks/useLearningState';
import { cn } from '@/lib/cn';
import { ExhibitFrame } from '@/modules/lesson/ExhibitFrame';
import { StepControls } from '@/modules/lesson/StepControls';
import { lifecycleTimeline, type ClassLifecycleState } from '@/simulators/classLifecycle';
import { useClassLoadingState } from './useClassLoadingState';

type RailState = 'done' | 'now' | 'pending' | 'partial';

const STATES = lifecycleTimeline(CONFIG_MODEL, LIFECYCLE_STEPS);
/** The references the microscope follows: Config's fields, used by Lifecycle. */
const CONFIG_REFERENCES = [46, 53];

function rail(state: ClassLifecycleState, step: LifecycleStep) {
  const resolved = CONFIG_REFERENCES.filter((i) => state.resolved[i]).length;
  const mark = (done: boolean, phase: LifecycleStep['phase']): RailState =>
    step.phase === phase ? 'now' : done ? 'done' : 'pending';
  return {
    loading: mark(state.status !== 'not-loaded', 'loading'),
    verification: mark(state.verified, 'verification'),
    preparation: mark(state.prepared, 'preparation'),
    resolution:
      step.phase === 'resolution'
        ? ('now' as const)
        : resolved === CONFIG_REFERENCES.length
          ? ('done' as const)
          : resolved > 0
            ? ('partial' as const)
            : ('pending' as const),
    initialization: mark(state.status === 'initialized', 'initialization'),
    resolvedCount: resolved,
  };
}

function RailItem({ label, state, note }: { label: string; state: RailState; note?: string }) {
  return (
    <li
      aria-current={state === 'now' ? 'step' : undefined}
      className={cn(
        'flex min-w-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px]',
        state === 'now'
          ? 'border-exec-400 bg-exec-900/60 text-exec-200'
          : state === 'done'
            ? 'border-ok-500/50 text-ok-300'
            : state === 'partial'
              ? 'border-ok-500/40 border-dashed text-fg-muted'
              : 'border-ink-600 text-fg-subtle',
      )}
    >
      {state === 'done' ? (
        <Check size={13} aria-hidden />
      ) : state === 'now' ? (
        <CircleDot size={13} aria-hidden />
      ) : (
        <Circle size={11} aria-hidden />
      )}
      <span>{label}</span>
      <span className="sr-only">
        :{' '}
        {state === 'now'
          ? 'happening now'
          : state === 'done'
            ? 'done'
            : state === 'partial'
              ? 'partly done'
              : 'not yet'}
      </span>
      {note && <span className="text-[11.5px] text-fg-subtle">{note}</span>}
    </li>
  );
}

/**
 * The life of one class under the microscope: the real Lifecycle program,
 * step by step, with the phase rail (loading, linking with its three parts,
 * initialization), Config's static fields, Lifecycle's references to it, and
 * the console with the real output and log lines as they appeared.
 */
export function LifecycleMicroscope() {
  const state = useClassLoadingState();
  const { preferences } = usePreferences();
  const total = LIFECYCLE_STEPS.length;
  const index = Math.min(state.step, total - 1);
  const playback = usePlayback({
    step: index,
    total,
    onStep: state.setStep,
    resetKey: 'lifecycle',
    stepMs: 3200,
  });
  const stepper = { step: index, total, ...playback };
  const step = LIFECYCLE_STEPS[index]!;
  const now = STATES[index]!;
  const before = index > 0 ? STATES[index - 1]!.console.length : 0;
  const phases = rail(now, step);
  const previous = index > 0 ? STATES[index - 1]! : null;
  const changed = useMemo(
    () =>
      new Set(
        CONFIG_MODEL.fields
          .filter(
            (f) =>
              JSON.stringify(now.statics[f.name]) !== JSON.stringify(previous?.statics[f.name]),
          )
          .map((f) => f.name),
      ),
    [now, previous],
  );

  return (
    <ExhibitFrame
      title="Lifecycle microscope: class Config in java -cp . Lifecycle"
      controls={<StepControls stepper={stepper} />}
      caption={
        <>
          <span className="font-medium text-fg">{step.title}.</span>{' '}
          <LevelText
            content={step.text}
            level={preferences.level}
            className="prose-ij mt-1 text-[15px]"
            fallbackStyle="tag"
          />
        </>
      }
      note="Every printed and logged line is from a real run on OpenJDK 25.0.4. The phase rail uses the specification’s names; HotSpot prepares the class while it creates it, so no separate log line appears for preparation."
    >
      <ol aria-label="Phases of Config" className="flex flex-wrap items-center gap-1.5">
        <RailItem label="Loading" state={phases.loading} />
        <li aria-hidden className="text-fg-subtle">
          →
        </li>
        <li className="min-w-0">
          <span className="sr-only">Linking:</span>
          <ol className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-ink-500 px-1.5 py-1">
            <li className="px-1 text-[12px] text-fg-subtle" aria-hidden>
              Linking
            </li>
            <RailItem label="Verification" state={phases.verification} />
            <RailItem label="Preparation" state={phases.preparation} />
            <RailItem
              label="Resolution"
              state={phases.resolution}
              note={`${phases.resolvedCount} of ${CONFIG_REFERENCES.length} uses, lazily`}
            />
          </ol>
        </li>
        <li aria-hidden className="text-fg-subtle">
          →
        </li>
        <RailItem label="Initialization" state={phases.initialization} />
      </ol>

      <div className="mt-4 grid gap-4 @[760px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <CodeBlock
            code={LIFECYCLE_JAVA.code}
            language="java"
            title="Lifecycle.java"
            highlightLines={step.lines}
          />
          {step.instruction && (
            <p className="mt-2 font-mono text-[12px] text-exec-300" translate="no">
              {step.instruction}
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <section
            aria-label="Class Config"
            className="rounded-lg border border-rt-500/40 bg-rt-900/20 p-3"
          >
            <p className="font-mono text-[13px] text-fg" translate="no">
              class Config
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
              {(
                [
                  ['Loaded', now.status !== 'not-loaded'],
                  ['Verified', now.verified],
                  ['Prepared', now.prepared],
                  [
                    now.status === 'initializing' ? 'Initializing' : 'Initialized',
                    now.status === 'initialized' || now.status === 'initializing',
                  ],
                ] as const
              ).map(([label, on]) => (
                <li
                  key={label}
                  className={cn(
                    'inline-flex items-center gap-1 rounded border px-1.5 py-0.5',
                    on ? 'border-ok-500/50 text-ok-300' : 'border-ink-600 text-fg-subtle',
                  )}
                >
                  {on ? <Check size={12} aria-hidden /> : <span aria-hidden>·</span>}
                  {label}
                  <span className="sr-only">{on ? ': yes' : ': not yet'}</span>
                </li>
              ))}
            </ul>
            <table className="mt-3 w-full border-collapse text-left text-[12.5px]">
              <caption className="pb-1 text-left text-[12px] text-fg-subtle">
                Static fields (in the class’s mirror)
              </caption>
              <thead>
                <tr className="text-[11.5px] text-fg-subtle">
                  <th scope="col" className="py-1 pr-2 font-normal">
                    Field
                  </th>
                  <th scope="col" className="py-1 pr-2 font-normal">
                    Value
                  </th>
                  <th scope="col" className="py-1 font-normal">
                    Set by
                  </th>
                </tr>
              </thead>
              <tbody>
                {CONFIG_MODEL.fields.map((field) => {
                  const value = now.statics[field.name];
                  const fresh = changed.has(field.name) && index > 0;
                  return (
                    <tr
                      key={field.name}
                      className={cn('border-t border-ink-700', fresh && 'bg-ok-900/30')}
                    >
                      <td className="py-1 pr-2 font-mono" translate="no">
                        {field.constant ? 'static final ' : 'static '}
                        {field.type} {field.name}
                      </td>
                      <td className="py-1 pr-2 font-mono text-fg" translate="no">
                        {value
                          ? field.type === 'String' && value.value !== 'null'
                            ? `"${value.value}"`
                            : value.value
                          : '—'}
                      </td>
                      <td className="py-1 text-fg-muted">
                        {value
                          ? value.by === 'default'
                            ? 'preparation (default)'
                            : value.by === 'constant'
                              ? 'ConstantValue'
                              : '<clinit>'
                          : 'does not exist yet'}
                        {fresh && <span className="text-ok-300"> · changed</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section
            aria-label="References in Lifecycle’s constant pool"
            className="rounded-lg border border-ink-600 bg-ink-900/60 p-3"
          >
            <p className="text-[12px] text-fg-subtle">
              Lifecycle’s constant pool: references used here
            </p>
            <ul className="mt-1.5 space-y-1 font-mono text-[12px]" translate="no">
              {CONFIG_MODEL.entries.map((entry) => (
                <li
                  key={entry.index}
                  className="flex flex-wrap items-baseline justify-between gap-2"
                >
                  <span className="text-fg-muted">
                    #{entry.index} {entry.text}
                  </span>
                  <span className={now.resolved[entry.index] ? 'text-ok-300' : 'text-fg-subtle'}>
                    {now.resolved[entry.index] ? 'resolved' : 'symbolic'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section
        aria-label="Console: output and log"
        className="mt-4 rounded-lg border border-ink-600 bg-ink-950"
      >
        <p className="border-b border-ink-700 px-3 py-1.5 text-[12px] text-fg-subtle">
          Console: <span className="text-fg-muted">output</span> and{' '}
          <span className="font-mono">-Xlog:class+load,class+init</span> lines, in order
        </p>
        <ol
          // Focusable so a keyboard can scroll long lines.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="code-output max-h-64 overflow-auto px-3 py-2 font-mono text-[12px] leading-relaxed"
          translate="no"
        >
          {now.console.map((line, i) => (
            <li
              key={i}
              className={cn(
                'whitespace-pre',
                line.kind === 'log' ? 'text-fg-subtle' : 'text-ok-300',
                i >= before && 'bg-exec-500/15 shadow-[inset_2px_0_0_var(--color-exec-400)]',
              )}
            >
              {line.text}
            </li>
          ))}
          {now.console.length === 0 && <li className="text-fg-subtle">(nothing yet)</li>}
        </ol>
      </section>
    </ExhibitFrame>
  );
}
