import { COMPONENT_IDS } from '@/content/jvm/ids';
import { TOPICS, topicBySlug } from '@/content/topics';
import { SITE } from '@/data/site';

/**
 * Title, description and canonical path for every public route. Kept free of
 * heavy content imports: the app shell uses it to keep <head> in step during
 * client-side navigation, and scripts/prerender.mjs writes it into the HTML.
 */
export interface Crumb {
  name: string;
  path: string;
}

export interface PageMeta {
  /** Canonical site path (no base path, no query). */
  path: string;
  /** The document title. Must equal what the page sets with usePageTitle. */
  title: string;
  description: string;
  type: 'website' | 'article';
  crumbs: Crumb[];
  indexable: boolean;
}

export const HOME_TITLE = `${SITE.name} · ${SITE.tagline.replace(/\.$/, '')}`;
export const pageTitle = (name: string) => `${name} · ${SITE.name}`;

const HOME: Crumb = { name: 'Home', path: '/' };
const LEARN: Crumb = { name: 'Learn', path: '/learn' };

const PAGES: Record<string, { name: string; description: string }> = {
  '/start': {
    name: 'Start here',
    description:
      'A guided first lesson in seven short chapters: follow one Java program from source code to the processor, predicting each step before you see it. No programming knowledge needed.',
  },
  '/learn': {
    name: 'Learn',
    description:
      'Guides and learning paths that start from a question: what the JVM is, how it runs your code, where objects live and how memory is reclaimed, linked to every lesson and exhibit.',
  },
  '/anatomy': {
    name: 'JVM anatomy',
    description: `An interactive map of the Java Virtual Machine: ${COMPONENT_IDS.length} components from class loading to garbage collection, each explained at three levels, with relationships, dissections and step-by-step walkthroughs.`,
  },
  '/glossary': {
    name: 'Glossary',
    description:
      'Definitions of the terms used across JVM Atlas, from bytecode and class loaders to safepoints and Metaspace, each explained simply and in depth.',
  },
  '/references': {
    name: 'References',
    description:
      'The primary sources behind JVM Atlas: the Java SE 25 JVM and Java Language Specifications, JEPs, API documentation and OpenJDK source, with the pages that cite each one.',
  },
  '/about': {
    name: 'About',
    description:
      'Why JVM Atlas exists, which specification and OpenJDK versions it describes, how its examples are verified, and what is built so far.',
  },
  '/contributing': {
    name: 'Contributing',
    description:
      'How to improve JVM Atlas: run it locally, write explanations at three levels, cite primary sources and verify examples with a real JDK.',
  },
};

/** Every route written to its own HTML file at build time. */
export const PRERENDER_PATHS: string[] = [
  '/',
  ...Object.keys(PAGES),
  '/paths',
  ...TOPICS.map((topic) => `/learn/${topic.slug}`),
];

export const NOT_FOUND_META: PageMeta = {
  path: '/404',
  title: pageTitle('Page not found'),
  description: 'This page does not exist. Start from the JVM Atlas home page.',
  type: 'website',
  crumbs: [HOME],
  indexable: false,
};

export function pageMeta(path: string): PageMeta {
  if (path === '/')
    return {
      path,
      title: HOME_TITLE,
      description: SITE.description,
      type: 'website',
      crumbs: [HOME],
      indexable: true,
    };
  // The old address of Learn: same page, consolidated under /learn.
  if (path === '/paths') return { ...pageMeta('/learn') };
  const page = PAGES[path];
  if (page)
    return {
      path,
      title: pageTitle(page.name),
      description: page.description,
      type: 'website',
      crumbs: [HOME, { name: page.name, path }],
      indexable: true,
    };
  const topic = path.startsWith('/learn/') ? topicBySlug(path.slice('/learn/'.length)) : undefined;
  if (topic)
    return {
      path,
      title: pageTitle(topic.title),
      description: topic.description,
      type: 'article',
      crumbs: [HOME, LEARN, { name: topic.title, path }],
      indexable: true,
    };
  return NOT_FOUND_META;
}

/** Canonical, indexable URLs: everything prerendered except aliases. */
export const sitemapPaths = () => PRERENDER_PATHS.filter((path) => pageMeta(path).path === path);
