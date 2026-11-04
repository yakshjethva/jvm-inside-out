import { AccuracyNote } from '@/components/learning/AccuracyNote';
import { KnowledgeCheck } from '@/components/learning/KnowledgeCheck';
import { LevelSwitch } from '@/components/learning/LevelSwitch';
import { SourceList } from '@/components/learning/SourceReference';
import { MEMORY_INVESTIGATIONS, MEMORY_QUIZ, MEMORY_STATIONS } from '@/content/labs/memory';
import { usePreferences, useProgress } from '@/hooks/useLearningState';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Investigations } from '@/modules/labs/Investigations';
import { LabHero } from '@/modules/labs/LabHero';
import { StationView } from '@/modules/labs/StationView';
import { FrameDissection } from '@/modules/memory/FrameDissection';
import { HeapNativeMemory } from '@/modules/memory/HeapNativeMemory';
import { LivingStackHeap } from '@/modules/memory/LivingStackHeap';
import { MemoryObservatory } from '@/modules/memory/MemoryObservatory';
import { ObjectLayoutLab } from '@/modules/memory/ObjectLayoutLab';
import { memoryStationHref, useMemoryLabState } from '@/modules/memory/useMemoryLabState';

const LAB = 'lab:memory';

const NOTES = [
  'Every message, log line, flag value and layout on this page comes from a real run of OpenJDK 25.0.4 (Linux x64, 4 CPUs) or from JOL 0.17 on it, and says how it was produced. Sizes that depend on the machine are this machine’s.',
  '**Specification and implementation.** The heap, method area, run-time constant pools, pc registers, JVM stacks and native method stacks are defined by the JVM Specification (Java SE 25). Metaspace, the compressed class space, the code cache, object headers and every collector’s layout are OpenJDK HotSpot (JDK 25).',
  'The living stack and heap replays real bytecode in the specification’s model. HotSpot may keep values in registers, remove allocations that do not escape, and collect whenever it chooses; positions on screen are never addresses.',
];

/** The Memory Laboratory: where a running program keeps everything, and what happens when it changes. */
export function MemoryPage() {
  usePageTitle('Memory laboratory');
  const state = useMemoryLabState();
  const progress = useProgress();
  const { preferences, setLevel } = usePreferences();
  const visited = progress.lessons[LAB] ?? {};
  const index = MEMORY_STATIONS.findIndex((s) => s.id === state.station);
  const station = MEMORY_STATIONS[index]!;
  const next = MEMORY_STATIONS[index + 1];

  return (
    <>
      <LabHero
        kicker="Laboratory · Memory"
        title="Where does a running Java program keep everything?"
        intro={
          <p>
            Five stations, from the whole process down to one object: the areas a JVM uses, a
            program’s stack and heap changing statement by statement, one frame opened up, the bytes
            of an object, and the heap and native memory as each collector organizes them.
          </p>
        }
        stations={MEMORY_STATIONS}
        current={station.id}
        hrefFor={memoryStationHref}
        completed={visited}
        aside={<LevelSwitch value={preferences.level} onChange={setLevel} />}
      />

      <div className="mx-auto w-full max-w-[1320px] px-4 pt-10 pb-20 sm:px-6">
        <StationView
          key={station.id}
          lab={LAB}
          station={station}
          index={index}
          total={MEMORY_STATIONS.length}
          open={state.hasExhibitState}
          visited={station.id in visited}
          exhibit={
            station.id === 'observatory' ? (
              <MemoryObservatory />
            ) : station.id === 'living' ? (
              <LivingStackHeap />
            ) : station.id === 'frames' ? (
              <FrameDissection />
            ) : station.id === 'layout' ? (
              <ObjectLayoutLab />
            ) : (
              <HeapNativeMemory />
            )
          }
          next={
            next
              ? { label: `Next: ${next.title}`, to: memoryStationHref(next.id) }
              : { label: 'Next: the investigations', to: '/memory?lab=heap#investigations' }
          }
        />

        <section
          aria-labelledby="investigations-title"
          id="investigations"
          className="mt-20 scroll-mt-20"
        >
          <p className="kicker">Advanced</p>
          <h2 id="investigations-title" className="mt-1 font-serif text-[30px] text-fg">
            Investigations
          </h2>
          <p className="mt-2 max-w-[46rem] text-[15.5px] text-fg-muted">
            Questions that come up in real systems, each answered with output from a real JVM:
            references and reachability, stacks and threads, object layout, and how objects move
            between generations.
          </p>
          <div className="mt-6">
            <Investigations items={MEMORY_INVESTIGATIONS} />
          </div>
        </section>

        <section aria-labelledby="lab-check" className="mt-20 max-w-[46rem]">
          <p className="kicker">Knowledge check</p>
          <h2 id="lab-check" className="mt-1 font-serif text-[30px] text-fg">
            Check your understanding of memory
          </h2>
          <div className="mt-5">
            <KnowledgeCheck quiz={MEMORY_QUIZ} />
          </div>
        </section>

        <section aria-labelledby="lab-accuracy" className="mt-20">
          <p className="kicker">Read me</p>
          <h2 id="lab-accuracy" className="mt-1 font-serif text-[30px] text-fg">
            Accuracy and sources
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {NOTES.map((note, i) => (
              <AccuracyNote key={i} text={note} title={`Note ${i + 1}`} />
            ))}
          </div>
          <div className="mt-6 max-w-[46rem]">
            <SourceList
              citations={[
                { source: 'jvms-2.5' },
                { source: 'jvms-2.6' },
                { source: 'jvms-2.7' },
                { source: 'jls-12.6' },
                { source: 'guide-gc' },
                { source: 'jep-122' },
                { source: 'jep-519' },
                { source: 'src-markword' },
                { source: 'src-nmt' },
                { source: 'tool-jol' },
              ]}
            />
          </div>
        </section>
      </div>
    </>
  );
}
