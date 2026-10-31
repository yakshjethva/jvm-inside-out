/**
 * Writes the prerendered site into dist/ after the client build (`vite build`)
 * and the SSR build (`vite build --ssr`, in dist-server/). `npm run build` runs
 * all three steps.
 *
 * For every public route it writes the page's real HTML and its <head> (title,
 * description, canonical URL, Open Graph, JSON-LD), plus a small script that
 * marks the page for a fresh client render when the browser's URL is not the
 * one that was rendered (a query string, or the 404 page). It also writes
 * 404.html and, for builds served from the site root (the canonical Vercel
 * deployment), sitemap.xml and robots.txt. See docs/SEO_AND_DEPLOYMENT.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const server = await import(pathToFileURL(path.join(root, 'dist-server', 'entry-server.js')).href);
const {
  render,
  pageMeta,
  NOT_FOUND_META,
  PRERENDER_PATHS,
  sitemapPaths,
  structuredData,
  headTags,
  SITE_URL,
  BASE_URL,
} = server;

const built = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!built.includes('<div id="root"></div>'))
  throw new Error('dist/index.html is already prerendered: run `npm run build` from the start.');

/**
 * The stylesheet is written into each page instead of linked: the first paint
 * then waits for nothing but the HTML, rather than for a second request that
 * competes with the scripts. The file stays in dist/assets for the service
 * worker; its font URLs are absolute, so they resolve the same inline.
 */
function inlineStylesheets(html) {
  return html.replace(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g, (_, href) => {
    const file = path.join(dist, href.slice(BASE_URL.length));
    const css = fs.readFileSync(file, 'utf8').replace(/<\/style/gi, '<\\/style');
    return `<style>${css}</style>`;
  });
}
/**
 * The app's entry module is requested right after the browser has painted the
 * prerendered page, so the first paint never waits for, or shares bandwidth
 * with, the scripts. On a real connection the HTML is long parsed by then, so
 * hydration starts only a frame later.
 */
function runAfterFirstPaint(html) {
  // Vite also preloads the entry's dependencies; those links move into the
  // loader too, so nothing script-related is fetched before the first paint.
  const preloads = [];
  const withoutPreloads = html.replace(
    /\s*<link rel="modulepreload" crossorigin href="([^"]+)">/g,
    (_, href) => {
      preloads.push(href);
      return '';
    },
  );
  return withoutPreloads.replace(
    /<script type="module" crossorigin src="([^"]+)"><\/script>/,
    (_, src) =>
      `<script type="module">requestAnimationFrame(()=>setTimeout(()=>{` +
      `for(const h of ${JSON.stringify(preloads)}){const l=document.createElement("link");` +
      `l.rel="modulepreload";l.crossOrigin="";l.href=h;document.head.append(l)}` +
      `import(${JSON.stringify(src)})}))</script>`,
  );
}
const template = runAfterFirstPaint(inlineStylesheets(built));
if (!template.includes('<script type="module">requestAnimationFrame('))
  throw new Error('prerender: the entry script tag was not found in dist/index.html');

/**
 * Runs before the body is parsed, so the first paint is already right: a page
 * rendered for another URL is marked for a fresh client render, and a learner
 * who dismissed the explorer tour does not see the prerendered one (the key is
 * the preferences store's, src/lib/storage.ts).
 */
const clientRenderMarker = (renderedPath) =>
  `<script>(function(){var d=document.documentElement,b=${JSON.stringify(BASE_URL)},r=${JSON.stringify(renderedPath)},p=location.pathname;` +
  `if(p.indexOf(b)===0)p="/"+p.slice(b.length);p=p.replace(/\\/+$/,"")||"/";` +
  `if(location.search||p!==r)d.setAttribute("data-client-render","");` +
  `try{var s=JSON.parse(localStorage.getItem("inside-java:v1:preferences")||"null");` +
  `if(s&&s.dismissed&&s.dismissed["explorer-tour"])d.setAttribute("data-tour-dismissed","")}catch(e){}})()</script>`;

function pageHtml(meta, appHtml, renderedPath) {
  return template
    .replace(/\s*<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<meta\s+name="description"[\s\S]*?\/>/, '')
    .replace(
      '</head>',
      `    ${headTags(meta, structuredData(meta))}\n    ${clientRenderMarker(renderedPath)}\n  </head>`,
    )
    .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
}

function write(relative, content) {
  const file = path.join(dist, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

for (const routePath of PRERENDER_PATHS) {
  const { html } = await render(routePath);
  const file = routePath === '/' ? 'index.html' : `${routePath.slice(1)}/index.html`;
  write(file, pageHtml(pageMeta(routePath), html, routePath));
}
const notFound = await render('/404');
write('404.html', pageHtml(NOT_FOUND_META, notFound.html, '/404'));

const rootBuild = BASE_URL === '/';
if (rootBuild) {
  // No <lastmod>: the build knows no page's own modification date, and one
  // shared date would mark unchanged pages as modified on every commit.
  const urls = sitemapPaths()
    .map((p) => `  <url>\n    <loc>${SITE_URL}${p}</loc>\n  </url>`)
    .join('\n');
  write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  write('robots.txt', robots());
}

console.log(
  `prerendered ${PRERENDER_PATHS.length} pages and 404.html for base ${BASE_URL}` +
    (rootBuild ? ', with sitemap.xml and robots.txt' : ' (mirror build: no sitemap or robots.txt)'),
);

/**
 * Search engines and AI search crawlers may index the site. Crawlers that
 * collect training data for AI models are not allowed: that is the project
 * owner's decision to change (docs/SEO_AND_DEPLOYMENT.md).
 */
function robots() {
  return `# JVM Atlas: ${SITE_URL}/
# Search engines may crawl everything.
User-agent: *
Allow: /

# AI search and answer engines, which link to the pages they cite.
User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

# Model-training crawlers: not allowed until the project owner decides otherwise.
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: CCBot
Disallow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}
