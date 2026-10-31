# JVM Atlas

**Explore the machine behind Java programs.**

JVM Atlas is an independent, open-source, interactive atlas of the Java Virtual Machine: its
runtime architecture, memory management and execution. It teaches one machine at several depths:
a beginner follows a single line of Java from source code to the CPU, and an engineer opens the
same machine as a 66-component plate, a 3D model, HotSpot structures, verified bytecode and
primary sources.

> **One machine. One source of truth. Multiple levels of understanding.**

These instructions describe the project as it is built. Read them before changing anything, and
keep them, `README.md` and `docs/` in step with the code. The detailed references are
`docs/BRAND_GUIDELINES.md`, `docs/DESIGN_SYSTEM.md`, `docs/3D_EXPERIENCE.md`,
`docs/SEO_AND_DEPLOYMENT.md`, `docs/LEARNING_EXPERIENCE.md` and `docs/IMPLEMENTATION_PLAN.md`.

## Hard constraints

- **Static site only.** No backend, database, account system, API, paid service, analytics or
  tracking. No fonts, scripts or images from other hosts; technical images are original SVG or
  generated geometry.
- **Two deployments from one commit.** Vercel serves the canonical site at
  `https://jvmatlas.vercel.app` from `/`; GitHub Pages serves a mirror from `/jvm-inside-out/`.
  Never write root-relative asset paths; use `import.meta.env.BASE_URL` or router links (the
  router's basename is the base path).
- **Original visuals.** 2D diagrams are hand-written SVG; the 3D model is generated from content
  with Three.js. No diagram or chart library, no model files, no physics engine. Do not add large
  dependencies without a reason recorded in the pull request and in `THIRD_PARTY_NOTICES.md`.
- **No dead ends.** Link only to pages that exist. Planned work is plain text with its milestone.
- **Never reset learner data.** Stored data changes go through a migration (see Persistence).
- **Do not delete capabilities to simplify the interface.** Move them behind progressive
  disclosure instead.
- **Do not fabricate.** No invented bytecode, flags, log lines, numbers, quotes, sources,
  measurements, test results, deployments, rankings or indexing claims.

## Brand

- The name is **JVM Atlas**; the tagline is "Explore the machine behind Java programs."
- Every page footer and the About page carry, verbatim: "JVM Atlas is an independent educational
  project and is not affiliated with or endorsed by Oracle." and the trademark notice in
  `SITE.trademarks` (`src/data/site.ts`).
- Use "Java" for the language, source code, `javac`, class files, Java SE, the JVMS and the JLS;
  otherwise use precise JVM terms. No Oracle or OpenJDK logos, no coffee-cup artwork, no copied
  marketing material, nothing that suggests affiliation or endorsement. No legal-clearance claims.
- The mark, favicon, app icons and social card are original (`scripts/brand/`). See
  `docs/BRAND_GUIDELINES.md`.

## Stack

| Concern          | Implementation                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------- |
| UI               | React 19.3, React Router 8.5 (data router, lazy routes), hydrated from prerendered HTML     |
| Language         | TypeScript 6, strict                                                                        |
| Build            | Vite 8: client build, SSR build (`src/entry-server.tsx`), `scripts/prerender.mjs`, `scripts/verify-build.mjs` |
| Styling          | Tailwind CSS 4: tokens in `src/styles/index.css` (`@theme static`), container queries       |
| Motion and icons | Motion 14, Lucide                                                                           |
| Code             | Shiki 4 (Java, shell and C grammars, JavaScript regex engine), loaded lazily               |
| Fonts            | Self-hosted via Fontsource: Source Serif 4, Inter, JetBrains Mono                           |
| 2D diagrams      | Hand-written SVG components                                                                 |
| 3D               | Three.js 0.186.1 and React Three Fiber 9.8.2 (no Drei), loaded only for the 3D viewer       |
| Unit tests       | Vitest 5, Testing Library, jsdom                                                            |
| Browser tests    | Playwright 1.63 (desktop Chrome 1440 × 900 and Pixel 7), axe-core 4.14 for WCAG checks      |
| CI and hosting   | GitHub Actions, GitHub Pages (mirror), Vercel (canonical, `vercel.json`)                    |
| Offline          | A dependency-free service worker (`src/sw/service-worker.js`)                               |

Node.js 22 or newer (`.nvmrc`). The `@` import alias points to `src/`.

## Commands

| Command                                    | What it does                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `npm ci`                                   | Install exact dependencies                                                    |
| `npm run dev`                              | Development server (Vite, <http://localhost:5173/>), client rendering only    |
| `npm run typecheck`                        | `tsc` for the app, tests and tooling                                          |
| `npm run lint`                             | ESLint (with jsx-a11y, react-hooks) and `prettier --check`                    |
| `npm run format`                           | Prettier, writing changes                                                     |
| `npm test`                                 | Vitest: unit, component, content-integrity, SEO and 3D layout tests           |
| `npm run build`                            | Build for the site root (Vercel): prerendered pages, sitemap, robots.txt, checks |
| `BASE_PATH=/jvm-inside-out/ npm run build` | Build exactly as GitHub Pages serves it (no sitemap or robots.txt)            |
| `npm run verify:build`                     | Re-run the output checks on an existing `dist/`                               |
| `npm run check`                            | typecheck, lint, test and build: run before every pull request                |
| `npm run test:e2e`                         | Playwright against a production build served on `/jvm-inside-out/`           |
| `npm run preview:pages`                    | Serve `dist/` like GitHub Pages at <http://localhost:4173/jvm-inside-out/>    |

`scripts/serve-pages.mjs` reproduces GitHub Pages: files under the base path, trailing-slash
redirects, `404.html` with status 404 and gzip for text files. `npm run test:e2e` builds with
`BASE_PATH=/jvm-inside-out/` first; set `E2E_SKIP_BUILD=1` to test an existing `dist/`. Install
the browser once with `npx playwright install chromium`.

## Architecture

Four layers, kept apart so each can change without the others:

| Layer         | Where                                                           | Rule                                              |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------- |
| Content       | `src/content`, `src/glossary`, `src/data`                       | Typed data only: no JSX, no layout coordinates    |
| Simulation    | `src/simulators`, `src/modules/anatomy-3d/data`                 | Pure functions with unit tests; no React, no DOM  |
| Visualization | `src/components/anatomy`, `src/modules/*`                       | Reads content by id; owns coordinates and drawing |
| UI            | `src/app`, `src/pages`, `src/components/{layout,ui,learning,…}` | Composition, routing, persistence                 |

```text
src/
  main.tsx          hydrates the prerendered page (or renders fresh), registers the service worker
  entry-server.tsx  renders a route to HTML for the prerender step
  app/              router (routes.tsx), root layout, App, service worker registration
  pages/            one component per route (TopicPage renders the guides)
  seo/              pages.ts (every public route and its metadata), head.ts, structuredData.ts, site.ts (canonical origin)
  components/
    anatomy/        AnatomyCanvas (pan and zoom), ArchitectureNode, RelationshipConnector, ComponentSearch, tree, legend
    inspector/      ComponentInspector: the progressive-disclosure explanation panel
    learning/       RichText, GlossaryTerm, KnowledgeCheck, LevelSwitch, LevelText, AccuracyNote, SourceReference, Popover
    layout/ ui/ code/ timeline/ diagrams/
  modules/
    home/           HeroMachine (the seven areas, drawn from content), home exhibits
    jvm/            the explorer: AnatomyExplorer, AnatomyPlate, layout.ts (coordinates), scene, camera, tour, internals/ (12 dissections)
    anatomy-3d/     the 3D model: viewer, scene, models, components, controls, interactions, accessibility, data, fallback, tests
    lesson/         the Start here lesson: ExhibitFrame, StepControls, useStepper, Prediction, TermCard, TeachBack, exhibits/
    journey/        JourneyMachine: the line-of-Java journey
  simulators/       journey (class-file size, bytecode), tiering, reachability, playback
  content/
    jvm/            components/ (66 docs), teaching.ts, regions.ts (six regions, ATLAS_AREAS), relationships, scenarios, quiz
    lesson/         firstRun.ts: the first lesson, its listings and its quiz
    topics.ts       the ten guides at /learn/<slug>
    paths.ts, questions.ts, status.ts
  glossary/         84 terms
  data/             references.ts (123 primary sources), site.ts (brand, navigation)
  hooks/, lib/      learning state, storage, levels, rich text, geometry, media queries
  types/            content.ts, lesson.ts
  styles/           index.css: design tokens, the two surfaces and shared classes
  sw/               service worker (the build prepends its precache list)
tests/unit/         Vitest
tests/e2e/          Playwright (fixtures.ts waits for hydration after every navigation)
scripts/            prerender.mjs, verify-build.mjs, serve-pages.mjs, brand/ (artwork and icons)
docs/               the design, brand, 3D, SEO, learning and plan documents
```

### Routes and URL state

| Route           | Page            | URL state                                                                                     |
| --------------- | --------------- | --------------------------------------------------------------------------------------------- |
| `/`             | Home            |                                                                                               |
| `/start`        | Start here      | `chapter=program\|compiler\|jvm\|loading\|memory\|execution\|gc\|recap`                       |
| `/learn`        | Learn           | (the earlier address `/paths` still works; its canonical URL is `/learn`)                    |
| `/learn/:slug`  | Guide           | ten slugs from `src/content/topics.ts`                                                        |
| `/anatomy`      | Explore anatomy | `c` component, `mode`, `viewer=2d\|3d\|list`, `view=overview\|full`, `s` walkthrough, `step` |
| `/glossary`     | Glossary        | `#term-id`                                                                                    |
| `/references`   | References      | `#ref-<reference-id>`                                                                         |
| `/about`        | About           | `#project-status`                                                                             |
| `/contributing` | Contributing    |                                                                                               |

Routes are registered in two places: the router (`src/app/routes.tsx`) and `src/seo/pages.ts`
(`PAGES`, `PRERENDER_PATHS`), which gives each public route its title and description and drives
the prerender, the sitemap and the checks. Add a page to both, and only once it exists; the page
must call `usePageTitle` with the same name (a unit test checks it). Explorer `mode` values stay
`anatomy|exploded|internal|execution` in URLs even though the interface calls them Overview, Show
the parts, Look inside and Watch it run; `viewer` is absent for the 2D map. Existing deep links
must keep working.

Navigation is: Start here, Explore anatomy, Learn, Glossary, References, About; the logo is the
link home, and the mobile menu adds Home, Contributing and Project status. The footer links the
primary and project pages.

### Rendering and hydration

Every public route is prerendered to real HTML with its own head (`docs/SEO_AND_DEPLOYMENT.md`).
The page carries its stylesheet inline and loads the app's entry module after its first paint;
`main.tsx` then loads the current route's lazy module and hydrates. A page rendered for another
URL (a query string, the 404 page, the offline shell) is marked by an inline head script and
rendered fresh instead, hidden until then (revealed after five seconds if scripts never arrive).

Code that reads browser state must render the same on the server and on the first client render:
`useSyncExternalStore` stores return defaults on the server snapshot; state that depends on stored
preferences or the screen syncs after mounting, or is chosen by CSS (the explorer tour renders
both placements; a learner who dismissed it is marked before the first paint). Never let content
appear, move or resize after hydration: check CLS whenever a page changes.

### Bundles and performance

- Routes are lazy. Keep the shell (header, footer, settings) free of content: the header imports
  `LevelSwitch`, never `LevelText` or `RichText`, which pull in the glossary and all component
  docs.
- On-request features load with `React.lazy`: the inspector's interactive models, the homepage's
  map preview (when near the viewport) and the 3D viewer (only for `viewer=3d`).
- **Three.js never reaches the first load.** `scripts/verify-build.mjs` fails the build if it is in
  the scripts a page loads first, in the anatomy page's static imports or in the service worker's
  precache, and enforces gzip budgets: initial scripts 125 kB, 3D chunk 275 kB. Raise a budget
  only with a reason in the pull request.
- After a page has loaded, other pages are prefetched one at a time (not with Save-Data or on 2G).
- Targets (lab, Lighthouse mobile and desktop): LCP ≤ 2.5 s, CLS ≤ 0.1, and keep TBT low as the
  lab proxy for INP ≤ 200 ms. Measure against `preview:pages` or a root build served with gzip;
  report results with the tool, version, settings and number of runs, never estimates.

### Persistence

`src/lib/storage.ts` provides `createPersistentStore(key, validate, defaults, migrate?)`; keys are
prefixed `inside-java:v1:` (kept from before the rename so no learner loses progress).
`src/hooks/useLearningState.ts` owns the two stores:

- `preferences`: `level` (`simple|developer|deep`), `motion`, `mapView` (`overview|full`),
  `dismissed` (for example the explorer tour).
- `progress`: explored and understood components, bookmarks, recent pages, quiz answers,
  walkthroughs, lesson chapters.

When a stored shape changes, extend `migratePreferences` / `migrateProgress` so old data is
repaired field by field (the release that introduced three levels maps `beginner` to `simple` and
`technical` to `deep`). Never bump the prefix or clear storage to avoid a migration. Add a test to
`tests/unit/learning-state.test.ts` for every migration. The prerender's head script reads the
preferences key to hide a dismissed tour; keep it in step.

## Learning experience

- **The homepage**, in order: hero ("Explore the machine behind every Java program." with
  _Explore the anatomy_ and _Start with the basics_, and the seven-area drawing), the interactive
  plate, the three levels side by side, the seven areas, the guided first lesson (journey machine,
  chapters, first guides), selected walkthroughs and dissections, accuracy and sources, the
  project. It is meaningful before any script runs and never opens on Three.js.
- **Start here** (`/start`): seven chapters (program, compiler, JVM, loading classes, memory,
  execution, garbage collection) and a recap with a diagram, a teach-back and a five-question
  check. Teaching cycle per chapter: question → prediction → what happens (the exhibit) → why
  (explanation at the chosen level) → the technical term → try it → check. The explanation stays
  hidden until the learner predicts or chooses to skip.
- **Guides** (`/learn/<slug>`) answer one common question each by composing reviewed content
  (component explanations at three levels, analogies with limits, the journey, regions,
  provenance, glossary terms) and link into the atlas. No thin or keyword-variant pages.
- **The path for every concept:** concept → explanation → 2D → 3D → experiment.
- Introduce one term at a time, after the learner has seen the thing it names.
- **Analogies** (`Analogy` in `src/types/content.ts`) map each part of the picture to the real
  concept and state where the picture stops being accurate (`limits`). No analogy without limits.
- **Experts are never slowed down.** Every chapter links to its component, the full map is one
  click from the overview, deep links bypass the tour.

## Progressive disclosure rules

1. **Three explanation levels** describe the same machine: _Simple_ (no programming needed),
   _Developer_ (code, APIs, what you observe) and _Deep dive_ (JVMS/JLS sections, HotSpot
   structures, bytecode, flags). Leveled content uses `LeveledText { simple, developer?, deep }`
   from `src/lib/levels.ts`; render it with `components/learning/LevelText.tsx`.
2. **A missing level is not a missing explanation.** `textAtLevel` falls back from Developer to
   Deep dive and marks the result `fallback: true`; the UI says the level is not written yet.
3. **Default views stay small.** The inspector shows: What is this? · Picture it · What actually
   happens? · See it working · Where does it fit? · Check your understanding. Everything else is
   inside _Explore the technical details_, which opens by default at Deep dive.
4. **The explorer opens on six regions** (from `src/content/jvm/regions.ts`). Selecting a region
   opens it; _Show the full JVM map_ shows all 66 components (remembered as `mapView`). Default
   controls are the view, the viewer (2D map, 3D model, List), _Find a component_ and _Guided
   tour_; layers, the diagram key, the component tree, collapse/expand and keyboard help live in
   _Advanced options_.
5. **Disclose, never delete.** A new field or capability must stay reachable from the default view
   in at most one or two steps.
6. **Core concepts get the full teaching layer** in `src/content/jvm/teaching.ts`: JVM, class
   loader subsystem, class file, runtime data areas, heap, JVM stack, stack frame, method area,
   interpreter, JIT compiler, garbage collector, JNI. Other components fall back gracefully.

## Visualizations teach cause and effect

- Every interactive visual changes **because the learner did something**, and says in words what
  changed and why (`aria-live` captions and announcements).
- Sequences are steppable: restart, previous, play/pause, next, "Step n of N". Nothing important
  happens only in an animation.
- Simulations are pure functions with unit tests written first. A visual may simplify, but it must
  not show something false; every simplified visual says what it leaves out.
- Motion explains a change (a token travelling, a frame appearing, parts coming apart). It is never
  decorative, uses `transform`/`opacity`, and with reduced motion every state is still reachable,
  without movement.
- Colour never carries meaning alone: blue is execution and control flow, purple runtime
  components, green success and live state, orange warnings and exceptional paths, teal platform
  and build time, grey inactive. Provenance uses line style: solid for specification concepts,
  dashed with an `HS` tag for HotSpot structures, dotted for platform and build-time parts.

## The 3D anatomy

Read `docs/3D_EXPERIENCE.md`. In short:

- **One source of truth.** Parts, areas, relationships, walkthroughs and selection come from the
  content and the explorer's URL state; `src/modules/anatomy-3d/data/layout3d.ts` adds spatial
  metadata only, derived from the 2D plate. **Positions are a teaching layout**, never memory
  addresses or physical locations, and the interface says so.
- The 2D map stays the default and a complete fallback; the List viewer and the prerendered page
  work without WebGL or JavaScript. Show a notice and the 2D map when WebGL is missing, the chunk
  fails or the graphics context is lost.
- Demand rendering, capped pixel ratio, shared and disposed geometry and materials, and no
  per-frame React state: animations write to Three.js objects and DOM nodes on rendered frames.
- Every action has a keyboard and HTML equivalent; the component tree is the list of parts.

## Technical accuracy rules

- **Specification vs implementation.** Every component has a `provenance` of `spec`, `hotspot`
  or `platform`. Anything HotSpot-specific names the version it describes (OpenJDK HotSpot, JDK
  25, checked against the `jdk-25-ga` source tag).
- **Keep these distinctions:** JVM specification vs HotSpot; method area vs Metaspace; loading vs
  linking vs initialization; Java heap vs native memory; references vs memory addresses;
  reachability vs eligibility vs reclamation (and none of these says when a collection runs);
  JDK vs JRE vs JVM; bytecode vs machine code; interpreter vs JIT; conceptual model vs real
  implementation; build-time tools, the JVM, the operating system and hardware.
- **Primary sources.** Cite by id from `src/data/references.ts`: JVMS and JLS for Java SE 25, the
  Java SE 25 API documentation, JEPs, the JNI specification, OpenJDK source at a release tag. The
  type check fails on an unknown id.
- **Verified output only.** Bytecode, class-file sizes, flag values and log lines are produced with
  OpenJDK 25.0.4 (`javac`, `javap -c -v`, `-XX:+PrintFlagsFinal`, `-Xlog`, `-XX:+PrintCompilation`)
  and record how in `verifiedWith`. Never write them by hand.
- **Simple is short, never false.** Do not say "primitives live on the stack", "objects are freed
  when they go out of scope", "the JIT compiles everything" and similar shortcuts.

## Search and discoverability

Read `docs/SEO_AND_DEPLOYMENT.md`. In short:

- Every public route has a unique title and description, one `h1`, real prerendered content and a
  canonical URL on `https://jvmatlas.vercel.app` (also from the mirror). Unknown pages are
  `noindex`.
- Structured data only for what the page shows: `WebSite` (home), `TechArticle` and the visible
  breadcrumb (guides), `DefinedTermSet` (glossary). No reviews, ratings, authors, credentials,
  affiliations, dates or certifications.
- `robots.txt` and `sitemap.xml` exist only on the root build. Search and AI search crawlers are
  allowed; model-training crawlers are disallowed until the owner decides otherwise. Never claim
  that allowing a crawler earns citations; no `llms.txt`; no placeholder verification tokens.

## Testing

Add tests for new functionality; write simulator, layout and migration tests before the code.

- `tests/unit/content-integrity.test.tsx`: ids, the component tree, plate layout, relationship
  routes, citations, scenario listings, quizzes, the teaching layer, the first lesson (verified
  with OpenJDK 25.0.4), links to routes, home exhibits and the seven areas. It sweeps every piece
  of rich text for unknown glossary terms and non-HTTPS links.
- `tests/unit/seo.test.tsx`: unique titles and descriptions, canonical URLs, aliases, structured
  data, guide references, and that each page's runtime title equals its prerendered one.
- Component tests (`components.test.tsx`, `learning-experience.test.tsx`), and
  `learning-state.test.ts`, `storage.test.ts`, `simulators.test.ts`.
- `src/modules/anatomy-3d/tests/`: the 3D layout, the viewer URL state, keys and announcements.
- `scripts/verify-build.mjs` (part of every build): prerendered pages, canonical URLs, JSON-LD,
  links, base paths, sitemap and robots rules, Three.js isolation and script budgets.
- Browser tests (`tests/e2e/`, desktop and mobile, against the subpath build): direct links, back
  and forward, navigation, keyboard use, reduced motion, storage migration, offline reload, the
  whole first lesson, the explorer modes, the 3D viewer (lazy loading, selection, keyboard,
  explode, walkthroughs, no-WebGL fallback, context loss), prerendered pages without JavaScript,
  axe-core WCAG 2.2 A/AA checks, no sideways scrolling at 360 px, console errors and internal links.
  Import `test` and `expect` from `tests/e2e/fixtures.ts`, which waits for hydration.

Do not claim something works in a browser unless a browser test or a real browser run showed it.
Do not weaken or delete a test to make it pass; fix the regression.

## Design system

Read `docs/DESIGN_SYSTEM.md`. In short:

- **Two surfaces.** A warm, light editorial surface for reading, and the dark graphite instrument
  surface (`.surface-instrument`, `.exhibit`) for the machine: the hero, the plate, the 3D model,
  code. Accent scales are mirrored so the same class reads on both. One dominant visual per screen.
- Source Serif 4 for questions and titles, Inter for reading (`.reading`: 17 px, at most about 70
  characters per line), JetBrains Mono only for code and technical identifiers. Sentence case for
  headings and labels. No text or label smaller than 11 px (glyphs inside icons excepted).
- Tokens (colours, type, spacing, radii, shadows `raised`/`overlay`/`case`, motion durations) are
  CSS custom properties shared by HTML, SVG and the 3D materials. No gradients in the interface,
  no glass or backdrop blur, no decorative shadows or animation.
- Layouts work from 360 px to wide desktops without horizontal scrolling. Every control is
  keyboard operable, has a visible focus ring and an accessible name, and meets the WCAG 2.2
  minimum target size (24 × 24 px); primary actions are larger. Popovers stay inside the screen.

## Deployment

- **Vercel (canonical):** the GitHub integration builds every push with `vercel.json`
  (`npm run build`, output `dist`, cache headers). Pull requests get preview deployments.
- **GitHub Pages (mirror):** `.github/workflows/deploy.yml` runs on pushes to `main`, pull requests
  and manual dispatch: `npm ci`, typecheck, lint, unit tests, a root build (checked, then
  discarded), the Pages build with `BASE_PATH`, Playwright against it, then (on `main` only)
  uploads `dist/` and deploys. `BASE_PATH` is `/<repository>/`, `/` for a `<owner>.github.io`
  repository, or the `PAGES_BASE_PATH` repository variable. One-time setup: **Settings → Pages →
  Source: GitHub Actions**.
- A local build is not a deployment: confirm the live sites after merging
  (`docs/SEO_AND_DEPLOYMENT.md`). Do not change production settings without the owner's approval.

The service worker precaches the app shell, the favicon, every JavaScript and CSS bundle except
the 3D viewer, and the Latin font subsets, and caches other same-origin files (including the 3D
viewer) the first time they are fetched. Page navigations go to the network and fall back to the
cached shell, which renders the requested route. Hashed assets are cache-first, so after the first
visit the site works offline.

## Agent skills

Project skills live in `.claude/skills/` and are recorded in `skills-lock.json`. The five
Three.js skills (`threejs-r3f`, `threejs-performance`, `threejs-accessibility`, `threejs-assets`,
`threejs-testing`) come from `cesartevisual/threejs-skills` and were reviewed before installation.
Install a community skill only after reading it in full, one skill at a time; skills advise, and
these instructions decide. They are kept exactly as published (the lock records their hashes), so
where one is broader than this project, these instructions narrow it: `threejs-assets` covers
model and texture files, which this project does not use (no model files; all geometry is
generated), so only its guidance on caching and releasing GPU resources applies here.

## Contributing

1. Follow this architecture and the rules above; read `CONTRIBUTING.md`.
2. Maintain technical accuracy and cite sources.
3. Add tests for new functionality.
4. Run `npm run check` (and `npm run test:e2e` for anything interactive).
5. Submit changes through pull requests; never push to `main` directly.

## License

MIT; see [LICENSE](LICENSE). Bundled fonts and libraries keep their own licences
(`THIRD_PARTY_NOTICES.md`). JVM Atlas is an independent educational project and is not affiliated
with or endorsed by Oracle. Java and OpenJDK are trademarks or registered trademarks of Oracle
and/or its affiliates.
