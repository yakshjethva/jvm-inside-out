/**
 * Learning paths as questions a learner already has, in a sensible order.
 * Each one links only to things that exist now; what is planned is named with
 * its milestone and not linked (no dead navigation).
 */
export interface QuestionPath {
  id: string;
  question: string;
  /** What answering it involves, in one or two plain sentences. */
  summary: string;
  /** Places that answer it today. */
  now: { label: string; to: string; kind: 'lesson' | 'map' | 'walkthrough' | 'inside' | 'lab' }[];
  /** A dedicated laboratory that is planned. */
  later?: { label: string; milestone: string };
}

export const QUESTION_PATHS: QuestionPath[] = [
  {
    id: 'objects',
    question: 'Where do my objects and variables live?',
    summary:
      'The heap, the stack and the references between them: what `new` really does, and why two variables can share one object.',
    now: [
      {
        label: 'Chapter 5 of the first lesson: Memory',
        to: '/start?chapter=memory',
        kind: 'lesson',
      },
      {
        label: 'Watch new Person("Alex") run, instruction by instruction',
        to: '/anatomy?mode=execution&s=new-person',
        kind: 'walkthrough',
      },
      {
        label: 'Look inside a stack frame',
        to: '/anatomy?c=stack-frame&mode=internal',
        kind: 'inside',
      },
      { label: 'The heap on the map', to: '/anatomy?c=heap', kind: 'map' },
      {
        label: 'The memory laboratory: stack and heap, statement by statement',
        to: '/memory?lab=living',
        kind: 'lab',
      },
    ],
  },
  {
    id: 'loading',
    question: 'How does Java find and load my classes?',
    summary:
      'Class loaders, the class path and the order of loading, linking and initialization, including the parts that wait until a name is first used.',
    now: [
      {
        label: 'Chapter 4 of the first lesson: Loading classes',
        to: '/start?chapter=loading',
        kind: 'lesson',
      },
      {
        label: 'Watch the JVM start and load your first class',
        to: '/anatomy?mode=execution&s=launch',
        kind: 'walkthrough',
      },
      {
        label: 'The class loader subsystem on the map',
        to: '/anatomy?c=class-loader-subsystem',
        kind: 'map',
      },
      {
        label: 'The class loader explorer: follow a request through the loaders',
        to: '/class-loading?lab=delegation',
        kind: 'lab',
      },
    ],
  },
  {
    id: 'speed',
    question: 'How does the JVM run my code, and why does it get faster?',
    summary:
      'The interpreter, the JIT compilers and the code cache: why Java starts quickly and then speeds up while it runs.',
    now: [
      {
        label: 'Chapter 6 of the first lesson: Execution',
        to: '/start?chapter=execution',
        kind: 'lesson',
      },
      {
        label: 'Watch a hot method become machine code',
        to: '/anatomy?mode=execution&s=jit',
        kind: 'walkthrough',
      },
      {
        label: 'Look inside the interpreter',
        to: '/anatomy?c=interpreter&mode=internal',
        kind: 'inside',
      },
    ],
    later: { label: 'Bytecode Explorer: real javap output, step by step', milestone: 'M5' },
  },
  {
    id: 'garbage',
    question: 'What happens to objects I stop using?',
    summary:
      'Reachability, garbage collection and HotSpot’s collectors: the difference between unreachable and actually reclaimed.',
    now: [
      {
        label: 'Chapter 7 of the first lesson: Garbage collection',
        to: '/start?chapter=gc',
        kind: 'lesson',
      },
      {
        label: 'Watch a young collection, with real G1 log lines',
        to: '/anatomy?mode=execution&s=young-gc',
        kind: 'walkthrough',
      },
      {
        label: 'The garbage collector on the map',
        to: '/anatomy?c=garbage-collector',
        kind: 'map',
      },
    ],
    later: { label: 'Garbage Collection Lab: collectors side by side', milestone: 'M6' },
  },
  {
    id: 'native',
    question: 'How does Java talk to code written in C?',
    summary:
      'Native methods, JNI and native libraries, and the newer Foreign Function & Memory API.',
    now: [
      {
        label: 'Watch a call cross from Java into native code',
        to: '/anatomy?mode=execution&s=jni-call',
        kind: 'walkthrough',
      },
      { label: 'JNI on the map', to: '/anatomy?c=jni', kind: 'map' },
    ],
  },
  {
    id: 'threads',
    question: 'How do threads share work safely?',
    summary:
      'What each thread owns, what all threads share, and why shared objects need synchronization.',
    now: [{ label: 'A Java thread on the map', to: '/anatomy?c=java-thread', kind: 'map' }],
    later: { label: 'Concurrency Lab: interleave two threads', milestone: 'M7' },
  },
  {
    id: 'collections',
    question: 'How do ArrayList and HashMap work inside?',
    summary: 'Arrays, buckets, hashing and resizing: what your collections do with memory.',
    now: [],
    later: { label: 'Collections Explorer: HashMap buckets and resizing', milestone: 'M7' },
  },
];
