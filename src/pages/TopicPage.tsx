import { ArrowRight, ChevronRight, Compass, Map as MapIcon, PlayCircle } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { CodeBlock } from '@/components/code/CodeBlock';
import { RichText } from '@/components/learning/RichText';
import { SourceList } from '@/components/learning/SourceReference';
import { Badge } from '@/components/ui/Badge';
import { getComponentDoc } from '@/content/jvm';
import { JVM_REGIONS } from '@/content/jvm/regions';
import { SCENARIOS } from '@/content/jvm/scenarios';
import { FIRST_RUN } from '@/content/lesson/firstRun';
import { TOPICS, topicBySlug, type Topic, type TopicBlock } from '@/content/topics';
import { getGlossaryEntry } from '@/glossary';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { ComponentId } from '@/content/jvm/ids';
import type { ComponentDoc } from '@/types/content';
import { NotFoundPage } from './NotFoundPage';

const PROVENANCE_LABEL: Record<ComponentDoc['provenance'], string> = {
  spec: 'JVM specification',
  hotspot: 'HotSpot · JDK 25',
  platform: 'Outside the JVM',
};
const PROVENANCE_TONE = { spec: 'rt', hotspot: 'exec', platform: 'plat' } as const;

/** A guide: one question, answered with the atlas's existing, verified content. */
export function TopicPage() {
  const { slug } = useParams();
  const topic = topicBySlug(slug);
  if (!topic) return <NotFoundPage />;
  return <Guide topic={topic} />;
}

function Guide({ topic }: { topic: Topic }) {
  usePageTitle(topic.title);
  const explore = getComponentDoc(topic.explore);
  const chapter = FIRST_RUN.chapters.find((c) => c.id === topic.chapter);
  const chapterNumber = chapter ? FIRST_RUN.chapters.indexOf(chapter) + 1 : 0;
  const scenario = SCENARIOS.find((s) => s.id === topic.scenario);
  const related = topic.related
    .map((slug) => TOPICS.find((t) => t.slug === slug))
    .filter((t): t is Topic => Boolean(t));

  return (
    <article className="mx-auto w-full max-w-[1180px] px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
      <nav aria-label="Breadcrumb" className="text-[13.5px] text-fg-subtle">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to="/" className="hover:text-fg">
              Home
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link to="/learn" className="hover:text-fg">
              Learn
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="text-fg-muted">
            {topic.title}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <header>
            <p className="text-[14px] font-medium text-exec-300">Guide</p>
            <h1 className="mt-2 font-serif text-[36px] leading-[1.1] text-balance text-fg sm:text-[46px]">
              {topic.question}
            </h1>
            <p className="mt-4 max-w-[40rem] text-[18px] leading-relaxed text-fg-muted">
              {topic.description}
            </p>
          </header>

          {topic.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}

          {related.length > 0 && (
            <section aria-labelledby="related" className="mt-16 border-t border-ink-700 pt-8">
              <h2 id="related" className="text-[20px] font-semibold text-fg">
                Related guides
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {related.map((t) => (
                  <li key={t.slug}>
                    <Link
                      to={`/learn/${t.slug}`}
                      className="block h-full rounded-xl border border-ink-600 bg-raised p-4 shadow-raised transition-colors hover:border-exec-400"
                    >
                      <span className="block text-[15px] font-medium text-fg">{t.title}</span>
                      <span className="mt-1 block text-[13.5px] text-fg-muted">{t.question}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside aria-label="In the atlas" className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-ink-600 bg-raised p-4 shadow-raised">
            <p className="text-[13px] font-medium text-fg-muted">See it in the atlas</p>
            <ul className="mt-3 space-y-2.5 text-[14.5px]">
              <li>
                <Link
                  to={`/anatomy?c=${explore.id}`}
                  className="flex items-start gap-2 text-exec-300 hover:text-exec-200"
                >
                  <MapIcon size={16} aria-hidden className="mt-0.5 shrink-0" />
                  <span>{explore.name} on the JVM map</span>
                </Link>
              </li>
              {scenario && (
                <li>
                  <Link
                    to={`/anatomy?mode=execution&s=${scenario.id}`}
                    className="flex items-start gap-2 text-exec-300 hover:text-exec-200"
                  >
                    <PlayCircle size={16} aria-hidden className="mt-0.5 shrink-0" />
                    <span>Watch it run: {scenario.title.replace(/`/g, '')}</span>
                  </Link>
                </li>
              )}
              {chapter && (
                <li>
                  <Link
                    to={`/start?chapter=${chapter.id}`}
                    className="flex items-start gap-2 text-exec-300 hover:text-exec-200"
                  >
                    <Compass size={16} aria-hidden className="mt-0.5 shrink-0" />
                    <span>
                      Step by step: chapter {chapterNumber}, {chapter.title}
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </article>
  );
}

function Block({ block }: { block: TopicBlock }) {
  switch (block.kind) {
    case 'component':
      return <ComponentSection doc={getComponentDoc(block.id)} heading={block.heading} />;
    case 'journey':
      return <JourneySection />;
    case 'regions':
      return <RegionsSection />;
    case 'provenance':
      return <ProvenanceSection ids={block.ids} />;
    case 'terms':
      return <TermsSection heading={block.heading} ids={block.ids} />;
  }
}

const sectionClass = 'mt-14 border-t border-ink-700 pt-8';
const h2Class = 'font-serif text-[28px] leading-tight text-fg sm:text-[32px]';
const h3Class = 'mt-6 text-[17px] font-semibold text-fg';

function ComponentSection({ doc, heading }: { doc: ComponentDoc; heading?: string }) {
  const id = `c-${doc.id}`;
  return (
    <section aria-labelledby={id} className={sectionClass}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={id} className={h2Class}>
          {heading ?? doc.name}
        </h2>
        <Badge tone={PROVENANCE_TONE[doc.provenance]} dashed={doc.provenance === 'hotspot'}>
          {PROVENANCE_LABEL[doc.provenance]}
        </Badge>
      </div>
      <p className="mt-3 max-w-[40rem] text-[17px] leading-relaxed text-fg">{doc.summary}</p>

      <h3 className={h3Class}>Simply put</h3>
      <RichText className="prose-ij reading mt-2" text={doc.simple} />
      {doc.developer && (
        <>
          <h3 className={h3Class}>What a developer sees</h3>
          <RichText className="prose-ij reading mt-2" text={doc.developer} />
        </>
      )}

      {doc.analogy && (
        <div className="mt-6 max-w-[40rem] rounded-xl border border-ink-600 bg-ink-900 p-4">
          <h3 className="text-[15px] font-semibold text-fg">Picture it</h3>
          <RichText className="prose-ij mt-1" text={doc.analogy.picture} />
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14.5px]">
            {doc.analogy.mapping.map((pair) => (
              <div key={pair.picture} className="contents">
                <dt className="text-fg-muted">{pair.picture}</dt>
                <dd className="text-fg">
                  <RichText text={pair.real} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[13.5px] font-medium text-warn-300">
            Where the picture stops working
          </p>
          <RichText className="prose-ij mt-0.5" text={doc.analogy.limits} />
        </div>
      )}

      <details className="group mt-6 max-w-[44rem] rounded-xl border border-ink-600">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-[15.5px] font-medium text-fg hover:bg-ink-900 [&::-webkit-details-marker]:hidden">
          <ChevronRight
            size={16}
            aria-hidden
            className="shrink-0 text-fg-subtle transition-transform group-open:rotate-90"
          />
          Deep dive: the specification and HotSpot in detail
        </summary>
        <div className="space-y-5 border-t border-ink-700 px-4 py-5">
          <RichText className="prose-ij" text={doc.deep} />
          {doc.specVsImpl && <SpecVsImpl doc={doc} />}
          {doc.example && (
            <CodeBlock
              code={doc.example.code}
              language={doc.example.language}
              title={doc.example.title}
              verifiedWith={doc.example.verifiedWith}
            />
          )}
        </div>
      </details>

      {doc.misconceptions.length > 0 && (
        <>
          <h3 className={h3Class}>Common misconceptions</h3>
          <ul className="mt-2 max-w-[40rem] space-y-3">
            {doc.misconceptions.map((item) => (
              <li key={item.myth} className="text-[15px]">
                <p className="text-fg-muted line-through decoration-warn-400/70">{item.myth}</p>
                <RichText className="prose-ij mt-0.5" text={item.truth} />
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className={h3Class}>Sources</h3>
      <div className="mt-2 max-w-[44rem]">
        <SourceList citations={doc.references} />
      </div>
    </section>
  );
}

function SpecVsImpl({ doc }: { doc: ComponentDoc }) {
  if (!doc.specVsImpl) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-rt-700 bg-rt-900 p-3">
        <p className="text-[13px] font-semibold text-rt-300">The specification requires</p>
        <RichText className="prose-ij mt-1" text={doc.specVsImpl.spec} />
      </div>
      <div className="rounded-lg border border-dashed border-exec-700 bg-exec-900 p-3">
        <p className="text-[13px] font-semibold text-exec-300">HotSpot (JDK 25) does</p>
        <RichText className="prose-ij mt-1" text={doc.specVsImpl.implementation} />
      </div>
    </div>
  );
}

function JourneySection() {
  return (
    <section aria-labelledby="journey" className={sectionClass}>
      <h2 id="journey" className={h2Class}>
        From source code to output, step by step
      </h2>
      <ol className="mt-6 space-y-8">
        {FIRST_RUN.chapters.map((chapter, index) => (
          <li key={chapter.id} className="grid gap-4 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-500 font-mono text-[13px] text-fg-muted"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-[19px] font-semibold text-fg">{chapter.title}</h3>
              <p className="mt-0.5 font-serif text-[18px] text-fg-muted">{chapter.question}</p>
              <RichText className="prose-ij reading mt-2" text={chapter.explanation.simple} />
              <p className="mt-2 text-[14.5px] text-fg">
                <span className="font-medium">In one sentence:</span> {chapter.takeaway}
              </p>
              <Link
                to={`/start?chapter=${chapter.id}`}
                className="mt-2 inline-flex items-center gap-1 text-[14.5px] text-exec-300 underline underline-offset-2 hover:text-exec-200"
              >
                Try chapter {index + 1} <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RegionsSection() {
  return (
    <section aria-labelledby="regions" className={sectionClass}>
      <h2 id="regions" className={h2Class}>
        The main parts
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {JVM_REGIONS.map((region) => {
          const doc = getComponentDoc(region.id);
          return (
            <li
              key={region.id}
              className="rounded-xl border border-ink-600 bg-raised p-4 shadow-raised"
            >
              <h3 className="text-[17px] font-semibold text-fg">{region.title}</h3>
              <p className="mt-1 text-[15px] text-fg-muted">{region.role}</p>
              <p className="mt-2 text-[14px] text-fg-subtle">
                On the map: {doc.name}. {doc.summary}
              </p>
              <Link
                to={`/anatomy?c=${region.id}`}
                className="mt-2 inline-flex items-center gap-1 text-[14px] text-exec-300 underline underline-offset-2 hover:text-exec-200"
              >
                Open {region.title.toLowerCase()} <ArrowRight size={13} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProvenanceSection({ ids }: { ids: ComponentId[] }) {
  return (
    <section aria-labelledby="provenance" className={sectionClass}>
      <h2 id="provenance" className={h2Class}>
        Part by part: what is required, what HotSpot chooses
      </h2>
      <div className="mt-6 space-y-6">
        {ids.map((id) => {
          const doc = getComponentDoc(id);
          return (
            <div key={id}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[18px] font-semibold text-fg">{doc.name}</h3>
                <Badge tone={PROVENANCE_TONE[doc.provenance]} dashed={doc.provenance === 'hotspot'}>
                  {PROVENANCE_LABEL[doc.provenance]}
                </Badge>
              </div>
              <div className="mt-2">
                {doc.specVsImpl ? (
                  <SpecVsImpl doc={doc} />
                ) : (
                  <RichText className="prose-ij reading" text={doc.deep} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TermsSection({ heading, ids }: { heading: string; ids: string[] }) {
  const sectionId = `terms-${ids.join('-')}`;
  return (
    <section aria-labelledby={sectionId} className={sectionClass}>
      <h2 id={sectionId} className={h2Class}>
        {heading}
      </h2>
      <dl className="mt-4 space-y-6">
        {ids.map((id) => {
          const entry = getGlossaryEntry(id);
          if (!entry) return null;
          return (
            <div key={id} className="max-w-[44rem]">
              <dt className="text-[18px] font-semibold text-fg">{entry.term}</dt>
              <dd className="mt-1 space-y-3">
                <RichText className="prose-ij reading" text={entry.simple} />
                {entry.developer && (
                  <RichText className="prose-ij reading" text={entry.developer} />
                )}
                <RichText className="prose-ij" text={entry.deep} />
                <Link
                  to={`/glossary#${entry.id}`}
                  className="inline-flex items-center gap-1 text-[14px] text-exec-300 underline underline-offset-2 hover:text-exec-200"
                >
                  {entry.term} in the glossary <ArrowRight size={13} aria-hidden />
                </Link>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
