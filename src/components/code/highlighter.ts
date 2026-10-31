import type { HighlighterCore, ThemeRegistration } from 'shiki/core';
import type { CodeLanguage } from '@/types/content';

/** Shiki theme built from the design tokens (see src/styles/index.css). */
const THEME: ThemeRegistration = {
  name: 'jvm-atlas',
  type: 'dark',
  colors: { 'editor.background': '#00000000', 'editor.foreground': '#d6deea' },
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#7f8ba0', fontStyle: 'italic' },
    },
    {
      scope: [
        'keyword',
        'storage',
        'storage.type.primitive',
        'storage.modifier',
        'keyword.control',
        'keyword.operator.new',
      ],
      settings: { foreground: '#b39dff' },
    },
    {
      scope: ['string', 'string.quoted', 'punctuation.definition.string'],
      settings: { foreground: '#8fdcb2' },
    },
    {
      scope: ['constant.numeric', 'constant.language', 'constant.character'],
      settings: { foreground: '#ffbf80' },
    },
    {
      scope: [
        'entity.name.type',
        'entity.name.class',
        'support.class',
        'storage.type',
        'entity.other.inherited-class',
      ],
      settings: { foreground: '#a9d2ff' },
    },
    {
      scope: ['entity.name.function', 'meta.method-call entity.name.function', 'support.function'],
      settings: { foreground: '#e3ecfa' },
    },
    { scope: ['variable.parameter'], settings: { foreground: '#f0d9b5' } },
    { scope: ['keyword.operator', 'punctuation'], settings: { foreground: '#a5b0c2' } },
    {
      scope: ['variable.other.constant', 'meta.preprocessor', 'entity.name.function.preprocessor'],
      settings: { foreground: '#ffbf80' },
    },
  ],
};

const SHIKI_LANG: Partial<Record<CodeLanguage, string>> = {
  java: 'java',
  shell: 'shellscript',
  c: 'c',
};

let highlighterPromise: Promise<HighlighterCore> | null = null;

function loadHighlighter() {
  highlighterPromise ??= Promise.all([import('shiki/core'), import('shiki/engine/javascript')])
    .then(([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
      createHighlighterCore({
        themes: [THEME],
        langs: [
          import('shiki/langs/java.mjs'),
          import('shiki/langs/shellscript.mjs'),
          import('shiki/langs/c.mjs'),
        ],
        engine: createJavaScriptRegexEngine(),
      }),
    )
    .catch((error: unknown) => {
      // Allow a later retry (for example once the connection is back).
      highlighterPromise = null;
      throw error;
    });
  return highlighterPromise;
}

/** Loads the highlighter in the background so code stays highlighted offline. */
export function preloadHighlighter() {
  loadHighlighter().catch(() => {
    // Code blocks fall back to plain text.
  });
}

/** Returns highlighted HTML, or null for languages rendered as plain text. */
export async function highlight(code: string, language: CodeLanguage): Promise<string | null> {
  const lang = SHIKI_LANG[language];
  if (!lang) return null;
  const highlighter = await loadHighlighter();
  return highlighter.codeToHtml(code, { lang, theme: 'jvm-atlas' });
}
