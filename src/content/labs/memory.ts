import type { ComponentId } from '@/content/jvm/ids';
import type { LeveledText } from '@/lib/levels';
import type { Citation, CodeListing, Provenance, Quiz } from '@/types/content';
import type { Investigation, LabStation } from '@/types/lab';
import * as E from './memoryEvidence';

/**
 * The Memory Laboratory. Logical areas come from the JVM Specification
 * (Java SE 25); implementation structures are OpenJDK HotSpot, JDK 25. Every
 * number and message is from a real run (memoryEvidence.ts).
 */

export type MemoryAreaId =
  | 'heap'
  | 'method-area'
  | 'runtime-constant-pool'
  | 'pc-register'
  | 'jvm-stack'
  | 'native-method-stack'
  | 'java-heap'
  | 'metaspace'
  | 'class-space'
  | 'code-cache'
  | 'thread-stacks'
  | 'gc-structures'
  | 'native-allocations';

export interface MemoryArea {
  id: MemoryAreaId;
  title: string;
  layer: 'spec' | 'hotspot' | 'platform';
  provenance: Provenance;
  scope: 'shared' | 'per-thread' | 'process';
  /** One line on the plate. */
  summary: string;
  role: LeveledText;
  /** The other layer's areas this one corresponds to. */
  mapsTo: MemoryAreaId[];
  /** Where it shows in Native Memory Tracking (HotSpot structures). */
  nmt?: string;
  component?: ComponentId;
  evidence: CodeListing[];
  references: Citation[];
}

export const MEMORY_AREAS: MemoryArea[] = [
  {
    id: 'heap',
    title: 'Heap',
    layer: 'spec',
    provenance: 'spec',
    scope: 'shared',
    summary: 'Every object and array, shared by all threads.',
    role: {
      simple:
        'The shared memory where every object lives. Variables only hold references to objects here. Nobody frees heap memory by hand: the garbage collector reclaims objects that can no longer be reached.',
      developer:
        '`new`, array creation, string literals and boxing (outside the cached small values) allocate here. Its size is bounded by `-Xmx`; when live objects do not fit, the JVM throws `OutOfMemoryError: Java heap space`.',
      deep: 'JVMS §2.5.3: created at start-up, shared among all threads, the run-time data area from which all class instances and arrays are allocated; storage is reclaimed by an automatic storage management system and never explicitly deallocated. The specification mandates no layout, generations or algorithm.',
    },
    mapsTo: ['java-heap'],
    component: 'heap',
    evidence: [E.HEAP_INFO.g1, E.OOM.heap],
    references: [{ source: 'jvms-2.5.3' }, { source: 'jvms-2.7' }],
  },
  {
    id: 'method-area',
    title: 'Method area',
    layer: 'spec',
    provenance: 'spec',
    scope: 'shared',
    summary: 'Per-class structures: fields, method code, constant pools.',
    role: {
      simple:
        'The JVM’s notes about every class it has loaded: its fields, its methods and their bytecode, its constants.',
      developer:
        'Class metadata is not on the Java heap in HotSpot: it is in Metaspace, native memory. A class’s static fields, however, live in its `java.lang.Class` object, on the heap.',
      deep: 'JVMS §2.5.4: shared among threads, stores per-class structures such as the run-time constant pool, field and method data, and the code of methods and constructors. It is logically part of the heap, but the specification does not dictate its location or management. HotSpot implements it with Metaspace (class metadata, JEP 122) plus the class mirror in the Java heap.',
    },
    mapsTo: ['metaspace', 'class-space', 'java-heap'],
    component: 'method-area',
    evidence: [E.OOM.metaspace],
    references: [{ source: 'jvms-2.5.4' }, { source: 'jep-122' }, { source: 'src-metaspace' }],
  },
  {
    id: 'runtime-constant-pool',
    title: 'Run-time constant pools',
    layer: 'spec',
    provenance: 'spec',
    scope: 'shared',
    summary: 'One per class: constants and symbolic references.',
    role: {
      simple:
        'Each class has a table of names and constants its code uses, like an address book. The first use of an entry looks it up; later uses are fast.',
      developer:
        '`javap -v` prints the class file’s constant pool, from which this one is built: `#7 Class Person`, `#9 String Alex`, `#16 Methodref Person.setName`.',
      deep: 'JVMS §2.5.5 and §5.1: a per-class run-time representation of the `constant_pool` table, allocated from the method area when the class is created. HotSpot keeps it as a `ConstantPool` and a `ConstantPoolCache` with the resolved entries, both in Metaspace.',
    },
    mapsTo: ['metaspace'],
    component: 'runtime-constant-pool',
    evidence: [E.MAIN_CONSTANT_POOL],
    references: [{ source: 'jvms-2.5.5' }, { source: 'jvms-5.1' }, { source: 'src-constantpool' }],
  },
  {
    id: 'pc-register',
    title: 'PC register',
    layer: 'spec',
    provenance: 'spec',
    scope: 'per-thread',
    summary: 'Per thread: the instruction it is executing.',
    role: {
      simple: 'Each thread’s bookmark: which instruction of which method it is on.',
      developer:
        'The pc values are the offsets `javap -c` prints (`0: new`, `9: astore_1`). While a thread runs native code the value is undefined.',
      deep: 'JVMS §2.5.1: each thread has its own pc register holding the address of the JVM instruction being executed, if the method is not native. HotSpot’s interpreter keeps the bytecode pointer in a register (r13 on x86-64) and saves it in the interpreter frame; compiled code uses the processor’s program counter.',
    },
    mapsTo: ['thread-stacks'],
    component: 'pc-register',
    evidence: [E.MAIN_JAVAP],
    references: [{ source: 'jvms-2.5.1' }, { source: 'src-interp-masm-x86' }],
  },
  {
    id: 'jvm-stack',
    title: 'JVM stack',
    layer: 'spec',
    provenance: 'spec',
    scope: 'per-thread',
    summary: 'Per thread: a frame for every method call in progress.',
    role: {
      simple:
        'Each thread’s pile of method calls in progress. Calling a method adds a frame on top; returning removes it.',
      developer:
        'Each line of a stack trace is a frame. `-Xss` sets its size for new threads; too deep a recursion throws `StackOverflowError`.',
      deep: 'JVMS §2.5.2: private to a thread, created with it, holding frames (§2.6) with local variables, operand stack and a reference to the run-time constant pool of the current method’s class. It may be fixed or dynamically sized; exceeding it throws `StackOverflowError`, failing to create one `OutOfMemoryError`.',
    },
    mapsTo: ['thread-stacks'],
    component: 'jvm-stack',
    evidence: [E.OVERFLOW_OUTPUT],
    references: [{ source: 'jvms-2.5.2' }, { source: 'jvms-2.6' }],
  },
  {
    id: 'native-method-stack',
    title: 'Native method stack',
    layer: 'spec',
    provenance: 'spec',
    scope: 'per-thread',
    summary: 'Per thread: frames of native (C) code, if the JVM has them.',
    role: {
      simple: 'Room for calls into code written for the operating system, such as C libraries.',
      developer:
        'Native frames appear in thread dumps as `(Native Method)`, for example `Thread.sleepNanos0`.',
      deep: 'JVMS §2.5.6: an implementation may use conventional C stacks (“native method stacks”) to support native methods; it need not provide them if it cannot run native methods. HotSpot has no separate one: Java and native frames share one native thread stack.',
    },
    mapsTo: ['thread-stacks'],
    component: 'native-method-stack',
    evidence: [E.THREAD_PRINT],
    references: [{ source: 'jvms-2.5.6' }, { source: 'jni-spec' }],
  },
  {
    id: 'java-heap',
    title: 'Java heap (collector-specific)',
    layer: 'hotspot',
    provenance: 'hotspot',
    scope: 'shared',
    summary: 'One reservation, organized by the chosen collector.',
    role: {
      simple:
        'HotSpot’s heap is one big block of memory. How it is divided depends on the garbage collector: equal regions for G1, two fixed spaces for Serial and Parallel.',
      developer:
        'G1 (the default on server-class machines) splits it into equal regions (1 MB in a 64 MB heap, 2 MB at this machine’s default size). `jcmd <pid> GC.heap_info` shows the layout of the collector in use.',
      deep: 'Reserved at start-up up to `MaxHeapSize` (25% of physical or container memory by default, `MaxRAMPercentage`) and committed as needed. The heap also holds the `java.lang.Class` mirrors, with each class’s static fields. NMT category: Java Heap.',
    },
    mapsTo: ['heap', 'method-area'],
    nmt: 'Java Heap',
    component: 'heap',
    evidence: [E.HEAP_INFO.g1, E.HEAP_INFO.serial, E.NMT_SUMMARY],
    references: [{ source: 'guide-gc' }, { source: 'src-g1' }, { source: 'src-gcconfig' }],
  },
  {
    id: 'metaspace',
    title: 'Metaspace',
    layer: 'hotspot',
    provenance: 'hotspot',
    scope: 'process',
    summary: 'Class metadata in native memory, per class loader.',
    role: {
      simple:
        'Where HotSpot keeps its notes about classes. It is outside the heap, and it grows as classes are loaded; it shrinks only when class loaders are unloaded.',
      developer:
        '`-XX:MaxMetaspaceSize` caps it (unlimited by default: `18446744073709551615`). Hitting the cap throws `OutOfMemoryError: Metaspace`, typically from a class loader leak.',
      deep: 'JEP 122 replaced the permanent generation with Metaspace; JEP 387 made it elastic. Each `ClassLoaderData` owns its metaspace chunks, freed when the loader is unloaded. Holds `InstanceKlass` (non-class part: methods, constant pools, annotations). NMT category: Class (Metadata).',
    },
    mapsTo: ['method-area', 'runtime-constant-pool'],
    nmt: 'Class › Metadata',
    component: 'method-area',
    evidence: [E.NMT_SUMMARY, E.OOM.metaspace],
    references: [
      { source: 'jep-122' },
      { source: 'jep-387' },
      { source: 'src-metaspace' },
      { source: 'src-classloaderdata' },
    ],
  },
  {
    id: 'class-space',
    title: 'Compressed class space',
    layer: 'hotspot',
    provenance: 'hotspot',
    scope: 'process',
    summary: 'The part of Metaspace that compressed class pointers can reach.',
    role: {
      simple:
        'A reserved region for the most important class descriptions, so each object can point to its class with a short, 4-byte number.',
      developer:
        '`CompressedClassSpaceSize` is 1 GB by default (reserved, not used). Filling it throws `OutOfMemoryError: Compressed class space` even when total Metaspace has room.',
      deep: 'With compressed class pointers (on by default; turning them off is deprecated in JDK 25), each object header stores a 32-bit narrow `Klass*`, an offset into this space. Holds the `Klass` structures; their methods and constant pools go to the non-class part.',
    },
    mapsTo: ['method-area'],
    nmt: 'Class › Class space',
    evidence: [E.NMT_SUMMARY, E.OOM.classSpace, E.NO_CCP_WARNING],
    references: [{ source: 'src-compressedklass' }, { source: 'src-metaspace' }],
  },
  {
    id: 'code-cache',
    title: 'Code cache',
    layer: 'hotspot',
    provenance: 'hotspot',
    scope: 'process',
    summary: 'Machine code from the JIT compilers and the interpreter.',
    role: {
      simple: 'Where HotSpot keeps the machine code it generated, so busy methods run fast.',
      developer:
        '`ReservedCodeCacheSize` is 240 MB here (`251662336`, ergonomic), split into three segments. If it fills, HotSpot prints `CodeCache is full. Compiler has been disabled.` and stops compiling.',
      deep: 'Not a specification area: an implementation structure of the execution engine (JEP 197 segmented code cache: non-method, profiled and non-profiled code heaps). NMT category: Code.',
    },
    mapsTo: [],
    nmt: 'Code',
    component: 'code-cache',
    evidence: [E.FLAGS_OUTPUT],
    references: [{ source: 'jep-197' }, { source: 'src-codecache' }],
  },
  {
    id: 'thread-stacks',
    title: 'Native thread stacks',
    layer: 'hotspot',
    provenance: 'hotspot',
    scope: 'per-thread',
    summary: 'One per thread, holding Java and native frames, with guard zones.',
    role: {
      simple:
        'Each thread’s stack is a block of memory from the operating system, holding both its Java calls and its native calls.',
      developer:
        '1 MB per platform thread by default on Linux x64 (`ThreadStackSize = 1024`, set with `-Xss`), mostly reserved rather than used. Too many threads can fail with `unable to create native thread`.',
      deep: 'HotSpot runs each Java thread on a native thread whose stack holds interpreter frames, compiled frames and native frames alike, with reserved, yellow and red guard zones that turn an overflow into `StackOverflowError`. Virtual threads keep their frames in heap objects while unmounted. NMT category: Thread (stack).',
    },
    mapsTo: ['jvm-stack', 'native-method-stack', 'pc-register'],
    nmt: 'Thread › stack',
    component: 'java-thread',
    evidence: [E.NMT_SUMMARY, E.OOM.threads],
    references: [
      { source: 'src-stackoverflow' },
      { source: 'src-javathread' },
      { source: 'jep-444' },
    ],
  },
  {
    id: 'gc-structures',
    title: 'GC data structures',
    layer: 'hotspot',
    provenance: 'hotspot',
    scope: 'process',
    summary: 'Card tables, remembered sets and marking bitmaps.',
    role: {
      simple: 'The garbage collector’s own bookkeeping, kept outside the heap it manages.',
      developer:
        'With a 256 MB G1 heap, NMT reports about 45 MB for GC: memory to budget for, beyond `-Xmx`.',
      deep: 'Collector-specific: G1 keeps a card table, per-region remembered sets and marking bitmaps; ZGC and Shenandoah keep their own metadata. NMT category: GC.',
    },
    mapsTo: [],
    nmt: 'GC',
    component: 'garbage-collector',
    evidence: [E.NMT_SUMMARY],
    references: [{ source: 'src-g1' }, { source: 'guide-gc' }],
  },
  {
    id: 'native-allocations',
    title: 'Direct buffers and native allocations',
    layer: 'platform',
    provenance: 'platform',
    scope: 'process',
    summary: 'Memory outside the heap: direct buffers, JNI and library allocations.',
    role: {
      simple:
        'Programs can use memory outside the heap too, for fast input and output or through native libraries. The garbage collector does not manage it directly.',
      developer:
        '`ByteBuffer.allocateDirect` memory is counted against `MaxDirectMemorySize` (by default the maximum heap size; the flag reads `0`). Exceeding it throws `OutOfMemoryError: Cannot reserve … bytes of direct buffer memory`. JNI code’s `malloc` is not counted anywhere by the JVM.',
      deep: 'Direct buffers are freed when their `ByteBuffer` object is collected (through a `Cleaner`). NMT reports them under Other; memory a native library allocates itself is invisible to NMT.',
    },
    mapsTo: [],
    nmt: 'Other',
    component: 'native-libraries',
    evidence: [E.NMT_SUMMARY, E.OOM.direct],
    references: [{ source: 'api-bytebuffer' }, { source: 'src-bits' }, { source: 'jni-spec' }],
  },
];

export const isAreaId = (value: string | null): value is MemoryAreaId =>
  MEMORY_AREAS.some((area) => area.id === value);

/** One band of an object's layout, in bytes from the start of the object. */
export interface LayoutSegment {
  offset: number;
  size: number;
  kind: 'mark' | 'class' | 'length' | 'field' | 'elements' | 'gap';
  label: string;
}

export type LayoutConfigId = 'default' | 'compact' | 'nocoops';
export type LayoutSubjectId =
  'object' | 'person' | 'point' | 'mixed' | 'string' | 'int3' | 'person2';

export const LAYOUT_CONFIGS: { id: LayoutConfigId; title: string; flags: string; text: string }[] =
  [
    {
      id: 'default',
      title: 'Default (JDK 25)',
      flags: '(none)',
      text: 'Compressed references and compressed class pointers: a 12-byte header (8-byte mark word, 4-byte class pointer) and 4-byte references.',
    },
    {
      id: 'compact',
      title: 'Compact object headers',
      flags: '-XX:+UseCompactObjectHeaders',
      text: 'JEP 519 (a product option in JDK 25, off by default): the class pointer moves into the mark word, giving an 8-byte header.',
    },
    {
      id: 'nocoops',
      title: 'Uncompressed references',
      flags: '-XX:-UseCompressedOops',
      text: 'References become 8 bytes. Class pointers stay compressed (they are controlled separately), so the header is still 12 bytes.',
    },
  ];

const H = {
  mark: (): LayoutSegment => ({ offset: 0, size: 8, kind: 'mark', label: 'mark word' }),
  klass: (): LayoutSegment => ({ offset: 8, size: 4, kind: 'class', label: 'class pointer' }),
};
const f = (offset: number, size: number, label: string): LayoutSegment => ({
  offset,
  size,
  kind: 'field',
  label,
});
const gap = (offset: number, size: number, label = 'padding'): LayoutSegment => ({
  offset,
  size,
  kind: 'gap',
  label,
});

export interface LayoutSubject {
  id: LayoutSubjectId;
  title: string;
  declaration: string;
  /** Measured by JOL (objects) or derived from JOL's array base offset and element size (array elements). */
  layouts: Record<LayoutConfigId, { segments: LayoutSegment[]; size: number; derived?: boolean }>;
}

/** From JOL 0.17 and Instrumentation.getObjectSize on OpenJDK 25.0.4 (memoryEvidence.ts). */
export const LAYOUT_SUBJECTS: LayoutSubject[] = [
  {
    id: 'object',
    title: 'Object',
    declaration: 'new Object()',
    layouts: {
      default: { size: 16, segments: [H.mark(), H.klass(), gap(12, 4, 'alignment')] },
      compact: { size: 8, segments: [H.mark()] },
      nocoops: { size: 16, segments: [H.mark(), H.klass(), gap(12, 4, 'alignment')] },
    },
  },
  {
    id: 'person',
    title: 'Person',
    declaration: 'class Person { String name; }',
    layouts: {
      default: { size: 16, segments: [H.mark(), H.klass(), f(12, 4, 'name (reference)')] },
      compact: {
        size: 16,
        segments: [H.mark(), f(8, 4, 'name (reference)'), gap(12, 4, 'alignment')],
      },
      nocoops: {
        size: 24,
        segments: [H.mark(), H.klass(), gap(12, 4), f(16, 8, 'name (reference)')],
      },
    },
  },
  {
    id: 'point',
    title: 'Point',
    declaration: 'class Point { int x; int y; }',
    layouts: {
      default: {
        size: 24,
        segments: [
          H.mark(),
          H.klass(),
          f(12, 4, 'x (int)'),
          f(16, 4, 'y (int)'),
          gap(20, 4, 'alignment'),
        ],
      },
      compact: { size: 16, segments: [H.mark(), f(8, 4, 'x (int)'), f(12, 4, 'y (int)')] },
      nocoops: {
        size: 24,
        segments: [
          H.mark(),
          H.klass(),
          f(12, 4, 'x (int)'),
          f(16, 4, 'y (int)'),
          gap(20, 4, 'alignment'),
        ],
      },
    },
  },
  {
    id: 'mixed',
    title: 'Mixed',
    declaration: 'class Mixed { byte flag; long id; Object ref; int count; }',
    layouts: {
      default: {
        size: 32,
        segments: [
          H.mark(),
          H.klass(),
          f(12, 4, 'count (int)'),
          f(16, 8, 'id (long)'),
          f(24, 1, 'flag (byte)'),
          gap(25, 3),
          f(28, 4, 'ref (reference)'),
        ],
      },
      compact: {
        size: 32,
        segments: [
          H.mark(),
          f(8, 8, 'id (long)'),
          f(16, 4, 'count (int)'),
          f(20, 1, 'flag (byte)'),
          gap(21, 3),
          f(24, 4, 'ref (reference)'),
          gap(28, 4, 'alignment'),
        ],
      },
      nocoops: {
        size: 40,
        segments: [
          H.mark(),
          H.klass(),
          f(12, 4, 'count (int)'),
          f(16, 8, 'id (long)'),
          f(24, 1, 'flag (byte)'),
          gap(25, 7),
          f(32, 8, 'ref (reference)'),
        ],
      },
    },
  },
  {
    id: 'string',
    title: 'String',
    declaration: '"Alex" (the String object; its bytes are in a separate byte[])',
    layouts: {
      default: {
        size: 24,
        segments: [
          H.mark(),
          H.klass(),
          f(12, 4, 'hash (int)'),
          f(16, 1, 'coder (byte)'),
          f(17, 1, 'hashIsZero'),
          gap(18, 2),
          f(20, 4, 'value (byte[] reference)'),
        ],
      },
      compact: {
        size: 24,
        segments: [
          H.mark(),
          f(8, 4, 'hash (int)'),
          f(12, 1, 'coder (byte)'),
          f(13, 1, 'hashIsZero'),
          gap(14, 2),
          f(16, 4, 'value (byte[] reference)'),
          gap(20, 4, 'alignment'),
        ],
      },
      nocoops: {
        size: 32,
        segments: [
          H.mark(),
          H.klass(),
          f(12, 4, 'hash (int)'),
          f(16, 1, 'coder (byte)'),
          f(17, 1, 'hashIsZero'),
          gap(18, 6),
          f(24, 8, 'value (byte[] reference)'),
        ],
      },
    },
  },
  {
    id: 'int3',
    title: 'int[3]',
    declaration: 'new int[3]',
    layouts: {
      default: {
        size: 32,
        derived: true,
        segments: [
          H.mark(),
          H.klass(),
          { offset: 12, size: 4, kind: 'length', label: 'length' },
          { offset: 16, size: 12, kind: 'elements', label: '3 × int' },
          gap(28, 4, 'alignment'),
        ],
      },
      compact: {
        size: 24,
        derived: true,
        segments: [
          H.mark(),
          { offset: 8, size: 4, kind: 'length', label: 'length' },
          { offset: 12, size: 12, kind: 'elements', label: '3 × int' },
        ],
      },
      nocoops: {
        size: 32,
        derived: true,
        segments: [
          H.mark(),
          H.klass(),
          { offset: 12, size: 4, kind: 'length', label: 'length' },
          { offset: 16, size: 12, kind: 'elements', label: '3 × int' },
          gap(28, 4, 'alignment'),
        ],
      },
    },
  },
  {
    id: 'person2',
    title: 'Person[2]',
    declaration: 'new Person[2]',
    layouts: {
      default: {
        size: 24,
        derived: true,
        segments: [
          H.mark(),
          H.klass(),
          { offset: 12, size: 4, kind: 'length', label: 'length' },
          { offset: 16, size: 8, kind: 'elements', label: '2 × reference' },
        ],
      },
      compact: {
        size: 24,
        derived: true,
        segments: [
          H.mark(),
          { offset: 8, size: 4, kind: 'length', label: 'length' },
          { offset: 12, size: 8, kind: 'elements', label: '2 × reference' },
          gap(20, 4, 'alignment'),
        ],
      },
      nocoops: {
        size: 32,
        derived: true,
        segments: [
          H.mark(),
          H.klass(),
          { offset: 12, size: 4, kind: 'length', label: 'length' },
          { offset: 16, size: 16, kind: 'elements', label: '2 × reference' },
        ],
      },
    },
  },
];

export type CollectorId = 'g1' | 'serial' | 'parallel' | 'zgc' | 'shenandoah';

export interface CollectorProfile {
  id: CollectorId;
  title: string;
  flag: string;
  /** How the heap is divided. */
  structure: 'regions' | 'contiguous' | 'pages';
  generational: string;
  summary: string;
  text: LeveledText;
  evidence: CodeListing[];
  references: Citation[];
}

export const COLLECTORS: CollectorProfile[] = [
  {
    id: 'g1',
    title: 'G1',
    flag: '-XX:+UseG1GC (default on server-class machines)',
    structure: 'regions',
    generational: 'Generational: eden, survivor and old are sets of regions, not fixed areas',
    summary: 'Equal-sized regions; each one is eden, survivor, old or humongous at a time.',
    text: {
      simple:
        'G1 cuts the heap into many equal pieces called regions. Any region can hold new objects, survivors or old objects, and a region changes role over time.',
      developer:
        'Young collections copy live objects out of eden regions into survivor or old regions; the log shows the counts (`Eden regions: 17->0`, `Survivor regions: 0->1`). Objects of half a region or more are humongous and get regions of their own.',
      deep: 'JEP 248 made G1 the default. Region size is chosen at start-up (1 MB for a 64 MB heap, 2 MB at this machine’s default heap); young generation size adapts to the pause-time goal. Old regions are collected incrementally in mixed collections after concurrent marking.',
    },
    evidence: [E.HEAP_INFO.g1, E.GC_LOG_G1],
    references: [{ source: 'guide-gc' }, { source: 'jep-248' }, { source: 'src-g1' }],
  },
  {
    id: 'serial',
    title: 'Serial',
    flag: '-XX:+UseSerialGC',
    structure: 'contiguous',
    generational:
      'Generational: a contiguous young generation (eden and two survivor spaces) and a contiguous old generation (Tenured)',
    summary: 'Two fixed areas: young (eden, from, to) and old.',
    text: {
      simple:
        'Serial divides the heap into two fixed areas: one for new objects and one for long-lived ones. One thread does all the collecting.',
      developer:
        '`GC.heap_info` shows `DefNew` (eden, from, to) and `Tenured`. Survivors of a young collection move to the `to` space, and after enough collections to Tenured: in the log, Tenured grows from 1156K to 1345K.',
      deep: 'A single-threaded, stop-the-world copying young collector and mark-compact old collector. HotSpot selects it by default when the machine is not server-class: roughly, fewer than 2 processors or less than 1792 MB of physical memory (`os::is_server_class_machine`).',
    },
    evidence: [E.HEAP_INFO.serial, E.GC_LOG_SERIAL],
    references: [
      { source: 'guide-gc' },
      { source: 'src-serial' },
      { source: 'src-gcconfig' },
      { source: 'src-os' },
    ],
  },
  {
    id: 'parallel',
    title: 'Parallel',
    flag: '-XX:+UseParallelGC',
    structure: 'contiguous',
    generational:
      'Generational: contiguous young (eden, from, to) and old spaces, collected by many threads',
    summary: 'The same two-area layout as Serial, collected in parallel.',
    text: {
      simple: 'Like Serial, two fixed areas, but many threads clean at once to finish sooner.',
      developer:
        '`GC.heap_info` shows `PSYoungGen` and `ParOldGen`. In this run the old generation lies at lower addresses than the young one: the order is the collector’s choice.',
      deep: 'Throughput-oriented: stop-the-world, multi-threaded young and full collections.',
    },
    evidence: [E.HEAP_INFO.parallel],
    references: [{ source: 'guide-gc' }, { source: 'src-parallel' }],
  },
  {
    id: 'zgc',
    title: 'ZGC',
    flag: '-XX:+UseZGC',
    structure: 'pages',
    generational:
      'Generational (JDK 21+, the only mode since JDK 24), but with no fixed young or old address ranges',
    summary: 'Pages of several size classes; young and old are not fixed areas.',
    text: {
      simple:
        'ZGC does most of its work while the program keeps running, so pauses stay very short. It manages memory in pages rather than fixed areas.',
      developer:
        '`GC.heap_info` reports only used and capacity: there are no eden or tenured address ranges to print. In a 64 MB heap the log reports `Medium Page Size: N/A`.',
      deep: 'JEP 377 (production), JEP 439 (generational), JEP 474 (generational by default), JEP 490 (non-generational mode removed). Uses colored pointers and load barriers to relocate objects concurrently.',
    },
    evidence: [E.HEAP_INFO.zgc, E.GC_INIT],
    references: [
      { source: 'jep-377' },
      { source: 'jep-439' },
      { source: 'jep-474' },
      { source: 'jep-490' },
      { source: 'src-zgc' },
    ],
  },
  {
    id: 'shenandoah',
    title: 'Shenandoah',
    flag: '-XX:+UseShenandoahGC',
    structure: 'regions',
    generational:
      'Single generation by default; a generational mode is a product option in JDK 25 (JEP 521)',
    summary: 'Equal regions (256 × 256 KB in a 64 MB heap), one generation by default.',
    text: {
      simple:
        'Shenandoah also splits the heap into regions and moves objects while the program runs. By default it does not separate young and old objects.',
      developer:
        '`GC.heap_info`: `256 x 256 K regions`; the log reports `Mode: Snapshot-At-The-Beginning (SATB)`.',
      deep: 'JEP 379 (production). Concurrent evacuation with load-reference barriers; JEP 521 made generational Shenandoah a product feature in JDK 25, selected with `-XX:ShenandoahGCMode=generational`.',
    },
    evidence: [E.HEAP_INFO.shenandoah, E.GC_INIT],
    references: [{ source: 'jep-379' }, { source: 'jep-521' }, { source: 'src-shenandoah' }],
  },
];

export interface MemoryErrorCase {
  id: string;
  message: string;
  area: MemoryAreaId;
  cause: string;
  limit: string;
  diagnose: string;
  listing: CodeListing;
}

export const MEMORY_ERRORS: MemoryErrorCase[] = [
  {
    id: 'heap',
    message: 'OutOfMemoryError: Java heap space',
    area: 'java-heap',
    cause: 'Live objects no longer fit in the heap, even after a full collection.',
    limit: '-Xmx (default: 25% of physical or container memory)',
    diagnose:
      'Take a heap dump (`-XX:+HeapDumpOnOutOfMemoryError`, or `jcmd <pid> GC.heap_dump`) and look for the largest retained objects.',
    listing: E.OOM.heap,
  },
  {
    id: 'metaspace',
    message: 'OutOfMemoryError: Metaspace',
    area: 'metaspace',
    cause: 'Class metadata exceeds the limit: usually class loaders that are never unloaded.',
    limit: '-XX:MaxMetaspaceSize (default: unlimited)',
    diagnose:
      'Compare `jcmd <pid> VM.classloader_stats` over time and find what keeps old loaders reachable.',
    listing: E.OOM.metaspace,
  },
  {
    id: 'class-space',
    message: 'OutOfMemoryError: Compressed class space',
    area: 'class-space',
    cause: 'Too many classes for the space compressed class pointers can address.',
    limit: '-XX:CompressedClassSpaceSize (default 1 GB)',
    diagnose: 'As for Metaspace: count classes and loaders; NMT shows Class space use.',
    listing: E.OOM.classSpace,
  },
  {
    id: 'direct',
    message: 'OutOfMemoryError: Cannot reserve … bytes of direct buffer memory',
    area: 'native-allocations',
    cause: 'Direct buffers still referenced add up to more than the limit.',
    limit: '-XX:MaxDirectMemorySize (default: the maximum heap size)',
    diagnose:
      'NMT category Other, and the `java.nio` buffer pool MXBean; make sure buffers are released or reused.',
    listing: E.OOM.direct,
  },
  {
    id: 'threads',
    message: 'OutOfMemoryError: unable to create native thread',
    area: 'thread-stacks',
    cause: 'The operating system refused a new thread: process limits, address space or memory.',
    limit: 'OS limits (ulimit -u, cgroups, address space) and -Xss',
    diagnose:
      'Count threads (`jcmd <pid> Thread.print`), check OS limits, use a thread pool or virtual threads.',
    listing: E.OOM.threads,
  },
  {
    id: 'stack',
    message: 'StackOverflowError',
    area: 'thread-stacks',
    cause: 'One thread needed more stack than it has: usually unbounded recursion.',
    limit: '-Xss / ThreadStackSize (1024 KB by default on Linux x64)',
    diagnose:
      'Read the repeating frames at the top of the stack trace; fix the recursion before raising -Xss.',
    listing: E.OVERFLOW_OUTPUT,
  },
];

export const WORKBENCH: {
  id: string;
  title: string;
  when: string;
  listing: CodeListing;
  references: Citation[];
}[] = [
  {
    id: 'flags',
    title: 'See the effective flags',
    when: 'Know the real heap, stack, Metaspace and code cache limits of this JVM on this machine.',
    listing: E.FLAGS_OUTPUT,
    references: [{ source: 'tool-java' }],
  },
  {
    id: 'heap-info',
    title: 'Look at the heap layout',
    when: 'Which collector, which regions or spaces, and how full they are.',
    listing: E.HEAP_INFO.g1,
    references: [{ source: 'tool-jcmd' }],
  },
  {
    id: 'gc-log',
    title: 'Read a GC log',
    when: 'Watch generations change at every collection: -Xlog:gc,gc+heap=info.',
    listing: E.GC_LOG_G1,
    references: [{ source: 'jep-158' }, { source: 'tool-java' }],
  },
  {
    id: 'histogram',
    title: 'Count objects by class',
    when: 'Which classes take the most heap right now.',
    listing: E.HISTOGRAM,
    references: [{ source: 'tool-jcmd' }, { source: 'tool-jmap' }],
  },
  {
    id: 'heap-dump',
    title: 'Take a heap dump',
    when: 'Find what keeps objects alive: open the .hprof file in a heap analyzer.',
    listing: E.HEAP_DUMP,
    references: [{ source: 'tool-jcmd' }, { source: 'tool-java' }],
  },
  {
    id: 'threads',
    title: 'Dump the threads',
    when: 'Every thread’s stack, its state and what it waits for.',
    listing: E.THREAD_PRINT,
    references: [{ source: 'tool-jcmd' }],
  },
  {
    id: 'nmt',
    title: 'Account for native memory',
    when: 'Everything the JVM itself reserved and committed, by category: start with -XX:NativeMemoryTracking=summary.',
    listing: E.NMT_SUMMARY,
    references: [{ source: 'tool-jcmd' }, { source: 'src-nmt' }],
  },
];

export type MemoryStationId = 'observatory' | 'living' | 'frames' | 'layout' | 'heap';

export const MEMORY_STATIONS: LabStation<MemoryStationId>[] = [
  {
    id: 'observatory',
    title: 'Memory observatory',
    scale: 'The whole process',
    question:
      'Which areas of memory does a running JVM use, and which ones does the specification define?',
    summary:
      'The specification’s run-time data areas, and the HotSpot structures that implement them.',
    prediction: {
      prompt:
        'Where does HotSpot (JDK 25) keep the description of a class, its methods and its constant pool?',
      options: [
        {
          id: 'heap',
          text: 'In the Java heap, next to the objects',
          correct: false,
          feedback:
            'Only the class’s `java.lang.Class` object and its static fields are in the heap. The metadata itself is in Metaspace, native memory outside the heap.',
        },
        {
          id: 'metaspace',
          text: 'In Metaspace, native memory outside the Java heap',
          correct: true,
          feedback:
            'Right. Since JDK 8 (JEP 122) class metadata lives in Metaspace. The specification’s “method area” is a logical area; Metaspace is how HotSpot implements most of it.',
        },
        {
          id: 'stack',
          text: 'On the stack of the thread that loaded the class',
          correct: false,
          feedback:
            'Stacks hold frames of method calls in progress, nothing that outlives them. Class metadata is shared by all threads.',
        },
      ],
    },
    tryIt:
      'Select an area of the specification to see the HotSpot structures that implement it, or a HotSpot structure to see what it implements. Switch to the 3D model to see both layers at once.',
    explanation: {
      simple:
        'The JVM specification describes memory in a few **logical areas**: one heap for objects, a method area for class information, and per thread a stack of method calls. A real JVM like HotSpot implements them with its own structures, plus some the specification never mentions, like the code cache.',
      developer:
        'Six run-time data areas are defined: heap, method area (with the run-time constant pools), and per thread a pc register, a JVM stack and a native method stack. In HotSpot JDK 25 they map to the Java heap (organized by the collector), Metaspace with its compressed class space, and native thread stacks. Native Memory Tracking (`-XX:NativeMemoryTracking=summary`) shows them all as categories.',
      deep: 'JVMS §2.5 defines the areas and their errors, not their layout (§2.13: public design, private implementation). HotSpot reserves the Java heap and the class space as large virtual ranges up front and commits as needed; NMT reports reserved and committed memory per category (Java Heap, Class, Thread, Code, GC, Other…). Logical areas and implementation structures do not map one to one: the method area is split between Metaspace and the heap (mirrors and statics), and the JVM stack and native method stack share one native stack.',
    },
    term: {
      glossaryId: 'metaspace',
      term: 'Metaspace',
      definition:
        'HotSpot’s native memory for class metadata, outside the Java heap; it implements most of the specification’s method area.',
    },
    check: {
      id: 'mem-observatory-check',
      kind: 'concept',
      prompt:
        'Which statement about the JVM stack and the native method stack is true for HotSpot?',
      options: [
        {
          id: 'a',
          text: 'They are two separate stacks per thread',
          correct: false,
          explanation:
            'The specification allows that, but HotSpot keeps Java and native frames on one native thread stack.',
        },
        {
          id: 'b',
          text: 'They share one native thread stack per thread',
          correct: true,
          explanation:
            'Right: one native stack per thread, holding interpreter, compiled and native frames, with guard zones.',
        },
        {
          id: 'c',
          text: 'They are both part of the Java heap',
          correct: false,
          explanation:
            'Stacks are per thread and outside the heap (virtual threads, while unmounted, are the exception).',
        },
      ],
    },
    component: 'runtime-data-areas',
    listings: [E.NMT_SUMMARY, E.FLAGS_OUTPUT],
    accuracyNote:
      'Not to scale and not a memory map: real areas differ in size by orders of magnitude and lie wherever the operating system maps them. The HotSpot layer shows JDK 25 with default flags on Linux x64; other collectors, flags and versions change it.',
    references: [
      { source: 'jvms-2.5' },
      { source: 'jvms-2.13' },
      { source: 'jep-122' },
      { source: 'src-nmt' },
    ],
  },
  {
    id: 'living',
    title: 'Living stack and heap',
    scale: 'One program',
    question: 'What happens in memory when Java runs your statements?',
    summary:
      'Step through Person p1 = new Person("Alex") and four more statements, frame by frame.',
    prediction: {
      prompt:
        'After `Person p2 = p1;` and `p2.setName("Yaksh");`, what does `p1.getName()` return?',
      options: [
        {
          id: 'alex',
          text: '"Alex": p1 still has its own Person',
          correct: false,
          feedback:
            '`p2 = p1` copies the reference, not the object. There is only one Person, and it was renamed. The real program prints `Yaksh`.',
        },
        {
          id: 'yaksh',
          text: '"Yaksh": p1 and p2 refer to the same object',
          correct: true,
          feedback:
            'Right. Both variables hold a reference to the same object, so a change through `p2` is visible through `p1`. The real program prints `p1.getName() = Yaksh`.',
        },
        {
          id: 'null',
          text: 'null: setName replaced the object',
          correct: false,
          feedback: '`setName` changes a field of the existing object; nothing is replaced.',
        },
      ],
    },
    tryIt:
      'Step through the program. Select a variable, a field or an object to light up what it refers to. Try the two-thread and recursion programs too.',
    explanation: {
      simple:
        'Variables do not contain objects: they contain **references**, like arrows to an object somewhere in the heap. Copying a variable copies the arrow. Calling a method adds a frame on top of the thread’s stack, and returning removes it. Setting a variable to `null` removes an arrow, not the object.',
      developer:
        '`p2 = p1` is `aload_1; astore_2`: one reference copied. Each call pushes a frame with its own locals (`this` is slot 0) and operand stack. An object without references is unreachable, so eligible for collection, but it stays in the heap until a collection runs; a `WeakReference` shows it in the real run.',
      deep: 'JVMS §2.6: frames with local variable arrays and operand stacks; §2.5.3: one heap shared by threads; JLS §12.6.1: reachability. The model replays the real bytecode of `Main` and `Person` (javac 25.0.4): every push, pop, local store and field write follows `javap -c`.',
    },
    term: {
      glossaryId: 'reference',
      term: 'Reference',
      definition:
        'The value a variable or field holds to find an object. Copying it copies the reference, never the object.',
    },
    check: {
      id: 'mem-living-check',
      kind: 'memory-state',
      prompt: 'Right after `p2 = null;` (both variables null), where is the Person object?',
      options: [
        {
          id: 'a',
          text: 'Gone: setting the last reference to null deletes it',
          correct: false,
          explanation:
            'Java never deletes objects on assignment. The object is still there, unreachable.',
        },
        {
          id: 'b',
          text: 'Still in the heap, unreachable, until a collection reclaims it',
          correct: true,
          explanation:
            'Right. Reachability decides eligibility; the collector decides when memory is reclaimed.',
        },
        {
          id: 'c',
          text: 'Moved to the stack of main',
          correct: false,
          explanation: 'Objects never move into frames; frames hold references.',
        },
      ],
    },
    component: 'heap',
    listings: [E.MAIN_JAVAP, E.PERSON_JAVAP, E.IDENTITY_JAVA, E.IDENTITY_OUTPUT],
    accuracyNote:
      'The specification’s model, driven by the real bytecode. HotSpot may keep values in registers, may remove allocations that do not escape (escape analysis), and decides when to collect. Objects are drawn in creation order; positions say nothing about addresses.',
    references: [
      { source: 'jvms-2.5.2' },
      { source: 'jvms-2.5.3' },
      { source: 'jvms-2.6' },
      { source: 'jls-12.6' },
    ],
  },
  {
    id: 'frames',
    title: 'Stack frame dissection',
    scale: 'One method call',
    question: 'What exactly is inside a stack frame?',
    summary:
      'Local variables, the operand stack, the link to the constant pool, and how a frame ends.',
    prediction: {
      prompt:
        '`countdown(3)` calls itself until `n` is 0. While `countdown(0)` runs, how many `n` variables exist?',
      options: [
        {
          id: 'one',
          text: 'One `n`, changed by each call',
          correct: false,
          feedback:
            'Each call has its own frame with its own local variable array, so each has its own `n`: 3, 2, 1 and 0.',
        },
        {
          id: 'four',
          text: 'Four: one in each countdown frame',
          correct: true,
          feedback: 'Right. Four frames, four slots called `n`, holding 3, 2, 1 and 0.',
        },
      ],
    },
    tryIt:
      'Choose a program and a step, then select a frame to dissect it: its slots, its operand stack, its link to the class’s constant pool and where it returns to.',
    explanation: {
      simple:
        'A frame is the workspace of one method call: boxes for its variables, a scratch pile for the values it is working on, and a note of which class’s address book it uses. Frames appear on a call and disappear on return, in reverse order.',
      developer:
        'Sizes are fixed by javac: `stack=3, locals=1` for `countdown`. `int` locals hold values; reference locals hold references. A thrown exception unwinds frames until a handler matches; too many frames and the thread gets `StackOverflowError`.',
      deep: 'JVMS §2.6: local variables (§2.6.1), operand stack (§2.6.2), dynamic linking through a reference to the run-time constant pool of the current method’s class (§2.6.3), normal and abrupt completion (§2.6.4–5). HotSpot interpreter frames add the `Method*`, the bytecode pointer, the constant pool cache and monitors; compiled frames are laid out by the JIT, with inlined callees.',
    },
    term: {
      glossaryId: 'frame',
      term: 'Frame',
      definition:
        'The workspace of one method invocation: local variables, an operand stack and a link to its class’s run-time constant pool.',
    },
    check: {
      id: 'mem-frames-check',
      kind: 'concept',
      prompt: 'What is fixed when a method is compiled, not when it runs?',
      options: [
        {
          id: 'a',
          text: 'The maximum operand stack depth and number of local slots',
          correct: true,
          explanation:
            'Right: `max_stack` and `max_locals` are in the `Code` attribute, and the verifier checks that they are respected.',
        },
        {
          id: 'b',
          text: 'The number of frames the method will need',
          correct: false,
          explanation: 'That depends on the run: recursion depth, for example.',
        },
        {
          id: 'c',
          text: 'The objects its locals will refer to',
          correct: false,
          explanation: 'Locals hold whatever references the code stores at run time.',
        },
      ],
    },
    component: 'stack-frame',
    listings: [E.COUNTDOWN_JAVAP, E.OVERFLOW_JAVA, E.OVERFLOW_OUTPUT, E.UNCAUGHT_OUTPUT],
    accuracyNote:
      'Frames are drawn as the specification describes them. HotSpot’s interpreter frames also hold the method pointer, bytecode pointer and constant pool cache; compiled frames may hold values in registers and contain inlined calls. Stack depths differ between runs as code is compiled.',
    references: [
      { source: 'jvms-2.6' },
      { source: 'jvms-2.6.1' },
      { source: 'jvms-2.6.2' },
      { source: 'jvms-2.6.3' },
      { source: 'jvms-2.6.4' },
      { source: 'jvms-2.6.5' },
      { source: 'src-frame-x86' },
    ],
  },
  {
    id: 'layout',
    title: 'Object layout laboratory',
    scale: 'One object',
    question: 'How many bytes does an object take in HotSpot, and what are they?',
    summary: 'Headers, fields, padding and arrays, measured on JDK 25 in three configurations.',
    prediction: {
      prompt: 'With JDK 25’s default flags, how big is a `Person` object with one `String` field?',
      options: [
        {
          id: '4',
          text: '4 bytes: the size of one reference',
          correct: false,
          feedback:
            'Every object also has a header: an 8-byte mark word and a 4-byte class pointer by default.',
        },
        {
          id: '16',
          text: '16 bytes: a 12-byte header and a 4-byte reference',
          correct: true,
          feedback:
            'Right. JOL and `Instrumentation.getObjectSize` both measure 16 bytes. The "Alex" string is a separate object.',
        },
        {
          id: '24',
          text: '24 bytes: the object plus its string',
          correct: false,
          feedback:
            'The field holds a reference; the string is a separate object of its own (24 bytes).',
        },
      ],
    },
    tryIt:
      'Choose an object and a configuration. Watch the header shrink with compact headers, and references grow without compressed oops. Select a band to read what it is.',
    explanation: {
      simple:
        'Every object starts with a small header the JVM uses for its own bookkeeping, then the object’s fields. Objects are rounded up to a multiple of 8 bytes, so some space is padding.',
      developer:
        'Default JDK 25 on x64: a 12-byte header (8-byte mark word, 4-byte compressed class pointer), 4-byte references, 8-byte alignment. HotSpot reorders fields to pack them (`Mixed` keeps none of its declaration order). Arrays add a 4-byte length.',
      deep: 'JVMS §2.7 mandates no object layout; all of this is HotSpot (JDK 25). The mark word holds the identity hash, GC age and lock bits (`markWord.hpp`); with `-XX:+UseCompactObjectHeaders` (JEP 519) a 22-bit class pointer moves into it. Compressed oops encode references as 32-bit offsets scaled by 8 (heaps up to 32 GB).',
    },
    term: {
      glossaryId: 'object-header',
      term: 'Object header',
      definition:
        'The bytes HotSpot puts before an object’s fields: the mark word and, unless headers are compact, the class pointer.',
    },
    check: {
      id: 'mem-layout-check',
      kind: 'concept',
      prompt: 'Which statement about object layout is guaranteed by the JVM Specification?',
      options: [
        {
          id: 'a',
          text: 'Every object has a 12-byte header',
          correct: false,
          explanation:
            'That is HotSpot’s default today; compact headers make it 8 bytes, and the specification mandates none.',
        },
        {
          id: 'b',
          text: 'Fields are stored in declaration order',
          correct: false,
          explanation: 'HotSpot reorders them (see `Mixed`).',
        },
        {
          id: 'c',
          text: 'None: the internal structure of objects is up to the implementation',
          correct: true,
          explanation:
            'Right. JVMS §2.7: the JVM does not mandate any particular internal structure for objects.',
        },
      ],
    },
    component: 'heap',
    listings: [
      E.JOL_DEFAULT,
      E.JOL_COMPACT,
      E.JOL_NO_COOPS,
      E.JOL_MIXED,
      E.JOL_ARRAYS,
      E.SIZES_OUTPUT,
      E.MARK_WORD_SOURCE,
    ],
    accuracyNote:
      'Configuration-qualified HotSpot measurements (OpenJDK 25.0.4, x64, JOL 0.17 and Instrumentation.getObjectSize). Array elements and trailing padding are derived from JOL’s measured array base offset and element size, and match the measured total. Other JVMs, versions, platforms and flags give different layouts.',
    references: [
      { source: 'jvms-2.7' },
      { source: 'src-markword' },
      { source: 'jep-519' },
      { source: 'tool-jol' },
      { source: 'api-instrumentation-size' },
    ],
  },
  {
    id: 'heap',
    title: 'Heap and native memory',
    scale: 'The process, by collector',
    question:
      'How is the heap organized, what lives outside it, and what does each OutOfMemoryError mean?',
    summary:
      'Collectors compared, memory outside the heap, six memory errors and a diagnostic workbench.',
    prediction: {
      prompt:
        'Does every HotSpot collector divide the heap into a young and an old generation at fixed addresses?',
      options: [
        {
          id: 'yes',
          text: 'Yes: eden, survivor and old are always separate areas',
          correct: false,
          feedback:
            'Only Serial and Parallel use contiguous young and old spaces. G1 assigns roles to regions; ZGC has no fixed young or old address ranges; Shenandoah is single-generation by default.',
        },
        {
          id: 'no',
          text: 'No: it depends on the collector',
          correct: true,
          feedback:
            'Right. Compare `GC.heap_info` for each collector: DefNew/Tenured, PSYoungGen/ParOldGen, G1 regions, ZGC pages, Shenandoah regions.',
        },
      ],
    },
    tryIt:
      'Choose a collector to see its heap, then open the memory outside the heap, the six memory errors and the workbench of diagnostic commands.',
    explanation: {
      simple:
        'How the heap is organized depends on which garbage collector the JVM uses. And a Java process uses plenty of memory outside the heap: class data, compiled code, thread stacks, the collector’s bookkeeping and direct buffers. Each kind can run out in its own way.',
      developer:
        'The total footprint is far more than `-Xmx`: NMT shows the heap next to Class, Thread, Code, GC and Other. Each `OutOfMemoryError` names the area that ran out; the fix differs for each.',
      deep: 'Collector choice changes structure, barriers and pause behaviour (HotSpot GC tuning guide, JDK 25). Native categories are HotSpot-specific (NMT). Direct memory is limited by `MaxDirectMemorySize` and accounted by `java.nio.Bits`; JNI allocations are invisible to the JVM.',
    },
    term: {
      glossaryId: 'native-memory-tracking',
      term: 'Native Memory Tracking',
      definition:
        'A HotSpot feature that accounts for the native memory the JVM itself uses, by category, enabled with -XX:NativeMemoryTracking.',
    },
    check: {
      id: 'mem-heap-check',
      kind: 'concept',
      prompt: 'A service with `-Xmx2g` uses 3 GB of memory. What is the most likely explanation?',
      options: [
        {
          id: 'a',
          text: 'The heap ignores -Xmx',
          correct: false,
          explanation: '`-Xmx` does bound the Java heap.',
        },
        {
          id: 'b',
          text: 'Memory outside the heap: Metaspace, thread stacks, code cache, GC structures, direct buffers',
          correct: true,
          explanation: 'Right. Native Memory Tracking accounts for each category the JVM manages.',
        },
        {
          id: 'c',
          text: 'Objects are counted twice',
          correct: false,
          explanation: 'No: the rest is genuinely native memory.',
        },
      ],
    },
    component: 'garbage-collector',
    listings: [E.NMT_SUMMARY, E.GC_LOG_G1, E.GC_LOG_SERIAL],
    accuracyNote:
      'Collector layouts are drawn from real `GC.heap_info` output with a 64 MB heap; region counts and sizes change with the heap size and machine. The drawings are schematic, not address maps.',
    references: [
      { source: 'guide-gc' },
      { source: 'tool-jcmd' },
      { source: 'src-nmt' },
      { source: 'api-bytebuffer' },
    ],
  },
];

export const MEMORY_INVESTIGATIONS: Investigation[] = [
  {
    id: 'references-not-addresses',
    group: 'References and objects',
    title: 'A reference is not an address',
    question: 'What does a variable of a class type actually hold?',
    body: {
      simple:
        'A reference: something the JVM can use to find the object. It is not the object, and it need not be its address.',
      developer:
        'With compressed oops (the default for heaps below 32 GB) a reference field takes 4 bytes; with `-XX:-UseCompressedOops` 8 bytes, as JOL shows for `Person.name`.',
      deep: 'JVMS §2.2–2.4 define reference values abstractly. HotSpot stores compressed oops as 32-bit offsets scaled by 8 from the heap base; moving collectors change addresses while references stay valid.',
    },
    listings: [E.JOL_DEFAULT, E.JOL_NO_COOPS],
    references: [{ source: 'jvms-2.7' }, { source: 'src-markword' }],
  },
  {
    id: 'reachability',
    group: 'References and objects',
    title: 'Unreachable is not reclaimed',
    question: 'Does `p = null` free memory?',
    body: {
      simple:
        'No. It removes one reference. The object stays until a collection decides to reclaim it.',
      developer:
        'The real program: after both variables are null, a `WeakReference` still finds the object; after `System.gc()` it is cleared.',
      deep: 'JLS §12.6.1 defines reachability; when collections run is the collector’s decision, and `System.gc()` is only a request.',
    },
    listings: [E.IDENTITY_JAVA, E.IDENTITY_OUTPUT],
    references: [{ source: 'jls-12.6' }, { source: 'api-java-lang-ref' }],
  },
  {
    id: 'stack-overflow',
    group: 'Stacks and frames',
    title: 'StackOverflowError',
    question: 'How deep can a thread’s stack go?',
    body: {
      simple:
        'It depends on the stack size and on how big each frame is. With the default size, about 22,000 calls of a tiny method in our runs.',
      developer:
        '`-Xss256k` cut the depth to 2470 frames. The trace shows at most 1024 frames (`MaxJavaStackTraceDepth`).',
      deep: 'HotSpot’s guard zones (`stackOverflow.hpp`) make the overflow a `StackOverflowError` rather than a crash; depth varies as methods are JIT-compiled and frames change size.',
    },
    listings: [E.OVERFLOW_JAVA, E.OVERFLOW_OUTPUT, E.UNCAUGHT_OUTPUT],
    references: [
      { source: 'jvms-2.5.2' },
      { source: 'src-stackoverflow' },
      { source: 'tool-java' },
    ],
  },
  {
    id: 'threads',
    group: 'Stacks and frames',
    title: 'Threads share the heap, not their stacks',
    question: 'What does a new thread get of its own?',
    body: {
      simple: 'Its own stack (and pc register). Everything in the heap is shared.',
      developer:
        'The worker’s stack shows `Renamer.run` and `Thread.run`; main sees the worker’s change once `join()` returns.',
      deep: 'JVMS §2.5.1–2.5.2 (per thread), §2.5.3 (shared); JLS §17.4.5: `join` gives the happens-before edge that makes the write visible.',
    },
    listings: [E.TWO_THREADS_OUTPUT, E.THREAD_PRINT],
    references: [{ source: 'jvms-2.5.2' }, { source: 'api-stackwalker' }, { source: 'tool-jcmd' }],
  },
  {
    id: 'mark-word',
    group: 'Object layout',
    title: 'Inside the mark word',
    question: 'What does HotSpot store in the 8-byte mark word?',
    body: {
      simple:
        'The object’s identity hash code, its age (how many collections it survived) and lock bits.',
      developer:
        'The JOL value `0x…01` is an unlocked object with no hash yet; with compact headers part of the word holds the class pointer.',
      deep: 'From `markWord.hpp` (jdk-25-ga): 64-bit layout `unused:22 hash:31 unused_gap:4 age:4 self-fwd:1 lock:2`; with compact headers the top 22 bits are the narrow class pointer.',
    },
    listings: [E.MARK_WORD_SOURCE, E.JOL_COMPACT],
    references: [{ source: 'src-markword' }, { source: 'jep-519' }],
  },
  {
    id: 'compressed-class-pointers',
    group: 'Object layout',
    title: 'Compressed class pointers',
    question: 'Why can the class pointer be 4 bytes?',
    body: {
      simple:
        'Because class descriptions live in a reserved region, a short number is enough to find one.',
      developer:
        'Turning compressed class pointers off is deprecated in JDK 25: the JVM warns, and disables the CDS archive.',
      deep: 'Narrow `Klass*` values index the compressed class space (`compressedKlass.hpp`); compact headers shrink them to 22 bits inside the mark word.',
    },
    listings: [E.NO_CCP_WARNING],
    references: [{ source: 'src-compressedklass' }, { source: 'jep-519' }],
  },
  {
    id: 'generations',
    group: 'Heap and collectors',
    title: 'Watching objects move between generations',
    question: 'How do survivors reach the old generation?',
    body: {
      simple:
        'New objects start young. Each collection copies the few survivors; after a few, they are promoted to the old area.',
      developer:
        'In the Serial log, GC(6) promotes: Tenured grows from 1156K to 1345K. In the G1 log, survivor regions go from 1 to 2.',
      deep: 'Promotion is collector-specific: Serial and Parallel age objects in survivor spaces up to a tenuring threshold; G1 evacuates regions; ZGC and Shenandoah differ again.',
    },
    listings: [E.GC_LOG_SERIAL, E.GC_LOG_G1],
    references: [{ source: 'guide-gc' }, { source: 'jep-158' }],
  },
];

export const MEMORY_QUIZ: Quiz = {
  id: 'lab:memory',
  title: 'Check your understanding: memory',
  questions: [
    {
      id: 'q1',
      kind: 'memory-state',
      prompt: 'After `Person p2 = p1;`, how many Person objects exist?',
      options: [
        {
          id: 'a',
          text: 'One, with two references to it',
          correct: true,
          explanation: 'Assignment copies the reference.',
        },
        {
          id: 'b',
          text: 'Two',
          correct: false,
          explanation: 'No object is copied; `p1 == p2` is true.',
        },
        {
          id: 'c',
          text: 'None until a method is called',
          correct: false,
          explanation: '`new` created it earlier.',
        },
      ],
    },
    {
      id: 'q2',
      kind: 'concept',
      prompt: 'Which areas does each thread have to itself?',
      options: [
        {
          id: 'a',
          text: 'Heap and method area',
          correct: false,
          explanation: 'Those are shared by all threads.',
        },
        {
          id: 'b',
          text: 'pc register, JVM stack and native method stack',
          correct: true,
          explanation: 'JVMS §2.5.1, §2.5.2, §2.5.6.',
        },
        {
          id: 'c',
          text: 'Metaspace',
          correct: false,
          explanation: 'Shared, and HotSpot-specific.',
        },
      ],
    },
    {
      id: 'q3',
      kind: 'concept',
      prompt: 'Where are a class’s static fields in HotSpot JDK 25?',
      options: [
        {
          id: 'a',
          text: 'In Metaspace with the class metadata',
          correct: false,
          explanation: 'Since JDK 8 they are in the class’s `java.lang.Class` mirror.',
        },
        {
          id: 'b',
          text: 'In the java.lang.Class object, on the Java heap',
          correct: true,
          explanation: 'The mirror holds the static fields.',
        },
        {
          id: 'c',
          text: 'On the stack of the main thread',
          correct: false,
          explanation: 'Statics outlive any frame.',
        },
      ],
    },
    {
      id: 'q4',
      kind: 'concept',
      prompt: 'What does `OutOfMemoryError: Metaspace` most often point to?',
      options: [
        {
          id: 'a',
          text: 'Too many objects in the heap',
          correct: false,
          explanation: 'That is `Java heap space`.',
        },
        {
          id: 'b',
          text: 'Class loaders that are never unloaded',
          correct: true,
          explanation: 'Metaspace is freed per loader; leaked loaders keep all their classes.',
        },
        {
          id: 'c',
          text: 'Deep recursion',
          correct: false,
          explanation: 'That is `StackOverflowError`.',
        },
      ],
    },
    {
      id: 'q5',
      kind: 'concept',
      prompt:
        'How big is a `Person` object (one reference field) with compact object headers on JDK 25?',
      options: [
        {
          id: 'a',
          text: '8 bytes',
          correct: false,
          explanation: 'The 8-byte header plus a 4-byte reference is 12, rounded up to 16.',
        },
        {
          id: 'b',
          text: '16 bytes',
          correct: true,
          explanation: 'Measured: 8-byte header, 4-byte field, 4 bytes of alignment.',
        },
        {
          id: 'c',
          text: '24 bytes',
          correct: false,
          explanation: 'That is the size without compressed oops.',
        },
      ],
    },
  ],
};

export const MEMORY_LISTINGS: Record<string, CodeListing> = Object.fromEntries(
  Object.values(E).flatMap((value) =>
    'code' in value
      ? [[value.id, value as CodeListing]]
      : Object.values(value as Record<string, CodeListing>).map((l) => [l.id, l]),
  ),
);
