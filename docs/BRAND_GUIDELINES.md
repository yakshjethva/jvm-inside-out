# JVM Atlas brand guidelines

## Identity

| Element       | Value                                                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Name          | **JVM Atlas** (two words, `JVM` in capitals). Never "JVMAtlas", "Jvm Atlas" or "the JVM Atlas" in running text.                     |
| Tagline       | Explore the machine behind Java programs.                                                                                           |
| Positioning   | An independent interactive atlas for understanding the Java Virtual Machine, runtime architecture, memory management and execution. |
| Primary CTA   | Explore the anatomy                                                                                                                 |
| Secondary CTA | Start with the basics                                                                                                               |
| Canonical URL | <https://jvmatlas.vercel.app> (GitHub Pages is a mirror; see `docs/SEO_AND_DEPLOYMENT.md`)                                          |

## Voice

Precise, plain and calm: an expert explaining a machine to a curious colleague.

- Sentence case for headings, labels and buttons.
- Say what a thing does before naming its mechanism; introduce one term at a time.
- No hype ("revolutionary", "blazing"), no exclamation marks, no unexplained jargon.
- A simplification says that it is one, and an analogy says where it stops being true.

## The mark

A block of the machine with its lid lifted: an exploded view of one component,
revealing the live core inside. It stands for the product's promise, taking the
machine apart to see how it works.

- Source: `public/favicon.svg`; the React component is `LogoMark` in
  `src/components/layout/Logo.tsx`. Both use the same geometry.
- The mark keeps its own colours on every surface (graphite tile `#0f1218`, lid
  `#5c93ec`, core `#9fd0ff`, faces `#4a5466` / `#2b313d`). Do not recolour,
  rotate, stretch, outline or add effects.
- Minimum size 16 px. Clear space around it: at least a quarter of its width.
- App icons (`public/icons/`) are full-bleed tiles of the same mark; platforms
  apply their own mask.

## The wordmark

`JVM` in Inter Variable, semibold, tracking −0.015em, followed by `Atlas` in
Source Serif 4. The pairing is the brand: an engineered sans for the machine
and an editorial serif for the atlas. Use the `Wordmark` component; do not set
it by hand.

## Brand artwork

`scripts/brand/artwork.html` draws the social card (1200 × 630, the explorer's
six regions as an exploded stack of slabs: the five regions of the JVM and the
platform beneath them) and the app icons, which share one mark function;
`node scripts/brand/render-assets.mjs` renders them into `public/og/` and
`public/icons/`. The artwork is original. The stack is a pedagogical layout, not
a picture of memory, and the card says nothing the site does not.

## Terminology and trademarks

Use **Java** when it accurately names Java source code, the Java programming
language, `javac`, Java class files, Java SE, the JVMS and JLS, or OpenJDK.
Elsewhere, prefer the precise runtime term: JVM, runtime, bytecode, class
loading, execution engine, garbage collector, HotSpot. Never disguise or avoid
correct technical terms.

Required notice (footer and About page, from `SITE.independence` and
`SITE.trademarks` in `src/data/site.ts`):

> JVM Atlas is an independent educational project and is not affiliated with or
> endorsed by Oracle. Java and OpenJDK are trademarks or registered trademarks of
> Oracle and/or its affiliates.

Never use Oracle logos, the Java coffee-cup artwork, Duke, copied marketing
material or other third-party proprietary assets, and never suggest
affiliation, sponsorship or endorsement.

These guidelines are not legal advice and make no legal-clearance claim. Whether
the product name and domain are suitable to launch is a separate review for the
project owner.

## Legacy names

The project was called Inside Java. Two internal identifiers keep that name on
purpose: the browser storage prefix `inside-java:v1:` (renaming it would
silently reset every learner's saved progress) and the old service-worker cache
prefix, which the new worker still recognises so it can delete those caches.
