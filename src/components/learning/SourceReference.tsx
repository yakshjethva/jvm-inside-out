import { ExternalLink } from 'lucide-react';
import { getReference } from '@/data/references';
import type { Citation } from '@/types/content';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

const KIND_TONE: Record<string, BadgeTone> = {
  specification: 'rt',
  jep: 'exec',
  source: 'plat',
  api: 'neutral',
  guide: 'neutral',
  tool: 'neutral',
};

const KIND_LABEL: Record<string, string> = {
  specification: 'Spec',
  jep: 'JEP',
  source: 'Source',
  api: 'API',
  guide: 'Guide',
  tool: 'Tool',
};

export function SourceReference({ citation }: { citation: Citation }) {
  const ref = getReference(citation.source);
  return (
    <li className="flex items-start gap-2.5">
      <Badge tone={KIND_TONE[ref.kind]} className="mt-0.5 shrink-0">
        {KIND_LABEL[ref.kind]}
      </Badge>
      <div className="min-w-0 text-[13px] leading-snug">
        <a
          href={ref.url}
          target="_blank"
          rel="noreferrer noopener"
          className="group inline-flex min-h-6 items-center gap-1 font-medium text-fg hover:text-exec-200"
        >
          <span className="break-words">{ref.title}</span>
          <ExternalLink
            size={11}
            aria-hidden
            className="shrink-0 text-fg-subtle group-hover:text-exec-300"
          />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <p className="text-fg-subtle">
          {citation.note ?? ref.description} <span className="text-fg-subtle">· {ref.version}</span>
        </p>
      </div>
    </li>
  );
}

export function SourceList({ citations }: { citations: Citation[] }) {
  return (
    <ul className="space-y-2.5">
      {citations.map((citation, index) => (
        <SourceReference key={`${citation.source}-${index}`} citation={citation} />
      ))}
    </ul>
  );
}
