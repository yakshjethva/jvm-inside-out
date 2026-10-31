import { ArrowRight, Check, Clock3 } from 'lucide-react';
import { lazy, Suspense, useCallback, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { InlineRichText, RichText } from '@/components/learning/RichText';
import { ButtonLink } from '@/components/ui/Button';
import { COMPONENT_LIST, descendantCount, getComponentDoc, type ComponentId } from '@/content/jvm';
import { ATLAS_AREAS } from '@/content/jvm/regions';
import { SCENARIOS } from '@/content/jvm/scenarios';
import { FIRST_RUN } from '@/content/lesson/firstRun';
import { TOPICS } from '@/content/topics';
import { REFERENCE_IDS } from '@/data/references';
import { SITE } from '@/data/site';
import { useProgress } from '@/hooks/useLearningState';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/cn';
import { HOME_EXHIBITS } from '@/modules/home/exhibits';
import { HeroMachine } from '@/modules/home/HeroMachine';
import { JourneyMachine } from '@/modules/journey/JourneyMachine';

// The full plate loads only when its section comes near the viewport.
const AnatomyPreview = lazy(() =>
  import('@/modules/jvm/AnatomyPreview').then((m) => ({ default: m.AnatomyPreview })),
);

const CHAPTERS = FIRST_RUN.chapters;
const LESSON_MINUTES = CHAPTERS.reduce((sum, chapter) => sum + chapter.minutes, 0);

/** The concept shown at all three levels: short enough to compare side by side. */
const LEVELS_EXAMPLE: ComponentId = 'stack-frame';

/** Guides linked from the learning journey: the questions people ask first. */
const FIRST_GUIDES = ['what-is-the-jvm', 'heap-vs-stack', 'interpreter-vs-jit-compiler'];

/**
 * Mounts its children only when the placeholder comes near the viewport, so a
 * visitor who never scrolls that far does not download or render them.
 * Without IntersectionObserver the children mount as soon as the page does.
 */
function WhenNearViewport({
  children,
  fallback,
  className,
}: {
  children: ReactNode;
  fallback: ReactNode;
  className?: string;
}) {
  // Never during the server render or hydration: the preview is client-only.
  const [near, setNear] = useState(false);
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element || near) return;
      if (typeof IntersectionObserver === 'undefined') {
        setNear(true);
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setNear(true);
            observer.disconnect();
          }
        },
        { rootMargin: '400px 0px' },
      );
      observer.observe(element);
      return () => observer.disconnect();
    },
    [near],
  );
  return (
    <div ref={ref} className={className}>
      {near ? children : fallback}
    </div>
  );
}

const MAP_FALLBACK = (
  <div className="flex h-full items-center justify-center text-[14px] text-fg-subtle">
    Loading the map…
  </div>
);

/** A numbered section heading in the atlas's editorial style. */
function SectionHeading({
  id,
  number,
  label,
  children,
}: {
  id: string;
  number: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-3 font-mono text-[12px] text-fg-subtle">
        <span aria-hidden>{String(number).padStart(2, '0')}</span>
        <span aria-hidden className="h-px w-8 bg-ink-500" />
        {label}
      </p>
      <h2
        id={id}
        className="mt-3 font-serif text-[32px] leading-[1.1] text-balance text-fg sm:text-[40px]"
      >
        {children}
      </h2>
    </div>
  );
}

const linkClass =
  'inline-flex items-center gap-1.5 text-exec-300 underline decoration-exec-500/40 underline-offset-4 hover:text-exec-200 hover:decoration-exec-300';

export function HomePage() {
  usePageTitle();
  const progress = useProgress();
  const done = progress.lessons[FIRST_RUN.id] ?? {};
  const nextChapter = CHAPTERS.find((chapter) => !(chapter.id in done));
  const started = CHAPTERS.some((chapter) => chapter.id in done);
  const finished = !nextChapter;
  const levelsDoc = getComponentDoc(LEVELS_EXAMPLE);

  return (
    <>
      {/* 1. Hero: what this is, with the machine it explains */}
      <section
        aria-labelledby="home-title"
        className="surface-instrument blueprint border-b border-ink-700 bg-ink-950"
      >
        <div className="mx-auto grid max-w-[1320px] gap-12 px-4 pt-14 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:pt-20 lg:pb-20">
          <div>
            <p className="text-[14px] text-fg-muted">
              An independent atlas of the Java Virtual Machine
            </p>
            <h1
              id="home-title"
              className="mt-4 font-serif text-[42px] leading-[1.04] tracking-tight text-balance text-fg sm:text-[60px]"
            >
              Explore the machine behind every Java program.
            </h1>
            <p className="mt-6 max-w-[34rem] text-[18px] leading-relaxed text-fg-muted sm:text-[19px]">
              Understand the Java Virtual Machine from the first instruction to the runtime systems
              that execute it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink to="/anatomy" variant="primary" size="lg">
                Explore the anatomy <ArrowRight size={17} aria-hidden />
              </ButtonLink>
              <ButtonLink to="/start" variant="secondary" size="lg">
                Start with the basics
              </ButtonLink>
            </div>
            {started && nextChapter && (
              <p className="mt-5 text-[15px] text-fg-muted">
                Welcome back.{' '}
                <Link
                  to={`/start?chapter=${nextChapter.id}`}
                  className="text-exec-300 underline underline-offset-2 hover:text-exec-200"
                >
                  Continue with chapter {CHAPTERS.indexOf(nextChapter) + 1}: {nextChapter.title}
                </Link>
              </p>
            )}
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-fg-subtle">
              <li>{SITE.specVersion} specifications</li>
              <li>{SITE.implementationVersion}</li>
              <li>Free and open source</li>
              <li>Works offline</li>
            </ul>
          </div>
          <HeroMachine className="mx-auto w-full max-w-[560px]" />
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        {/* 2. Interactive architecture preview */}
        <section
          aria-labelledby="architecture"
          className="grid gap-10 py-16 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:py-24"
        >
          <div>
            <SectionHeading id="architecture" number={2} label="Architecture">
              The whole machine on one plate
            </SectionHeading>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-fg-muted">
              {COMPONENT_LIST.length} components, from the class file to the processor, drawn where
              they belong and connected by what flows between them. Select any part to see what it
              is.
            </p>
            <ul className="mt-6 space-y-2.5 text-[16px]">
              <li>
                <Link to="/anatomy?view=overview" className={linkClass}>
                  Start from the six regions <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
              <li>
                <Link to="/anatomy?view=full" className={linkClass}>
                  Open the full map <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
            </ul>
            {progress.recent.length > 0 && (
              <div className="mt-8">
                <p
                  id="home-recently-explored"
                  className="flex items-center gap-1.5 text-[14px] text-fg-muted"
                >
                  <Clock3 size={14} aria-hidden /> Recently explored
                </p>
                <ul aria-labelledby="home-recently-explored" className="mt-2 flex flex-wrap gap-2">
                  {progress.recent.slice(0, 6).map((item) => (
                    <li key={item.key}>
                      <Link
                        to={item.href}
                        className="inline-block rounded-md border border-ink-600 bg-raised px-2.5 py-1 text-[14px] text-fg-muted hover:border-exec-400 hover:text-fg"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <WhenNearViewport
            className="surface-instrument h-[360px] overflow-hidden rounded-2xl border border-ink-600 bg-ink-950 shadow-case sm:h-[480px]"
            fallback={MAP_FALLBACK}
          >
            <Suspense fallback={MAP_FALLBACK}>
              <AnatomyPreview />
            </Suspense>
          </WhenNearViewport>
        </section>

        {/* 3. Three levels of explanation */}
        <section aria-labelledby="levels" className="border-t border-ink-700 py-16 lg:py-24">
          <SectionHeading id="levels" number={3} label="Three depths">
            One machine, explained at the depth you need
          </SectionHeading>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-fg-muted">
            Every part has three explanations of the same facts. Choose your level from the menu at
            the top of any page; it applies everywhere. Here is the {levelsDoc.name.toLowerCase()}{' '}
            at each one.
          </p>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {(
              [
                ['Simple', 'No programming needed', levelsDoc.simple],
                ['Developer', 'Code, APIs and what you observe', levelsDoc.developer],
                ['Deep dive', 'Specification sections and HotSpot structures', levelsDoc.deep],
              ] as const
            ).map(([level, audience, text]) =>
              text ? (
                <article
                  key={level}
                  aria-labelledby={`level-${level}`}
                  className="rounded-xl border border-ink-600 bg-raised p-6 shadow-raised"
                >
                  <h3 id={`level-${level}`} className="text-[18px] font-semibold text-fg">
                    {level}
                  </h3>
                  <p className="mt-0.5 text-[13.5px] text-fg-subtle">{audience}</p>
                  <RichText
                    className="prose-ij mt-4 text-[15.5px] leading-relaxed text-fg-muted"
                    text={text}
                  />
                </article>
              ) : null,
            )}
          </div>
          <Link to={`/anatomy?c=${LEVELS_EXAMPLE}`} className={cn(linkClass, 'mt-6 text-[16px]')}>
            Open the {levelsDoc.name.toLowerCase()} in the atlas{' '}
            <ArrowRight size={14} aria-hidden />
          </Link>
        </section>

        {/* 4. The major subsystems */}
        <section aria-labelledby="subsystems" className="border-t border-ink-700 py-16 lg:py-24">
          <SectionHeading id="subsystems" number={4} label="Subsystems">
            Seven areas, from source code to processor
          </SectionHeading>
          <ol className="mt-10 grid gap-x-10 gap-y-2 md:grid-cols-2">
            {ATLAS_AREAS.map((area, index) => {
              const outside = getComponentDoc(area.id).provenance === 'platform';
              return (
                <li key={area.id}>
                  <Link
                    to={`/anatomy?c=${area.id}`}
                    className="group grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-t border-ink-700 py-5"
                  >
                    <span className="pt-1 font-mono text-[13px] text-fg-subtle" aria-hidden>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="flex flex-wrap items-baseline gap-x-3">
                        <span className="text-[19px] font-semibold text-fg group-hover:text-exec-300">
                          {area.title}
                        </span>
                        <span className="text-[13px] text-fg-subtle">
                          {descendantCount(area.id)} parts inside
                          {outside && ' · outside the JVM'}
                        </span>
                      </span>
                      <span className="mt-1 block max-w-[34rem] text-[15.5px] leading-relaxed text-fg-muted">
                        {area.role}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        {/* 5. Guided learning journey */}
        <section
          aria-labelledby="journey"
          className="grid gap-12 border-t border-ink-700 py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-24"
        >
          <div>
            <SectionHeading id="journey" number={5} label="Start here">
              Follow one line of Java to the processor
            </SectionHeading>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-fg-muted">
              <span className="text-fg">{FIRST_RUN.title}</span> Seven short chapters, about{' '}
              {LESSON_MINUTES} minutes, no programming knowledge needed. Each one asks you to
              predict, shows you what really happens, and checks that it made sense.
            </p>
            <ButtonLink
              to={
                finished
                  ? '/start?chapter=recap'
                  : started && nextChapter
                    ? `/start?chapter=${nextChapter.id}`
                    : '/start'
              }
              variant="primary"
              className="mt-6"
            >
              {finished
                ? 'Review what you now know'
                : started && nextChapter
                  ? `Continue with chapter ${CHAPTERS.indexOf(nextChapter) + 1}`
                  : 'Begin the first lesson'}
              <ArrowRight size={16} aria-hidden />
            </ButtonLink>
            <ol className="mt-10 grid gap-y-1" aria-label="Chapters of the first lesson">
              {CHAPTERS.map((chapter, i) => (
                <li key={chapter.id}>
                  <Link
                    to={`/start?chapter=${chapter.id}`}
                    className="group flex gap-3.5 rounded-lg px-2 py-2.5 hover:bg-ink-850"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[12.5px]',
                        chapter.id in done
                          ? 'border-ok-500/60 text-ok-300'
                          : 'border-ink-500 text-fg-muted',
                      )}
                    >
                      {chapter.id in done ? <Check size={14} aria-label="Completed" /> : i + 1}
                    </span>
                    <span>
                      <span className="block text-[16px] font-medium text-fg group-hover:text-exec-300">
                        {chapter.title}
                      </span>
                      <span className="block text-[14.5px] text-fg-muted">{chapter.question}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
          <div className="min-w-0">
            <JourneyMachine />
            <div className="mt-8">
              <p className="text-[14px] text-fg-muted">Or start from a question</p>
              <ul className="mt-2 space-y-2 text-[16px]">
                {FIRST_GUIDES.map((slug) => TOPICS.find((topic) => topic.slug === slug)!).map(
                  (topic) => (
                    <li key={topic.slug}>
                      <Link to={`/learn/${topic.slug}`} className={linkClass}>
                        {topic.question} <ArrowRight size={14} aria-hidden />
                      </Link>
                    </li>
                  ),
                )}
                <li>
                  <Link to="/learn" className={linkClass}>
                    All guides and learning paths <ArrowRight size={14} aria-hidden />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 6. Selected technical exhibits */}
        <section aria-labelledby="exhibits" className="border-t border-ink-700 py-16 lg:py-24">
          <SectionHeading id="exhibits" number={6} label="Exhibits">
            Watch it run, then look inside
          </SectionHeading>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-fg-muted">
            Step through real programs with their verified{' '}
            <code className="font-mono text-[0.9em] text-fg">javap</code> output, or open a part and
            see its internal structure.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HOME_EXHIBITS.map((exhibit) => {
              const scenario =
                exhibit.kind === 'walkthrough'
                  ? SCENARIOS.find((item) => item.id === exhibit.id)
                  : undefined;
              const doc = scenario ? null : getComponentDoc(exhibit.id as ComponentId);
              return (
                <li key={exhibit.to}>
                  <Link
                    to={exhibit.to}
                    className="group flex h-full flex-col rounded-xl border border-ink-600 bg-raised p-5 shadow-raised transition-colors hover:border-exec-400"
                  >
                    <span className="text-[13px] text-fg-subtle">
                      {scenario
                        ? `Walkthrough · ${scenario.steps.length} steps`
                        : 'Look inside a part'}
                    </span>
                    <span className="mt-2 text-[17px] leading-snug font-semibold text-fg group-hover:text-exec-300">
                      {scenario ? (
                        <InlineRichText text={scenario.title} />
                      ) : (
                        `Inside the ${doc!.name.toLowerCase()}`
                      )}
                    </span>
                    <span className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">
                      {scenario ? <InlineRichText text={scenario.summary} /> : doc!.summary}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 7. Accuracy and sources */}
        <section
          aria-labelledby="accuracy"
          className="grid gap-10 border-t border-ink-700 py-16 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:py-24"
        >
          <SectionHeading id="accuracy" number={7} label="Accuracy">
            Simple is short, never false
          </SectionHeading>
          <div className="max-w-2xl">
            <div className="space-y-4 text-[17px] leading-relaxed text-fg-muted">
              <p>
                Every simplified picture says what it leaves out, and every analogy says where it
                stops being true. Bytecode, logs and numbers come from running a real JDK (OpenJDK
                25.0.4), never from memory.
              </p>
              <p>
                What the Java specification requires is kept apart from how OpenJDK’s HotSpot JVM
                happens to do it, and the drawings say which is which:
              </p>
            </div>
            <ul className="mt-5 space-y-3 text-[15.5px] text-fg-muted">
              {(
                [
                  [undefined, 'Specification: what every JVM must do'],
                  ['6 4', 'HotSpot: how OpenJDK’s JVM does it (marked HS)'],
                  ['1.5 3.5', 'Platform and build time: outside the JVM'],
                ] as const
              ).map(([dash, label]) => (
                <li key={label} className="flex items-center gap-3">
                  <svg width="44" height="10" aria-hidden className="shrink-0">
                    <line
                      x1="1"
                      y1="5"
                      x2="43"
                      y2="5"
                      stroke="var(--color-fg-muted)"
                      strokeWidth="2"
                      strokeDasharray={dash}
                      strokeLinecap="round"
                    />
                  </svg>
                  {label}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[17px] leading-relaxed text-fg-muted">
              Every claim cites its source: {REFERENCE_IDS.length} primary sources, from the{' '}
              {SITE.specVersion} specifications to the OpenJDK source code.{' '}
              <Link
                to="/references"
                className="text-exec-300 underline underline-offset-2 hover:text-exec-200"
              >
                Browse the references
              </Link>{' '}
              or{' '}
              <Link
                to="/about"
                className="text-exec-300 underline underline-offset-2 hover:text-exec-200"
              >
                read the accuracy policy
              </Link>
              .
            </p>
          </div>
        </section>

        {/* 8. About and contributing */}
        <section
          aria-labelledby="project"
          className="grid gap-10 border-t border-ink-700 py-16 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:py-24"
        >
          <SectionHeading id="project" number={8} label="The project">
            Independent, free and open
          </SectionHeading>
          <div className="max-w-2xl">
            <p className="text-[17px] leading-relaxed text-fg-muted">
              {SITE.name} has no accounts, no tracking and no backend: your progress stays in your
              browser. The content and code are open source, and corrections are welcome.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-[16px]">
              <li>
                <Link to="/about" className={linkClass}>
                  About the project <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
              <li>
                <Link to="/contributing" className={linkClass}>
                  Contribute <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
              <li>
                <a
                  href={SITE.repository}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={linkClass}
                >
                  Source code on GitHub<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
