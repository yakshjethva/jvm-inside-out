import { Check, Copy } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { CodeLanguage } from '@/types/content';
import { highlight } from './highlighter';

const LANGUAGE_LABEL: Record<CodeLanguage, string> = {
  java: 'Java',
  shell: 'Shell',
  text: 'Output',
  c: 'C',
};

/** Lightweight colouring for javap listings and logs (no grammar needed). */
function renderPlain(code: string, highlightLines?: number[]): ReactNode {
  return code.split('\n').map((line, index) => {
    const match = /^(\s*)(\d+)(:\s+)([a-z_0-9]+)(.*)$/.exec(line);
    const lineNo = index + 1;
    const active = highlightLines?.includes(lineNo);
    return (
      <span
        key={index}
        className={cn(
          'block',
          active && 'bg-exec-500/15 shadow-[inset_2px_0_0_var(--color-exec-400)]',
        )}
      >
        {match ? (
          <>
            {match[1]}
            <span className="text-fg-subtle">{match[2]}</span>
            {match[3]}
            <span className="text-exec-300">{match[4]}</span>
            {colourRest(match[5] ?? '')}
          </>
        ) : (
          colourRest(line)
        )}
        {'\n'}
      </span>
    );
  });
}

function colourRest(rest: string): ReactNode {
  const comment = rest.indexOf('//');
  const body = comment === -1 ? rest : rest.slice(0, comment);
  const parts = body.split(/(#\d+)/g).map((part, i) =>
    /^#\d+$/.test(part) ? (
      <span key={i} className="text-rt-300">
        {part}
      </span>
    ) : (
      part
    ),
  );
  return (
    <>
      {parts}
      {comment !== -1 && <span className="text-fg-subtle">{rest.slice(comment)}</span>}
    </>
  );
}

export function CodeBlock({
  code,
  language,
  title,
  output,
  verifiedWith,
  highlightLines,
  className,
}: {
  code: string;
  language: CodeLanguage;
  title?: string;
  output?: string;
  verifiedWith?: string;
  highlightLines?: number[];
  className?: string;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const usesShiki = language !== 'text' && !highlightLines?.length;

  useEffect(() => {
    let cancelled = false;
    if (usesShiki) {
      highlight(code, language)
        .then((result) => {
          if (!cancelled) setHtml(result);
        })
        .catch(() => {
          if (!cancelled) setHtml(null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [code, language, usesShiki]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (permissions, insecure context); ignore.
    }
  };

  return (
    <figure
      className={cn(
        'surface-instrument overflow-hidden rounded-md border border-ink-600 bg-ink-900',
        className,
      )}
    >
      <figcaption className="flex items-center justify-between gap-2 border-b border-ink-700 bg-ink-850 px-3 py-1.5">
        <span className="truncate text-[12.5px] text-fg-muted">
          {title ?? LANGUAGE_LABEL[language]}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[11px] tracking-wider text-fg-subtle uppercase">
            {LANGUAGE_LABEL[language]}
          </span>
          <button
            type="button"
            onClick={copy}
            className="rounded p-1 text-fg-subtle hover:bg-ink-700 hover:text-fg"
            aria-label={copied ? 'Copied' : 'Copy code'}
          >
            {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
          </button>
        </span>
      </figcaption>
      {/* Focusable so a keyboard can scroll long lines. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="code-surface" translate="no" tabIndex={0}>
        {usesShiki && html ? (
          // Shiki output is generated locally from our own content (no user input).
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre>
            <code className="text-[#d6deea]">
              {language === 'text' || highlightLines?.length
                ? renderPlain(code, highlightLines)
                : code}
            </code>
          </pre>
        )}
      </div>
      {output && (
        <div className="border-t border-ink-700 bg-ink-950/60">
          <p className="px-3 pt-2 font-mono text-[11px] tracking-wider text-fg-subtle uppercase">
            Output
          </p>
          <pre
            translate="no"
            // Focusable so a keyboard can scroll long lines.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            className="code-output overflow-x-auto px-3 pt-1 pb-3 text-[12px] leading-relaxed text-ok-300"
          >
            {output}
          </pre>
        </div>
      )}
      {verifiedWith && (
        <p className="border-t border-ink-700 px-3 py-1.5 text-[11.5px] text-fg-subtle">
          <span className="text-ok-400" aria-hidden>
            ✓{' '}
          </span>
          Verified with {verifiedWith}
        </p>
      )}
    </figure>
  );
}
