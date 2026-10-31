# JVM Atlas — implementation plan

> Explore the machine behind Java programs.

This is the working plan for the project. It is short on purpose: it records the decisions that shape
the code base, the milestone order, and what "done" means for each milestone. Update it when a
decision changes. How the site teaches (navigation, the first lesson, explanation levels,
progressive disclosure) is described in [`LEARNING_EXPERIENCE.md`](LEARNING_EXPERIENCE.md).

## 0. Starting point

The repository started with only an MIT `LICENSE` and a one-line `README.md`. Everything else is new.

## 1. Product architecture

JVM Atlas is a **static single-page application**, prerendered to HTML for every public route.
There is no server, database, account system or external API. Everything the learner sees is
compiled into static files, served from one commit by two hosts: Vercel serves the canonical site
from the root of `https://jvmatlas.vercel.app`, and GitHub Pages serves a mirror on the project
subpath (section 7).

```
┌──────────────────────────── browser ────────────────────────────┐
│  UI & navigation      React Router pages, layout, preferences    │
│  Visualization        SVG anatomy, 3D model, inspector           │
│  Simulation           pure TypeScript step models (no DOM)       │
│  Content              typed TS data: components, relationships,  │
│                       glossary, references, scenarios, quizzes   │
│  Persistence          localStorage (progress, bookmarks, prefs)  │
└──────────────────────────────────────────────────────────────────┘
          ▲ static files only (HTML, JS, CSS, fonts, SVG, PNG)
   Vercel ─────────build──▶ jvmatlas.vercel.app (canonical, site root)
   GitHub Actions ─build──▶ GitHub Pages (mirror, project subpath)
```

The four layers are kept separate so contributors can change one without touching the others:

| Layer         | Lives in                                               | Rule                                               |
| ------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Content       | `src/content`, `src/glossary`, `src/data`              | Plain typed data. No JSX, no layout coordinates.   |
| Visualization | `src/components/anatomy`, `src/modules/*/` SVG         | Reads content by id. Owns coordinates and drawing. |
| Simulation    | `src/simulators`                                       | Pure functions with unit tests. No React.          |
| UI            | `src/app`, `src/pages`, `src/components/{layout,ui,…}` | Composition, routing, persistence.                 |

## 2. Sitemap

| Route            | Page (navigation label)   | Milestone  | Status in this release                                      |
| ---------------- | ------------------------- | ---------- | ----------------------------------------------------------- |
| `/`              | Home                      | M1, LX, JA | Built (atlas hero, eight sections)                          |
| `/start`         | Start here                | LX         | Built (7 chapters and a recap)                              |
| `/learn`         | Learn                     | M1, LX, JA | Built (guides and question-led paths; `/paths` still works) |
| `/learn/:slug`   | Guides                    | JA         | Built (ten guides)                                          |
| `/anatomy`       | Explore anatomy           | M2, LX, JA | Built (2D map, 3D model, list; 4 views)                     |
| `/glossary`      | Glossary                  | M1/M2      | Built                                                       |
| `/references`    | References                | M1/M2      | Built                                                       |
| `/about`         | About                     | M1         | Built (includes project status)                             |
| `/contributing`  | Contributing (footer)     | M1         | Built                                                       |
| `/class-loading` | Class Loader Explorer     | M3         | Not routed yet                                              |
| `/memory`        | Runtime Memory Explorer   | M4         | Not routed yet                                              |
| `/execution`     | Execution Engine Explorer | M5         | Not routed yet                                              |
| `/bytecode`      | Bytecode Explorer         | M5         | Not routed yet                                              |
| `/gc`            | Garbage Collection Lab    | M6         | Not routed yet                                              |
| `/concurrency`   | Concurrency Lab           | M7         | Not routed yet                                              |
| `/collections`   | Collections Explorer      | M7         | Not routed yet                                              |

LX is the learning-experience redesign (see [`LEARNING_EXPERIENCE.md`](LEARNING_EXPERIENCE.md));
JA is the JVM Atlas release (rebrand, prerendering, guides, 3D anatomy). The header shows Start
here, Explore anatomy, Learn, Glossary, References and About; Contributing and Project status are
in the footer and the mobile menu.

Pages that are not built are **not linked**. The Learn page and About → Project status list them
as "in development" with their milestone, as plain text. No dead navigation, no empty pages.

Selection state lives in the URL so every view can be shared and the back button works:
`/anatomy?c=heap&mode=internal&view=full`, `/anatomy?mode=execution&s=jit&step=3`,
`/start?chapter=memory`. Explorer `mode` values keep their original names
(`anatomy|exploded|internal|execution`); the interface calls them Overview, Show the parts, Look
inside and Watch it run.

## 3. Design system

**Mood:** a science museum after dark. Reading surfaces are calm (Inter at 17 px, about 70
characters per line, sentence case); each visualization is a lit exhibit case (`.exhibit`) on the
dark blueprint canvas and moves only when the learner acts. The JVM plate keeps the technical-atlas
language: blueprint grid, hairline boundaries, numbered parts, callouts and leader lines.

**Typography** (self-hosted, OFL-licensed, no font CDN):

- Source Serif 4: titles and component names (the "textbook" voice)
- Inter: body and UI text
- JetBrains Mono: code, labels, part numbers, specification citations

**Colour semantics** (always paired with a second, non-colour cue):

| Colour | Meaning                          | Second cue                                             |
| ------ | -------------------------------- | ------------------------------------------------------ |
| Blue   | Execution and control flow       | Solid connector with a filled arrowhead                |
| Purple | Runtime components               | Component outline and a text label                     |
| Green  | Successful operation or state    | Check glyph and a state word ("initialized")           |
| Orange | Warning or exceptional condition | Warning glyph and dash-dot line                        |
| Grey   | Inactive structure               | Reduced opacity and "inactive" in the accessible label |

**Provenance cues:** solid outlines are concepts defined by the JVM Specification. Dashed outlines
with a `HotSpot` tag are implementation structures of OpenJDK HotSpot (JDK 25). Platform (OS/CPU)
and build-time structures use a dotted outline. The legend on every diagram explains this.

**Tokens** are CSS custom properties declared in `src/styles/index.css` through Tailwind v4 `@theme`, so
SVG and HTML share one palette.

**Reusable components:** `AnatomyCanvas`, `ArchitectureNode` (including the collapsed region
cards of the overview), `RelationshipConnector`, `ComponentInspector`, `ComponentSearch`,
`ExplorerTour`, `InternalView`, `ExecutionTimeline`, `StepController`, `CodeBlock`, `GlossaryTerm`
(in-place popover), `KnowledgeCheck`, `AccuracyNote`, `SourceReference`, `LevelSwitch` and
`LevelText` (explanation levels). The lesson adds `ExhibitFrame` (an exhibit with a live caption
and an accuracy note), `StepControls` with `useStepper`, `PredictionCard`, `TermCard`, `TeachBack`
and `ReferenceArrows` (arrows between a stack variable and the object it refers to);
`JourneyMachine` follows one line of Java on the homepage. The full memory and bytecode explorers
(`MemoryRegion`, `HeapObject`, `BytecodeInstruction`) arrive with M4 and M5.

## 4. JVM anatomical component inventory (M2)

Provenance: **S** = JVM Specification concept, **H** = HotSpot (JDK 25) implementation, **P** =
platform / toolchain (outside the JVM).

| Subsystem              | Components                                                                                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build time (P)         | Source file, `javac`, class file                                                                                                                                                                                                              |
| Launch (P)             | `java` launcher                                                                                                                                                                                                                               |
| Class loader subsystem | Bootstrap (S), Platform (S/H), Application (S/H), Custom (S) loaders · Parent delegation (S) · Loading (S) · Linking (S): Verification, Preparation, Resolution · Initialization (S) · Unloading (S, JLS §12.7)                               |
| Runtime data areas     | Method area (S) → Run-time constant pool (S) · Heap (S) → Young generation (H): Eden, Survivor · Old generation (H) · Thread (S): PC register, JVM stack → Stack frame → Local variables, Operand stack, Frame data · Native method stack (S) |
| Execution engine       | Interpreter (S role, H template interpreter) · Runtime profiling (H) · JIT compiler (H): Compilation, Optimization, C1, C2 · Code cache (H) · Deoptimization (H)                                                                              |
| Garbage collector      | GC roots · Marking · Sweeping · Compaction/evacuation · Collectors (H): G1, ZGC, Shenandoah, Parallel, Serial, Epsilon                                                                                                                        |
| Native interface       | JNI (JNI specification) · Native libraries                                                                                                                                                                                                    |
| Platform (P)           | Native threads and scheduler, virtual memory, system calls, CPU                                                                                                                                                                               |

Twelve components also have a hand-drawn **internal dissection** (class loader delegation, method
area metadata, run-time constant pool, heap regions and object layout, thread stack, stack frame,
PC register, interpreter dispatch, tiered compilation, code cache segments, GC reachability, JNI call
path). Every other component gets a generated focus view built from its data (children, inputs,
outputs, relationships).

## 5. Data model

All content is typed (`src/types/content.ts`), so a missing field or a broken reference fails the
type check or the integrity tests.

```ts
ComponentDoc {
  id, name, label, subsystem, parent?, provenance: 'spec' | 'hotspot' | 'platform',
  scope?: 'shared' | 'per-thread' | 'per-class' | 'process' | 'build',
  summary,                          // one line: hover labels and "What is this?"
  simple, developer?, deep: RichText, // the three explanation levels
  analogy?: { picture, mapping: { picture, real }[], limits },
  demo?: DemoId,                    // a lesson exhibit reused in "See it working"
  check?: QuizQuestion,             // "Check your understanding"
  purpose, internals: RichText[],   // what it is for, what it is made of
  inputs, outputs: string[],
  example?: { title, language, code, output?, verifiedWith },
  practice: RichText,               // real-world application, flags, diagnostics
  misconceptions: { myth, truth }[],
  specVsImpl?: { spec, implementation },
  accuracyNote?, version?,          // e.g. "HotSpot, JDK 25"
  references: { source, section?, note? }[],
}
Relationship  { id, from, to, kind: 'control' | 'data' | 'delegation' | 'lifecycle' | 'exception' | 'native', label, description }
GlossaryEntry { id, term, aliases, simple, developer?, deep, whyItExists, componentId?, related, misconception? }
Reference     { id, title, publisher, url, version, kind: 'spec' | 'jep' | 'source' | 'guide' | 'api' }
Scenario      { id, title, summary, accuracyNote, code?, steps: Step[] }
Step          { title, simple, developer?, deep, active[], flows[], states?, codeLine?, bytecodePc? }
Quiz          { id, questions: { prompt, kind, options: { text, correct, explanation }[] }[] }
JvmRegion     { id, title, blurb, role, family }      // the six parts of the explorer overview
Lesson        { id, title, summary, chapters: LessonChapter[] }
LessonChapter { id, title, question, takeaway, minutes, prediction, exhibit, component,
                explanation: LeveledText, term, tryIt, check, listings?, accuracyNote, references }
```

The core-concept fields (`developer`, `analogy`, `demo`, `check`) are written in
`src/content/jvm/teaching.ts` and merged into the component docs, so the teaching layer can be
reviewed on its own. `LeveledText` (`src/lib/levels.ts`) resolves a level and falls back from
Developer to Deep dive, marking the fallback so the interface can say so.

Learner data (`src/hooks/useLearningState.ts`) is stored in `localStorage` under
`inside-java:v1:preferences` and `inside-java:v1:progress`. Each store has a validator and a
migration: data from an older release is repaired field by field (for example `beginner` →
`simple`, `technical` → `deep`), never discarded.

`RichText` is a small, tested inline syntax: `` `code` ``, `**strong**`, `[[glossary-id|label]]` for
clickable glossary terms, and `[label](https://…)` for links. It keeps content readable in a diff
and renders without shipping a Markdown runtime. Long-form lessons (M3 onwards) will use MDX; the
same glossary and citation components will be exposed to MDX.

Layout coordinates live beside the visualization (`src/modules/jvm/layout.ts`), never in content.

## 6. Technical implementation plan

- **Stack:** React 19, TypeScript 6 (strict; typescript-eslint does not yet support TypeScript 7),
  Vite 8, Tailwind CSS 4, Motion, Lucide, Shiki (fine-grained, JavaScript regex engine, Java and
  shell grammars only), Vitest + Testing Library, Playwright for browser tests. Monaco Editor and MDX
  are deferred to the milestones that use them (M3/M4), which keeps the first bundle small.
- **Anatomy rendering:** one SVG `viewBox` (1600 × 1100) with a transform group for pan/zoom.
  Dragging updates the transform through a ref (no React re-render per pointer move); the zoom level
  is committed to state only when it crosses a level-of-detail threshold. Edges use orthogonal routes
  computed from anchor sides; edges to collapsed or hidden nodes re-attach to the nearest visible
  ancestor.
- **Modes** (interface names in brackets): Anatomy [Overview] (the map: six collapsed regions by
  default, or the complete map), Exploded [Show the parts] (subsystems and parts separated with
  numbered callouts), Internal [Look inside] (dissection of the selection), Execution [Watch it
  run] (scenario playback with the camera following the active components).
- **Lesson and journey:** the Start here exhibits and the homepage journey machine are React and
  SVG components driven by pure simulators (`src/simulators/journey.ts`, `tiering.ts`,
  `reachability.ts`) and a shared stepper (restart, previous, play/pause, next).
- **Accessibility:** every node is a focusable `button` role with a descriptive label; the component
  tree is a keyboard-navigable `tree`; diagram keyboard shortcuts (`+`, `-`, `0`, arrows, `Esc`);
  `prefers-reduced-motion` disables animated flows and camera tweens; colour never carries meaning
  alone.
- **Performance and offline use:** route-level code splitting; the anatomy page, Shiki and the
  glossary load lazily; after the first page is idle the remaining route chunks and the
  highlighter are prefetched. A dependency-free service worker (`src/sw/service-worker.js`,
  generated with its precache list at build time) makes reloads work offline too: pages are
  network-first with the cached shell as fallback, hashed assets are cache-first.
- **Accuracy:** every claim cites a source id from `src/data/references.ts`. Bytecode, flag
  defaults and log lines were produced with OpenJDK 25.0.4 (`javac`, `javap -c -v`,
  `-XX:+PrintFlagsFinal`, `-Xlog`). HotSpot internals were checked against the `jdk-25-ga` source tag.
- **Tests:** unit tests for rich text, geometry/routing, exploded layout, playback, storage, the
  learning-state migration, the simulators and content integrity (every id, relationship, glossary
  link, citation, lesson listing and teaching-layer entry resolves); component tests for the
  inspector, knowledge check, component tree, the explorer overview and tour, the header, the first
  lesson and the journey machine; Playwright tests (desktop and mobile) that run against the
  production build served by `scripts/serve-pages.mjs`, which reproduces GitHub Pages on the
  `/jvm-inside-out/` subpath (redirects, `404.html`, status codes), including an offline reload, the
  whole first lesson, reduced motion and the migration of stored data.

### Milestones

| Milestone | Scope                                                                                                          | Done when                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| M1        | Setup, design system, layout, navigation, home, paths, glossary, references, about, contributing, Pages deploy | Builds, tests pass, subpath build verified locally             |
| M2        | JVM anatomy: all subsystems, nested parts, inspector, relationships, 4 modes, layers, quiz                     | Acceptance criteria 3–6, 9–12 below                            |
| LX        | Learning experience: Start here lesson, journey machine, explorer overview, three levels, inspector disclosure | Done in this release; see `LEARNING_EXPERIENCE.md`             |
| M3        | Class Loader Explorer (delegation simulator, loading/linking/init walkthrough), MDX lessons                    | Criterion 7                                                    |
| M4        | Runtime Memory Explorer (stack/heap lab, `Person` timeline, Monaco)                                            | Criterion 8                                                    |
| M5        | Execution Engine Explorer and Bytecode Explorer (verified `javap` listings)                                    | Operand stack/locals stepping works for the shipped examples   |
| M6        | Garbage Collection Lab (object graph editor, reachability, simulated collection)                               | Reachable / unreachable / reclaimed states are distinguishable |
| M7        | Concurrency Lab (interleaving simulator) and Collections Explorer (HashMap playground)                         | Simulators covered by unit tests                               |
| M8        | Remaining curriculum, glossary expansion, quizzes, accessibility and performance audit                         | Release checklist complete                                     |

### First-release acceptance criteria and where they are met

| #   | Criterion                                        | Milestone                                                      |
| --- | ------------------------------------------------ | -------------------------------------------------------------- |
| 1   | Deploys to GitHub Pages                          | M1 (workflow; needs Pages enabled by the repository owner)     |
| 2   | Homepage loads from a subpath                    | M1 (verified locally by Playwright against `/jvm-inside-out/`) |
| 3   | JVM anatomy shows all major subsystems           | M2                                                             |
| 4   | Every major component is selectable              | M2                                                             |
| 5   | Inspector has substantive technical explanations | M2                                                             |
| 6   | Relationships are navigable                      | M2                                                             |
| 7   | Working class-loading walkthrough                | M3 (previews: the launch walkthrough, Start here chapter 4)    |
| 8   | Memory Explorer shows stack, heap and references | M4 (previews: `new Person("Alex")`, Start here chapter 5)      |
| 9   | Every diagram has accuracy notes                 | M2                                                             |
| 10  | Works without a backend or paid service          | M1                                                             |
| 11  | README covers local development and deployment   | M1                                                             |
| 12  | No critical navigation or interaction is broken  | Every milestone                                                |

## 7. Deployment plan

The canonical site is on Vercel at `https://jvmatlas.vercel.app` (root path); GitHub Pages serves a
mirror at `/jvm-inside-out/`. Both come from the same commit. See
[`SEO_AND_DEPLOYMENT.md`](SEO_AND_DEPLOYMENT.md) for the details.

1. `vite.config.ts` reads `BASE_PATH` (default `/`). CI sets it to `/<repository-name>/`, or to the
   `PAGES_BASE_PATH` repository variable when a custom domain is used. Vercel builds for `/`.
2. The router uses `import.meta.env.BASE_URL` as its basename. No root-relative asset paths in code.
3. `npm run build` runs the client build (which writes `sw.js` with the precache list), the SSR
   build and `scripts/prerender.mjs`, which writes every public route as real HTML, `404.html`
   and, for the root build, `sitemap.xml` and `robots.txt`; `scripts/verify-build.mjs` then checks
   the output, Three.js isolation and the script budgets.
4. `.github/workflows/deploy.yml`: checkout → `npm ci` → type-check → lint → unit tests → root
   build → Pages build → Playwright tests against the built subpath → upload Pages artifact →
   deploy (on `main` only; pull requests run everything except deployment). `vercel.json` sets the
   Vercel build command, output directory and headers.
5. One-time setup by the repository owner: **Settings → Pages → Source: GitHub Actions**, and the
   Vercel project connected to the repository.

Production deployment cannot be verified from a pull request: a pull request gets a Vercel preview
deployment and runs every CI step except the Pages deployment. Production is verified when the
workflows run on `main` and the sites respond at `https://jvmatlas.vercel.app` and
`https://<owner>.github.io/<repository>/`.

## 8. Project structure

```
src/
  app/            router, root layout, route table, page fallback, service worker registration
  pages/          one file per route
  components/
    anatomy/      AnatomyCanvas, ArchitectureNode, RelationshipConnector, legend, tree, controls
    diagrams/     shared SVG defs (markers, patterns, blueprint grid, title block)
    inspector/    ComponentInspector and its sections
    code/         CodePanel, Shiki highlighter
    timeline/     ExecutionTimeline, StepController
    learning/     GlossaryTerm, KnowledgeCheck, RichText, AccuracyNote, SourceReference
    layout/       AppShell, header, footer, mobile navigation
    ui/           buttons, badges, segmented control, callouts
  modules/
    jvm/          explorer: layout, explorer state, overview regions, tour, internal dissections
    lesson/       Start here: exhibits, stepper, prediction, term card, teach-back
    journey/      homepage journey machine
  simulators/     pure TS models: playback, journey (class-file size, bytecode), tiering, reachability
  content/        JVM component docs, teaching layer, regions, relationships, scenarios, quiz,
                  the first lesson, learning paths, questions, project status
  glossary/       glossary terms
  data/           reference registry, site metadata, navigation
  hooks/          pan/zoom, persistence, media queries, reduced motion
  lib/            rich-text parser, geometry, storage, utilities
  types/          content and layout types
  styles/         Tailwind entry and design tokens
  sw/             service worker (the build prepends its precache list)
tests/
  unit/           Vitest
  e2e/            Playwright (runs against the production build on the Pages subpath)
scripts/          serve-pages.mjs: a local GitHub Pages emulator for previews and browser tests
.github/workflows deploy.yml: check, test, build, browser tests, deploy
```
