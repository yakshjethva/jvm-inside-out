import type { LearningPath } from '@/types/content';

/**
 * The curriculum. `route` is set only for paths with a working page in this
 * release; the rest are shown as "in development" with their milestone and
 * are not linked (no dead navigation).
 */
export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'jvm-anatomy',
    code: 'B',
    title: 'JVM anatomical architecture',
    summary:
      'Every subsystem of the JVM on one interactive plate: class loading, runtime data areas, the execution engine, the garbage collector and JNI, with dissections and execution walkthroughs.',
    milestone: 'M2',
    route: '/anatomy',
    topics: [
      'Class loader subsystem: bootstrap, platform, application and custom loaders; parent delegation',
      'Loading, linking (verification, preparation, resolution), initialization, unloading',
      'Heap, JVM stacks, frames, local variables, operand stacks, frame data, PC registers',
      'Method area and run-time constant pool; HotSpot Metaspace',
      'Interpreter, profiling, JIT compilation (C1/C2), code cache, deoptimization',
      'Garbage collector anatomy and the HotSpot collectors',
      'JNI and native libraries',
    ],
    labs: [
      'Anatomy view',
      'Exploded view',
      'Internal dissections',
      'Execution walkthroughs',
      'Knowledge check',
    ],
  },
  {
    id: 'execution-lifecycle',
    code: 'A',
    title: 'Java execution lifecycle',
    summary:
      'From a `.java` file to instructions on the CPU: compilation, class files, JVM start-up, class loading, linking, initialization, interpretation and JIT compilation.',
    milestone: 'M3',
    topics: [
      'Source code and javac',
      'Class-file structure and bytecode',
      'JVM start-up',
      'Loading, linking, initialization',
      'Interpreter and JIT',
      'Machine instructions, OS and CPU',
    ],
    labs: ['Interactive execution pipeline'],
  },
  {
    id: 'class-loading',
    code: 'B2',
    title: 'Class loader explorer',
    summary:
      'The loaders of a running JVM, a delegation simulator and a step-by-step walkthrough of loading, linking (verification, preparation, resolution) and initialization, checked against JDK 25.',
    milestone: 'M3',
    route: '/class-loading',
    topics: [
      'Bootstrap, platform, application and user-defined loaders',
      'Parent-first, child-first and module-aware delegation',
      'Defining and initiating loaders, loading constraints',
      'Initialization order, locks, errors and deadlocks',
      'Class unloading and class loader leaks',
    ],
    labs: ['Loader observatory (2D and 3D)', 'Delegation laboratory', 'Lifecycle microscope'],
  },
  {
    id: 'memory',
    code: 'C',
    title: 'Memory anatomy and laboratory',
    summary:
      'Stack versus heap, references, object layout, generations, Metaspace, native and direct memory, and the errors that come with them.',
    milestone: 'M4',
    route: '/memory',
    topics: [
      'Heap vs stack',
      'References and objects',
      'Object headers, instance and static fields, arrays',
      'Eden, survivor and old generations, collector by collector',
      'Metaspace, direct and native memory',
      'StackOverflowError and the kinds of OutOfMemoryError',
    ],
    labs: [
      'Memory observatory (2D and 3D)',
      'Living stack and heap: Person p1 = new Person("Alex") and four more statements',
      'Stack frame dissection',
      'Object layout laboratory',
      'Heap and native memory, with a diagnostic workbench',
    ],
  },
  {
    id: 'bytecode',
    code: 'G1',
    title: 'Bytecode and the execution engine',
    summary:
      'Source-to-bytecode comparisons from verified javap output, with the operand stack and local variables at every instruction; interpreter and JIT internals.',
    milestone: 'M5',
    topics: [
      'aload / astore, new / dup, invokespecial / invokevirtual / invokestatic',
      'getfield / putfield, getstatic / putstatic, return',
      'Template interpreter',
      'Tiered compilation, inlining, escape analysis, deoptimization',
    ],
    labs: ['Bytecode Explorer', 'Execution Engine Explorer'],
  },
  {
    id: 'gc',
    code: 'D',
    title: 'Garbage collection laboratory',
    summary:
      'Build object graphs, cut references, watch reachability change and run a simulated collection; then compare G1, ZGC and Shenandoah.',
    milestone: 'M6',
    topics: [
      'GC roots and reachability',
      'Strong, soft, weak and phantom references',
      'Marking, sweeping, compaction',
      'Generational collection and stop-the-world pauses',
      'G1, ZGC, Shenandoah',
      'GC logs and tuning',
    ],
    labs: ['Object graph editor with simulated collection'],
  },
  {
    id: 'concurrency',
    code: 'E',
    title: 'Concurrency laboratory',
    summary:
      'Two threads, one shared counter: reorder their steps and watch lost updates appear, then fix them with synchronization.',
    milestone: 'M7',
    topics: [
      'Processes and threads, lifecycle, scheduling',
      'Race conditions, monitors, locks, volatile',
      'Happens-before and the Java Memory Model',
      'Deadlocks',
      'ExecutorService, ForkJoinPool, CompletableFuture',
      'Virtual threads',
    ],
    labs: ['Shared-counter interleaving simulator'],
  },
  {
    id: 'collections',
    code: 'F',
    title: 'Collections anatomy',
    summary:
      'The real internal structures of ArrayList, LinkedList, HashMap, HashSet, TreeMap, PriorityQueue and ConcurrentHashMap (JDK 25).',
    milestone: 'M7',
    topics: [
      'HashMap: hash spreading, buckets, collisions, treeification, resizing, load factor',
      'ArrayList growth and LinkedList nodes',
      'TreeMap red-black trees, PriorityQueue heaps',
      'ConcurrentHashMap',
    ],
    labs: ['HashMap playground'],
  },
  {
    id: 'language',
    code: 'G2',
    title: 'Java language internals',
    summary:
      'How language features become JVM constructs: dispatch, generics and erasure, reflection and proxies, annotations, lambdas and invokedynamic, records, sealed classes and modules.',
    milestone: 'M8',
    topics: [
      'Method dispatch, overloading, overriding',
      'Generics and type erasure',
      'Reflection, dynamic proxies, annotations',
      'Lambdas and invokedynamic',
      'Records, sealed classes, modules',
    ],
    labs: [],
  },
  {
    id: 'io',
    code: 'G3',
    title: 'I/O and NIO',
    summary:
      'Streams, readers and buffers down to system calls; channels, selectors, ByteBuffer and memory-mapped files.',
    milestone: 'M8',
    topics: [
      'InputStream / OutputStream, Reader / Writer',
      'Serialization',
      'Sockets, TCP and UDP',
      'NIO channels, buffers, selectors',
      'Memory-mapped files',
    ],
    labs: [],
  },
  {
    id: 'performance',
    code: 'G4',
    title: 'JVM performance engineering',
    summary:
      'Measuring before tuning: JFR and JMC, JMH, thread and heap dumps, GC logs, profiling, flags and heap sizing.',
    milestone: 'M8',
    topics: [
      'Java Flight Recorder and Mission Control',
      'JMH',
      'Thread dumps and heap dumps',
      'CPU and memory profiling',
      'JVM flags and heap sizing',
    ],
    labs: [],
  },
  {
    id: 'os',
    code: 'G5',
    title: 'Operating system foundations',
    summary:
      'The OS concepts needed to understand the JVM, kept clearly separate from JVM concepts.',
    milestone: 'M8',
    topics: [
      'Processes and threads',
      'Virtual and physical memory',
      'System calls and context switching',
      'CPU scheduling',
      'File descriptors and networking',
    ],
    labs: [],
  },
  {
    id: 'native',
    code: 'G6',
    title: 'JNI and native integration',
    summary:
      'Native methods, native memory, the Foreign Function & Memory API and the life cycle of native resources.',
    milestone: 'M8',
    topics: [
      'JNI and native methods',
      'Native memory',
      'Foreign Function & Memory API',
      'Native resource lifecycle',
    ],
    labs: [],
  },
];
