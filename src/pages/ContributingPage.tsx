import { PageHeader } from '@/components/layout/PageHeader';
import { CodeBlock } from '@/components/code/CodeBlock';
import { SITE } from '@/data/site';
import { usePageTitle } from '@/hooks/usePageTitle';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-ink-700 py-8 first:border-t-0">
      <h2 className="font-serif text-[26px] text-fg">{title}</h2>
      <div className="prose-ij mt-3 max-w-3xl text-[15.5px]">{children}</div>
    </section>
  );
}

const COMPONENT_EXAMPLE = `{
  id: 'operand-stack',
  name: 'Operand stack',
  parent: 'stack-frame',
  provenance: 'spec',            // 'spec' | 'hotspot' | 'platform'
  scope: 'per-thread',
  summary: 'A per-frame LIFO scratch stack ...',
  simple: 'The JVM is a stack machine ...',  // no programming knowledge needed
  // developer: '...',              optional: code, APIs, what you can observe
  deep: 'JVMS §2.6.2: ... [[verification|The verifier]] proves ...',
  purpose: '...',
  internals: ['...'],
  inputs: ['...'],
  outputs: ['...'],
  practice: '...',
  misconceptions: [{ myth: '...', truth: '...' }],
  references: [{ source: 'jvms-2.6.2' }],
}`;

const TEACHING_EXAMPLE = `heap: {
  developer: 'Every \`new\`, and every array, allocates in the heap. ...',
  analogy: {
    picture: 'A big shared warehouse. Each object is a box on a shelf, ...',
    mapping: [
      { picture: 'The warehouse', real: 'The heap' },
      { picture: 'A claim ticket', real: 'A reference, held by a variable or a field' },
      // ...
    ],
    limits: 'A ticket is not a shelf number you can do arithmetic with: ...',
  },
  demo: 'memory',                   // a lesson exhibit, shown under "See it working"
  check: { id: 'check-heap', prompt: '...', options: [/* one correct */] },
}`;

export function ContributingPage() {
  usePageTitle('Contributing');
  return (
    <>
      <PageHeader kicker="Open source" title="Contributing">
        <p>
          JVM Atlas grows one verified explanation at a time. You can fix an error, improve an
          explanation, add a glossary term, or build the next laboratory. The full guide is{' '}
          <code>CONTRIBUTING.md</code> in the{' '}
          <a href={SITE.repository} className="text-exec-300 underline underline-offset-2">
            repository
          </a>
          .
        </p>
      </PageHeader>
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6">
        <Block title="Run it locally">
          <p>You need Node.js 22 or newer. No accounts, keys or services are required.</p>
          <CodeBlock
            className="not-prose mt-3"
            language="shell"
            code={`git clone ${SITE.repository}.git\ncd jvm-inside-out\nnpm ci\nnpm run dev`}
          />
          <p>
            Before opening a pull request run <code>npm run check</code> (type check, lint, unit
            tests and a production build). Browser tests run with <code>npm run test:e2e</code>.
          </p>
        </Block>
        <Block title="Where things live">
          <ul>
            <li>
              <code>src/content/jvm/components/*.ts</code>: one entry per anatomy component
              (explanations, examples, misconceptions, sources).
            </li>
            <li>
              <code>src/content/jvm/relationships.ts</code> and <code>scenarios.ts</code>:
              connectors and execution walkthroughs.
            </li>
            <li>
              <code>src/glossary/terms.ts</code>: glossary entries. Link a term from any text with{' '}
              <code>[[term-id]]</code> or <code>[[term-id|label]]</code>.
            </li>
            <li>
              <code>src/data/references.ts</code>: the source registry. Cite a source by id; the
              type check fails if it does not exist.
            </li>
            <li>
              <code>src/modules/jvm/layout.ts</code>: coordinates and connector routes, kept apart
              from the content.
            </li>
            <li>
              <code>src/content/jvm/teaching.ts</code>: the teaching layer of the twelve core
              concepts (developer explanation, analogy, demo and check question).
            </li>
            <li>
              <code>src/content/lesson/firstRun.ts</code>, <code>src/modules/lesson/</code> and{' '}
              <code>src/simulators/</code>: the Start here lesson, its interactive exhibits and the
              pure models behind them.
            </li>
          </ul>
          <p>
            A component entry looks like this (types are checked, and integrity tests check every
            link and citation):
          </p>
          <CodeBlock
            className="not-prose mt-3"
            language="text"
            code={COMPONENT_EXAMPLE}
            title="src/content/jvm/components/runtimeData.ts (excerpt)"
          />
        </Block>
        <Block title="Writing explanations">
          <ul>
            <li>
              Write each explanation at three levels that describe the same machine:{' '}
              <strong>Simple</strong> (no programming knowledge, one new term at a time),{' '}
              <strong>Developer</strong> (code and what you can observe) and{' '}
              <strong>Deep dive</strong> (specification sections, HotSpot mechanisms, bytecode and
              flags). Simple is short, never false.
            </li>
            <li>
              An analogy maps each part of its picture to the real concept and says where the
              picture stops being accurate. It opens a door; it never replaces the explanation.
            </li>
            <li>
              Every interactive teaches cause and effect: the learner acts, the visual changes, and
              a caption says what changed and why. It can be stepped, paused and replayed.
            </li>
            <li>
              Disclose depth, never delete it: technical detail goes behind “Explore the technical
              details” rather than into the default view.
            </li>
          </ul>
          <p>A core concept’s teaching entry has this shape:</p>
          <CodeBlock
            className="not-prose mt-3"
            language="text"
            code={TEACHING_EXAMPLE}
            title="src/content/jvm/teaching.ts (excerpt)"
          />
        </Block>
        <Block title="Accuracy checklist">
          <ul>
            <li>
              Is the claim defined by the specification, or is it HotSpot behaviour? Say which, and
              set the provenance.
            </li>
            <li>Name the Java version for anything implementation-specific.</li>
            <li>
              Never hand-write bytecode or log output. Produce it with a real JDK and record the
              version in <code>verifiedWith</code>.
            </li>
            <li>
              Cite a primary source: JVMS, JLS, API docs, a JEP or the OpenJDK source at a release
              tag.
            </li>
            <li>
              If a diagram or simulation simplifies something, add an accuracy note that says what.
            </li>
          </ul>
        </Block>
        <Block title="Design rules">
          <ul>
            <li>
              Every visual must explain a real technical concept. No decorative diagrams or stock
              images.
            </li>
            <li>
              Colour always comes with a second cue (line style, glyph or text): blue is control
              flow, purple runtime components, green success, orange warnings, grey inactive.
            </li>
            <li>
              Every interactive element must work with a keyboard and have an accessible name.
            </li>
            <li>No links to pages that do not exist yet.</li>
          </ul>
        </Block>
      </div>
    </>
  );
}
