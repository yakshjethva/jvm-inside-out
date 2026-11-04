import { CircleAlert, CircleCheck, FlaskConical, RotateCcw, Send } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { LevelText } from '@/components/learning/LevelText';
import { SourceList } from '@/components/learning/SourceReference';
import {
  CLASS_CHOICES,
  CLASS_LOADING_LISTINGS,
  DELEGATION_EXPERIMENTS,
  LOADER_IDS,
  LOADER_PROFILES,
  LOADER_WORLD,
  type LoaderId,
} from '@/content/labs/classLoading';
import { usePlayback } from '@/hooks/usePlayback';
import { usePreferences } from '@/hooks/useLearningState';
import { cn } from '@/lib/cn';
import { CodeText } from '@/modules/lesson/CodeText';
import { ExhibitFrame } from '@/modules/lesson/ExhibitFrame';
import { PredictionCard } from '@/modules/lesson/Prediction';
import { StepControls } from '@/modules/lesson/StepControls';
import { initialRuntime, type RequestResult } from '@/simulators/classLoading';
import { LoaderStructure } from './LoaderStructure';
import {
  narrate,
  outcomeNarration,
  shortId,
  shortLoader,
  shortName,
  shortSignature,
} from './narration';
import { useClassLoadingState } from './useClassLoadingState';

const TONE_CLASS = {
  flow: 'text-exec-300',
  ok: 'text-ok-300',
  miss: 'text-warn-300',
  warn: 'text-warn-300',
  neutral: 'text-fg-muted',
};

const selectClass =
  'h-9 w-full min-w-0 rounded-md border border-ink-600 bg-ink-850 px-2 font-mono text-[12.5px] text-fg focus-visible:border-exec-400';

const describeRequest = (result: RequestResult) => {
  const request = result.request;
  if (request.kind === 'class') return `${shortLoader(request.loader)} → ${request.name}`;
  const member = LOADER_WORLD.members.find((m) => m.id === request.member);
  return member
    ? `${shortName(member.fromClass)} calls ${shortSignature(member.signature)}`
    : request.member;
};

/**
 * The delegation laboratory: guided experiments with a prediction, free
 * requests to any loader, and a step player over the request's steps. The
 * loader structure shows the runtime state after the current step, so each
 * definition and record appears the moment it happens.
 */
export function DelegationLab() {
  const state = useClassLoadingState();
  const { preferences } = usePreferences();
  const formId = useId();
  const { results, experiment } = state;
  const current = results.at(-1) ?? null;
  const total = current?.steps.length ?? 0;
  const step = Math.min(state.step, Math.max(total - 1, 0));
  const runKey = `${results.length}:${experiment?.id ?? ''}`;

  // An experiment opens on its prediction; a shared link part-way through skips it.
  const [predicted, setPredicted] = useState<Record<string, string | true>>({});
  const awaitingPrediction = Boolean(
    experiment && !(experiment.id in predicted) && state.step === 0,
  );

  const playback = usePlayback({
    step,
    total: awaitingPrediction ? 0 : total,
    onStep: state.setStep,
    resetKey: runKey,
    stepMs: 1600,
  });
  const stepper = { step, total, ...playback };

  const [loader, setLoader] = useState<LoaderId>('app');
  const [name, setName] = useState(CLASS_CHOICES[0]!.name);
  const send = (event: FormEvent) => {
    event.preventDefault();
    state.send({ kind: 'class', loader, name });
  };

  const before = results.length > 1 ? results.at(-2)!.runtime : initialRuntime(LOADER_WORLD);
  const active = current && !awaitingPrediction ? current.steps[step]! : null;
  const runtime = active
    ? active.runtime
    : awaitingPrediction || !current
      ? before
      : current.runtime;
  const narration = active && current ? narrate(active, LOADER_WORLD, current) : null;
  const finished = Boolean(current && !awaitingPrediction && step === total - 1);
  const outcome = current ? outcomeNarration(current.outcome) : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <section aria-labelledby={`${formId}-experiments`}>
          <h4
            id={`${formId}-experiments`}
            className="flex items-center gap-2 text-[15px] font-medium text-fg"
          >
            <FlaskConical size={16} aria-hidden className="text-exec-300" /> Guided experiments
          </h4>
          <ol className="mt-2 space-y-1">
            {DELEGATION_EXPERIMENTS.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => state.openExperiment(item.id)}
                  aria-pressed={experiment?.id === item.id}
                  className={cn(
                    'flex w-full gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors',
                    experiment?.id === item.id
                      ? 'border-exec-400 bg-exec-900/40'
                      : 'border-transparent hover:border-ink-600 hover:bg-ink-850',
                  )}
                >
                  <span className="mt-0.5 font-mono text-[12px] text-fg-subtle">{index + 1}</span>
                  <span className="text-[14px] leading-snug text-fg">{item.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <form
          onSubmit={send}
          aria-labelledby={`${formId}-free`}
          className="rounded-xl border border-ink-600 bg-ink-900/50 p-3.5"
        >
          <h4 id={`${formId}-free`} className="text-[15px] font-medium text-fg">
            Your own request
          </h4>
          <p className="mt-1 text-[13px] text-fg-muted">
            Requests add up: each one changes what the loaders already know.
          </p>
          <label className="mt-3 block text-[12.5px] text-fg-subtle">
            Ask this loader
            <select
              className={cn(selectClass, 'mt-1 font-sans')}
              value={loader}
              onChange={(event) => setLoader(event.target.value as LoaderId)}
            >
              {LOADER_IDS.map((id) => (
                <option key={id} value={id}>
                  {LOADER_PROFILES[id].title}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-[12.5px] text-fg-subtle">
            for the class
            <select
              className={cn(selectClass, 'mt-1')}
              value={name}
              onChange={(event) => setName(event.target.value)}
            >
              {CLASS_CHOICES.map((choice) => (
                <option key={choice.name} value={choice.name}>
                  {choice.name}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1 text-[12px] text-fg-subtle">
            {CLASS_CHOICES.find((choice) => choice.name === name)?.note}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-exec-500 bg-exec-500 px-3 text-[13.5px] font-medium text-ink-950 hover:bg-exec-400"
            >
              <Send size={14} aria-hidden /> Send request
            </button>
            <button
              type="button"
              onClick={state.reset}
              disabled={results.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink-600 px-3 text-[13.5px] text-fg-muted hover:text-fg disabled:opacity-45"
            >
              <RotateCcw size={14} aria-hidden /> Fresh JVM
            </button>
          </div>
        </form>

        {results.length > 0 && (
          <section aria-label="Requests so far" className="text-[13px]">
            <h4 className="font-medium text-fg-muted">Requests so far</h4>
            <ol className="mt-1.5 space-y-1">
              {results.map((result, index) => {
                const o = result.outcome;
                return (
                  <li key={index} className="flex gap-2">
                    <span className="font-mono text-fg-subtle">{index + 1}.</span>
                    <span className="min-w-0 break-words text-fg-muted">
                      <span className="font-mono text-[12px] text-fg" translate="no">
                        {describeRequest(result)}
                      </span>{' '}
                      {o.kind === 'loaded' ? (
                        <span className="text-ok-300">✓ {shortId(o.classId)}</span>
                      ) : o.kind === 'not-found' ? (
                        <span className="text-warn-300">⚠ not found</span>
                      ) : (
                        <span className="text-warn-300">⚠ LinkageError</span>
                      )}
                      {index === results.length - 1 && (
                        <span className="text-fg-subtle"> · shown</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>

      <div className="min-w-0 space-y-5">
        {experiment && (
          <div>
            <p className="text-[13px] text-exec-300">Experiment</p>
            <p className="font-serif text-[22px] leading-snug text-fg">{experiment.title}</p>
            <p className="mt-1 text-[15px] text-fg-muted">
              <CodeText text={experiment.question} />
            </p>
            {experiment.setup.length > 0 && (
              <p className="mt-1 text-[13px] text-fg-subtle">
                Already done before this request: {experiment.setup.length}{' '}
                {experiment.setup.length === 1 ? 'request' : 'requests'}, listed under “Requests so
                far”.
              </p>
            )}
          </div>
        )}

        {experiment && (awaitingPrediction || typeof predicted[experiment.id] === 'string') && (
          <PredictionCard
            key={experiment.id}
            prediction={experiment.prediction}
            chosen={
              typeof predicted[experiment.id] === 'string'
                ? (predicted[experiment.id] as string)
                : null
            }
            revealed={!awaitingPrediction}
            onChoose={(option) => setPredicted((p) => ({ ...p, [experiment.id]: option }))}
            onSkip={() => setPredicted((p) => ({ ...p, [experiment.id]: true }))}
          />
        )}

        <ExhibitFrame
          title="Delegation laboratory: the class loaders of one JVM"
          controls={
            current && !awaitingPrediction ? (
              <StepControls stepper={stepper} label="Step" />
            ) : undefined
          }
          caption={
            narration && active ? (
              <>
                <span className={cn('mr-2 font-medium', TONE_CLASS[narration.tone])}>
                  {narration.label}.
                </span>
                <span className="text-fg-muted">
                  <CodeText text={narration.text} />
                </span>
              </>
            ) : awaitingPrediction ? (
              <span className="text-fg-muted">
                Make your prediction above, then step through the request.
              </span>
            ) : (
              <span className="text-fg-muted">
                No request yet. Choose an experiment, or send your own request: the loaders start
                with only the classes the JVM loaded at startup.
              </span>
            )
          }
          note="A deterministic model of the JDK 25 algorithms, checked against real runs (Technical insight). It leaves out per-name locking, the CDS archive’s shortcuts and the hundreds of classes a real JVM loads at startup."
        >
          <LoaderStructure
            runtime={runtime}
            selected={state.loader}
            onSelect={(id) => state.select(state.loader === id ? null : id)}
            step={active}
          />
        </ExhibitFrame>

        {current && !awaitingPrediction && (
          <section
            aria-label="Every step of this request"
            className="rounded-xl border border-ink-600 bg-ink-900/40 p-3.5"
          >
            <h4 className="text-[14px] font-medium text-fg-muted">Every step of this request</h4>
            <ol className="mt-2 grid gap-1 sm:grid-cols-2">
              {current.steps.map((item, index) => {
                const text = narrate(item, LOADER_WORLD, current);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => playback.seek(index)}
                      aria-current={index === step ? 'step' : undefined}
                      className={cn(
                        'flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left text-[13px]',
                        index === step
                          ? 'bg-exec-900/60 text-fg'
                          : 'text-fg-muted hover:bg-ink-850',
                      )}
                    >
                      <span className="w-5 shrink-0 text-right font-mono text-[11.5px] text-fg-subtle">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className={TONE_CLASS[text.tone]}>{text.label}</span>
                        <span className="text-fg-subtle"> · {shortLoader(item.loader)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {finished && current && outcome && (
          <section
            aria-label="Result"
            className={cn(
              'rounded-xl border p-4',
              current.outcome.kind === 'loaded'
                ? 'border-ok-500/60 bg-ok-900/20'
                : 'border-warn-500/60 bg-warn-900/20',
            )}
          >
            <p
              className={cn(
                'flex items-center gap-2 font-medium',
                current.outcome.kind === 'loaded' ? 'text-ok-300' : 'text-warn-300',
              )}
            >
              {current.outcome.kind === 'loaded' ? (
                <CircleCheck size={17} aria-hidden />
              ) : (
                <CircleAlert size={17} aria-hidden />
              )}
              {outcome.label}
            </p>
            <p className="mt-1 text-[15px] text-fg-muted">
              <CodeText text={outcome.text} />
            </p>
            {experiment && (
              <div className="mt-4 space-y-4 border-t border-ink-700 pt-4">
                <LevelText
                  content={experiment.explanation}
                  level={preferences.level}
                  className="prose-ij reading"
                />
                {experiment.evidence.map((id) => {
                  const listing = CLASS_LOADING_LISTINGS[id]!;
                  return (
                    <CodeBlock
                      key={id}
                      code={listing.code}
                      language={listing.language}
                      title={listing.title}
                      verifiedWith={listing.verifiedWith}
                    />
                  );
                })}
                <SourceList citations={experiment.references} />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
