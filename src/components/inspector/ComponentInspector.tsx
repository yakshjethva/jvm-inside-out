import {
  ArrowDownLeft,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Microscope,
  Play,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { AccuracyNote } from '@/components/learning/AccuracyNote';
import { KnowledgeCheck } from '@/components/learning/KnowledgeCheck';
import { LevelSwitch } from '@/components/learning/LevelSwitch';
import { LevelText } from '@/components/learning/LevelText';
import { InlineRichText, RichText } from '@/components/learning/RichText';
import { SourceList } from '@/components/learning/SourceReference';
import { Badge } from '@/components/ui/Badge';
import { EDGE_STYLES } from '@/components/diagrams/edgeStyles';
import type { ExplanationLevel } from '@/hooks/useLearningState';
import { cn } from '@/lib/cn';
import type { ComponentDoc, DemoId, Relationship } from '@/types/content';

export interface InspectorLink {
  id: string;
  name: string;
  summary?: string;
}

export interface InspectorConnection {
  rel: Relationship;
  other: InspectorLink;
}

export interface ComponentInspectorProps {
  doc: ComponentDoc;
  ancestry: InspectorLink[];
  parts: InspectorLink[];
  outgoing: InspectorConnection[];
  incoming: InspectorConnection[];
  level: ExplanationLevel;
  onLevelChange: (level: ExplanationLevel) => void;
  onNavigate: (id: string) => void;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  understood: boolean;
  onToggleUnderstood: () => void;
  onDissect?: () => void;
  onClose?: () => void;
  headingId?: string;
  /** A walkthrough step in which this component takes part ("Watch it run"). */
  walkthrough?: { stepTitle: string; onWatch: () => void };
  /** Renders the first lesson's interactive model for `doc.demo`. */
  renderDemo?: (demo: DemoId) => ReactNode;
}

const PROVENANCE_BADGE = {
  spec: { tone: 'rt' as const, text: 'JVM specification', dashed: false },
  hotspot: { tone: 'exec' as const, text: 'HotSpot · JDK 25', dashed: true },
  platform: { tone: 'plat' as const, text: 'Outside the JVM', dashed: false },
};

const SCOPE_TEXT: Record<string, string> = {
  shared: 'Shared by all threads',
  'per-thread': 'One per thread',
  'per-class': 'One per class',
  process: 'Process level',
  build: 'Build time',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-ink-700 px-5 py-4">
      <h3 className="mb-2 text-[15px] font-semibold text-fg">{title}</h3>
      {children}
    </section>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-ink-700/70 py-4 first:border-t-0 first:pt-1">
      <h4 className="mb-2 text-[13.5px] font-semibold text-fg-muted">{title}</h4>
      {children}
    </section>
  );
}

const bullets = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

/**
 * Detail panel for one component. The default view answers six questions in
 * order (what is it, picture it, what actually happens, see it working, where
 * does it fit, check yourself); everything else is one step away under
 * "Explore the technical details", open by default at the deep-dive level.
 */
export function ComponentInspector({
  doc,
  ancestry,
  parts,
  outgoing,
  incoming,
  level,
  onLevelChange,
  onNavigate,
  bookmarked,
  onToggleBookmark,
  understood,
  onToggleUnderstood,
  onDissect,
  onClose,
  headingId,
  walkthrough,
  renderDemo,
}: ComponentInspectorProps) {
  const provenance = PROVENANCE_BADGE[doc.provenance];
  const connections = [...outgoing, ...incoming];
  const parent = ancestry.length > 1 ? ancestry[ancestry.length - 2] : undefined;
  // The verified example moves up into "See it working" when there is no interactive model.
  const exampleUp = !doc.demo && Boolean(doc.example) && level !== 'simple';
  const lowerName = doc.name.charAt(0).toLowerCase() + doc.name.slice(1);

  return (
    <article aria-labelledby={headingId} className="text-[14px]">
      <header className="px-5 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <nav aria-label="Component breadcrumb" className="min-w-0">
            <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[12px] text-fg-subtle">
              {ancestry.map((item, index) => (
                <li key={item.id} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight size={11} aria-hidden className="text-ink-400" />}
                  {index === ancestry.length - 1 ? (
                    <span aria-current="location" className="text-fg-muted">
                      {item.name}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate(item.id)}
                      className="inline-flex min-h-6 items-center rounded hover:text-exec-200 hover:underline"
                    >
                      {item.name}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="-mt-1 -mr-2 rounded p-1.5 text-fg-subtle hover:bg-ink-700 hover:text-fg"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>

        <h2 id={headingId} className="mt-2 font-serif text-[28px] leading-[1.15] text-fg">
          {doc.name}
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone={provenance.tone} dashed={provenance.dashed}>
            {provenance.text}
          </Badge>
          {doc.scope && <Badge>{SCOPE_TEXT[doc.scope]}</Badge>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-pressed={bookmarked}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px]',
              bookmarked
                ? 'border-exec-500/60 bg-exec-900/60 text-exec-200'
                : 'border-ink-600 text-fg-muted hover:text-fg',
            )}
          >
            {bookmarked ? (
              <BookmarkCheck size={14} aria-hidden />
            ) : (
              <Bookmark size={14} aria-hidden />
            )}
            {bookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
          <button
            type="button"
            onClick={onToggleUnderstood}
            aria-pressed={understood}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px]',
              understood
                ? 'border-ok-500/60 bg-ok-900/60 text-ok-300'
                : 'border-ink-600 text-fg-muted hover:text-fg',
            )}
          >
            <CircleCheck size={14} aria-hidden />
            {understood ? 'Understood' : 'Mark understood'}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-700 bg-ink-900/40 px-5 py-2.5">
        <span className="text-[12.5px] text-fg-subtle">How deep should this go?</span>
        <LevelSwitch value={level} onChange={onLevelChange} />
      </div>

      <Section title="What is this?">
        <p className="text-[15.5px] leading-relaxed text-fg">
          <InlineRichText text={doc.summary} />
        </p>
      </Section>

      {doc.analogy && (
        <Section title="Picture it">
          <RichText className="prose-ij text-[14.5px]" text={doc.analogy.picture} />
          <dl className="mt-3 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-x-3 gap-y-1.5 text-[13.5px]">
            {doc.analogy.mapping.map((pair) => (
              <div key={pair.picture} className="contents">
                <dt className="text-fg-muted">{pair.picture}</dt>
                <dd className="text-fg">
                  <span aria-hidden className="mr-1 text-fg-subtle">
                    →
                  </span>
                  <span className="sr-only">stands for </span>
                  <InlineRichText text={pair.real} />
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 rounded-md border border-dashed border-warn-500/40 bg-warn-900/15 p-2.5">
            <p className="text-[12.5px] font-medium text-warn-300">
              Where the picture stops working
            </p>
            <RichText className="prose-ij mt-0.5 text-[13.5px]" text={doc.analogy.limits} />
          </div>
        </Section>
      )}

      <Section title="What actually happens?">
        <LevelText content={doc} level={level} />
      </Section>

      <SeeItWorking
        doc={doc}
        renderDemo={renderDemo}
        walkthrough={walkthrough}
        onDissect={onDissect}
        showExample={exampleUp}
      />

      <Section title="Where does it fit?">
        {parent && (
          <p className="text-[14px] text-fg-muted">
            Part of <ConnectionButton name={parent.name} onClick={() => onNavigate(parent.id)} />.
          </p>
        )}
        {connections.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {connections.slice(0, 3).map(({ rel, other }) => (
              <li key={rel.id} className="text-[14px] leading-snug text-fg-muted">
                {rel.from === doc.id ? (
                  <>
                    {doc.name} {rel.label}{' '}
                    <ConnectionButton name={other.name} onClick={() => onNavigate(other.id)} />.
                  </>
                ) : (
                  <>
                    <ConnectionButton name={other.name} onClick={() => onNavigate(other.id)} />{' '}
                    {rel.label} {lowerName}.
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {parts.length > 0 && (
          <div className="mt-3">
            <p className="text-[12.5px] text-fg-subtle">Inside it</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {parts.map((part) => (
                <li key={part.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(part.id)}
                    title={part.summary}
                    className="rounded border border-ink-600 bg-ink-800 px-2 py-1 text-[12.5px] text-fg-muted hover:border-rt-500/60 hover:text-rt-200"
                  >
                    {part.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {connections.length > 3 && (
          <p className="mt-2 text-[12.5px] text-fg-subtle">
            {connections.length - 3} more{' '}
            {connections.length - 3 === 1 ? 'connection is' : 'connections are'} listed in the
            technical details.
          </p>
        )}
      </Section>

      <Section title="Check your understanding">
        {doc.check ? (
          <KnowledgeCheck
            compact
            quiz={{ id: `check:${doc.id}`, title: doc.name, questions: [doc.check] }}
          />
        ) : (
          <TeachBackMini key={doc.id} doc={doc} />
        )}
      </Section>

      <details className="group border-t border-ink-700" open={level === 'deep'}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[15px] font-semibold text-fg hover:bg-ink-900/60 [&::-webkit-details-marker]:hidden">
          Explore the technical details
          <ChevronDown
            size={16}
            aria-hidden
            className="shrink-0 text-fg-subtle transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="px-5 pb-5">
          {level !== 'developer' && doc.developer && (
            <DetailBlock title="Developer explanation">
              <RichText className="prose-ij" text={doc.developer} />
            </DetailBlock>
          )}
          {level !== 'deep' && (
            <DetailBlock title="Deep dive">
              <RichText className="prose-ij" text={doc.deep} />
            </DetailBlock>
          )}

          {doc.specVsImpl && (
            <DetailBlock title="Specification and HotSpot">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-md border border-rt-500/30 bg-rt-900/30 p-3">
                  <p className="text-[12px] font-medium text-rt-300">JVM specification</p>
                  <RichText className="prose-ij mt-1 text-[13.5px]" text={doc.specVsImpl.spec} />
                </div>
                <div className="rounded-md border border-dashed border-exec-500/40 bg-exec-900/30 p-3">
                  <p className="text-[12px] font-medium text-exec-300">HotSpot · JDK 25</p>
                  <RichText
                    className="prose-ij mt-1 text-[13.5px]"
                    text={doc.specVsImpl.implementation}
                  />
                </div>
              </div>
            </DetailBlock>
          )}

          <DetailBlock title="What it is for">
            <RichText className="prose-ij" text={doc.purpose} />
          </DetailBlock>

          <DetailBlock title="Internal structure">
            <RichText className="prose-ij" text={bullets(doc.internals)} />
          </DetailBlock>

          <DetailBlock title="Inputs and outputs">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 flex items-center gap-1 text-[12.5px] text-fg-subtle">
                  <ArrowDownLeft size={13} aria-hidden /> Inputs
                </p>
                <RichText className="prose-ij text-[13.5px]" text={bullets(doc.inputs)} />
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1 text-[12.5px] text-fg-subtle">
                  <ArrowUpRight size={13} aria-hidden /> Outputs
                </p>
                <RichText className="prose-ij text-[13.5px]" text={bullets(doc.outputs)} />
              </div>
            </div>
          </DetailBlock>

          {connections.length > 0 && (
            <DetailBlock title={`All connections (${connections.length})`}>
              <ConnectionList
                title="This component →"
                items={outgoing}
                direction="out"
                name={doc.name}
                onNavigate={onNavigate}
              />
              <ConnectionList
                title="→ This component"
                items={incoming}
                direction="in"
                name={doc.name}
                onNavigate={onNavigate}
              />
            </DetailBlock>
          )}

          {doc.example && !exampleUp && (
            <DetailBlock title="Verified example">
              <CodeBlock
                code={doc.example.code}
                language={doc.example.language}
                title={doc.example.title}
                output={doc.example.output}
                verifiedWith={doc.example.verifiedWith}
              />
            </DetailBlock>
          )}

          <DetailBlock title="In practice">
            <RichText className="prose-ij" text={doc.practice} />
            {doc.errors && doc.errors.length > 0 && (
              <ul className="mt-3 space-y-2">
                {doc.errors.map((error) => (
                  <li
                    key={error.name}
                    className="flex gap-2 rounded-md border border-warn-500/30 bg-warn-900/25 p-2.5"
                  >
                    <TriangleAlert
                      size={15}
                      aria-hidden
                      className="mt-0.5 shrink-0 text-warn-400"
                    />
                    <div className="text-[13px]">
                      <code className="font-mono text-warn-300">{error.name}</code>
                      <span className="text-fg-muted">
                        {' '}
                        — <InlineRichText text={error.when} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DetailBlock>

          {doc.misconceptions.length > 0 && (
            <DetailBlock title="Common misconceptions">
              <ul className="space-y-3">
                {doc.misconceptions.map((item) => (
                  <li key={item.myth}>
                    <p className="flex gap-2 text-[13.5px] text-warn-300">
                      <span aria-hidden className="font-mono">
                        ✗
                      </span>
                      <span>
                        <span className="sr-only">Misconception: </span>
                        {item.myth}
                      </span>
                    </p>
                    <div className="mt-1 flex gap-2">
                      <span aria-hidden className="font-mono text-[13.5px] text-ok-400">
                        ✓
                      </span>
                      <RichText className="prose-ij text-[13.5px]" text={item.truth} />
                    </div>
                  </li>
                ))}
              </ul>
            </DetailBlock>
          )}

          {doc.accuracyNote && (
            <div className="border-t border-ink-700/70 py-4">
              <AccuracyNote text={doc.accuracyNote} compact />
            </div>
          )}

          <DetailBlock title="Sources">
            <SourceList citations={doc.references} />
          </DetailBlock>
        </div>
      </details>
    </article>
  );
}

function ConnectionButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-medium text-exec-200 underline decoration-exec-500/40 underline-offset-2 hover:decoration-exec-300"
    >
      {name}
    </button>
  );
}

/** "See it working": the lesson's model, a verified example, a walkthrough step, a dissection. */
function SeeItWorking({
  doc,
  renderDemo,
  walkthrough,
  onDissect,
  showExample,
}: {
  doc: ComponentDoc;
  renderDemo?: (demo: DemoId) => ReactNode;
  walkthrough?: ComponentInspectorProps['walkthrough'];
  onDissect?: () => void;
  showExample: boolean;
}) {
  const [open, setOpen] = useState(false);
  const demo = doc.demo && renderDemo ? doc.demo : null;
  if (!demo && !showExample && !walkthrough && !onDissect) return null;

  return (
    <Section title="See it working">
      {demo && (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-exec-500/60 bg-exec-900/40 px-3 text-[13.5px] text-exec-200 hover:border-exec-400"
          >
            <Play size={14} aria-hidden />
            {open ? 'Hide the interactive model' : 'Try the interactive model'}
          </button>
          {open && <div className="mt-3">{renderDemo!(demo)}</div>}
        </>
      )}
      {showExample && doc.example && (
        <CodeBlock
          code={doc.example.code}
          language={doc.example.language}
          title={doc.example.title}
          output={doc.example.output}
          verifiedWith={doc.example.verifiedWith}
        />
      )}
      {(walkthrough || onDissect) && (
        <div className={cn('flex flex-wrap gap-2', (demo || showExample) && 'mt-3')}>
          {walkthrough && (
            <button
              type="button"
              onClick={walkthrough.onWatch}
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-600 px-3 py-1.5 text-left text-[13px] text-fg-muted hover:border-exec-400 hover:text-fg"
            >
              <Play size={13} aria-hidden className="shrink-0 text-exec-300" />
              <span>
                Watch it run: <span className="text-fg">{walkthrough.stepTitle}</span>
              </span>
            </button>
          )}
          {onDissect && (
            <button
              type="button"
              onClick={onDissect}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-ink-600 px-3 text-[13px] text-fg-muted hover:border-rt-500/60 hover:text-fg"
            >
              <Microscope size={13} aria-hidden className="text-rt-300" /> Look inside it
            </button>
          )}
        </div>
      )}
    </Section>
  );
}

/** Teach-back for components without a written question: explain it, then compare. */
function TeachBackMini({ doc }: { doc: ComponentDoc }) {
  const [text, setText] = useState('');
  const [shown, setShown] = useState(false);
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-[14px] text-fg-muted">
        In your own words, in a sentence or two: what does this part do?
      </label>
      <textarea
        id={id}
        name="explain"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        autoComplete="off"
        className="mt-2 w-full resize-y rounded-md border border-ink-600 bg-ink-850 p-2.5 text-[14px] text-fg focus-visible:border-exec-400"
      />
      {shown ? (
        <div
          className="mt-2 rounded-md border border-ok-500/40 bg-ok-900/20 p-2.5"
          aria-live="polite"
        >
          <p className="text-[12.5px] font-medium text-ok-300">Compare with</p>
          <p className="mt-0.5 text-[14px] text-fg">
            <InlineRichText text={doc.summary} />
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShown(true)}
          className="mt-2 inline-flex h-8 items-center rounded-md border border-ink-500 px-2.5 text-[12.5px] text-fg-muted hover:text-fg"
        >
          Compare with the summary
        </button>
      )}
    </div>
  );
}

function ConnectionList({
  title,
  items,
  direction,
  name,
  onNavigate,
}: {
  title: string;
  items: InspectorConnection[];
  direction: 'in' | 'out';
  name: string;
  onNavigate: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[12.5px] text-fg-subtle">{title}</p>
      <ul className="space-y-1.5">
        {items.map(({ rel, other }) => {
          const style = EDGE_STYLES[rel.kind];
          return (
            <li key={rel.id} className="rounded-md border border-ink-700 bg-ink-850/70 p-2.5">
              <p className="flex flex-wrap items-baseline gap-x-1.5 text-[13.5px] leading-snug">
                <svg width="22" height="8" aria-hidden className="shrink-0 self-center">
                  <line
                    x1="0"
                    y1="4"
                    x2="16"
                    y2="4"
                    stroke={style.color}
                    strokeWidth="1.6"
                    strokeDasharray={style.dash}
                  />
                  <path d="M15 1 L21 4 L15 7 Z" fill={style.color} />
                </svg>
                {direction === 'out' ? (
                  <>
                    <span className="text-fg-muted">{name}</span>
                    <span className="text-fg">{rel.label}</span>
                    <ConnectionButton name={other.name} onClick={() => onNavigate(other.id)} />
                  </>
                ) : (
                  <>
                    <ConnectionButton name={other.name} onClick={() => onNavigate(other.id)} />
                    <span className="text-fg">{rel.label}</span>
                    <span className="text-fg-muted">{name}</span>
                  </>
                )}
                <span className="sr-only">({style.label})</span>
              </p>
              <RichText className="prose-ij mt-1 text-[13px]" text={rel.description} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
