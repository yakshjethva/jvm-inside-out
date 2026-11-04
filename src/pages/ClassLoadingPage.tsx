import { useLocation } from 'react-router';
import { AccuracyNote } from '@/components/learning/AccuracyNote';
import { KnowledgeCheck } from '@/components/learning/KnowledgeCheck';
import { LevelSwitch } from '@/components/learning/LevelSwitch';
import { SourceList } from '@/components/learning/SourceReference';
import {
  CLASS_LOADING_INVESTIGATIONS,
  CLASS_LOADING_QUIZ,
  CLASS_LOADING_STATIONS,
} from '@/content/labs/classLoading';
import { usePreferences, useProgress } from '@/hooks/useLearningState';
import { usePageTitle } from '@/hooks/usePageTitle';
import { DelegationLab } from '@/modules/class-loading/DelegationLab';
import { LifecycleMicroscope } from '@/modules/class-loading/LifecycleMicroscope';
import { LoaderObservatory } from '@/modules/class-loading/LoaderObservatory';
import { stationHref, useClassLoadingState } from '@/modules/class-loading/useClassLoadingState';
import { Investigations } from '@/modules/labs/Investigations';
import { LabHero } from '@/modules/labs/LabHero';
import { StationView } from '@/modules/labs/StationView';

const LAB = 'lab:class-loading';

const NOTES = [
  'Every log line, error message and listing on this page comes from a real run of OpenJDK 25.0.4 (Linux x64) and says how it was produced. Hash codes, addresses and timestamps differ between runs.',
  'The delegation simulator models the JDK 25 algorithms (`ClassLoader.loadClass`, `BuiltinClassLoader.loadClassOrNull`) and the JVM’s records of defining and initiating loaders. Unit tests check that it reaches the same answers as the real programs.',
  '**Specification and implementation.** Loading, linking and initialization are defined by the JVM Specification (Java SE 25); which loader defines which JDK module, the CDS archive and the timing of linking are OpenJDK HotSpot (JDK 25) choices.',
];

/** The Class Loader Explorer: who loads classes, how a request travels, and the life of one class. */
export function ClassLoadingPage() {
  usePageTitle('Class loader explorer');
  const state = useClassLoadingState();
  const location = useLocation();
  const progress = useProgress();
  const { preferences, setLevel } = usePreferences();
  const visited = progress.lessons[LAB] ?? {};
  const index = CLASS_LOADING_STATIONS.findIndex((s) => s.id === state.station);
  const station = CLASS_LOADING_STATIONS[index]!;
  const next = CLASS_LOADING_STATIONS[index + 1];

  return (
    <>
      <LabHero
        kicker="Laboratory · Class loading"
        title="How does the JVM find, load, verify and initialize your classes?"
        intro={
          <p>
            Three stations, from the whole subsystem down to one class: the loaders of a running
            JVM, a request travelling between them, and the life of a class from its bytes to its
            first use. Every result can be checked against real JDK 25 output.
          </p>
        }
        stations={CLASS_LOADING_STATIONS}
        current={station.id}
        hrefFor={(id) => stationHref(id, location.search)}
        completed={visited}
        aside={<LevelSwitch value={preferences.level} onChange={setLevel} />}
      />

      <div className="mx-auto w-full max-w-[1320px] px-4 pt-10 pb-20 sm:px-6">
        <StationView
          key={station.id}
          lab={LAB}
          station={station}
          index={index}
          total={CLASS_LOADING_STATIONS.length}
          open={state.hasExhibitState}
          visited={station.id in visited}
          exhibit={
            station.id === 'observatory' ? (
              <LoaderObservatory />
            ) : station.id === 'delegation' ? (
              <DelegationLab />
            ) : (
              <LifecycleMicroscope />
            )
          }
          next={
            next
              ? { label: `Next: ${next.title}`, to: stationHref(next.id, location.search) }
              : {
                  label: 'Next: the investigations',
                  to: '/class-loading?lab=lifecycle#investigations',
                }
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
            identity and namespaces, initialization order and its failures, unloading and leaks, and
            what each loading error means.
          </p>
          <div className="mt-6">
            <Investigations items={CLASS_LOADING_INVESTIGATIONS} />
          </div>
        </section>

        <section aria-labelledby="lab-check" className="mt-20 max-w-[46rem]">
          <p className="kicker">Knowledge check</p>
          <h2 id="lab-check" className="mt-1 font-serif text-[30px] text-fg">
            Check your understanding of class loading
          </h2>
          <div className="mt-5">
            <KnowledgeCheck quiz={CLASS_LOADING_QUIZ} />
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
                { source: 'jvms-5.3' },
                { source: 'jvms-5.4' },
                { source: 'jvms-5.5' },
                { source: 'jls-12.4.1' },
                { source: 'jls-12.7' },
                { source: 'api-classloader' },
                { source: 'src-builtin-classloader' },
                { source: 'src-classloader' },
                { source: 'src-systemdictionary' },
              ]}
            />
          </div>
        </section>
      </div>
    </>
  );
}
