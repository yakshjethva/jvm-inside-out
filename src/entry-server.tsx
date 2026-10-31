/**
 * Build-time server rendering. scripts/prerender.mjs imports this module from
 * the SSR build and writes one HTML file per public route, so every page ships
 * its real content; the browser then hydrates it (src/main.tsx).
 */
import { StrictMode } from 'react';
import { prerender } from 'react-dom/static';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { routes } from './app/routes';

export { headTags } from './seo/head';
export { NOT_FOUND_META, pageMeta, PRERENDER_PATHS, sitemapPaths } from './seo/pages';
export { canonicalUrl, SITE_URL } from './seo/site';
export { structuredData } from './seo/structuredData';

/** The base path this bundle was built for: "/" or "/<repository>/". */
export const BASE_URL = import.meta.env.BASE_URL;

export interface RenderResult {
  html: string;
  status: number;
}

/** Renders `pathname` (without the base path) to HTML. */
export async function render(pathname: string): Promise<RenderResult> {
  const handler = createStaticHandler(routes, { basename: BASE_URL });
  const url = new URL(BASE_URL.replace(/\/$/, '') + pathname, 'http://prerender.local');
  const context = await handler.query(new Request(url));
  if (context instanceof Response)
    throw new Error(`Unexpected redirect while rendering ${pathname}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  // prerender waits for every Suspense boundary, so the HTML is complete.
  const { prelude } = await prerender(
    <StrictMode>
      <StaticRouterProvider router={router} context={context} />
    </StrictMode>,
  );
  return { html: await new Response(prelude).text(), status: context.statusCode };
}
