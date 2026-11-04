import { ArrowRight, ChevronDown, Compass, Hand, Microscope } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CodeBlock } from '@/components/code/CodeBlock';
import { AccuracyNote } from '@/components/learning/AccuracyNote';
import { KnowledgeCheck } from '@/components/learning/KnowledgeCheck';
import { LevelSwitch } from '@/components/learning/LevelSwitch';
import { LevelText } from '@/components/learning/LevelText';
import { RichText } from '@/components/learning/RichText';
import { SourceList } from '@/components/learning/SourceReference';
import { getComponentDoc } from '@/content/jvm';
import { progressActions, usePreferences } from '@/hooks/useLearningState';
import { PredictionCard } from '@/modules/lesson/Prediction';
import { TermCard } from '@/modules/lesson/TermCard';
import type { LabStation } from '@/types/lab';

/**
 * One station of a laboratory, built on the teaching cycle: the question, a
 * prediction, exploration and observation in the exhibit, the explanation at
 * the chosen level, the technical term, a check, and the technical insight
 * (real output, the accuracy note and sources) one step away.
 *
 * The exhibit opens once the learner predicts or skips, or at once when the
 * station has no prediction, was visited before, or the URL already holds
 * exhibit state (a shared link): experts are never held up.
 */
export function StationView({
  lab,
  station,
  index,
  total,
  exhibit,
  open,
  visited,
  next,
}: {
  /** Progress id of the laboratory, e.g. "lab:class-loading". */
  lab: string;
  station: LabStation;
  index: number;
  total: number;
  exhibit: ReactNode;
  /** The URL holds exhibit state: show the exhibit straight away. */
  open: boolean;
  visited: boolean;
  next?: { label: string; to: string };
}) {
  const { preferences, setLevel } = usePreferences();
  const [chosen, setChosen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(open || visited || !station.prediction);
  // Progress arrives after hydration: a visited station opens revealed.
  const [seen, setSeen] = useState({ open, visited });
  if (seen.open !== open || seen.visited !== visited) {
    setSeen({ open, visited });
    if (open || visited) setRevealed(true);
  }
  const doc = getComponentDoc(station.component);
  const id = `${station.id}-station`;

  return (
    <section aria-labelledby={id} className="min-w-0">
      <p className="text-[14px] text-fg-subtle">
        Station {index + 1} of {total} · {station.title}
      </p>
      <h2
        id={id}
        className="mt-1.5 max-w-[46rem] font-serif text-[28px] leading-[1.15] text-balance text-fg sm:text-[34px]"
      >
        {station.question}
      </h2>

      {station.prediction && (
        <div className="mt-6 max-w-[46rem]">
          <PredictionCard
            prediction={station.prediction}
            chosen={chosen}
            revealed={revealed}
            onChoose={(option) => {
              setChosen(option);
              setRevealed(true);
            }}
            onSkip={() => setRevealed(true)}
          />
        </div>
      )}

      {revealed && (
        <>
          <section aria-labelledby={`${id}-explore`} className="mt-10">
            <h3 id={`${id}-explore`} className="text-[20px] font-semibold text-fg">
              Explore and observe
            </h3>
            <div className="mt-1.5 flex max-w-[46rem] items-start gap-2 text-[15.5px] text-fg-muted">
              <Hand size={17} aria-hidden className="mt-1.5 shrink-0 text-exec-300" />
              <RichText className="prose-ij reading" text={station.tryIt} />
            </div>
            <div className="mt-4">{exhibit}</div>
          </section>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <section aria-labelledby={`${id}-why`} className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 id={`${id}-why`} className="text-[20px] font-semibold text-fg">
                  What is going on
                </h3>
                <LevelSwitch value={preferences.level} onChange={setLevel} />
              </div>
              <div className="mt-3">
                <LevelText
                  content={station.explanation}
                  level={preferences.level}
                  className="prose-ij reading"
                />
              </div>
            </section>
            <div className="min-w-0">
              <TermCard term={station.term} />
              <Link
                to={`/anatomy?c=${station.component}`}
                className="mt-4 inline-flex min-h-6 items-center gap-2 text-[15px] text-exec-300 underline underline-offset-4 hover:text-exec-200"
              >
                <Compass size={16} aria-hidden className="shrink-0" />
                {doc.name} on the JVM map
              </Link>
            </div>
          </div>

          <section aria-labelledby={`${id}-check`} className="mt-12 max-w-[46rem]">
            <h3 id={`${id}-check`} className="text-[20px] font-semibold text-fg">
              Check your understanding
            </h3>
            <div className="mt-3">
              <KnowledgeCheck
                compact
                quiz={{
                  id: `${lab}:${station.id}`,
                  title: station.title,
                  questions: [station.check],
                }}
              />
            </div>
          </section>

          <details
            className="group mt-12 rounded-xl border border-ink-600 bg-ink-900/50"
            open={preferences.level === 'deep'}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-[16px] font-medium text-fg hover:bg-ink-850 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <Microscope size={17} aria-hidden className="text-exec-300" />
                Technical insight: the exact model, real output and sources
              </span>
              <ChevronDown
                size={17}
                aria-hidden
                className="shrink-0 text-fg-subtle transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="space-y-5 border-t border-ink-700 px-4 py-5">
              {preferences.level !== 'deep' && (
                <RichText className="prose-ij max-w-[46rem]" text={station.explanation.deep} />
              )}
              <div className="grid gap-4 xl:grid-cols-2">
                {station.listings.map((listing) => (
                  <CodeBlock
                    key={listing.id}
                    code={listing.code}
                    language={listing.language}
                    title={listing.title}
                    verifiedWith={listing.verifiedWith}
                    className="min-w-0"
                  />
                ))}
              </div>
              <AccuracyNote compact text={station.accuracyNote} />
              <div>
                <h4 className="mb-2 text-[14px] font-medium text-fg-muted">Sources</h4>
                <SourceList citations={station.references} />
              </div>
            </div>
          </details>
        </>
      )}

      {next && (
        <nav
          aria-label="Next station"
          className="mt-12 flex flex-wrap items-center justify-end gap-3 border-t border-ink-700 pt-6"
        >
          <Link
            to={next.to}
            preventScrollReset={false}
            onClick={() => progressActions.completeChapter(lab, station.id)}
            className="inline-flex h-12 items-center gap-2 rounded-lg border border-exec-400 bg-exec-500 px-5 text-[15.5px] font-medium text-ink-950 transition-colors hover:bg-exec-400"
          >
            {next.label}
            <ArrowRight size={17} aria-hidden />
          </Link>
        </nav>
      )}
    </section>
  );
}
