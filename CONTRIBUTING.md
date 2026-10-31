# Contributing to JVM Atlas

Thank you for helping. JVM Atlas grows one verified explanation at a time: you can fix an
error, sharpen an explanation, add a glossary term, improve accessibility, or build the next
laboratory. This guide explains how the project is organised and what a pull request needs.

## Ground rules

- **Accuracy first.** A clear explanation that is wrong does more harm than no explanation.
- **Static only.** The site is deployed to GitHub Pages. Do not add a backend, database, API,
  authentication, analytics, tracking or any external service, and do not load fonts, scripts or
  images from another host.
- **Original visuals.** Every technical diagram is original SVG or rendered by code. Do not add
  screenshots or images copied from elsewhere.
- **No dead ends.** Do not link to pages that do not exist yet, and do not add buttons that do
  nothing.
- Be kind and assume good faith in issues and reviews.

## Set up

You need Node.js 22 or newer and npm. No accounts or keys are required.

```bash
npm ci
```

```bash
npm run dev
```

Before you open a pull request:

```bash
npm run check
```

That runs the type check, ESLint and Prettier, the unit tests and a production build. If you
changed anything interactive, also run the browser tests (install the browser once with
`npx playwright install chromium`):

```bash
npm run test:e2e
```

## Where things live

| Path                                      | Contents                                                         |
| ----------------------------------------- | ---------------------------------------------------------------- |
| `src/content/jvm/components/*.ts`         | One entry per anatomy component: explanations, example, sources  |
| `src/content/jvm/teaching.ts`             | The teaching layer of the core concepts (levels, analogy, check) |
| `src/content/jvm/regions.ts`              | The six main parts of the explorer overview, and the seven areas |
| `src/content/topics.ts`                   | The guides at `/learn/<slug>`, composed from existing content    |
| `src/seo/pages.ts`                        | Every public route's title and description (prerender, sitemap)  |
| `src/content/lesson/firstRun.ts`          | The Start here lesson: chapters, predictions, listings, quiz     |
| `src/modules/lesson/exhibits/`            | The lesson's interactive exhibits (reused by the inspector)      |
| `src/simulators/`                         | Pure models behind the exhibits, with unit tests                 |
| `src/content/jvm/ids.ts`                  | The list of component ids                                        |
| `src/content/jvm/relationships.ts`        | Connectors between components                                    |
| `src/content/jvm/scenarios.ts`            | Execution walkthroughs, step by step                             |
| `src/content/jvm/quiz.ts`                 | The anatomy knowledge check                                      |
| `src/content/paths.ts`                    | The curriculum by subject (Learn page)                           |
| `src/content/questions.ts`                | The question-led paths (Learn page)                              |
| `src/glossary/terms.ts`                   | Glossary entries                                                 |
| `src/data/references.ts`                  | The source registry                                              |
| `src/modules/jvm/layout.ts`               | Plate coordinates and connector routes (kept apart from content) |
| `src/modules/anatomy-3d/data/layout3d.ts` | 3D positions derived from the plate (a teaching layout)          |
| `src/modules/jvm/internals/plates/`       | Hand-drawn dissections for Internal mode                         |
| `tests/unit/content-integrity.test.tsx`   | Checks every id, link, citation, route and layout constraint     |

### Writing text

Content is plain TypeScript data with a small inline syntax, so it stays readable in a diff:

- `` `code` `` for code, `**bold**` for emphasis;
- `[[term-id]]` or `[[term-id|label]]` links a glossary term (it opens in place on the site);
- `[label](https://…)` for an external link (HTTPS only);
- a blank line starts a new paragraph; lines starting with `- ` form a list.

Explanations are written at three levels that describe the same machine. Core concepts need all
three; other content may leave out `developer` until someone writes it:

- `simple`: assumes no programming knowledge. Short sentences, familiar examples, one new term
  at a time. Short, but never false: no "primitives live on the stack" or "objects are freed
  when they go out of scope".
- `developer` (optional): for people who write Java. Real code and APIs, and what a developer
  can observe (`javap`, logs, errors, stack traces). When it is missing, the site shows the deep
  dive and says the developer level is not written yet.
- `deep`: names the JVMS or JLS section or the HotSpot mechanism, with bytecode, flags and limits.

Prefer short sentences and concrete examples over adjectives.

### Analogies and the teaching layer

The core concepts (JVM, class loader subsystem, class file, runtime data areas, heap, JVM stack,
stack frame, method area, interpreter, JIT compiler, garbage collector, JNI) have a teaching
layer in `src/content/jvm/teaching.ts`: developer text, an analogy, a check question and, where
one exists, an interactive demo from the lesson.

An `analogy` needs all three parts: the `picture`, a `mapping` from each part of the picture to
the real concept, and `limits`, which says where the picture stops being accurate. An analogy
opens a door; it never replaces the technical explanation. The integrity tests reject a core
concept without all three levels, a mapped analogy with limits, and a question.

### Interactive visualizations

Every interactive teaches cause and effect: the learner does something, the visual changes, and
a caption says what changed and why. Sequences can be restarted, stepped backwards and forwards,
and paused. Put the logic in a pure function in `src/simulators` and write its unit tests first.
If the visual simplifies anything, its accuracy note says what.

### Adding a component

1. Add its id to `src/content/jvm/ids.ts`.
2. Add its entry to the right file in `src/content/jvm/components/`, with every field filled in
   (TypeScript enforces the shape).
3. Give it a rectangle in `NODE_RECTS` in `src/modules/jvm/layout.ts`, inside its parent and
   clear of its siblings.
4. Add relationships, if any, to `src/content/jvm/relationships.ts`.
5. If it is a core concept, add its entry to `src/content/jvm/teaching.ts`.
6. Run `npm test`: the integrity tests fail with a precise message if anything is missing.

## Accuracy checklist

Every pull request that changes technical content should be able to answer yes to these:

- [ ] Is it clear whether a claim is defined by the specification or is HotSpot behaviour? The
      `provenance` field (`spec`, `hotspot` or `platform`) says which.
- [ ] Does anything implementation-specific name the Java version it applies to?
- [ ] Is every important claim backed by a primary source in `src/data/references.ts`: JVMS, JLS,
      the Java SE API documentation, a JEP, or OpenJDK source at a release tag? Cite it by id;
      the type check fails if the id does not exist.
- [ ] Were bytecode listings, flag values and log output produced by a real JDK, never written by
      hand? Record how in the example's `verifiedWith` field, for example
      `OpenJDK 25.0.4, javap -c -v`.
- [ ] If a diagram or simulation simplifies something, does its accuracy note say what?
- [ ] Are these distinctions kept: specification vs HotSpot; method area vs Metaspace; loading
      vs linking vs initialization; Java heap vs native memory; references vs addresses;
      reachability vs when a collection happens; JDK vs JRE vs JVM; conceptual model vs real
      implementation?

## Design and accessibility rules

- Colour is never the only cue. Blue is execution and control flow, purple runtime components,
  green successful operations and live state, orange warnings and exceptional paths, grey
  inactive. Pair colour with line style, a glyph or text.
- Every interactive element works with a keyboard, has an accessible name and a visible focus
  state.
- Respect reduced motion: animation must never be required to understand something.
- Disclose depth, never delete it. Keep default views small: new technical detail in the
  inspector goes inside "Explore the technical details", and new explorer tools go in
  "Advanced options".
- Layouts must work from a 360 px wide phone to a large desktop.
- New runtime dependencies need a good reason: say why in the pull request, and add them to
  `THIRD_PARTY_NOTICES.md`.

## Pull requests

- Keep each pull request focused on one change.
- Describe what changed and why, and list the sources you used.
- Include screenshots for visual changes.
- Make sure `npm run check` passes. The workflow also runs the browser tests against a
  production build served from the GitHub Pages subpath.

By contributing you agree that your contribution is licensed under the
[MIT License](LICENSE).
