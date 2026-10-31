import { SITE } from '@/data/site';
import type { PageMeta } from './pages';
import { canonicalUrl, SITE_URL } from './site';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** JSON for a <script> element: `<` is escaped so content can never close the tag. */
const scriptJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

export const SOCIAL_IMAGE = {
  path: '/og/jvm-atlas.png',
  width: 1200,
  height: 630,
  alt: 'JVM Atlas: the five regions of the Java Virtual Machine and the platform beneath them, drawn as an exploded stack.',
};

/** The <head> tags for a page, written into its prerendered HTML. */
export function headTags(meta: PageMeta, jsonLd: Record<string, unknown>[]): string {
  const url = canonicalUrl(meta.path);
  const image = SITE_URL + SOCIAL_IMAGE.path;
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    meta.indexable
      ? `<link rel="canonical" href="${url}" />`
      : '<meta name="robots" content="noindex" />',
    `<meta property="og:site_name" content="${escapeHtml(SITE.name)}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    ...(meta.indexable ? [`<meta property="og:url" content="${url}" />`] : []),
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="${SOCIAL_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${SOCIAL_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(SOCIAL_IMAGE.alt)}" />`,
    '<meta property="og:locale" content="en_US" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    ...jsonLd.map((item) => `<script type="application/ld+json">${scriptJson(item)}</script>`),
  ];
  return tags.join('\n    ');
}
