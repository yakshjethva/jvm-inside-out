import { Crosshair, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { LevelSwitch } from '@/components/learning/LevelSwitch';
import { LevelText } from '@/components/learning/LevelText';
import { RichText } from '@/components/learning/RichText';
import { SourceList } from '@/components/learning/SourceReference';
import { getComponentDoc } from '@/content/jvm';
import { GLOSSARY, getGlossaryEntry } from '@/glossary';
import { usePreferences } from '@/hooks/useLearningState';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toPlainText } from '@/lib/richText';

export function GlossaryPage() {
  usePageTitle('Glossary');
  const [query, setQuery] = useState('');
  const { preferences, setLevel } = usePreferences();
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ block: 'start' });
    target?.focus({ preventScroll: true });
  }, [location.hash]);

  const q = query.trim().toLowerCase();
  const entries = useMemo(
    () =>
      q
        ? GLOSSARY.filter((entry) =>
            [
              entry.term,
              ...(entry.aliases ?? []),
              toPlainText(entry.simple),
              toPlainText(entry.developer ?? ''),
              toPlainText(entry.deep),
            ].some((text) => text.toLowerCase().includes(q)),
          )
        : GLOSSARY,
    [q],
  );

  const letters = [...new Set(GLOSSARY.map((entry) => entry.term[0]!.toUpperCase()))];

  return (
    <>
      <PageHeader kicker="Reference" title="Glossary">
        <p>
          {GLOSSARY.length} terms, each explained simply and in depth. Terms underlined with dots
          anywhere on the site open these explanations in place.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
        <div className="sticky top-14 z-10 -mx-4 flex flex-wrap items-center gap-3 border-b border-ink-700 bg-ink-950 px-4 py-3 sm:-mx-6 sm:px-6">
          <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-md border border-ink-600 bg-ink-850 px-3">
            <Search size={15} aria-hidden className="text-fg-subtle" />
            <span className="sr-only">Search the glossary</span>
            <input
              type="search"
              name="glossary-search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search terms and definitions…"
              className="h-10 w-full bg-transparent text-[14.5px] text-fg outline-none placeholder:text-fg-subtle"
            />
          </label>
          <LevelSwitch value={preferences.level} onChange={setLevel} size="md" />
        </div>

        {!q && (
          <nav aria-label="Glossary index" className="mt-6 flex flex-wrap gap-1">
            {letters.map((letter) => {
              const first = GLOSSARY.find((entry) => entry.term[0]!.toUpperCase() === letter)!;
              return (
                <a
                  key={letter}
                  href={`#${first.id}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-ink-600 font-mono text-[13px] text-fg-muted hover:border-exec-500/60 hover:text-fg"
                >
                  {letter}
                </a>
              );
            })}
          </nav>
        )}

        <p className="mt-6 text-[13px] text-fg-subtle" aria-live="polite">
          {q ? `${entries.length} matching ${entries.length === 1 ? 'term' : 'terms'}` : ''}
        </p>

        <dl className="mt-2 divide-y divide-ink-700">
          {entries.map((entry) => {
            const component = entry.componentId ? getComponentDoc(entry.componentId) : undefined;
            return (
              <div
                key={entry.id}
                id={entry.id}
                tabIndex={-1}
                className="scroll-mt-32 py-6 outline-none [contain-intrinsic-size:auto_320px] [content-visibility:auto] focus-visible:bg-ink-900/60"
              >
                <dt>
                  <span className="font-serif text-[24px] text-fg">{entry.term}</span>
                  {entry.aliases && (
                    <span className="ml-2 text-[13px] text-fg-subtle">
                      also: {entry.aliases.join(', ')}
                    </span>
                  )}
                </dt>
                <dd className="mt-2 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                  <div>
                    <LevelText
                      content={entry}
                      level={preferences.level}
                      className="prose-ij text-[15.5px]"
                      fallbackStyle="tag"
                    />
                    <p className="kicker mt-4">Why it exists</p>
                    <RichText className="prose-ij mt-1" text={entry.whyItExists} />
                    {entry.misconception && (
                      <div className="mt-4 rounded-md border border-warn-500/30 bg-warn-900/25 p-3">
                        <p className="text-[13.5px] text-warn-300">
                          <span aria-hidden>✗ </span>
                          <span className="sr-only">Misconception: </span>
                          {entry.misconception.myth}
                        </p>
                        <RichText
                          className="prose-ij mt-1 text-[14px]"
                          text={entry.misconception.truth}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 text-[14px]">
                    {component && (
                      <div>
                        <p className="kicker">Where it fits</p>
                        <Link
                          to={`/anatomy?c=${component.id}`}
                          className="mt-1 inline-flex min-h-6 items-center gap-1.5 text-exec-300 hover:text-exec-200"
                        >
                          <Crosshair size={14} aria-hidden /> {component.name} in the JVM anatomy
                        </Link>
                      </div>
                    )}
                    {entry.related && entry.related.length > 0 && (
                      <div>
                        <p className="kicker">Related</p>
                        <ul className="mt-1 flex flex-wrap gap-1.5">
                          {entry.related.map((id) => {
                            const related = getGlossaryEntry(id);
                            return related ? (
                              <li key={id}>
                                <a
                                  href={`#${id}`}
                                  onClick={() => setQuery('')}
                                  className="inline-flex min-h-6 items-center rounded border border-ink-600 px-2 py-0.5 text-[13px] text-fg-muted hover:border-rt-500/60 hover:text-rt-200"
                                >
                                  {related.term}
                                </a>
                              </li>
                            ) : null;
                          })}
                        </ul>
                      </div>
                    )}
                    {entry.references && (
                      <div>
                        <p className="kicker mb-2">Sources</p>
                        <SourceList citations={entry.references} />
                      </div>
                    )}
                  </div>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </>
  );
}
