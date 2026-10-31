import type { RouteObject } from 'react-router';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';
import { PageLoading } from './PageLoading';

/**
 * Lazy page loaders. They are also prefetched once the first page is idle,
 * so the whole site keeps working offline after the initial visit.
 */
export const pageLoaders = {
  home: () => import('@/pages/HomePage'),
  start: () => import('@/pages/StartHerePage'),
  paths: () => import('@/pages/LearningPathsPage'),
  topic: () => import('@/pages/TopicPage'),
  anatomy: () => import('@/pages/JvmAnatomyPage'),
  glossary: () => import('@/pages/GlossaryPage'),
  references: () => import('@/pages/ReferencesPage'),
  about: () => import('@/pages/AboutPage'),
  contributing: () => import('@/pages/ContributingPage'),
  notFound: () => import('@/pages/NotFoundPage'),
};

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    // The fallback sits on the pages, not the root, so the header stays mounted
    // while the first page loads.
    children: [
      { index: true, lazy: () => pageLoaders.home().then((m) => ({ Component: m.HomePage })) },
      {
        path: 'start',
        lazy: () => pageLoaders.start().then((m) => ({ Component: m.StartHerePage })),
      },
      {
        path: 'learn',
        lazy: () => pageLoaders.paths().then((m) => ({ Component: m.LearningPathsPage })),
      },
      {
        path: 'learn/:slug',
        lazy: () => pageLoaders.topic().then((m) => ({ Component: m.TopicPage })),
      },
      // The earlier address of Learn keeps working; its canonical URL is /learn.
      {
        path: 'paths',
        lazy: () => pageLoaders.paths().then((m) => ({ Component: m.LearningPathsPage })),
      },
      {
        path: 'anatomy',
        lazy: () => pageLoaders.anatomy().then((m) => ({ Component: m.JvmAnatomyPage })),
      },
      {
        path: 'glossary',
        lazy: () => pageLoaders.glossary().then((m) => ({ Component: m.GlossaryPage })),
      },
      {
        path: 'references',
        lazy: () => pageLoaders.references().then((m) => ({ Component: m.ReferencesPage })),
      },
      { path: 'about', lazy: () => pageLoaders.about().then((m) => ({ Component: m.AboutPage })) },
      {
        path: 'contributing',
        lazy: () => pageLoaders.contributing().then((m) => ({ Component: m.ContributingPage })),
      },
      {
        path: '*',
        lazy: () => pageLoaders.notFound().then((m) => ({ Component: m.NotFoundPage })),
      },
    ].map((route) => ({ ...route, HydrateFallback: PageLoading })),
  },
];

/**
 * Loads the other pages one at a time while the browser is idle, then the
 * code highlighter, so later navigation is instant. Skipped when the reader
 * asks to save data or the connection is very slow; the service worker still
 * precaches every bundle for offline use.
 */
export function prefetchPages() {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  if (connection?.saveData || /2g/.test(connection?.effectiveType ?? '')) return;
  const idle =
    window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 300));
  const queue: (() => Promise<unknown>)[] = [
    ...Object.values(pageLoaders),
    () => import('@/components/code/highlighter').then((module) => module.preloadHighlighter()),
  ];
  const next = () => {
    const load = queue.shift();
    if (!load) return;
    load()
      // Offline or a deploy replaced the chunk: the route will retry on navigation.
      .catch(() => {})
      .finally(() => idle(next));
  };
  idle(next);
}
