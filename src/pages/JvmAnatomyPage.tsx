import { AccuracyNote } from '@/components/learning/AccuracyNote';
import { KnowledgeCheck } from '@/components/learning/KnowledgeCheck';
import { SourceList } from '@/components/learning/SourceReference';
import { ANATOMY_QUIZ } from '@/content/jvm/quiz';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AnatomyExplorer } from '@/modules/jvm/AnatomyExplorer';

const PLATE_NOTES = [
  "Schematic, not to scale. Real memory areas differ in size by orders of magnitude and are scattered across the process's address space.",
  '**Solid** outlines are concepts defined by the JVM Specification (Java SE 25). **Dashed** outlines tagged HS are OpenJDK HotSpot structures in JDK 25: other JVMs, and other HotSpot versions, may differ. **Dotted** outlines are outside the JVM (build tools, the OS process, the platform).',
  'Connectors show the most important relationships, not every interaction. For example compiled code also reads the heap and the method area, and the garbage collector also reaches into the code cache and JNI handles.',
  'Execution walkthroughs are educational models of what HotSpot does. They show real bytecode and log output from OpenJDK 25.0.4, but real executions interleave many threads and more steps.',
];

export function JvmAnatomyPage() {
  usePageTitle('JVM anatomy');
  return (
    <>
      <div className="border-b border-ink-700 bg-ink-950 px-4 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h1 className="font-serif text-[22px] text-fg">Explore the JVM</h1>
          <p className="text-[13.5px] text-fg-subtle">
            The machine that runs Java, part by part. Specification: Java SE 25 · Implementation:
            OpenJDK HotSpot, JDK 25
          </p>
        </div>
      </div>
      <AnatomyExplorer />
      <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6">
        <section aria-labelledby="plate-notes">
          <p className="kicker">Read me</p>
          <h2 id="plate-notes" className="mt-1 font-serif text-3xl text-fg">
            Accuracy notes for this plate
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {PLATE_NOTES.map((note, index) => (
              <AccuracyNote key={index} text={note} title={`Note ${index + 1}`} />
            ))}
          </div>
        </section>

        <section aria-labelledby="knowledge-check" className="mt-16">
          <p className="kicker">Knowledge check</p>
          <h2 id="knowledge-check" className="mt-1 font-serif text-3xl text-fg">
            {ANATOMY_QUIZ.title.replace(
              'Check your understanding: ',
              'Check your understanding of ',
            )}
          </h2>
          <div className="mt-5">
            <KnowledgeCheck quiz={ANATOMY_QUIZ} />
          </div>
        </section>

        <section aria-labelledby="plate-sources" className="mt-16">
          <p className="kicker">Primary sources</p>
          <h2 id="plate-sources" className="mt-1 font-serif text-3xl text-fg">
            Where these facts come from
          </h2>
          <p className="mt-2 max-w-2xl text-[14.5px] text-fg-muted">
            Every component cites its own sources in the inspector. These are the foundations of the
            whole plate.
          </p>
          <div className="mt-5">
            <SourceList
              citations={[
                { source: 'jvms-2.5' },
                { source: 'jvms-2.13' },
                { source: 'jvms-5.3' },
                { source: 'jvms-5.4' },
                { source: 'jvms-5.5' },
                { source: 'guide-gc' },
                { source: 'src-compilation-policy' },
                { source: 'jni-spec' },
              ]}
            />
          </div>
        </section>
      </div>
    </>
  );
}
