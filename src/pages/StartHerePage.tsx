import { ArrowLeft, ArrowRight, Check, ChevronDown, Compass, Hand } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CodeBlock } from '@/components/code/CodeBlock';
import { AccuracyNote } from '@/components/learning/AccuracyNote';
import { KnowledgeCheck } from '@/components/learning/KnowledgeCheck';
import { LevelSwitch } from '@/components/learning/LevelSwitch';
import { LevelText } from '@/components/learning/LevelText';
import { RichText } from '@/components/learning/RichText';
import { SourceList } from '@/components/learning/SourceReference';
import { getComponentDoc } from '@/content/jvm';
import { FIRST_RUN, FIRST_RUN_QUIZ } from '@/content/lesson/firstRun';
import { progressActions, usePreferences, useProgress } from '@/hooks/useLearningState';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/cn';
import { JourneyMachine } from '@/modules/journey/JourneyMachine';
import { Exhibit } from '@/modules/lesson/exhibits';
import { PredictionCard } from '@/modules/lesson/Prediction';
import { TeachBack } from '@/modules/lesson/TeachBack';
import { TermCard } from '@/modules/lesson/TermCard';
import type { LessonChapter } from '@/types/lesson';

const LESSON = FIRST_RUN;
const CHAPTERS = LESSON.chapters;
const TOTAL_MINUTES = CHAPTERS.reduce((sum, chapter) => sum + chapter.minutes, 0);
const chapterHref = (id: string) => `/start?chapter=${id}`;

/** The first lesson: "What happens when you run a Java program?" */
export function StartHerePage() {
  const [params] = useSearchParams();
  const requested = params.get('chapter');
  const index = CHAPTERS.findIndex((chapter) => chapter.id === requested);
  const isRecap = requested === 'recap';
  const chapter = index >= 0 ? CHAPTERS[index]! : null;
  usePageTitle(
    chapter
      ? `${chapter.title} · Start here`
      : isRecap
        ? 'What you now know · Start here'
        : 'Start here',
  );

  const progress = useProgress();
  const done = progress.lessons[LESSON.id] ?? {};

  if (!chapter && !isRecap) return <LessonIntro done={done} />;

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-10 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:pt-12">
      <ChapterNav current={isRecap ? 'recap' : chapter!.id} done={done} />
      {chapter ? (
        <ChapterView key={chapter.id} chapter={chapter} index={index} done={chapter.id in done} />
      ) : (
        <Recap />
      )}
    </div>
  );
}

function LessonIntro({ done }: { done: Record<string, number> }) {
  const next = CHAPTERS.find((chapter) => !(chapter.id in done));
  const started = CHAPTERS.some((chapter) => chapter.id in done);
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pt-12 pb-20 sm:px-6 lg:pt-20">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <p className="text-[15px] text-exec-300">Start here · the first lesson</p>
          <h1 className="mt-3 font-serif text-[40px] leading-[1.08] text-balance text-fg sm:text-[54px]">
            {LESSON.title}
          </h1>
          <p className="reading mt-5">{LESSON.summary}</p>
          <p className="mt-3 text-[15px] text-fg-subtle">
            {CHAPTERS.length} short chapters · about {TOTAL_MINUTES} minutes · no programming
            knowledge needed
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to={chapterHref(next ? next.id : 'recap')}
              className="inline-flex h-12 items-center gap-2 rounded-lg border border-exec-400 bg-exec-500 px-5 text-[16px] font-medium text-ink-950 transition-colors hover:bg-exec-400"
            >
              {!started
                ? 'Start chapter 1'
                : next
                  ? `Continue with chapter ${CHAPTERS.indexOf(next) + 1}`
                  : 'Review what you now know'}
              <ArrowRight size={17} aria-hidden />
            </Link>
            {started && (
              <Link
                to={chapterHref(CHAPTERS[0]!.id)}
                className="inline-flex h-12 items-center rounded-lg border border-ink-500 px-5 text-[15px] text-fg hover:border-ink-400"
              >
                Start from the beginning
              </Link>
            )}
          </div>
          <p className="mt-8 flex items-start gap-2 text-[14.5px] text-fg-muted">
            <Compass size={17} aria-hidden className="mt-0.5 shrink-0 text-exec-300" />
            <span>
              Already know Java? Jump to any chapter, or{' '}
              <Link to="/anatomy" className="text-exec-300 underline underline-offset-2">
                explore the whole JVM
              </Link>
              .
            </span>
          </p>
        </div>
        <ol className="space-y-1" aria-label="Chapters">
          {CHAPTERS.map((chapter, i) => (
            <li key={chapter.id}>
              <Link
                to={chapterHref(chapter.id)}
                className="group flex gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-ink-850"
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-[13px]',
                    chapter.id in done
                      ? 'border-ok-500/60 bg-ok-900/40 text-ok-300'
                      : 'border-ink-500 text-fg-muted',
                  )}
                >
                  {chapter.id in done ? <Check size={15} aria-label="Completed" /> : i + 1}
                </span>
                <span>
                  <span className="block text-[16.5px] font-medium text-fg group-hover:text-exec-200">
                    {chapter.title}
                  </span>
                  <span className="block text-[14.5px] text-fg-muted">{chapter.question}</span>
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              to={chapterHref('recap')}
              className="group flex gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-ink-850"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-ink-500 text-fg-muted">
                <Check size={15} aria-hidden />
              </span>
              <span>
                <span className="block text-[16.5px] font-medium text-fg group-hover:text-exec-200">
                  What you now know
                </span>
                <span className="block text-[14.5px] text-fg-muted">
                  The whole journey, in your own words, and a short check.
                </span>
              </span>
            </Link>
          </li>
        </ol>
      </div>
    </div>
  );
}

function ChapterNav({ current, done }: { current: string; done: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const currentIndex = CHAPTERS.findIndex((chapter) => chapter.id === current);
  const list = (
    <ol className="space-y-0.5">
      {CHAPTERS.map((chapter, i) => (
        <li key={chapter.id}>
          <Link
            to={chapterHref(chapter.id)}
            aria-current={chapter.id === current ? 'page' : undefined}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14.5px] transition-colors',
              chapter.id === current
                ? 'bg-ink-800 text-fg'
                : 'text-fg-muted hover:bg-ink-850 hover:text-fg',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11.5px]',
                chapter.id in done
                  ? 'border-ok-500/60 text-ok-300'
                  : chapter.id === current
                    ? 'border-exec-400 text-exec-200'
                    : 'border-ink-500',
              )}
            >
              {chapter.id in done ? <Check size={13} aria-label="Completed" /> : i + 1}
            </span>
            {chapter.title}
          </Link>
        </li>
      ))}
      <li>
        <Link
          to={chapterHref('recap')}
          aria-current={current === 'recap' ? 'page' : undefined}
          onClick={() => setOpen(false)}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14.5px] transition-colors',
            current === 'recap'
              ? 'bg-ink-800 text-fg'
              : 'text-fg-muted hover:bg-ink-850 hover:text-fg',
          )}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-ink-500">
            <Check size={13} aria-hidden />
          </span>
          What you now know
        </Link>
      </li>
    </ol>
  );

  return (
    <nav aria-label="Lesson chapters" className="lg:sticky lg:top-20 lg:self-start">
      <Link to="/start" className="text-[13.5px] text-fg-subtle hover:text-fg">
        Start here
      </Link>
      <p className="mt-1 font-serif text-[19px] leading-snug text-fg">{LESSON.title}</p>
      <div
        className="mt-3 flex gap-1"
        role="img"
        aria-label={`${Object.keys(done).filter((id) => id !== 'recap').length} of ${CHAPTERS.length} chapters completed`}
      >
        {CHAPTERS.map((chapter, i) => (
          <span
            key={chapter.id}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              chapter.id in done ? 'bg-ok-500' : i === currentIndex ? 'bg-exec-400' : 'bg-ink-600',
            )}
          />
        ))}
      </div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mt-3 inline-flex items-center gap-1.5 text-[14px] text-fg-muted hover:text-fg lg:hidden"
      >
        All chapters
        <ChevronDown
          size={15}
          aria-hidden
          className={cn('transition-transform', open && 'rotate-180')}
        />
      </button>
      <div className={cn('mt-3', open ? 'block' : 'hidden lg:block')}>{list}</div>
    </nav>
  );
}

function ChapterView({
  chapter,
  index,
  done,
}: {
  chapter: LessonChapter;
  index: number;
  done: boolean;
}) {
  const { preferences, setLevel } = usePreferences();
  const [chosen, setChosen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(done);
  // Progress arrives after hydration: a finished chapter opens revealed.
  const [seenDone, setSeenDone] = useState(done);
  if (done !== seenDone) {
    setSeenDone(done);
    if (done) setRevealed(true);
  }
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previous = CHAPTERS[index - 1];
  const next = CHAPTERS[index + 1];

  // After moving between chapters inside the app, put focus on the new chapter's
  // title so screen readers start there. A page opened directly keeps the default.
  useEffect(() => {
    if ((window.history.state as { idx?: number } | null)?.idx === 0) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [chapter.id]);

  const exhibit = (
    <section aria-labelledby={`${chapter.id}-show`} className="mt-10">
      <h2 id={`${chapter.id}-show`} className="text-[20px] font-semibold text-fg">
        {chapter.exhibitFirst ? 'Look closely' : 'See what happens'}
      </h2>
      <div className="mt-1.5 flex items-start gap-2 text-[15.5px] text-fg-muted">
        <Hand size={17} aria-hidden className="mt-1.5 shrink-0 text-exec-300" />
        <RichText className="prose-ij reading" text={chapter.tryIt} />
      </div>
      <div className="mt-4">
        <Exhibit id={chapter.exhibit} />
      </div>
    </section>
  );

  return (
    <article aria-labelledby={`${chapter.id}-title`} className="min-w-0">
      <p className="text-[14.5px] text-fg-subtle">
        Chapter {index + 1} of {CHAPTERS.length} · about {chapter.minutes} minutes
      </p>
      <h1
        id={`${chapter.id}-title`}
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 font-serif text-[36px] leading-[1.1] text-balance text-fg outline-none sm:text-[46px]"
      >
        {chapter.title}
      </h1>
      <p className="mt-3 font-serif text-[22px] leading-snug text-pretty text-fg-muted sm:text-[25px]">
        {chapter.question}
      </p>

      {chapter.exhibitFirst && exhibit}

      <div className="mt-10">
        <PredictionCard
          prediction={chapter.prediction}
          chosen={chosen}
          revealed={revealed}
          onChoose={(id) => {
            setChosen(id);
            setRevealed(true);
          }}
          onSkip={() => setRevealed(true)}
        />
      </div>

      {revealed && (
        <>
          {!chapter.exhibitFirst && exhibit}

          <section aria-labelledby={`${chapter.id}-why`} className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={`${chapter.id}-why`} className="text-[20px] font-semibold text-fg">
                What is going on
              </h2>
              <LevelSwitch value={preferences.level} onChange={setLevel} />
            </div>
            <div className="mt-3">
              <LevelText
                content={chapter.explanation}
                level={preferences.level}
                className="prose-ij reading"
              />
            </div>
          </section>

          <div className="mt-8">
            <TermCard term={chapter.term} />
            <Link
              to={`/anatomy?c=${chapter.component}`}
              className="mt-4 inline-flex items-center gap-2 text-[15px] text-exec-300 underline underline-offset-4 hover:text-exec-200"
            >
              <Compass size={16} aria-hidden className="shrink-0" />
              {getComponentDoc(chapter.component).name} on the JVM map
            </Link>
          </div>

          <section aria-labelledby={`${chapter.id}-check`} className="mt-12">
            <h2 id={`${chapter.id}-check`} className="text-[20px] font-semibold text-fg">
              Check your understanding
            </h2>
            <div className="mt-3">
              <KnowledgeCheck
                compact
                quiz={{
                  id: `lesson:${LESSON.id}:${chapter.id}`,
                  title: chapter.title,
                  questions: [chapter.check],
                }}
              />
            </div>
          </section>

          <details
            className="group mt-12 rounded-xl border border-ink-600 bg-ink-900/50"
            open={preferences.level === 'deep'}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-[16px] font-medium text-fg hover:bg-ink-850 [&::-webkit-details-marker]:hidden">
              Go deeper: the exact model, real output and sources
              <ChevronDown
                size={17}
                aria-hidden
                className="shrink-0 text-fg-subtle transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="space-y-5 border-t border-ink-700 px-4 py-5">
              {preferences.level !== 'deep' && (
                <RichText className="prose-ij" text={chapter.explanation.deep} />
              )}
              {chapter.listings?.map((listing) => (
                <CodeBlock
                  key={listing.id}
                  code={listing.code}
                  language={listing.language}
                  title={listing.title}
                  verifiedWith={listing.verifiedWith}
                />
              ))}
              <AccuracyNote compact text={chapter.accuracyNote} />
              <div>
                <h3 className="mb-2 text-[14px] font-medium text-fg-muted">Sources</h3>
                <SourceList citations={chapter.references} />
              </div>
            </div>
          </details>
        </>
      )}

      <nav
        aria-label="Chapter navigation"
        className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 pt-6"
      >
        {previous ? (
          <Link
            to={chapterHref(previous.id)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] text-fg-muted hover:bg-ink-850 hover:text-fg"
          >
            <ArrowLeft size={16} aria-hidden /> {previous.title}
          </Link>
        ) : (
          <Link
            to="/start"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] text-fg-muted hover:bg-ink-850 hover:text-fg"
          >
            <ArrowLeft size={16} aria-hidden /> All chapters
          </Link>
        )}
        <Link
          to={chapterHref(next ? next.id : 'recap')}
          onClick={() => progressActions.completeChapter(LESSON.id, chapter.id)}
          className="inline-flex h-12 items-center gap-2 rounded-lg border border-exec-400 bg-exec-500 px-5 text-[15.5px] font-medium text-ink-950 transition-colors hover:bg-exec-400"
        >
          {next ? `Next: ${next.title}` : 'Finish: what you now know'}
          <ArrowRight size={17} aria-hidden />
        </Link>
      </nav>
    </article>
  );
}

function Recap() {
  useEffect(() => {
    progressActions.completeChapter(LESSON.id, 'recap');
  }, []);

  return (
    <article aria-labelledby="recap-title" className="min-w-0">
      <p className="text-[14.5px] text-fg-subtle">The end of the first lesson</p>
      <h1
        id="recap-title"
        className="mt-2 font-serif text-[36px] leading-[1.1] text-fg sm:text-[46px]"
      >
        What you now know
      </h1>
      <p className="reading mt-4">
        You followed a Java program all the way from the text you type to the processor that runs
        it. Run the machine once more: by now, every station should make sense.
      </p>

      <div className="mt-8">
        <JourneyMachine />
      </div>

      <section aria-labelledby="recap-steps" className="mt-12">
        <h2 id="recap-steps" className="text-[20px] font-semibold text-fg">
          The journey, chapter by chapter
        </h2>
        <ol className="mt-4 space-y-3">
          {CHAPTERS.map((chapter, i) => (
            <li key={chapter.id} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-500 font-mono text-[12.5px] text-fg-muted">
                {i + 1}
              </span>
              <p className="text-[16.5px] leading-relaxed text-fg-muted">
                <span className="text-fg">{chapter.takeaway}</span>{' '}
                <Link
                  to={chapterHref(chapter.id)}
                  className="whitespace-nowrap text-[14.5px] text-exec-300 underline underline-offset-2 hover:text-exec-200"
                >
                  Revisit {chapter.title.toLowerCase()}
                </Link>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12">
        <TeachBack />
      </div>

      <section aria-labelledby="recap-check" className="mt-12">
        <h2 id="recap-check" className="text-[20px] font-semibold text-fg">
          Five questions to check
        </h2>
        <div className="mt-3">
          <KnowledgeCheck quiz={FIRST_RUN_QUIZ} />
        </div>
      </section>

      <section aria-labelledby="recap-next" className="mt-14 border-t border-ink-700 pt-8">
        <h2 id="recap-next" className="font-serif text-[30px] text-fg">
          Where to go next
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Link
            to="/anatomy?mode=execution&s=new-person"
            className="group rounded-xl border border-exec-500/50 bg-exec-900/20 p-5 transition-colors hover:border-exec-400"
          >
            <p className="text-[13.5px] text-exec-300">Recommended next</p>
            <p className="mt-1 text-[19px] font-medium text-fg">
              Watch <code className="font-mono text-[0.9em]">new Person("Alex")</code> run inside
              the full JVM
            </p>
            <p className="mt-1.5 text-[15px] text-fg-muted">
              The same ideas as chapters 4 and 5, step by step on the complete map, with real
              bytecode.
            </p>
          </Link>
          <Link
            to="/anatomy"
            className="group rounded-xl border border-ink-600 p-5 transition-colors hover:border-ink-400"
          >
            <p className="text-[13.5px] text-fg-subtle">Explore freely</p>
            <p className="mt-1 text-[19px] font-medium text-fg">Explore the whole JVM</p>
            <p className="mt-1.5 text-[15px] text-fg-muted">
              Start with its six main parts, then open the full map of 66 components.
            </p>
          </Link>
        </div>
        <p className="mt-5 text-[15px] text-fg-muted">
          Or choose a{' '}
          <Link to="/paths" className="text-exec-300 underline underline-offset-2">
            learning path
          </Link>{' '}
          that starts with a question you have.
        </p>
      </section>
    </article>
  );
}
