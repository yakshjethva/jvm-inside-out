# JVM Atlas

**Explore the machine behind Java programs.**

JVM Atlas is an independent, open-source, interactive atlas of the Java Virtual Machine: its
runtime architecture, memory management and execution. Beginners start with one question, "What
happens when you run a Java program?", and follow a single line of Java from source code to the
processor. Experienced developers open the same machine as a technical plate and a 3D model,
where every part is a real component they can select, inspect, take apart and watch at work.

**One machine. One source of truth. Multiple levels of understanding.**

It is a static site. There is no backend, database, account, analytics or paid service, and after
the first visit it keeps working offline.

- Primary site: <https://jvmatlas.vercel.app> (Vercel, deployed by its GitHub integration)
- Mirror: <https://yakshjethva.github.io/jvm-inside-out/> (GitHub Pages, deployed from `main`)

## What is in this release

See [`docs/LEARNING_EXPERIENCE.md`](docs/LEARNING_EXPERIENCE.md) for how the site teaches,
[`docs/3D_EXPERIENCE.md`](docs/3D_EXPERIENCE.md) for the 3D anatomy,
[`docs/SEO_AND_DEPLOYMENT.md`](docs/SEO_AND_DEPLOYMENT.md) for rendering, search and deployment,
and [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the architecture and roadmap.

- **Home:** "Explore the machine behind every Java program." An original drawing of the seven
  areas (build time, the five regions of the JVM, the platform), the interactive plate, one
  concept at all three explanation levels, the seven areas, the guided first lesson with the
  journey machine, selected walkthroughs and dissections, accuracy and sources, and the project.
  - The journey machine: edit the message in `System.out.println("…")`, press _Run it_ and
    follow the program through the compiler, the class file, the class loader, memory, the
    execution engine and the CPU to the output. The bytecode is real `javac` 25.0.4 output; the
    class-file size is 404 bytes plus the message's length in modified UTF-8, which matches
    `javac` 25.0.4.
- **Start here** (`/start`): the guided first lesson in seven short chapters (your first program,
  the compiler, the JVM, loading classes, memory, execution, garbage collection) and a recap.
  Each chapter asks for a prediction, shows what really happens in an interactive exhibit,
  explains it at your level, introduces one term, checks your understanding and links to the same
  part of the atlas.
- **Explore anatomy** (`/anatomy`): 66 components (36 defined by the JVM Specification, 19
  HotSpot implementation structures and 11 platform parts) with 39 relationships, in three
  viewers that share one selection:
  - **2D map** (default): opens on the six main parts; _Show the full JVM map_ reveals
    everything. Four views: Overview, Show the parts, Look inside (12 dissections) and Watch it
    run (5 step-by-step walkthroughs).
  - **3D model**: the same parts standing on the parts that contain them. Turn, zoom and pan;
    explode and reassemble; isolate a part; compare several; see a part's connections; play a
    walkthrough with its active parts lit and its flows drawn. Loaded only when you choose it,
    with a fallback to the 2D map where 3D cannot run.
  - **List**: every part as a nested list, for reading or a screen reader.
  - The inspector answers _What is this?_, _Picture it_, _What actually happens?_, _See it
    working_, _Where does it fit?_ and _Check your understanding_, and keeps the technical
    details one step away.
- **Learn** (`/learn`): ten guides that answer common questions (what is the JVM, how it works,
  its architecture, bytecode, class loading, heap vs stack, stack frames, garbage collection,
  interpreter vs JIT, HotSpot vs the specification), learning paths organised around questions,
  your progress and bookmarks.
- **Three explanation levels:** Simple, Developer and Deep dive, chosen once and used everywhere.
- A **glossary** of 84 terms, **references** (123 primary sources, with "cited by" links), and
  **About** and **Contributing** pages.
- Progress, bookmarks, quiz answers and preferences are stored in your browser only, and are
  migrated, never reset, when their shape changes.

Later milestones add the Class Loader Explorer, Runtime Memory Explorer, Execution Engine and
Bytecode Explorers, GC Lab, Concurrency Lab and Collections Explorer. They are not linked from
the site until they exist.

## Accuracy

- Specifications: JVMS and JLS for Java SE 25, Java SE 25 API documentation.
- Implementation: OpenJDK HotSpot, JDK 25, checked against the `jdk-25-ga` source tag.
- Every bytecode listing, flag value and log line was produced with OpenJDK 25.0.4 (`javac`,
  `javap -c -v`, `java -XX:+PrintFlagsFinal`, `-Xlog`) and records how it was produced.
- Drawings mark provenance with line style as well as colour: solid for JVM Specification
  concepts, dashed with an `HS` tag for HotSpot structures, dotted for parts outside the JVM.
  Every simplified visualization says what it leaves out, and the 3D positions are a teaching
  layout, not a memory map.

Found a mistake? Please [open an issue](https://github.com/yakshjethva/jvm-inside-out/issues)
with a source.

## Local development

You need Node.js 22 or newer (see `.nvmrc`) and npm.

```bash
git clone https://github.com/yakshjethva/jvm-inside-out.git
```

```bash
cd jvm-inside-out
```

```bash
npm ci
```

```bash
npm run dev
```

The development server prints its local URL (by default <http://localhost:5173/>). It renders in
the browser only; `npm run build` produces the prerendered site.

| Command                 | What it does                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`           | Development server with hot reload                                                     |
| `npm run typecheck`     | TypeScript in strict mode (application, tests and tooling)                             |
| `npm run lint`          | ESLint (including accessibility rules) and Prettier                                    |
| `npm test`              | Unit, component, content-integrity, SEO and 3D layout tests (Vitest)                   |
| `npm run build`         | Prerendered production build into `dist/` for the site root, checked by `verify-build` |
| `npm run check`         | All of the above: run it before opening a pull request                                 |
| `npm run test:e2e`      | Browser tests (Playwright, axe-core) against a production build on a subpath           |
| `npm run preview:pages` | Serve `dist/` the way GitHub Pages does (base path, 404 page, gzip)                    |
| `npm run format`        | Format every file with Prettier                                                        |

Browser tests need a Playwright browser once:

```bash
npx playwright install chromium
```

To build and look at the site exactly as GitHub Pages serves it:

```bash
BASE_PATH=/jvm-inside-out/ npm run build
```

```bash
npm run preview:pages
```

Then open <http://localhost:4173/jvm-inside-out/>.

## How pages are built

`npm run build` builds the client, renders every public route to HTML on the server side and
writes it to `dist/<route>/index.html` with its own title, description, canonical URL, Open Graph
tags and structured data, then checks the result. The browser shows that HTML at once and the app
takes over after the first paint. Builds for the site root also write `sitemap.xml` and
`robots.txt`. Details, including the crawler policy, are in
[`docs/SEO_AND_DEPLOYMENT.md`](docs/SEO_AND_DEPLOYMENT.md).

## Deployment

One commit deploys to both places.

**Vercel (primary).** The Vercel GitHub integration builds every push with
[`vercel.json`](vercel.json): `npm run build`, output `dist`, and cache headers. Pull requests get
preview deployments.

**GitHub Pages (mirror).** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
type-checks, lints, runs the unit tests, builds and checks the root build, builds the Pages build,
runs the browser tests against it and, on `main`, deploys it.

1. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**. This is
   a one-time step.
2. Push to `main` (or run the workflow by hand from the **Actions** tab).

GitHub Pages serves a project site from `/<repository>/`, so the workflow sets `BASE_PATH`:
`/<repository>/` for a project site, `/` for a `<owner>.github.io` repository, or the
`PAGES_BASE_PATH` repository variable (use `/` with a custom domain). Every page is prerendered,
so deep links such as `/jvm-inside-out/anatomy?c=heap` load with HTTP 200 (after GitHub Pages
adds the trailing slash), and unknown paths load `404.html` with status 404. Both builds point
search engines at the primary site.

### Offline use

A small service worker (`src/sw/service-worker.js`, registered in production builds only)
precaches the app shell, scripts, styles and Latin fonts after the first visit (the 3D viewer is
cached the first time you open it), and caches other files (not pages) the first time they are
fetched. Pages always come from the network, so a new deployment shows up immediately; offline,
the cached app shell loads instead and opens the page you asked for.

## Project structure

```
src/
  app/            router, root layout, service worker registration
  entry-server.tsx  server-side rendering for the prerender step
  pages/          one component per route
  seo/            page metadata, head tags, structured data, canonical origin
  components/     anatomy canvas and nodes, inspector, code, timeline, learning, layout, ui
  modules/
    home/         the homepage's machine drawing and exhibits
    jvm/          the JVM explorer: layout, scene, views, tour, dissections
    anatomy-3d/   the 3D anatomy: viewer, scene, models, controls, fallbacks, tests
    lesson/       the Start here lesson: exhibits, step controls, predictions, teach-back
    journey/      the journey machine
  simulators/     pure models: class-file size and bytecode, tiering, reachability, playback
  content/        JVM components and their teaching layer, regions, relationships,
                  walkthroughs, quizzes, the first lesson, guides, learning paths
  glossary/       glossary terms
  data/           source registry, brand and navigation
  hooks/, lib/    learning state and migration, explanation levels, rich text, geometry, storage
  sw/             service worker
tests/
  unit/           Vitest
  e2e/            Playwright
scripts/          prerender, build checks, GitHub Pages emulator, brand artwork
docs/             brand, design system, 3D, SEO and deployment, learning experience, plan
```

## Contributing

Contributions of every size are welcome, from a corrected sentence to a new laboratory. Read
[`CONTRIBUTING.md`](CONTRIBUTING.md) first: it explains the accuracy rules, how content is
structured and what a pull request needs.

## License

The code and content are released under the [MIT License](LICENSE). Bundled fonts and libraries
keep their own licences; see [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

JVM Atlas is an independent educational project and is not affiliated with or endorsed by Oracle.
Java and OpenJDK are trademarks or registered trademarks of Oracle and/or its affiliates.
