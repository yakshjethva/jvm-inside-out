# JVM Atlas design system

An interactive scientific instrument with an editorial voice: calm reading
surfaces, and graphite cases in which the machine is shown. Every page uses the
same tokens, primitives and rules. Tokens live in `src/styles/index.css`; the
brand (name, mark, voice, trademarks) is in `BRAND_GUIDELINES.md`.

## Principles

1. **Clarity before decoration.** Every visual element explains, navigates or
   shows state. No decorative gradients, glass, random shadows or motion.
2. **Two surfaces, one vocabulary.** Reading happens on paper; the machine sits
   in an instrument case. Token names are shared, so components work on both.
3. **Colour is never the only cue.** Pair it with line style, a glyph or text.
4. **Depth is earned.** Elevation marks things that float (menus, popovers,
   sheets) or hold the machine (cases); everything else is flat with hairlines.
5. **Motion explains a change** and is never needed to understand it.

## Surfaces

| Surface    | Where                                                                                      | How                                          |
| ---------- | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Editorial  | Pages, navigation, reading, inspector, menus                                               | The default (`:root`)                        |
| Instrument | The 2D and 3D anatomy viewers, lesson exhibits, the journey machine, code blocks, previews | Add `surface-instrument` (`.exhibit` has it) |

`surface-instrument` re-declares every colour token with the graphite values,
so any utility inside it (`bg-ink-900`, `text-fg-muted`, `border-ink-600`)
switches automatically. Do not hard-code colours to fake a surface.

## Colour tokens

Neutral scale, from the surface (`950`) to the strongest line (`400`):

| Token                         | Role                                      |
| ----------------------------- | ----------------------------------------- |
| `ink-950`                     | Page or case background                   |
| `ink-900`, `ink-850`          | Panels, inputs, insets                    |
| `ink-800`, `ink-750`          | Stronger panels, hover backgrounds        |
| `ink-700`                     | Hairline borders and dividers             |
| `ink-600`, `ink-500`          | Control borders, strong lines             |
| `ink-400`                     | Decorative strokes, disabled glyphs       |
| `raised`                      | Lifted surfaces: selected segments, menus |
| `fg`, `fg-muted`, `fg-subtle` | Primary, secondary and tertiary text      |

Accents are mirrored between surfaces, and each family defines only the levels
it needs: `exec` and `rt` have `-200` to `-500`, `-700` and `-900`; `ok` and
`warn` have `-300` to `-500` and `-900`; `plat` has `-400` and `-500`. Where a
level exists, `-200`/`-300` are text colours, `-400` is for icons, focus and
strokes, `-500` for filled controls, `-700` for tinted borders and `-900` for
tinted backgrounds; add a level to `src/styles/index.css` (on both surfaces)
before using it. On paper `text-exec-300` is a deep blue; in a case it is a
light blue. Both meet WCAG AA on their surface.

| Accent | Meaning                                       | Second cue                       |
| ------ | --------------------------------------------- | -------------------------------- |
| `exec` | Execution and control flow; primary actions   | Arrowheads, solid connectors     |
| `rt`   | Runtime structures (JVM specification)        | Solid outlines                   |
| `ok`   | Success, live state, reachable                | Check glyph, state word          |
| `warn` | Warnings, exceptional paths, eligible garbage | Warning glyph, dash-dot lines    |
| `plat` | Platform and build time (outside the JVM)     | Dotted outlines                  |
| `idle` | Inactive structure                            | Reduced opacity, "inactive" text |

Provenance always uses line style as well as colour: solid for specification
concepts, dashed with an `HS` tag for HotSpot structures, dotted for platform
and build-time parts.

## Typography

| Role                  | Family (self-hosted) | Size and weight                                 |
| --------------------- | -------------------- | ----------------------------------------------- |
| Display, page titles  | Source Serif 4       | 36–60 px, regular, tight leading, balanced wrap |
| Questions, sub-titles | Source Serif 4       | 22–26 px                                        |
| Section headings      | Inter                | 20 px semibold                                  |
| Reading (`.reading`)  | Inter                | 17 px / 1.7, at most about 70 characters        |
| UI text               | Inter                | 13.5–15 px                                      |
| Labels and captions   | Inter                | 12–13 px medium; never below 11 px              |
| Code, identifiers     | JetBrains Mono       | 12–14 px; `translate="no"`                      |

Sentence case everywhere. Numbers that change use `tabular`. No external font
CDNs; fonts come from `@fontsource-variable/*`.

## Space, size and layout

- Spacing follows Tailwind's 4 px scale. Sections breathe (`py-16`–`py-20`);
  controls are dense but never cramped.
- Containers: 1240 px for reference pages, 1320 px for the homepage, 1680 px for
  the explorer shell; reading columns `max-w-[40rem]`.
- Breakpoints: Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280).
  Validate at 1440 × 900, 1280 × 800, 768, 390 × 844 and 360 px.
- Touch targets meet WCAG 2.2 (24 × 24 px minimum); primary actions are 40–48 px.

## Radius, elevation and motion

| Token                                        | Use                                   |
| -------------------------------------------- | ------------------------------------- |
| `--radius-xs`…`--radius-xl` (3–16 px)        | Chips, controls, panels, cases        |
| `shadow-raised`                              | Selected segments, cards that lift    |
| `shadow-overlay`                             | Menus, popovers, sheets               |
| `--shadow-case`                              | Instrument cases on paper             |
| `--duration-fast/base/slow` (120/200/360 ms) | Hover, state change, camera or layout |
| `--ease-standard`, `--ease-out-quint`        | Default easing, arriving motion       |

Animate `transform` and `opacity` only. Reduced motion (the OS setting or the
in-app preference) keeps every state reachable without movement.

Overlays (menus, popovers, tooltips, the legend, the tour card) are solid
surfaces with `shadow-overlay`: no translucency, no backdrop blur. A popover
never runs past the bottom of the screen; a tall one scrolls inside itself.

## States and focus

Every interactive element has hover, focus-visible, active and disabled states.
Focus is a 2 px `exec-400` outline with a 2 px offset and is never removed.
Selected items use `raised` plus a text change or check glyph, not colour
alone. Pressed toggles expose `aria-pressed`.

## Shared primitives

Reuse these instead of re-implementing behaviour:

| Need                  | Component                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Buttons and links     | `Button`, `ButtonLink`, `IconButton` (`components/ui`)                                            |
| Tabs, toggles, levels | `SegmentedControl`, `LevelSwitch`                                                                 |
| Tooltips and popovers | `Popover`, `GlossaryTerm`                                                                         |
| Menus and drawers     | The mobile menu (`SiteHeader`), the explorer's component list                                     |
| Inspector panels      | `ComponentInspector`                                                                              |
| Search                | `ComponentSearch`, glossary search                                                                |
| Disclosure            | `<details>` styled as in the inspector and lessons                                                |
| Loading, error, empty | `PageLoading`, `RouteError`, empty messages in lists and search                                   |
| Keyboard shortcuts    | `Kbd` and the explorer's keyboard help                                                            |
| Viewer controls       | `AnatomyCanvas` controls, the 3D viewer's camera buttons and toolbar, `StepControls`, `MapToggle` |
| Section headings      | `SectionHeading` on the home page: number, label, serif title                                     |
| Machine drawings      | `HeroMachine` (SVG drawn from content, HTML labels over it)                                       |
| Exhibits and code     | `ExhibitFrame`, `CodeBlock`, `AccuracyNote`                                                       |
| Checks and teach-back | `KnowledgeCheck`, `TeachBack`                                                                     |

A new primitive is added only when two or more places need it, and it is
documented here.

## Accessibility

Semantic HTML first; one `h1` per page; every control has an accessible name;
everything works with a keyboard; contrast meets WCAG AA on both surfaces; no
information is carried by colour or animation alone; dialogs, menus and drawers
manage focus and close with Escape.

- Targets are at least 24 × 24 px, including text links in lists; links inside
  sentences are underlined.
- Scrollable regions (code blocks, outputs) are focusable so a keyboard can
  scroll them.
- No page scrolls sideways at 360 px: long identifiers and paths wrap
  (`overflow-wrap: anywhere`), inline code may break across lines, fieldsets can
  shrink, and centred containers in `<main>` keep full width.
- Nothing moves after the first paint: anything that depends on the browser is
  prerendered in a stable form or placed by CSS.
- `tests/e2e/a11y.spec.ts` runs axe-core's WCAG 2.2 A and AA rules on every kind
  of page, desktop and mobile; keyboard, focus and reduced-motion behaviour have
  their own browser tests.
