import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { childrenOf, COMPONENT_IDS, COMPONENTS, isAncestor, type ComponentId } from '@/content/jvm';
import { ANATOMY_QUIZ } from '@/content/jvm/quiz';
import { RELATIONSHIPS } from '@/content/jvm/relationships';
import { SCENARIOS } from '@/content/jvm/scenarios';
import { ATLAS_AREAS, JVM_REGIONS } from '@/content/jvm/regions';
import { FIRST_RUN, FIRST_RUN_QUIZ } from '@/content/lesson/firstRun';
import { LEARNING_PATHS } from '@/content/paths';
import { QUESTION_PATHS } from '@/content/questions';
import { PROJECT_STATUS } from '@/content/status';
import { REFERENCE_IDS, REFERENCES } from '@/data/references';
import { GLOSSARY, getGlossaryEntry } from '@/glossary';
import { contains, orthogonalRoute, anchorPoint, type Point, type Rect } from '@/lib/geometry';
import { collectLinks, collectTermIds } from '@/lib/richText';
import { HOME_EXHIBITS } from '@/modules/home/exhibits';
import { DISSECTIONS } from '@/modules/jvm/internals/registry';
import { EDGE_ROUTES, NODE_RECTS } from '@/modules/jvm/layout';
import type { Citation, ComponentDoc } from '@/types/content';
import { PRERENDER_PATHS } from '@/seo/pages';

/** Every rich-text string in the content layer, labelled by where it comes from. */
function allRichText(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const add = (where: string, text: string | undefined) => text && out.push({ where, text });
  for (const doc of Object.values(COMPONENTS) as ComponentDoc[]) {
    const w = `component ${doc.id}`;
    add(w, doc.summary);
    add(w, doc.simple);
    if (doc.developer) add(w, doc.developer);
    add(w, doc.deep);
    add(w, doc.purpose);
    add(w, doc.practice);
    add(w, doc.accuracyNote);
    doc.internals.forEach((t) => add(w, t));
    doc.inputs.forEach((t) => add(w, t));
    doc.outputs.forEach((t) => add(w, t));
    doc.misconceptions.forEach((m) => add(w, m.truth));
    doc.errors?.forEach((e) => add(w, e.when));
    add(w, doc.specVsImpl?.spec);
    add(w, doc.specVsImpl?.implementation);
    if (doc.analogy) {
      add(w, doc.analogy.picture);
      add(w, doc.analogy.limits);
      doc.analogy.mapping.forEach((m) => add(w, m.real));
    }
    if (doc.check) {
      add(w, doc.check.prompt);
      doc.check.options.forEach((o) => {
        add(w, o.text);
        add(w, o.explanation);
      });
    }
  }
  for (const chapter of FIRST_RUN.chapters) {
    const w = `lesson chapter ${chapter.id}`;
    add(w, chapter.explanation.simple);
    add(w, chapter.explanation.developer);
    add(w, chapter.explanation.deep);
    add(w, chapter.tryIt);
    add(w, chapter.accuracyNote);
    add(w, chapter.term.definition);
    add(w, chapter.prediction.prompt);
    chapter.prediction.options.forEach((o) => {
      add(w, o.text);
      add(w, o.feedback);
    });
    add(w, chapter.check.prompt);
    chapter.check.options.forEach((o) => {
      add(w, o.text);
      add(w, o.explanation);
    });
  }
  for (const q of FIRST_RUN_QUIZ.questions) {
    add(`lesson quiz ${q.id}`, q.prompt);
    q.options.forEach((o) => {
      add(`lesson quiz ${q.id}`, o.text);
      add(`lesson quiz ${q.id}`, o.explanation);
    });
  }
  for (const rel of RELATIONSHIPS) add(`relationship ${rel.id}`, rel.description);
  for (const scenario of SCENARIOS) {
    add(`scenario ${scenario.id}`, scenario.accuracyNote);
    for (const step of scenario.steps) {
      add(`step ${scenario.id}/${step.id}`, step.simple);
      if (step.developer) add(`step ${scenario.id}/${step.id}`, step.developer);
      add(`step ${scenario.id}/${step.id}`, step.deep);
      add(`step ${scenario.id}/${step.id}`, step.note);
    }
  }
  for (const q of ANATOMY_QUIZ.questions) {
    add(`quiz ${q.id}`, q.prompt);
    q.options.forEach((o) => {
      add(`quiz ${q.id}`, o.text);
      add(`quiz ${q.id}`, o.explanation);
    });
  }
  for (const entry of GLOSSARY) {
    const w = `glossary ${entry.id}`;
    add(w, entry.simple);
    if (entry.developer) add(w, entry.developer);
    add(w, entry.deep);
    add(w, entry.whyItExists);
    add(w, entry.misconception?.truth);
  }
  for (const dissection of Object.values(DISSECTIONS)) {
    add(`dissection ${dissection!.id}`, dissection!.accuracyNote);
    dissection!.parts.forEach((p) => add(`dissection ${dissection!.id}`, p.description));
  }
  return out;
}

function allCitations(): { where: string; citation: Citation }[] {
  const out: { where: string; citation: Citation }[] = [];
  for (const doc of Object.values(COMPONENTS) as ComponentDoc[])
    doc.references.forEach((c) => out.push({ where: doc.id, citation: c }));
  for (const s of SCENARIOS) s.references.forEach((c) => out.push({ where: s.id, citation: c }));
  for (const q of ANATOMY_QUIZ.questions)
    q.references?.forEach((c) => out.push({ where: q.id, citation: c }));
  for (const e of GLOSSARY) e.references?.forEach((c) => out.push({ where: e.id, citation: c }));
  for (const d of Object.values(DISSECTIONS))
    d!.references.forEach((c) => out.push({ where: d!.id, citation: c }));
  for (const chapter of FIRST_RUN.chapters)
    chapter.references.forEach((c) => out.push({ where: `lesson ${chapter.id}`, citation: c }));
  return out;
}

const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const isOrthogonal = (points: Point[]) =>
  points.every((p, i) => i === 0 || p.x === points[i - 1]!.x || p.y === points[i - 1]!.y);

describe('anatomy components', () => {
  it('has exactly one documented entry per component id', () => {
    expect(Object.keys(COMPONENTS).sort()).toEqual([...COMPONENT_IDS].sort());
    for (const id of COMPONENT_IDS) expect(COMPONENTS[id].id).toBe(id);
  });

  it('has substantive content for every component', () => {
    for (const doc of Object.values(COMPONENTS) as ComponentDoc[]) {
      expect(doc.summary.length, doc.id).toBeGreaterThan(30);
      expect(doc.simple.length, doc.id).toBeGreaterThan(80);
      expect(doc.deep.length, doc.id).toBeGreaterThan(120);
      expect(doc.purpose.length, doc.id).toBeGreaterThan(20);
      expect(doc.internals.length, doc.id).toBeGreaterThan(0);
      expect(doc.inputs.length, doc.id).toBeGreaterThan(0);
      expect(doc.outputs.length, doc.id).toBeGreaterThan(0);
      expect(doc.practice.length, doc.id).toBeGreaterThan(40);
      expect(doc.misconceptions.length, doc.id).toBeGreaterThan(0);
      expect(doc.references.length, doc.id).toBeGreaterThan(0);
    }
  });

  it('names the version for every HotSpot-specific component', () => {
    for (const doc of Object.values(COMPONENTS) as ComponentDoc[]) {
      if (doc.provenance === 'hotspot') expect(doc.version ?? doc.specVsImpl, doc.id).toBeTruthy();
    }
  });

  it('forms a tree whose parents exist', () => {
    for (const doc of Object.values(COMPONENTS) as ComponentDoc[]) {
      if (doc.parent) expect(COMPONENTS[doc.parent], doc.id).toBeDefined();
      expect(isAncestor(doc.id, doc.id), `${doc.id} is its own ancestor`).toBe(false);
    }
  });

  it('records verification for every example', () => {
    for (const doc of Object.values(COMPONENTS) as ComponentDoc[]) {
      if (doc.example) expect(doc.example.verifiedWith, doc.id).toMatch(/OpenJDK 25|JDK 25/);
    }
  });
});

describe('anatomy layout', () => {
  it('positions every component, children inside their parents', () => {
    for (const id of COMPONENT_IDS) {
      expect(NODE_RECTS[id], id).toBeDefined();
      for (const child of childrenOf(id))
        expect(contains(NODE_RECTS[id], NODE_RECTS[child.id]), `${child.id} inside ${id}`).toBe(
          true,
        );
    }
  });

  it('never overlaps siblings', () => {
    const parents: (ComponentId | undefined)[] = [undefined, ...COMPONENT_IDS];
    for (const parent of parents) {
      const kids = childrenOf(parent);
      for (let i = 0; i < kids.length; i++)
        for (let j = i + 1; j < kids.length; j++)
          expect(
            overlap(NODE_RECTS[kids[i]!.id], NODE_RECTS[kids[j]!.id]),
            `${kids[i]!.id} / ${kids[j]!.id}`,
          ).toBe(false);
    }
  });
});

describe('relationships', () => {
  it('connect existing components and have unique ids', () => {
    const ids = new Set<string>();
    for (const rel of RELATIONSHIPS) {
      expect(COMPONENTS[rel.from], rel.id).toBeDefined();
      expect(COMPONENTS[rel.to], rel.id).toBeDefined();
      expect(rel.from).not.toBe(rel.to);
      expect(ids.has(rel.id), rel.id).toBe(false);
      ids.add(rel.id);
    }
  });

  it('each have a hand route, and every route belongs to a relationship', () => {
    const relIds = new Set(RELATIONSHIPS.map((r) => r.id));
    for (const rel of RELATIONSHIPS) expect(EDGE_ROUTES[rel.id], rel.id).toBeDefined();
    for (const id of Object.keys(EDGE_ROUTES)) expect(relIds.has(id), id).toBe(true);
  });

  it('route with horizontal and vertical segments, anchored on their endpoints', () => {
    for (const rel of RELATIONSHIPS) {
      const route = EDGE_ROUTES[rel.id]!;
      for (const anchor of [route.from, route.to]) {
        const at = anchor.at ?? 0.5;
        expect(at, rel.id).toBeGreaterThanOrEqual(0);
        expect(at, rel.id).toBeLessThanOrEqual(1);
      }
      const start = anchorPoint(NODE_RECTS[rel.from], route.from);
      const end = anchorPoint(NODE_RECTS[rel.to], route.to);
      const points = orthogonalRoute(start, route.from.side, end, route.to.side, route.via);
      expect(isOrthogonal(points), rel.id).toBe(true);
    }
  });
});

describe('cross references', () => {
  it('resolve every [[glossary]] link', () => {
    const missing = allRichText().flatMap(({ where, text }) =>
      collectTermIds(text)
        .filter((id) => !getGlossaryEntry(id))
        .map((id) => `${where}: [[${id}]]`),
    );
    expect(missing).toEqual([]);
  });

  it('only link to https URLs', () => {
    for (const { where, text } of allRichText())
      for (const href of collectLinks(text)) expect(href, where).toMatch(/^https:\/\//);
  });

  it('cite only known references, all of which use https', () => {
    for (const { where, citation } of allCitations())
      expect(REFERENCES[citation.source], `${where}: ${citation.source}`).toBeDefined();
    for (const id of REFERENCE_IDS) expect(REFERENCES[id].url, id).toMatch(/^https:\/\//);
  });

  it('keep the glossary consistent', () => {
    const ids = new Set<string>();
    for (const entry of GLOSSARY) {
      expect(ids.has(entry.id), entry.id).toBe(false);
      ids.add(entry.id);
      if (entry.componentId) expect(COMPONENTS[entry.componentId], entry.id).toBeDefined();
      for (const related of entry.related ?? [])
        expect(getGlossaryEntry(related), `${entry.id} → ${related}`).toBeDefined();
    }
  });
});

describe('scenarios', () => {
  it('reference existing components, listings and lines', () => {
    for (const scenario of SCENARIOS) {
      const listings = new Map(scenario.listings.map((l) => [l.id, l.code.split('\n').length]));
      for (const step of scenario.steps) {
        const where = `${scenario.id}/${step.id}`;
        expect(step.active.length, where).toBeGreaterThan(0);
        for (const id of step.active) expect(COMPONENTS[id], where).toBeDefined();
        for (const flow of step.flows ?? []) {
          expect(COMPONENTS[flow.from], where).toBeDefined();
          expect(COMPONENTS[flow.to], where).toBeDefined();
        }
        for (const id of Object.keys(step.states ?? {}))
          expect(COMPONENTS[id as ComponentId], where).toBeDefined();
        for (const focus of step.focus ?? []) {
          expect(listings.has(focus.listing), `${where}: ${focus.listing}`).toBe(true);
          expect(focus.line, where).toBeGreaterThanOrEqual(1);
          expect(focus.line, where).toBeLessThanOrEqual(listings.get(focus.listing)!);
        }
      }
    }
  });

  it('have unique step ids within a scenario', () => {
    for (const scenario of SCENARIOS)
      expect(new Set(scenario.steps.map((s) => s.id)).size, scenario.id).toBe(
        scenario.steps.length,
      );
  });
});

describe('knowledge check', () => {
  it('has exactly one correct option per question, with explanations', () => {
    for (const q of ANATOMY_QUIZ.questions) {
      expect(
        q.options.filter((o) => o.correct),
        q.id,
      ).toHaveLength(1);
      for (const o of q.options)
        expect(o.explanation.length, `${q.id}/${o.id}`).toBeGreaterThan(20);
    }
  });
});

describe('learning paths', () => {
  it('link only to routes that exist', () => {
    const routes = new Set(PRERENDER_PATHS);
    for (const path of LEARNING_PATHS)
      if (path.route) expect(routes.has(path.route), path.id).toBe(true);
  });
});

describe('home page', () => {
  it('shows exhibits that open a real walkthrough or dissection', () => {
    for (const exhibit of HOME_EXHIBITS) {
      const params = new URLSearchParams(exhibit.to.split('?')[1]);
      if (exhibit.kind === 'walkthrough') {
        expect(
          SCENARIOS.map((s) => s.id),
          exhibit.id,
        ).toContain(exhibit.id);
        expect(params.get('mode')).toBe('execution');
        expect(params.get('s')).toBe(exhibit.id);
      } else {
        expect(DISSECTIONS[exhibit.id as ComponentId], exhibit.id).toBeDefined();
        expect(params.get('mode')).toBe('internal');
        expect(params.get('c')).toBe(exhibit.id);
      }
    }
  });

  it('draws the seven areas in the order a program meets them', () => {
    expect(ATLAS_AREAS.map((area) => area.id)).toEqual([
      'build-time',
      ...JVM_REGIONS.map((region) => region.id),
    ]);
    expect(ATLAS_AREAS.at(-1)!.id).toBe('platform');
  });
});

describe('dissections', () => {
  it('dissect existing components and map parts to existing components', () => {
    for (const [key, dissection] of Object.entries(DISSECTIONS)) {
      expect(dissection!.id).toBe(key);
      expect(COMPONENTS[dissection!.id]).toBeDefined();
      for (const part of dissection!.parts)
        if (part.componentId)
          expect(COMPONENTS[part.componentId], `${key}/${part.id}`).toBeDefined();
    }
  });

  it('render, and every selectable region has a documented part', () => {
    for (const dissection of Object.values(DISSECTIONS)) {
      const { container, unmount } = render(
        <svg>
          <dissection.Plate activePart={null} onPart={() => {}} />
        </svg>,
      );
      const documented = new Set(dissection!.parts.map((p) => p.id));
      const drawn = new Set(
        [...container.querySelectorAll('[data-part]')].map((el) => el.getAttribute('data-part')!),
      );
      expect(drawn.size, dissection!.id).toBeGreaterThan(3);
      for (const id of drawn)
        expect(documented.has(id), `${dissection!.id}: part "${id}" has no description`).toBe(true);
      unmount();
    }
  });
});

describe('the teaching layer', () => {
  const CORE: ComponentId[] = [
    'jvm',
    'class-loader-subsystem',
    'class-file',
    'runtime-data-areas',
    'heap',
    'jvm-stack',
    'stack-frame',
    'method-area',
    'interpreter',
    'jit-compiler',
    'garbage-collector',
    'jni',
  ];

  it('gives every core concept all three levels, a mapped analogy with limits and a question', () => {
    for (const id of CORE) {
      const doc = COMPONENTS[id];
      expect(doc.simple.length, id).toBeGreaterThan(80);
      expect(doc.developer?.length ?? 0, id).toBeGreaterThan(150);
      expect(doc.deep.length, id).toBeGreaterThan(120);
      expect(doc.analogy?.mapping.length ?? 0, id).toBeGreaterThanOrEqual(2);
      expect(doc.analogy?.limits.length ?? 0, id).toBeGreaterThan(60);
      expect(
        doc.check?.options.filter((o) => o.correct),
        id,
      ).toHaveLength(1);
    }
  });

  it('names the six regions after real components and keeps them in sync with the plate', () => {
    expect(JVM_REGIONS.map((r) => r.id)).toEqual([
      'class-loader-subsystem',
      'runtime-data-areas',
      'execution-engine',
      'garbage-collector',
      'native-interface',
      'platform',
    ]);
    for (const region of JVM_REGIONS) {
      expect(COMPONENTS[region.id], region.id).toBeDefined();
      expect(childrenOf(region.id).length, region.id).toBeGreaterThan(0);
    }
  });
});

describe('the first lesson', () => {
  it('has seven chapters, each with one right prediction, one right answer and sources', () => {
    expect(FIRST_RUN.chapters.map((c) => c.id)).toEqual([
      'program',
      'compiler',
      'jvm',
      'loading',
      'memory',
      'execution',
      'gc',
    ]);
    for (const chapter of FIRST_RUN.chapters) {
      expect(
        chapter.prediction.options.filter((o) => o.correct),
        chapter.id,
      ).toHaveLength(1);
      expect(
        chapter.check.options.filter((o) => o.correct),
        chapter.id,
      ).toHaveLength(1);
      expect(chapter.explanation.developer, chapter.id).toBeTruthy();
      expect(chapter.references.length, chapter.id).toBeGreaterThan(0);
      expect(getGlossaryEntry(chapter.term.glossaryId), chapter.term.glossaryId).toBeDefined();
      for (const listing of chapter.listings ?? [])
        expect(listing.verifiedWith, listing.id).toMatch(/OpenJDK 25\.0\.4/);
    }
  });

  it('has a recap check with exactly one right answer per question', () => {
    for (const q of FIRST_RUN_QUIZ.questions)
      expect(
        q.options.filter((o) => o.correct),
        q.id,
      ).toHaveLength(1);
  });

  it('places every chapter on the JVM map, each at a different component', () => {
    const components = FIRST_RUN.chapters.map((c) => c.component);
    for (const id of components) expect(COMPONENT_IDS, String(id)).toContain(id);
    expect(new Set(components).size).toBe(components.length);
  });
});

describe('learning paths and project status', () => {
  const routes = new Set(PRERENDER_PATHS.map((path) => path.slice(1)));
  const routeOf = (to: string) => to.replace(/^\//, '').split(/[?#]/)[0]!;

  it('link question paths only to pages that exist', () => {
    for (const path of QUESTION_PATHS)
      for (const item of path.now) expect(routes.has(routeOf(item.to)), item.to).toBe(true);
  });

  it('link only available experiences from the project status', () => {
    for (const item of PROJECT_STATUS)
      if (item.to) expect(routes.has(routeOf(item.to)), item.to).toBe(true);
  });

  it('point explorer deep links at real components and walkthroughs', () => {
    for (const path of QUESTION_PATHS)
      for (const item of path.now) {
        const params = new URLSearchParams(item.to.split('?')[1] ?? '');
        const c = params.get('c');
        const s = params.get('s');
        if (c) expect(COMPONENT_IDS.includes(c as ComponentId), item.to).toBe(true);
        if (s)
          expect(
            SCENARIOS.some((scenario) => scenario.id === s),
            item.to,
          ).toBe(true);
      }
  });
});
