/**
 * Checks the prerendered site in dist/ (the last step of `npm run build`):
 *
 * - every prerendered route has its own HTML with real content, one <h1>, the
 *   title and description from src/seo/pages.ts, a canonical URL on the primary
 *   origin (also in the GitHub Pages mirror build) and JSON-LD that parses;
 * - canonical pages have unique titles and are never marked noindex;
 * - 404.html is noindex and has no canonical URL;
 * - asset and link URLs stay under the build's base path, and links inside the
 *   prerendered content point at pages that exist;
 * - sitemap.xml and robots.txt exist only in builds served from the site root;
 * - Three.js is not in the scripts a page loads first, nor in the anatomy
 *   page's, and the script budgets below hold.
 *
 * Exits with status 1 and a list of problems if any check fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const {
  pageMeta,
  NOT_FOUND_META,
  PRERENDER_PATHS,
  sitemapPaths,
  structuredData,
  canonicalUrl,
  SITE_URL,
  BASE_URL,
} = await import(pathToFileURL(path.join(root, 'dist-server', 'entry-server.js')).href);

const problems = [];
const fail = (where, message) => problems.push(`${where}: ${message}`);

const decode = (text) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const all = (html, pattern) => [...html.matchAll(pattern)];
const read = (relative) => {
  const file = path.join(dist, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
};
const fileFor = (routePath) =>
  routePath === '/' ? 'index.html' : `${routePath.slice(1)}/index.html`;

/** The site path of an internal link, or null for external and non-page links. */
function linkedPage(href) {
  if (!href.startsWith(BASE_URL)) return null;
  const sitePath = '/' + href.slice(BASE_URL.length).split(/[?#]/)[0].replace(/\/+$/, '');
  if (/\.[a-z0-9]+$/i.test(sitePath)) return null; // a file: favicon, image, script, manifest
  return sitePath;
}

function checkPage(where, html, meta) {
  const titles = all(html, /<title>([\s\S]*?)<\/title>/g);
  if (titles.length !== 1) fail(where, `${titles.length} <title> elements`);
  else if (decode(titles[0][1]) !== meta.title) fail(where, `title is "${decode(titles[0][1])}"`);

  const descriptions = all(html, /<meta name="description" content="([^"]*)"/g);
  if (descriptions.length !== 1) fail(where, `${descriptions.length} meta descriptions`);
  else if (decode(descriptions[0][1]) !== meta.description) fail(where, 'meta description differs');

  const h1s = all(html, /<h1[\s>]/g).length;
  if (h1s !== 1) fail(where, `${h1s} <h1> elements`);

  const canonicals = all(html, /<link rel="canonical" href="([^"]*)"/g);
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  if (meta.indexable) {
    if (noindex) fail(where, 'an indexable page is marked noindex');
    if (canonicals.length !== 1) fail(where, `${canonicals.length} canonical links`);
    else if (canonicals[0][1] !== canonicalUrl(meta.path))
      fail(where, `canonical is ${canonicals[0][1]}, expected ${canonicalUrl(meta.path)}`);
  } else {
    if (!noindex) fail(where, 'not marked noindex');
    if (canonicals.length) fail(where, 'has a canonical link');
  }

  const jsonLd = all(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (jsonLd.length !== structuredData(meta).length)
    fail(where, `${jsonLd.length} JSON-LD blocks, expected ${structuredData(meta).length}`);
  for (const [, json] of jsonLd) {
    try {
      const data = JSON.parse(json);
      if (data['@context'] !== 'https://schema.org')
        fail(where, 'JSON-LD without schema.org context');
    } catch {
      fail(where, 'JSON-LD does not parse');
    }
  }

  if (/<link rel="modulepreload"|<script type="module"[^>]*\ssrc=/.test(html))
    fail(where, 'fetches a script before its first paint');

  const app = html.match(/<div id="root">([\s\S]*?)<\/div>\s*(?:<noscript>|<\/body>)/);
  const text = app
    ? app[1].replace(/<script[\s\S]*?<\/script>|<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    : '';
  if (text.length < 200) fail(where, `only ${text.length} characters of prerendered text`);

  for (const [, , url] of all(html, /\s(src|href)="([^"]*)"/g)) {
    if (url.startsWith('/') && !url.startsWith(BASE_URL))
      fail(where, `URL outside the base path: ${url}`);
    if (url.startsWith('http://')) fail(where, `insecure link: ${url}`);
    const page = linkedPage(url);
    if (page !== null && !PRERENDER_PATHS.includes(page))
      fail(where, `link to a missing page: ${url}`);
  }
}

const seenTitles = new Map();
for (const routePath of PRERENDER_PATHS) {
  const html = read(fileFor(routePath));
  if (html === null) {
    fail(routePath, `missing ${fileFor(routePath)}`);
    continue;
  }
  const meta = pageMeta(routePath);
  checkPage(routePath, html, meta);
  if (meta.path === routePath) {
    if (seenTitles.has(meta.title)) fail(routePath, `same title as ${seenTitles.get(meta.title)}`);
    seenTitles.set(meta.title, routePath);
    if (!meta.indexable) fail(routePath, 'a canonical page is not indexable');
  }
}

const notFound = read('404.html');
if (notFound === null) fail('404.html', 'missing');
else checkPage('404.html', notFound, NOT_FOUND_META);

const sitemap = read('sitemap.xml');
const robots = read('robots.txt');
if (BASE_URL === '/') {
  if (sitemap === null) fail('sitemap.xml', 'missing from a root build');
  else {
    const locs = all(sitemap, /<loc>([^<]*)<\/loc>/g).map((match) => match[1]);
    const expected = sitemapPaths().map((p) => canonicalUrl(p));
    if (!sitemap.startsWith('<?xml') || !sitemap.includes('<urlset'))
      fail('sitemap.xml', 'not a sitemap');
    if (locs.join('\n') !== expected.join('\n'))
      fail(
        'sitemap.xml',
        `lists ${locs.length} URLs, expected the ${expected.length} canonical pages`,
      );
  }
  if (robots === null) fail('robots.txt', 'missing from a root build');
  else {
    if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) fail('robots.txt', 'no sitemap line');
    for (const agent of ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'])
      if (!new RegExp(`User-agent: ${agent}\\nDisallow: /\\n`).test(robots))
        fail(
          'robots.txt',
          `${agent} is not disallowed (an owner decision: see docs/SEO_AND_DEPLOYMENT.md)`,
        );
  }
} else {
  // Crawlers read robots.txt only at a host's root, and a sitemap here would
  // list another host's URLs: the mirror has neither.
  if (sitemap !== null) fail('sitemap.xml', `present in a ${BASE_URL} build`);
  if (robots !== null) fail('robots.txt', `present in a ${BASE_URL} build`);
}

for (const file of ['sw.js', 'favicon.svg', 'site.webmanifest', 'og/jvm-atlas.png'])
  if (!fs.existsSync(path.join(dist, file))) fail(file, 'missing');

/**
 * Script budgets in gzip bytes. Raise one only with a reason recorded in the
 * pull request (docs/3D_EXPERIENCE.md lists the current sizes).
 */
const BUDGETS = { initialScripts: 125_000, threeChunk: 275_000 };
const assets = path.join(dist, 'assets');
const gzipSize = (file) => zlib.gzipSync(fs.readFileSync(path.join(assets, file))).length;
/** Static imports only: `import(...)` is a lazy chunk and does not count. */
const staticImports = (file) =>
  [
    ...fs
      .readFileSync(path.join(assets, file), 'utf8')
      .matchAll(/\bimport\s*(?:[^"';()]*?\bfrom\s*)?["']\.\/([^"']+?\.js)["']/g),
  ].map((match) => match[1]);
function closure(roots) {
  const seen = new Set();
  const queue = [...roots];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file) || !fs.existsSync(path.join(assets, file))) continue;
    seen.add(file);
    queue.push(...staticImports(file));
  }
  return [...seen];
}
const hasThree = (file) =>
  fs.readFileSync(path.join(assets, file), 'utf8').includes('WebGLRenderer');

const index = read('index.html') ?? '';
// The entry is loaded by a module script tag or a modulepreload link or, in
// prerendered pages, by the inline loader that runs after the first paint
// (its import() and the preloads it adds).
const initial = closure(
  [
    ...index.matchAll(
      /<(?:script type="module"|link rel="modulepreload")[^>]*?(?:src|href)="[^"]*\/assets\/([^"]+\.js)"/g,
    ),
    ...index.matchAll(/import\("[^"]*\/assets\/([^"]+\.js)"\)/g),
    ...index.matchAll(/"[^"]*\/assets\/([^"]+\.js)"/g),
  ].map((match) => match[1]),
);
if (initial.length === 0) fail('index.html', 'no entry script found');
const initialBytes = initial.reduce((sum, file) => sum + gzipSize(file), 0);
if (initial.some(hasThree)) fail('initial scripts', 'include Three.js');
if (initialBytes > BUDGETS.initialScripts)
  fail('initial scripts', `${initialBytes} bytes gzip, budget ${BUDGETS.initialScripts}`);

const anatomyPage = fs.readdirSync(assets).find((file) => /^JvmAnatomyPage-.*\.js$/.test(file));
if (!anatomyPage) fail('assets', 'no JvmAnatomyPage chunk');
else if (closure([anatomyPage]).some(hasThree))
  fail(anatomyPage, 'the anatomy page loads Three.js before the 3D viewer is chosen');

const threeChunks = fs.readdirSync(assets).filter((file) => file.endsWith('.js') && hasThree(file));
if (threeChunks.length === 0) fail('assets', 'no chunk contains the 3D renderer');
for (const file of threeChunks)
  if (gzipSize(file) > BUDGETS.threeChunk)
    fail(file, `${gzipSize(file)} bytes gzip, budget ${BUDGETS.threeChunk}`);
// Readers who never open the 3D viewer never download it, offline caching included.
const worker = read('sw.js') ?? '';
for (const file of threeChunks)
  if (worker.includes(file)) fail('sw.js', `precaches ${file}, which should load on demand`);

if (problems.length) {
  console.error(`verify-build: ${problems.length} problem(s) in dist/ (base ${BASE_URL}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  `verify-build: ${PRERENDER_PATHS.length} pages and 404.html are complete for base ${BASE_URL}` +
    ` (canonical origin ${SITE_URL}); initial scripts ${(initialBytes / 1000).toFixed(1)} kB gzip` +
    ` in ${initial.length} files, 3D chunk ${threeChunks.map((f) => (gzipSize(f) / 1000).toFixed(1)).join(', ')} kB gzip`,
);
