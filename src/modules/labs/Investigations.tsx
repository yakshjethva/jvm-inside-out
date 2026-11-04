import { ChevronDown } from 'lucide-react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { LevelText } from '@/components/learning/LevelText';
import { SourceList } from '@/components/learning/SourceReference';
import { usePreferences } from '@/hooks/useLearningState';
import type { Investigation } from '@/types/lab';

/**
 * Advanced investigations, grouped and closed by default: each answers one
 * question at the chosen level and shows the real output behind the answer.
 */
export function Investigations({ items }: { items: Investigation[] }) {
  const { preferences } = usePreferences();
  const groups = [...new Set(items.map((item) => item.group))];
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {groups.map((group) => (
        <section key={group} aria-label={group} className="min-w-0">
          <h3 className="text-[15px] font-medium text-fg-subtle">{group}</h3>
          <ul className="mt-2 space-y-2">
            {items
              .filter((item) => item.group === group)
              .map((item) => (
                <li key={item.id} id={`investigation-${item.id}`}>
                  <details className="group rounded-xl border border-ink-600 bg-ink-900/40">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-xl px-4 py-3 hover:bg-ink-850 [&::-webkit-details-marker]:hidden">
                      <span>
                        <span className="block text-[16px] font-medium text-fg">{item.title}</span>
                        <span className="block text-[14px] text-fg-muted">{item.question}</span>
                      </span>
                      <ChevronDown
                        size={17}
                        aria-hidden
                        className="mt-1 shrink-0 text-fg-subtle transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <div className="space-y-4 border-t border-ink-700 px-4 py-4">
                      <LevelText
                        content={item.body}
                        level={preferences.level}
                        className="prose-ij"
                      />
                      {item.listings.map((listing) => (
                        <CodeBlock
                          key={listing.id}
                          code={listing.code}
                          language={listing.language}
                          title={listing.title}
                          verifiedWith={listing.verifiedWith}
                        />
                      ))}
                      <SourceList citations={item.references} />
                    </div>
                  </details>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
