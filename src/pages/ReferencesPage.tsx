import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { COMPONENT_LIST } from '@/content/jvm';
import { REFERENCE_IDS, REFERENCES, type ReferenceId } from '@/data/references';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { ReferenceKind } from '@/types/content';

const GROUPS: { kind: ReferenceKind; title: string; intro: string }[] = [
  {
    kind: 'specification',
    title: 'Specifications',
    intro: 'The normative definitions: what every conforming JVM and Java compiler must do.',
  },
  {
    kind: 'source',
    title: 'OpenJDK source code',
    intro: 'HotSpot and JDK sources at tag jdk-25-ga, cited for implementation-specific behaviour.',
  },
  {
    kind: 'jep',
    title: 'JDK Enhancement Proposals',
    intro: 'Design documents for features, with the release that delivered them.',
  },
  {
    kind: 'api',
    title: 'Java SE API documentation',
    intro: 'The library contracts used in examples.',
  },
  {
    kind: 'tool',
    title: 'Tool reference',
    intro: 'The java, javac and javap commands used to produce our verified examples.',
  },
  { kind: 'guide', title: 'Guides', intro: 'Official guides for tuning and HotSpot features.' },
];

/** Which components cite each reference. */
const CITED_BY = new Map<ReferenceId, { id: string; name: string }[]>();
for (const doc of COMPONENT_LIST) {
  for (const citation of doc.references) {
    const list = CITED_BY.get(citation.source) ?? [];
    if (!list.some((item) => item.id === doc.id)) list.push({ id: doc.id, name: doc.name });
    CITED_BY.set(citation.source, list);
  }
}

export function ReferencesPage() {
  usePageTitle('References');
  return (
    <>
      <PageHeader kicker="Sources" title="References">
        <p>
          Every technically important claim in JVM Atlas cites one of these {REFERENCE_IDS.length}{' '}
          sources. Specifications are Java SE 25; implementation details are OpenJDK HotSpot, JDK
          25. Examples were run with OpenJDK 25.0.4 on Linux x64.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
        <nav aria-label="Reference groups" className="flex flex-wrap gap-2">
          {GROUPS.map((group) => (
            <a
              key={group.kind}
              href={`#refs-${group.kind}`}
              className="rounded border border-ink-600 px-2.5 py-1 text-[13px] text-fg-muted hover:text-fg"
            >
              {group.title}
            </a>
          ))}
        </nav>
        {GROUPS.map((group) => {
          const ids = REFERENCE_IDS.filter((id) => REFERENCES[id].kind === group.kind);
          return (
            <section
              key={group.kind}
              id={`refs-${group.kind}`}
              aria-labelledby={`refs-${group.kind}-title`}
              className="scroll-mt-20 py-8"
            >
              <h2 id={`refs-${group.kind}-title`} className="font-serif text-[28px] text-fg">
                {group.title} <span className="text-[16px] text-fg-subtle">({ids.length})</span>
              </h2>
              <p className="mt-1 text-[14.5px] text-fg-muted">{group.intro}</p>
              <ul className="mt-4 divide-y divide-ink-700 rounded-lg border border-ink-600">
                {ids.map((id) => {
                  const ref = REFERENCES[id];
                  const citedBy = CITED_BY.get(id) ?? [];
                  return (
                    <li key={id} id={`ref-${id}`} className="px-4 py-3">
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group inline-flex items-baseline gap-1.5 font-medium text-fg hover:text-exec-200"
                      >
                        {ref.title}
                        <ExternalLink
                          size={12}
                          aria-hidden
                          className="text-fg-subtle group-hover:text-exec-300"
                        />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                      <p className="text-[13.5px] text-fg-muted">{ref.description}</p>
                      <p className="mt-0.5 text-[12.5px] [overflow-wrap:anywhere] text-fg-subtle">
                        {ref.publisher} · {ref.version}
                      </p>
                      {citedBy.length > 0 && (
                        <p className="mt-1.5 text-[12.5px] text-fg-subtle">
                          Cited by:{' '}
                          {citedBy.map((item, index) => (
                            <span key={item.id}>
                              {index > 0 && ', '}
                              <Link
                                to={`/anatomy?c=${item.id}`}
                                className="text-exec-300 underline decoration-exec-500/40 underline-offset-2 hover:text-exec-200"
                              >
                                {item.name}
                              </Link>
                            </span>
                          ))}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
