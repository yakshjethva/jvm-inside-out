import { topicBySlug } from '@/content/topics';
import { SITE } from '@/data/site';
import { GLOSSARY } from '@/glossary';
import { toPlainText } from '@/lib/richText';
import type { PageMeta } from './pages';
import { canonicalUrl } from './site';

type JsonLd = Record<string, unknown>;

const WEBSITE: JsonLd = {
  '@type': 'WebSite',
  name: SITE.name,
  url: canonicalUrl('/'),
  description: SITE.description,
  inLanguage: 'en',
};

/**
 * JSON-LD for a page. Only types the visible content supports: no ratings,
 * authors, organisations or dates that the page does not show, and breadcrumbs
 * only on pages that show a breadcrumb (the guides).
 */
export function structuredData(meta: PageMeta): JsonLd[] {
  if (!meta.indexable) return [];
  const items: JsonLd[] = [];
  if (meta.path === '/') items.push({ '@context': 'https://schema.org', ...WEBSITE });
  const topic = meta.path.startsWith('/learn/')
    ? topicBySlug(meta.path.slice('/learn/'.length))
    : undefined;
  if (topic)
    items.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: meta.crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: canonicalUrl(crumb.path),
      })),
    });
  if (topic)
    items.push({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: topic.question,
      description: topic.description,
      url: canonicalUrl(meta.path),
      inLanguage: 'en',
      isAccessibleForFree: true,
      isPartOf: WEBSITE,
    });
  if (meta.path === '/glossary')
    items.push({
      '@context': 'https://schema.org',
      '@type': 'DefinedTermSet',
      name: `${SITE.name} glossary`,
      url: canonicalUrl('/glossary'),
      hasDefinedTerm: GLOSSARY.map((entry) => ({
        '@type': 'DefinedTerm',
        name: entry.term,
        description: toPlainText(entry.simple),
        url: `${canonicalUrl('/glossary')}#${entry.id}`,
        inDefinedTermSet: canonicalUrl('/glossary'),
      })),
    });
  return items;
}
