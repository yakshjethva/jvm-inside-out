import {
  ArrowRight,
  Bookmark,
  Check,
  Clock3,
  Map as MapIcon,
  Microscope,
  Play,
  Sparkles,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { InlineRichText } from '@/components/learning/RichText';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { COMPONENT_LIST } from '@/content/jvm';
import { FIRST_RUN } from '@/content/lesson/firstRun';
import { LEARNING_PATHS } from '@/content/paths';
import { QUESTION_PATHS, type QuestionPath } from '@/content/questions';
import { TOPICS } from '@/content/topics';
import { useProgress } from '@/hooks/useLearningState';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/cn';

const KIND_ICON = {
  lesson: Sparkles,
  map: MapIcon,
  walkthrough: Play,
  inside: Microscope,
};

export function LearningPathsPage() {
  usePageTitle('Learn');
  const progress = useProgress();
  const location = useLocation();
  const done = progress.lessons[FIRST_RUN.id] ?? {};
  const chaptersDone = FIRST_RUN.chapters.filter((chapter) => chapter.id in done).length;
  const next = FIRST_RUN.chapters.find((chapter) => !(chapter.id in done));
  const explored = Object.keys(progress.explored).length;

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.hash]);

  return (
    <>
      <PageHeader kicker="Learn" title="Start with a question">
        <p>
          Each path begins with something you might already wonder about, and goes as deep as you
          like. If you are new, begin with the first one: everything else builds on it.
        </p>
      </PageHeader>

      <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6">
        {/* The first question */}
        <section
          aria-labelledby="first-question"
          className="grid gap-8 rounded-2xl border border-exec-500/40 bg-ink-900/60 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
        >
          <div>
            <p className="text-[14px] text-exec-300">Begin here · about 21 minutes</p>
            <h2
              id="first-question"
              className="mt-2 font-serif text-[32px] leading-tight text-fg sm:text-[38px]"
            >
              {FIRST_RUN.title}
            </h2>
            <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-fg-muted">
              {FIRST_RUN.summary}
            </p>
            <ButtonLink
              to={
                chaptersDone === 0
                  ? '/start'
                  : next
                    ? `/start?chapter=${next.id}`
                    : '/start?chapter=recap'
              }
              variant="primary"
              size="lg"
              className="mt-6"
            >
              {chaptersDone === 0
                ? 'Start the first lesson'
                : next
                  ? `Continue with chapter ${FIRST_RUN.chapters.indexOf(next) + 1}`
                  : 'Review what you learned'}
              <ArrowRight size={17} aria-hidden />
            </ButtonLink>
          </div>
          <ol className="space-y-1 self-center" aria-label="Chapters">
            {FIRST_RUN.chapters.map((chapter, i) => (
              <li key={chapter.id}>
                <Link
                  to={`/start?chapter=${chapter.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-[15px] text-fg-muted hover:bg-ink-850 hover:text-fg"
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11.5px]',
                      chapter.id in done ? 'border-ok-500/60 text-ok-300' : 'border-ink-500',
                    )}
                  >
                    {chapter.id in done ? <Check size={13} aria-label="Completed" /> : i + 1}
                  </span>
                  {chapter.title}
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* Guides: one page per common question */}
        <section aria-labelledby="guides" className="mt-16">
          <h2 id="guides" className="font-serif text-[30px] text-fg">
            Guides: short answers, then the whole story
          </h2>
          <p className="mt-2 max-w-2xl text-[16px] text-fg-muted">
            Each guide answers one question simply, then in practice, then in depth, and links to
            the part of the machine that shows it.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {TOPICS.map((topic) => (
              <li key={topic.slug}>
                <Link
                  to={`/learn/${topic.slug}`}
                  className="group block h-full rounded-xl border border-ink-600 bg-raised p-5 shadow-raised transition-colors hover:border-exec-400"
                >
                  <span className="block text-[17px] font-semibold text-fg group-hover:text-exec-300">
                    {topic.title}
                  </span>
                  <span className="mt-1 block text-[14.5px] leading-relaxed text-fg-muted">
                    {topic.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Next questions */}
        <section aria-labelledby="next-questions" className="mt-16">
          <h2 id="next-questions" className="font-serif text-[30px] text-fg">
            Then follow your curiosity
          </h2>
          <p className="mt-2 max-w-2xl text-[16px] text-fg-muted">
            In a sensible order, but take them in any order you like. Each links to what answers it
            today; dedicated laboratories are on their way.
          </p>
          <ol className="mt-8 grid gap-5 md:grid-cols-2">
            {QUESTION_PATHS.map((path, i) => (
              <QuestionCard key={path.id} path={path} number={i + 2} />
            ))}
          </ol>
        </section>

        {/* Progress */}
        <section aria-labelledby="your-progress" className="mt-16 border-t border-ink-700 pt-10">
          <h2 id="your-progress" className="font-serif text-[26px] text-fg">
            Your progress
          </h2>
          <p className="mt-1 text-[14px] text-fg-subtle">Stored only in this browser.</p>
          <dl className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[13.5px] text-fg-muted">First lesson</dt>
              <dd className="mt-0.5 text-[22px] text-fg tabular">
                {chaptersDone} / {FIRST_RUN.chapters.length} chapters
              </dd>
            </div>
            <div>
              <dt className="text-[13.5px] text-fg-muted">Parts of the JVM explored</dt>
              <dd className="mt-0.5 text-[22px] text-fg tabular">
                {explored} / {COMPONENT_LIST.length}
              </dd>
            </div>
            <div>
              <dt className="text-[13.5px] text-fg-muted">Marked as understood</dt>
              <dd className="mt-0.5 text-[22px] text-fg tabular">
                {Object.keys(progress.understood).length}
              </dd>
            </div>
          </dl>
          {progress.bookmarks.length > 0 && (
            <div className="mt-6">
              <p className="flex items-center gap-1.5 text-[14px] text-fg-muted">
                <Bookmark size={14} aria-hidden /> Bookmarks
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {progress.bookmarks.map((item) => (
                  <li key={item.key}>
                    <Link
                      to={item.href}
                      className="inline-block rounded-md border border-ink-600 px-2.5 py-1 text-[13.5px] text-fg-muted hover:border-exec-400 hover:text-fg"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {progress.recent.length > 0 && (
            <div className="mt-6">
              <p
                id="recently-explored"
                className="flex items-center gap-1.5 text-[14px] text-fg-muted"
              >
                <Clock3 size={14} aria-hidden /> Recently explored
              </p>
              <ul aria-labelledby="recently-explored" className="mt-2 flex flex-wrap gap-2">
                {progress.recent.map((item) => (
                  <li key={item.key}>
                    <Link
                      to={item.href}
                      className="inline-block rounded-md border border-ink-600 px-2.5 py-1 text-[13.5px] text-fg-muted hover:border-exec-400 hover:text-fg"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* The full curriculum, for reference */}
        <section aria-labelledby="curriculum" className="mt-16 border-t border-ink-700 pt-10">
          <h2 id="curriculum" className="font-serif text-[26px] text-fg">
            The full curriculum, by subject
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] text-fg-muted">
            For readers who prefer to work through the JVM topic by topic. Laboratories are released
            one milestone at a time and are linked only once they work.
          </p>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {LEARNING_PATHS.map((path) => (
              <li
                key={path.id}
                id={path.id}
                className="scroll-mt-20 rounded-xl border border-ink-600 bg-ink-900/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-[16.5px] font-medium text-fg">
                    {path.route ? (
                      <Link to={path.route} className="hover:text-exec-200">
                        {path.title}
                      </Link>
                    ) : (
                      path.title
                    )}
                  </h3>
                  {path.route ? (
                    <Badge tone="ok">Available</Badge>
                  ) : (
                    <Badge>In development · {path.milestone}</Badge>
                  )}
                </div>
                <p className="mt-1.5 text-[14px] text-fg-muted">
                  <InlineRichText text={path.summary} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function QuestionCard({ path, number }: { path: QuestionPath; number: number }) {
  return (
    <li
      id={`question-${path.id}`}
      className="scroll-mt-20 rounded-xl border border-ink-600 bg-ink-900/40 p-5"
    >
      <p className="font-mono text-[12.5px] text-fg-subtle">{number}</p>
      <h3 className="mt-1 font-serif text-[23px] leading-snug text-fg">{path.question}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
        <InlineRichText text={path.summary} />
      </p>
      {path.now.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {path.now.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="group inline-flex items-start gap-2 text-[14.5px] text-exec-300 hover:text-exec-200"
                >
                  <Icon size={15} aria-hidden className="mt-1 shrink-0" />
                  <span className="underline decoration-exec-500/40 underline-offset-4 group-hover:decoration-exec-300">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {path.later && (
        <p className="mt-3 text-[13.5px] text-fg-subtle">
          Coming later: {path.later.label} ({path.later.milestone})
        </p>
      )}
    </li>
  );
}
