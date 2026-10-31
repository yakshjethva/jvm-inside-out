# Search, discoverability and deployment

How JVM Atlas pages reach readers through search engines and AI answer engines, and how one commit
becomes two deployments. Read this before adding a page, changing metadata or touching the build.

## Principles

- **A page is worth indexing only if it answers something.** Every public route has its own
  title, description, one `h1` and real content in its HTML. There are no thin or programmatic
  pages: the ten guides are composed from the same reviewed content the explorer uses.
- **Structured data describes what is visible.** No reviews, ratings, authors, credentials,
  affiliations, publication dates or certifications. Nothing is invented to look authoritative.
- **No claims without evidence.** Allowing a crawler does not guarantee a citation, and a
  sitemap does not guarantee indexing. Indexing status is read from Google Search Console or
  Bing Webmaster Tools by the owner, never assumed.

## How pages are built

`npm run build` runs four steps:

| Step | Command                                                      | Output                                                                                                                                                                                                                                                                                                         |
| ---- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `vite build`                                                 | `dist/`: the client app, `index.html` template, `sw.js`                                                                                                                                                                                                                                                        |
| 2    | `vite build --ssr src/entry-server.tsx --outDir dist-server` | `dist-server/entry-server.js`: renders a route to HTML (not deployed)                                                                                                                                                                                                                                          |
| 3    | `node scripts/prerender.mjs`                                 | `dist/<route>/index.html` for every public route, `404.html`, and on root builds `sitemap.xml` and `robots.txt`                                                                                                                                                                                                |
| 4    | `node scripts/verify-build.mjs`                              | Fails the build if any page lacks its title, description, single `h1`, canonical URL, JSON-LD or content, if a link points at a missing page, if a URL escapes the base path, if Three.js reaches the first-load scripts, the anatomy page or the service worker's precache, or if a script budget is exceeded |

`src/entry-server.tsx` renders with React Router's static handler and `react-dom/static`
`prerender`, so the HTML is exactly what the app renders for that URL. Each page carries the
stylesheet inline and requests the app's entry module only after its first paint, so the first
paint waits for the HTML alone. `src/main.tsx` then loads the lazy route modules for the current
URL and **hydrates** the prerendered HTML; `App` marks `<html data-hydrated>` when it has taken
over (the browser tests wait for it).

A page rendered for a different URL must not be hydrated: `/anatomy?c=heap` is served the HTML
of `/anatomy`, and on GitHub Pages every unknown path is served `404.html`. The prerender script
adds a tiny inline script to each page that compares the browser's URL with the rendered one and,
if they differ (or there is a query string), sets `data-client-render` on `<html>`. Such a page
stays hidden and is rendered fresh; `App` removes the attribute once React has painted. If the
scripts never arrive, CSS reveals the prerendered page after five seconds instead of leaving it
blank. Without JavaScript the script does not run and the prerendered page is readable.

Code that reads browser state (`localStorage`, `matchMedia`, `IntersectionObserver`) must give
the server render and the first client render the same result: `useSyncExternalStore` stores
return their defaults on the server snapshot, and components that depend on stored state
(a finished chapter) sync after mounting. Where that would move content, CSS decides instead: the
explorer tour is prerendered in both placements (over the map from 640 px, under it on phones),
and the inline head script marks a learner who dismissed it, so it is never shown.

## Performance

Measured on this branch with Lighthouse 13.5.0 against the root build served by
`scripts/serve-pages.mjs` (which gzips text, as the hosts do), in this container's headless
Chromium. Mobile is Lighthouse's default simulation (slow 4G, 4× CPU slowdown), median of three
runs; desktop is one run with the desktop preset. Lab results, not field data:

| Page                  | Mobile LCP | Mobile TBT | Mobile CLS | Desktop LCP | Desktop CLS |
| --------------------- | ---------- | ---------- | ---------- | ----------- | ----------- |
| Home                  | 2.26 s     | 201 ms     | 0.001      | 0.60 s      | 0.001       |
| Start here            | 2.41 s     | 206 ms     | 0.001      | 0.61 s      | 0.001       |
| Learn                 | 2.42 s     | 233 ms     | 0.020      | 0.53 s      | 0.001       |
| Guide (heap vs stack) | 2.41 s     | 558 ms     | 0.001      | 0.53 s      | 0.001       |
| Explore anatomy       | 2.41 s     | 868 ms     | 0.000      | 0.65 s      | 0.000       |
| Glossary              | 2.56 s     | 326 ms     | 0.001      | 0.57 s      | 0.001       |
| References            | 2.11 s     | 156 ms     | 0.002      | 0.49 s      | 0.002       |

Lighthouse category scores in the same runs: mobile performance 74–95, accessibility 96–100,
best practices 100, SEO 100; desktop performance 99–100, accessibility 100, best practices 100,
SEO 100. The glossary's mobile accessibility score (96) comes from target-size measurements of
terms far below the fold that the browser has not laid out yet (`content-visibility`); scrolled
into view, nothing covers them.

Targets are LCP ≤ 2.5 s, CLS ≤ 0.1 and INP ≤ 200 ms. INP needs real interactions and is not
measured here; TBT is its lab proxy, and hydration of the explorer and the guides is the largest
remaining cost on slow devices. The glossary's mobile LCP (2.56 s) is just above the target.

Script budgets (gzip), enforced by `verify-build`: initial scripts 125 kB (112.1 kB now), 3D chunk
275 kB (253.3 kB now). Other pages are prefetched one at a time after load, never with Save-Data
or on 2G; the service worker precaches every bundle except the 3D viewer, which is cached the
first time a reader opens it.

## Metadata

`src/seo/pages.ts` is the single list of public routes (`PRERENDER_PATHS`) and their metadata
(`pageMeta`). `src/seo/head.ts` writes the head tags; `src/app/RootLayout.tsx` keeps the
description and canonical link in step during client-side navigation, and each page sets the same
title with `usePageTitle` (a unit test checks they match).

| Tag                    | Value                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `<title>`              | `<Page> · JVM Atlas`; the home page is `JVM Atlas · Explore the machine behind Java programs` |
| `meta description`     | One or two specific sentences per page                                                        |
| `link rel=canonical`   | Primary origin, no query string; non-root paths omit trailing slashes (home is `/`)           |
| Open Graph and Twitter | Title, description, URL, `og/jvm-atlas.png` (1200 × 630, original artwork)                    |
| `meta robots`          | `noindex` on the 404 page only                                                                |

**Canonical origin.** `SITE_URL` in `src/seo/site.ts` is `https://jvmatlas.vercel.app` unless
`VITE_SITE_URL` is set at build time. Every build, including the GitHub Pages mirror, points its
canonical links there, so search engines consolidate the two copies on the primary site.

**Aliases.** `/paths`, the earlier address of Learn, still works and is prerendered, but its
canonical URL is `/learn` and it is not in the sitemap.

### Structured data

`src/seo/structuredData.ts`, JSON-LD only where the page shows the matching content:

| Page                | Types                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Home                | `WebSite` (name, URL, description, language)                                                                                             |
| Guides (`/learn/*`) | `BreadcrumbList` matching the visible breadcrumb, and `TechArticle` (headline is the visible question, description, `isPartOf` the site) |
| Glossary            | `DefinedTermSet` with every term and its simple definition                                                                               |
| Other pages         | None: they show nothing a structured type would add                                                                                      |

## Guides

`src/content/topics.ts` defines ten guides, each answering one common question (what is the
JVM, how it works, its architecture, bytecode, class loading, heap vs stack, stack frames,
garbage collection, interpreter vs JIT, HotSpot vs the specification). A guide is a list of
blocks that reuse existing content by id: component explanations at all three levels with
their analogy and its limits, the line-of-Java journey, the six regions, provenance and glossary
terms. Each guide links to the part of the atlas, the walkthrough and the lesson chapter that
show it. A unit test checks every id a guide uses exists.

Add a guide only when it answers a question readers ask and the content to answer it exists and
is verified. Do not create pages that differ only in keywords.

## Sitemap and robots.txt

Both are written only by builds served from the site root (the Vercel build). Crawlers read
`robots.txt` only at a host's root, and a sitemap on the mirror would list another host's URLs,
so the GitHub Pages build has neither. `verify-build.mjs` enforces this.

`sitemap.xml` lists every canonical page, without `lastmod`: the build has no per-page
modification date, and one shared date (such as the last commit's) would mark unchanged pages as
modified on every commit. Add `lastmod` only with a date that is accurate for each page.

`robots.txt` (written by `robots()` in `scripts/prerender.mjs`):

| User agent                                                             | Rule     | Why                                                     |
| ---------------------------------------------------------------------- | -------- | ------------------------------------------------------- |
| `*` (search engines)                                                   | Allow    | The site is meant to be found                           |
| `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`                   | Allow    | AI search and answer engines that link to their sources |
| `GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `CCBot` | Disallow | Collect data for training AI models                     |

**Owner decision.** Whether model-training crawlers may use the content is the project owner's
decision. The default disallows them. To change it, edit `robots()` in `scripts/prerender.mjs`
and the matching check in `scripts/verify-build.mjs`, and record the decision in the pull request.
Blocking training crawlers does not affect search indexing or AI search citations. Allowing a
crawler does not guarantee that any engine cites the site.

There is deliberately no `llms.txt`: no major search or answer engine documents using it for
ranking, and the prerendered HTML already gives every crawler the full content.

## Search Console and Bing Webmaster Tools

Not set up. Verification is an owner action: add a DNS record or upload the verification file
the console provides, then submit `https://jvmatlas.vercel.app/sitemap.xml`. Do not commit
placeholder verification tokens.

## Deployment

One commit deploys to two places:

| Target              | URL                                           | Base path          | Built by                                   |
| ------------------- | --------------------------------------------- | ------------------ | ------------------------------------------ |
| Vercel (canonical)  | https://jvmatlas.vercel.app                   | `/`                | Vercel's GitHub integration, `vercel.json` |
| GitHub Pages mirror | https://yakshjethva.github.io/jvm-inside-out/ | `/jvm-inside-out/` | `.github/workflows/deploy.yml`             |

**Vercel.** `vercel.json` sets the build command (`npm run build`, which must run the prerender),
the output directory (`dist`) and headers: hashed files under `/assets/` are cached for a year
as immutable, `sw.js` is revalidated on every request, and every response gets
`X-Content-Type-Options: nosniff` and a `strict-origin-when-cross-origin` referrer policy.
Pull requests get preview deployments from the same integration.

**GitHub Pages.** The workflow type-checks, lints, runs the unit tests, builds once for the site
root (to check the canonical build) and once for the Pages subpath, runs the browser tests
against the subpath build and, on `main`, deploys it. `BASE_PATH` is `/<repository>/`, `/` for
a `<owner>.github.io` repository, or the `PAGES_BASE_PATH` repository variable. One-time setup:
**Settings → Pages → Source: GitHub Actions**.

**Both builds locally:**

```bash
npm run build
```

```bash
BASE_PATH=/jvm-inside-out/ npm run build && npm run preview:pages
```

`npm run preview:pages` serves `dist/` the way GitHub Pages does (trailing-slash redirects and
`404.html` with status 404) at <http://localhost:4173/jvm-inside-out/>.

### After a deployment

A local build is not a deployment. After merging, confirm on the live sites:

```bash
curl -sS -w '\nHTTP %{http_code}\n' https://jvmatlas.vercel.app/learn/heap-vs-stack | grep -Eo '<title>[^<]*</title>|^HTTP [0-9]+'
```

```bash
curl -s https://jvmatlas.vercel.app/robots.txt
```

```bash
curl -s https://yakshjethva.github.io/jvm-inside-out/start/ | grep -o '<link rel="canonical"[^>]*>'
```

```bash
curl -sS -w '\nHTTP %{http_code}\n' https://jvmatlas.vercel.app/no-such-page | grep -Eo '<title>[^<]*</title>|^HTTP [0-9]+'
```

Expect HTTP 200 with the page's own HTML (its title is `Heap versus stack · JVM Atlas`), the
robots rules above, a canonical link on `https://jvmatlas.vercel.app` from the mirror, and HTTP 404
with the `404.html` page (`Page not found · JVM Atlas`) for an unknown path.

## Adding a page

1. Build the page and register it in `src/app/routes.tsx`.
2. Add its title and description to `PAGES` in `src/seo/pages.ts` (or a guide to
   `src/content/topics.ts`); it is then prerendered, listed in the sitemap and checked.
3. Call `usePageTitle` with the same name.
4. Run `npm run build`; `verify-build` reports anything missing.
