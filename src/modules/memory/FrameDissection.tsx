import { ArrowDownToLine, Layers, Link2 } from 'lucide-react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { LevelText } from '@/components/learning/LevelText';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { MEMORY_PROGRAMS, type MemoryProgramId } from '@/content/labs/memoryPrograms';
import { OVERFLOW_OUTPUT } from '@/content/labs/memoryEvidence';
import { usePlayback } from '@/hooks/usePlayback';
import { usePreferences } from '@/hooks/useLearningState';
import { cn } from '@/lib/cn';
import { ExhibitFrame } from '@/modules/lesson/ExhibitFrame';
import { StepControls } from '@/modules/lesson/StepControls';
import type { Frame } from '@/simulators/memory';
import { describeValue, PROGRAM_LABEL } from './values';
import { useMemoryLabState } from './useMemoryLabState';

/**
 * The run-time constant pool entries each method's bytecode names, copied
 * from javap -c (javac 25.0.4 for the lab's classes, the JDK 25.0.4 class
 * file for java.lang.Thread): what dynamic linking resolves for that frame.
 */
const DYNAMIC_LINKS: Record<string, string[]> = {
  'Main.main(String[])': [
    '#7 class Person',
    '#9 String Alex',
    '#11 Method Person."<init>":(Ljava/lang/String;)V',
    '#14 String Yaksh',
    '#16 Method Person.setName:(Ljava/lang/String;)V',
  ],
  'Person.Person(String)': [
    '#1 Method java/lang/Object."<init>":()V',
    '#7 Field name:Ljava/lang/String;',
  ],
  'Person.setName(String)': ['#7 Field name:Ljava/lang/String;'],
  'TwoThreads.main(String[])': [
    '#7 class Person',
    '#9 String Alex',
    '#14 class java/lang/Thread',
    '#16 class Renamer',
    '#21 String worker',
    '#26 Method java/lang/Thread.start:()V',
    '#29 Method java/lang/Thread.join:()V',
    '#46 Method Person.getName:()Ljava/lang/String;',
  ],
  'java.lang.Thread.run()': [
    '#1 Field holder:Ljava/lang/Thread$FieldHolder;',
    '#318 Field java/lang/Thread$FieldHolder.task:Ljava/lang/Runnable;',
    '#322 Method scopedValueBindings:()Ljava/lang/Object;',
    '#323 Method runWith:(Ljava/lang/Object;Ljava/lang/Runnable;)V',
  ],
  'java.lang.Thread.runWith(Object, Runnable)': [
    '#327 Method ensureMaterializedForStackWalk:(Ljava/lang/Object;)V',
    '#331 InterfaceMethod java/lang/Runnable.run:()V',
    '#336 Method java/lang/ref/Reference.reachabilityFence:(Ljava/lang/Object;)V',
  ],
  'Renamer.run()': [
    '#7 Field target:LPerson;',
    '#13 String Yaksh',
    '#15 Method Person.setName:(Ljava/lang/String;)V',
  ],
  'Countdown.main(String[])': [
    '#13 Field java/lang/System.out:Ljava/io/PrintStream;',
    '#7 Method countdown:(I)I',
    '#19 Method java/io/PrintStream.println:(I)V',
  ],
  'Countdown.countdown(int)': ['#7 Method countdown:(I)I'],
};

const keyOf = (frame: Frame) => `${frame.owner}.${frame.method}`;

/**
 * Stack frame dissection: one frame of a real program opened up — its local
 * variable array, its operand stack, its link to its class's run-time
 * constant pool, and where control goes when it completes.
 */
export function FrameDissection() {
  const state = useMemoryLabState();
  const { preferences } = usePreferences();
  const { program, states } = state;
  const total = program.steps.length;
  const index = state.step;
  const playback = usePlayback({
    step: index,
    total,
    onStep: state.setStep,
    resetKey: `frames:${program.id}`,
    stepMs: 2600,
  });
  const stepper = { step: index, total, ...playback };
  const step = program.steps[index]!;
  const memory = states[index]!;
  const frames = memory.threads.flatMap((thread) =>
    thread.frames.map((frame, depth) => ({ thread, frame, depth })),
  );
  const chosen =
    frames.find((f) => f.frame.id === state.frame) ??
    // By default, the current frame of the thread that is running.
    [...frames].reverse().find((f) => f.thread.status === 'running') ??
    frames.at(-1);

  return (
    <ExhibitFrame
      title={`Stack frame dissection: ${program.title}`}
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Program"
            size="sm"
            value={program.id}
            onChange={(id: MemoryProgramId) => state.setProgram(id)}
            segments={MEMORY_PROGRAMS.map((p) => ({
              value: p.id,
              label: PROGRAM_LABEL[p.id],
            }))}
          />
          <StepControls stepper={stepper} />
        </div>
      }
      caption={
        <>
          <span className="font-medium text-fg">{step.title}.</span>
          <LevelText
            content={step.text}
            level={preferences.level}
            className="prose-ij mt-1 text-[15px]"
            fallbackStyle="tag"
          />
        </>
      }
      note="Frames as the JVM Specification describes them. HotSpot’s interpreter frames also keep the method pointer, the bytecode pointer, the constant pool cache and monitors; compiled frames keep values in registers and may contain inlined callees."
    >
      <div className="@container grid gap-4 @[760px]:grid-cols-[15rem_minmax(0,1fr)]">
        <section aria-label="Choose a frame" className="min-w-0">
          {memory.threads.map((thread) => (
            <div key={thread.id} className="mb-3">
              <p className="flex items-center gap-1.5 text-[12.5px] text-fg-subtle">
                <Layers size={13} aria-hidden /> Thread {thread.name}: {thread.frames.length}{' '}
                {thread.frames.length === 1 ? 'frame' : 'frames'}
              </p>
              <ol className="mt-1 space-y-1">
                {[...thread.frames].reverse().map((frame, i) => (
                  <li key={frame.id}>
                    <button
                      type="button"
                      onClick={() => state.setFrame(frame.id)}
                      aria-pressed={chosen?.frame.id === frame.id}
                      className={cn(
                        'w-full rounded-md border px-2.5 py-1.5 text-left font-mono text-[12px] transition-colors',
                        chosen?.frame.id === frame.id
                          ? 'border-exec-400 bg-exec-900/60 text-exec-200'
                          : 'border-ink-600 text-fg-muted hover:border-ink-400 hover:text-fg',
                      )}
                      translate="no"
                    >
                      {frame.method}
                      {i === 0 && (
                        <span className="ml-1 font-sans text-[11px] text-fg-subtle">(top)</span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          {frames.length === 0 && (
            <p className="text-[13px] text-fg-subtle">
              No frames at this step: every method has returned.
            </p>
          )}
        </section>

        {chosen ? (
          <section
            aria-label={`Inside the frame of ${chosen.frame.method}`}
            className="min-w-0 space-y-3"
          >
            <div>
              <p className="font-mono text-[14px] text-fg" translate="no">
                {chosen.frame.owner}.{chosen.frame.method}
              </p>
              <p className="text-[12.5px] text-fg-subtle">
                Frame {chosen.depth + 1} from the bottom of thread {chosen.thread.name}’s stack ·
                max_locals = {chosen.frame.maxLocals}, max_stack = {chosen.frame.maxStack} (fixed by
                javac, checked by the verifier)
              </p>
            </div>
            <div className="grid gap-3 @[560px]:grid-cols-2">
              <div className="rounded-lg border border-rt-500/40 bg-rt-900/20 p-3">
                <p className="text-[12.5px] font-medium text-fg">Local variable array</p>
                <table className="mt-1.5 w-full text-left text-[12.5px]">
                  <thead>
                    <tr className="text-[11.5px] text-fg-subtle">
                      <th scope="col" className="py-0.5 pr-2 font-normal">
                        Slot
                      </th>
                      <th scope="col" className="py-0.5 pr-2 font-normal">
                        Name : type
                      </th>
                      <th scope="col" className="py-0.5 font-normal">
                        Holds
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono" translate="no">
                    {chosen.frame.locals.map((slot) => (
                      <tr key={slot.index} className="border-t border-ink-700">
                        <td className="py-1 pr-2 text-fg-subtle">{slot.index}</td>
                        <td className="py-1 pr-2 text-fg-muted">
                          {slot.name} : {slot.type}
                        </td>
                        <td className="py-1 text-fg">
                          {describeValue(slot.value, memory.objects)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1.5 text-[12px] text-fg-subtle">
                  An <span className="font-mono">int</span> slot holds the number itself; a slot of
                  a class type holds a reference, never an object.
                </p>
              </div>
              <div className="rounded-lg border border-exec-500/40 bg-exec-900/20 p-3">
                <p className="text-[12.5px] font-medium text-fg">
                  Operand stack ({chosen.frame.stack.length} of {chosen.frame.maxStack})
                </p>
                <ol
                  className="mt-1.5 flex flex-col-reverse gap-1"
                  aria-label="Operand stack, bottom first"
                >
                  {Array.from(
                    { length: chosen.frame.maxStack },
                    (_, i) => chosen.frame.stack[i],
                  ).map((value, i) => (
                    <li
                      key={i}
                      className={cn(
                        'rounded border px-2 py-0.5 font-mono text-[12px]',
                        value
                          ? 'border-exec-500/50 bg-ink-850 text-fg'
                          : 'border-dashed border-ink-600 text-fg-subtle',
                      )}
                      translate="no"
                    >
                      {value ? describeValue(value, memory.objects) : 'free'}
                    </li>
                  ))}
                </ol>
                <p className="mt-1.5 text-[12px] text-fg-subtle">
                  Instructions push values here and pop them off, top first.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-ink-600 bg-ink-900/60 p-3">
              <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg">
                <Link2 size={14} aria-hidden className="text-rt-300" /> Dynamic linking: the
                run-time constant pool of <span className="font-mono">{chosen.frame.owner}</span>
              </p>
              <p className="mt-1 text-[12.5px] text-fg-muted">
                The frame refers to its class’s run-time constant pool. These are entries this
                method’s bytecode names in the steps shown, each resolved the first time it is used.
              </p>
              <ul className="mt-1.5 space-y-0.5 font-mono text-[12px] text-fg-muted" translate="no">
                {(DYNAMIC_LINKS[keyOf(chosen.frame)] ?? []).map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-ink-600 bg-ink-900/60 p-3 text-[12.5px] text-fg-muted">
              <p className="flex items-center gap-1.5 font-medium text-fg">
                <ArrowDownToLine size={14} aria-hidden className="text-exec-300" /> When it
                completes
              </p>
              <p className="mt-1">
                {chosen.depth > 0 ? (
                  <>
                    Normal completion (a <span className="font-mono">return</span> instruction) pops
                    this frame and resumes{' '}
                    <span className="font-mono">
                      {chosen.thread.frames[chosen.depth - 1]!.method}
                    </span>{' '}
                    below it, pushing any return value onto that frame’s operand stack.
                  </>
                ) : (
                  <>
                    This is the bottom frame of its thread: when it completes, the thread has no
                    Java frames left.
                  </>
                )}{' '}
                Abrupt completion (an exception this method does not catch) pops it too, and the
                search for a handler continues in the caller.
              </p>
            </div>
          </section>
        ) : (
          <p className="text-[14px] text-fg-muted">Step back to see frames again.</p>
        )}
      </div>

      {program.id === 'recursion' && (
        <div className="mt-4">
          <CodeBlock
            code={OVERFLOW_OUTPUT.code}
            language="text"
            title={OVERFLOW_OUTPUT.title}
            verifiedWith={OVERFLOW_OUTPUT.verifiedWith}
          />
        </div>
      )}
    </ExhibitFrame>
  );
}
