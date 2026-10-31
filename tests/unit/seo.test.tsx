import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { COMPONENT_IDS } from '@/content/jvm/ids';
import { SCENARIOS } from '@/content/jvm/scenarios';
import { CHAPTER_IDS } from '@/content/lesson/firstRun';
import { TOPICS } from '@/content/topics';
import { GLOSSARY, getGlossaryEntry } from '@/glossary';
import { preferencesStore, progressStore } from '@/hooks/useLearningState';
import { headTags } from '@/seo/head';
import { HOME_TITLE, NOT_FOUND_META, pageMeta, PRERENDER_PATHS, sitemapPaths } from '@/seo/pages';
import { canonicalUrl, SITE_URL, sitePath } from '@/seo/site';
import { structuredData } from '@/seo/structuredData';

describe('page metadata', () => {
  const canonical = PRERENDER_PATHS.map(pageMeta).filter(
    (meta, i) => meta.path === PRERENDER_PATHS[i],
  );

  it('gives every canonical page a unique title and description', () => {
    const titles = canonical.map((meta) => meta.title);
    const descriptions = canonical.map((meta) => meta.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const meta of canonical) {
      expect(meta.indexable, meta.path).toBe(true);
      expect(meta.description.length, meta.path).toBeGreaterThan(70);
      expect(meta.description.length, meta.path).toBeLessThan(230);
      if (meta.path !== '/') expect(meta.title.endsWith(' · JVM Atlas'), meta.path).toBe(true);
    }
    expect(pageMeta('/').title).toBe(HOME_TITLE);
  });

  it('consolidates the old Learn address and keeps aliases out of the sitemap', () => {
    expect(pageMeta('/paths').path).toBe('/learn');
    expect(sitemapPaths()).not.toContain('/paths');
    expect(sitemapPaths()).toEqual(expect.arrayContaining(TOPICS.map((t) => `/learn/${t.slug}`)));
    expect(new Set(sitemapPaths()).size).toBe(sitemapPaths().length);
  });

  it('builds canonical URLs on the primary origin, never with a query or trailing slash', () => {
    expect(SITE_URL).toBe('https://jvmatlas.vercel.app');
    expect(canonicalUrl('/')).toBe('https://jvmatlas.vercel.app/');
    expect(canonicalUrl('/learn/heap-vs-stack')).toBe(
      'https://jvmatlas.vercel.app/learn/heap-vs-stack',
    );
    expect(sitePath('/jvm-inside-out/start/', '/jvm-inside-out/')).toBe('/start');
    expect(sitePath('/jvm-inside-out/', '/jvm-inside-out/')).toBe('/');
    expect(sitePath('/anatomy', '/')).toBe('/anatomy');
  });

  it('marks unknown pages as not indexable', () => {
    expect(pageMeta('/no-such-page')).toBe(NOT_FOUND_META);
    expect(NOT_FOUND_META.indexable).toBe(false);
    expect(headTags(NOT_FOUND_META, [])).toContain('<meta name="robots" content="noindex" />');
    expect(headTags(NOT_FOUND_META, [])).not.toContain('rel="canonical"');
  });

  it('escapes text written into the head and into JSON-LD', () => {
    const tags = headTags({ ...pageMeta('/about'), title: 'A "quoted" <title>' }, [
      { text: '</script><b>' },
    ]);
    expect(tags).toContain('A &quot;quoted&quot; &lt;title&gt;');
    expect(tags).not.toContain('</script><b>');
    expect(tags).toContain('\\u003c/script>');
  });
});

describe('structured data', () => {
  it('describes the site on the home page and only what each page shows', () => {
    expect(structuredData(pageMeta('/')).map((item) => item['@type'])).toEqual(['WebSite']);
    expect(structuredData(pageMeta('/start'))).toEqual([]);
    expect(structuredData(pageMeta('/about'))).toEqual([]);
    expect(structuredData(NOT_FOUND_META)).toEqual([]);
  });

  it('marks guides as technical articles with the breadcrumb they show', () => {
    const items = structuredData(pageMeta('/learn/heap-vs-stack'));
    const article = items.find((item) => item['@type'] === 'TechArticle')!;
    const crumbs = items.find((item) => item['@type'] === 'BreadcrumbList')!;
    expect(article.headline).toBe('What is the difference between the heap and the stack?');
    expect(article.url).toBe('https://jvmatlas.vercel.app/learn/heap-vs-stack');
    expect(crumbs.itemListElement).toHaveLength(3);
    for (const item of items)
      expect(JSON.stringify(item)).not.toMatch(/datePublished|author|rating/);
  });

  it('lists every glossary term on the glossary page', () => {
    const set = structuredData(pageMeta('/glossary')).find(
      (item) => item['@type'] === 'DefinedTermSet',
    )!;
    expect(set.hasDefinedTerm).toHaveLength(GLOSSARY.length);
  });
});

describe('guides', () => {
  it('point only at content that exists', () => {
    const slugs = TOPICS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const topic of TOPICS) {
      expect(slugs).toEqual(expect.arrayContaining(topic.related));
      expect(topic.related, topic.slug).not.toContain(topic.slug);
      expect(COMPONENT_IDS, topic.slug).toContain(topic.explore);
      if (topic.chapter) expect(CHAPTER_IDS, topic.slug).toContain(topic.chapter);
      if (topic.scenario)
        expect(
          SCENARIOS.map((s) => s.id),
          topic.slug,
        ).toContain(topic.scenario);
      for (const block of topic.blocks) {
        if (block.kind === 'component') expect(COMPONENT_IDS).toContain(block.id);
        if (block.kind === 'provenance')
          for (const id of block.ids) expect(COMPONENT_IDS).toContain(id);
        if (block.kind === 'terms')
          for (const id of block.ids) expect(getGlossaryEntry(id), id).toBeDefined();
      }
    }
  });
});

describe('titles after hydration', () => {
  beforeEach(() => {
    preferencesStore.reset();
    progressStore.reset();
  });

  // A page's runtime title must equal its prerendered title, or the tab flickers on load.
  it.each([
    '/start',
    '/learn',
    '/glossary',
    '/references',
    '/about',
    '/contributing',
    '/anatomy',
    '/learn/what-is-bytecode',
  ])('%s sets the title written into its HTML', async (path) => {
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    render(<RouterProvider router={router} />);
    await expect.poll(() => document.title, { timeout: 4000 }).toBe(pageMeta(path).title);
  });
});
