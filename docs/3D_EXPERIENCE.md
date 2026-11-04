# The 3D anatomy

How the 3D model of the JVM is built, what it may and may not claim, and how it stays fast and
usable for everyone. Read this before changing anything in `src/modules/anatomy-3d` or
`src/modules/lab-3d` (the laboratories' models, [below](#the-laboratories-models)).

## What it is for

The 2D plate shows how the parts of the JVM fit together; the 3D model shows the same parts
standing on the parts that contain them, so containment, layers and walkthrough steps can be
turned, pulled apart and isolated. It is a third way into the same machine, not a separate
product: the 2D plate remains the default and a complete fallback.

## One source of truth

| Concern                     | Comes from                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| Parts, names, provenance    | `COMPONENTS` / `COMPONENT_LIST` in `src/content/jvm`                                           |
| Areas                       | `ATLAS_AREAS` in `src/content/jvm/regions.ts` (build time, the five JVM regions, the platform) |
| Relationships               | `RELATIONSHIPS` / `relationshipsOf`                                                            |
| Walkthroughs                | `SCENARIOS` (active parts, states and flows of each step)                                      |
| Footprints                  | The 2D plate's rectangles (`NODE_RECTS` in `src/modules/jvm/layout.ts`)                        |
| Selection, mode, step, view | The explorer's URL state (`useAnatomyState`): `c`, `mode`, `s`, `step`, `view`, `viewer`       |
| Explanations                | The existing inspector and walkthrough panel                                                   |

The only new data is spatial: `src/modules/anatomy-3d/data/layout3d.ts` turns each part's 2D
rectangle into a footprint and stands it on top of its parent. **Positions are a teaching
layout.** They are not memory addresses, physical locations or sizes; the interface says so
wherever the model is shown.

## Module layout

```text
src/modules/anatomy-3d/
  viewer/         Anatomy3D.tsx: the lazily loaded entry, toolbar, camera buttons, announcements
  scene/          Stage.tsx: lights, reflection environment (full detail only), ground grid
  models/         Parts.tsx (blocks, cases, outlines, explode animation), materials.ts (palette, shared materials)
  components/     Labels.tsx (HTML labels projected from 3D), Flows.tsx (relationship and walkthrough arcs)
  controls/       CameraRig.tsx: OrbitControls, framed camera moves, the camera API for buttons and keys
  interactions/   viewerKeys.ts: keyboard shortcuts
  accessibility/  announcements.ts: what the live region says (the list of parts is the explorer's component tree)
  data/           layout3d.ts: pure spatial functions
  fallback/       webgl.ts (support and initial detail), Fallback3D.tsx (no WebGL, failure, loading)
  tests/          Vitest: layout, URL state, keyboard
```

Libraries: `three` 0.186.1 and `@react-three/fiber` 9.8.2 (React 19 peer range `>=19 <19.4`).
No Drei: three's own `OrbitControls` and `RoomEnvironment` cover what is needed. No physics
engine, no model files: every shape is a box generated from the layout.

## Views

| View             | How                                                                                                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assembled        | Default. In the seven-area overview each area is a closed case with its name                                                                                                                                                             |
| Cutaway          | Selecting a part opens its area: the case is cut away and the parts inside are shown. "Show the full JVM map" opens every area                                                                                                           |
| Exploded         | The Explode slider lifts each level above the part it stands on and moves the areas apart; "Show the parts" is fully exploded                                                                                                            |
| Reassemble       | Animates back to the assembled model (and leaves "Show the parts")                                                                                                                                                                       |
| Isolated         | "Isolate …" keeps the selected part, the parts that contain it and the parts inside it                                                                                                                                                   |
| Inspection       | The existing inspector, for the part selected in the model, the list or the search                                                                                                                                                       |
| Relationships    | The selected part's connections as arcs, coloured by kind (Advanced options → Connections)                                                                                                                                               |
| Follow execution | "Watch it run": each step lights its active parts (blue active, green done, orange exceptional), dims the rest, draws its flows and sends a token along each one; the camera follows. The step text is the same narrative panel as in 2D |
| Compare          | "Add to comparison" (or Shift-click) keeps several parts highlighted at once                                                                                                                                                             |

"Look inside" stays a 2D dissection in every viewer: the dissection plates are drawings of
internal structure, not parts of the model.

## Visual language

The model uses the same tokens as the rest of the site, read at runtime from the dark
instrument surface: graphite surfaces tinted by family (blue execution, purple runtime, teal
platform, orange deoptimization), coloured outlines, and provenance by line style — solid for
specification concepts, dashed for HotSpot structures, dotted for build-time and platform parts.
Colour never carries meaning alone: labels, outlines and the inspector's badges say the same in
words.

## Interaction and accessibility

- **Pointer and touch:** drag to orbit, scroll or pinch to zoom, right-drag or two fingers to
  pan; click a part to select it; click empty space to clear the selection.
- **Keyboard:** the model is a focusable group described by its instructions. Arrows orbit, `+`
  and `−` zoom, `0` or Home resets, `F` frames the selection, Escape clears it.
- **Buttons:** rotate, zoom, reset and centre the selection, all at least 36 px.
- **Without a pointer or sight:** "List of parts" opens the explorer's component tree (a real
  `tree` with arrow-key navigation); selecting there selects in the model. The List viewer
  (`viewer=list`) shows the same tree without any drawing.
- **Announcements:** selection, isolation, explode and reassemble changes are announced in a
  polite live region; frames and hovers are not.
- **Reduced motion:** camera moves, the explode animation and flow tokens become immediate; no
  inertia. Every state is still reachable.

## Four experiences

| Experience    | When                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full 3D       | Default where the device reports enough cores and memory                                                                                                          |
| Reduced 3D    | Devices with 4 or fewer cores, 4 GB or less memory, or Save-Data; or "Reduce detail". Device pixel ratio 1, no antialiasing, no reflection map, simpler materials |
| 2D SVG        | The default viewer, and the fallback offered whenever 3D cannot run                                                                                               |
| Semantic HTML | The List viewer, and the prerendered explorer page without JavaScript                                                                                             |

## Performance

- **Never in the first load.** `Anatomy3D` is imported with `React.lazy` only when `viewer=3d`,
  and so are the laboratories' models. Three.js, Fiber and the scene code the viewers share are
  one chunk that only the viewers import. `scripts/verify-build.mjs` fails the build if Three.js
  is in the scripts `index.html` loads, in the static imports of a page with a 3D view
  (`JvmAnatomyPage`, `ClassLoadingPage`, `MemoryPage`) or anywhere reachable without opening a
  3D view, if the service worker precaches a viewer-only chunk, and if a budget is exceeded:

  | Scripts (gzip)                                                        | Budget | Measured on this branch                                   |
  | --------------------------------------------------------------------- | ------ | --------------------------------------------------------- |
  | Initial (entry and its static imports)                                | 125 kB | 113.9 kB                                                  |
  | Opening a 3D view (everything it downloads beyond its page's scripts) | 275 kB | anatomy 254.0 kB, class loaders 256.9 kB, memory 255.4 kB |

  The 3D budget used to apply to one chunk; since the viewers share Three.js it applies to the
  whole download a 3D view causes, which is stricter. Raise a budget only with a reason recorded
  in the pull request.

- While the chunk loads, a small original SVG of stacked layers holds the space.
- **Demand rendering** (`frameloop="demand"`): a frame is drawn only when something changed —
  a camera move, a hover, an animation step. An idle or off-screen model costs nothing.
- Device pixel ratio capped at 2 (1 when reduced). One shared box geometry for every part;
  materials shared by look and disposed on unmount, as are outlines, flow tubes, the reflection
  map, the grid and the controls.
- **No per-frame React state.** The explode animation, label positions and flow tokens are
  written to Three.js objects and DOM nodes on rendered frames; React state changes only on
  input (selection, hover, slider).
- **Context loss:** if the browser takes the graphics context back, the view says so and offers
  "Restart the 3D view" (a fresh renderer) or the page's 2D view.

Not done yet: adaptive quality that measures frame times while the model is in use (the
starting detail level comes from device hints and the learner's choice).

## Known console message

React Three Fiber 9.8.2 creates a `THREE.Clock`, which Three.js has marked deprecated since
r183, so each canvas logs "THREE.Clock: This module has been deprecated". It is harmless; the
browser tests tolerate exactly this message and should drop the exception when Fiber stops using
`Clock`.

## Tests

- `src/modules/anatomy-3d/tests/layout3d.test.ts`: every part stands on its parent and inside
  its footprint, build time is at the back and the platform at the front, explode lifts and
  separates, cases hold their contents, overview and isolation show the right parts, arcs rise,
  framing covers its boxes.
- `src/modules/anatomy-3d/tests/viewerState.test.tsx`: the `viewer` URL parameter, the
  keyboard shortcuts and the announcements.
- `tests/e2e/anatomy-3d.spec.ts` (desktop and Pixel 7, real WebGL in Chromium's software
  renderer): Three.js loads only on demand; model, list and inspector share the selection and the
  URL; a click selects; keyboard and camera buttons; explode and reassemble; walkthrough steps;
  the no-WebGL fallback; context loss and restart; the List viewer.

A software renderer is not a GPU benchmark: these tests prove behaviour, not frame rates on real
devices.

## The laboratories' models

The [Class Loader Explorer](../src/pages/ClassLoadingPage.tsx) and the
[Memory Laboratory](../src/pages/MemoryPage.tsx) each offer a 3D model next to their 2D
observatory (`viewer=3d`). They follow every rule above and share the anatomy's camera rig,
stage, materials, keyboard handling, fallbacks and WebGL checks.

```text
src/modules/lab-3d/
  LabViewer3D.tsx          the shared shell: canvas, camera buttons, keys, "Spread the levels",
                           Reassemble, Isolate, Reduce detail, live region, context-loss restart
  LoaderObservatory3D.tsx  the class loaders as terraces, a request travelling, a guided tour
  MemoryObservatory3D.tsx  the specification's areas above HotSpot's structures, linked
  SceneNodes.tsx           prisms and boxes, provenance outlines, the explode animation
  SceneLinks.tsx           links and arrowheads, a token travelling along a request's path
  SceneLabels.tsx          HTML labels projected from the scene
  data/                    labScene.ts (shared types), loaderScene.ts, memoryScene.ts: pure layouts
  tests/                   Vitest: both layouts
```

- **One source of truth.** The loader model draws the delegation simulator's world and its
  current runtime (`src/content/labs/classLoading.ts`, `src/simulators/classLoading.ts`); the
  request it plays is the last one sent in the delegation laboratory, or a demonstration request
  until there is one. The memory model draws `MEMORY_AREAS` and their `mapsTo` links. Selection
  is the page's URL state (`loader`, `area`), shared with the 2D view and the inspectors.
- **Teaching layouts.** The terraces show delegation (parents in front), the decks show
  specification above implementation; neither is a memory map, and each page's note says so.
  Per-thread areas are drawn for two threads.
- **Motion explains a change.** A request travels hop by hop along its real path; each hop is
  announced. With reduced motion there is no token: the whole path is drawn and announced at once.
- **Camera homes.** `CameraRig` takes an optional `home` (target, distance, angles), so each
  model opens on a view that shows all of it; the anatomy keeps its own default.
- **Tests:** `src/modules/lab-3d/tests/` (layouts: every loader and area drawn, levels and decks
  in order, explode, links, isolation) and `tests/e2e/labs.spec.ts` (lazy loading, the guided
  tour and keyboard changing the shared selection, the no-WebGL fallback, context loss).

## Community skills

Five skills from `cesartevisual/threejs-skills` (MIT) are installed in `.claude/skills/` and
recorded in `skills-lock.json`: `threejs-r3f`, `threejs-performance`, `threejs-accessibility`,
`threejs-assets` and `threejs-testing`. They were read in full before installation: Markdown
guidance only, no scripts, and they state that they do not authorize changes beyond the task.
They advise; this document and `CLAUDE.md` decide.
