import type { ComponentId } from '@/content/jvm/ids';
import type { ChapterId } from '@/types/lesson';

/**
 * Guides: one page per question people ask about the JVM. A guide adds no new
 * technical claims. It arranges content that already exists and is verified
 * (component explanations at three levels, analogies with their limits,
 * misconceptions, specification vs HotSpot notes, examples, lesson chapters and
 * citations), so there is one source of truth for every explanation.
 */
export type TopicBlock =
  /** One component: summary, three levels, analogy, example, misconceptions, spec vs HotSpot. */
  | { kind: 'component'; id: ComponentId; heading?: string }
  /** The seven chapters of Start here, as the steps of one program's journey. */
  | { kind: 'journey' }
  /** The six regions of the explorer and what each one does. */
  | { kind: 'regions' }
  /** What the specification requires and what HotSpot chooses, side by side. */
  | { kind: 'provenance'; ids: ComponentId[] }
  /** Glossary definitions. */
  | { kind: 'terms'; heading: string; ids: string[] };

export interface Topic {
  /** URL segment under /learn/. */
  slug: string;
  /** The page's h1: the question as a reader would ask it. */
  question: string;
  /** Short title for lists, breadcrumbs and the document title. */
  title: string;
  /** Meta description: what the page answers, in one or two sentences. */
  description: string;
  blocks: TopicBlock[];
  /** The Start here chapter that teaches this, if any. */
  chapter?: ChapterId;
  /** The component to open on the JVM map. */
  explore: ComponentId;
  /** A walkthrough that shows it running. */
  scenario?: string;
  related: string[];
}

export const TOPICS: Topic[] = [
  {
    slug: 'what-is-the-jvm',
    question: 'What is the JVM?',
    title: 'What is the JVM?',
    description:
      'The Java Virtual Machine explained at three levels: what it is, what it does when a Java program runs, and how the specification differs from HotSpot, with verified examples and sources.',
    blocks: [
      { kind: 'component', id: 'jvm' },
      { kind: 'terms', heading: 'JDK, JRE and HotSpot', ids: ['jdk', 'jre', 'hotspot'] },
    ],
    chapter: 'jvm',
    explore: 'jvm',
    scenario: 'launch',
    related: ['how-the-jvm-works', 'jvm-architecture', 'hotspot-vs-jvm-specification'],
  },
  {
    slug: 'how-the-jvm-works',
    question: 'How does the JVM run a Java program?',
    title: 'How the JVM works',
    description:
      'Follow one Java program from source code through compilation, class loading, memory, execution and garbage collection, step by step, with real javac and javap output.',
    blocks: [{ kind: 'journey' }, { kind: 'component', id: 'execution-engine' }],
    chapter: 'program',
    explore: 'jvm',
    scenario: 'launch',
    related: ['what-is-the-jvm', 'what-is-bytecode', 'how-class-loading-works'],
  },
  {
    slug: 'jvm-architecture',
    question: 'What are the parts of the JVM?',
    title: 'JVM architecture',
    description:
      'The main parts of the Java Virtual Machine: class loading, the runtime data areas, the execution engine, garbage collection, the native interface and the platform beneath, and how they connect.',
    blocks: [{ kind: 'regions' }, { kind: 'component', id: 'runtime-data-areas' }],
    chapter: 'jvm',
    explore: 'jvm',
    related: ['what-is-the-jvm', 'heap-vs-stack', 'hotspot-vs-jvm-specification'],
  },
  {
    slug: 'what-is-bytecode',
    question: 'What is Java bytecode?',
    title: 'What is bytecode?',
    description:
      'What javac produces, how a class file stores bytecode and its constant pool, and how the JVM runs it, explained simply and in depth with a verified javap listing.',
    blocks: [
      { kind: 'terms', heading: 'Bytecode', ids: ['bytecode'] },
      { kind: 'component', id: 'class-file' },
    ],
    chapter: 'compiler',
    explore: 'class-file',
    related: ['how-the-jvm-works', 'interpreter-vs-jit-compiler', 'how-class-loading-works'],
  },
  {
    slug: 'how-class-loading-works',
    question: 'How does class loading work in the JVM?',
    title: 'How class loading works',
    description:
      'How the JVM finds, loads, links and initializes classes: the built-in class loaders, parent delegation and the steps defined in chapter 5 of the JVM Specification.',
    blocks: [
      { kind: 'component', id: 'class-loader-subsystem' },
      { kind: 'component', id: 'parent-delegation' },
      { kind: 'component', id: 'linking' },
      { kind: 'component', id: 'initialization' },
    ],
    chapter: 'loading',
    explore: 'class-loader-subsystem',
    scenario: 'launch',
    related: ['what-is-bytecode', 'how-the-jvm-works', 'jvm-architecture'],
  },
  {
    slug: 'heap-vs-stack',
    question: 'What is the difference between the heap and the stack?',
    title: 'Heap versus stack',
    description:
      'Where Java objects and method calls live: the shared heap, each thread’s JVM stack and its frames, references versus objects, and the misconceptions to avoid.',
    blocks: [
      { kind: 'component', id: 'heap' },
      { kind: 'component', id: 'jvm-stack' },
    ],
    chapter: 'memory',
    explore: 'runtime-data-areas',
    scenario: 'new-person',
    related: ['jvm-stack-frames', 'garbage-collection', 'jvm-architecture'],
  },
  {
    slug: 'jvm-stack-frames',
    question: 'What is a stack frame in the JVM?',
    title: 'JVM stack frames',
    description:
      'What the JVM creates for every method call: the local variable array, the operand stack and frame data, and how bytecode uses them.',
    blocks: [
      { kind: 'component', id: 'stack-frame' },
      { kind: 'component', id: 'local-variables' },
      { kind: 'component', id: 'operand-stack' },
    ],
    chapter: 'memory',
    explore: 'stack-frame',
    scenario: 'new-person',
    related: ['heap-vs-stack', 'what-is-bytecode', 'interpreter-vs-jit-compiler'],
  },
  {
    slug: 'garbage-collection',
    question: 'How does garbage collection work in the JVM?',
    title: 'Garbage collection',
    description:
      'How the JVM reclaims memory: GC roots and reachability, marking, sweeping and compaction, the difference between eligible and reclaimed objects, and HotSpot’s collectors.',
    blocks: [
      { kind: 'component', id: 'garbage-collector' },
      { kind: 'component', id: 'gc-roots' },
      { kind: 'component', id: 'collectors' },
    ],
    chapter: 'gc',
    explore: 'garbage-collector',
    scenario: 'young-gc',
    related: ['heap-vs-stack', 'hotspot-vs-jvm-specification', 'jvm-architecture'],
  },
  {
    slug: 'interpreter-vs-jit-compiler',
    question: 'What is the difference between the interpreter and the JIT compiler?',
    title: 'Interpreter versus JIT compiler',
    description:
      'How HotSpot runs bytecode: the interpreter executes it first, profiling finds hot methods, and the C1 and C2 JIT compilers turn them into machine code, with real PrintCompilation output.',
    blocks: [
      { kind: 'component', id: 'interpreter' },
      { kind: 'component', id: 'jit-compiler' },
      {
        kind: 'terms',
        heading: 'Tiers and deoptimization',
        ids: ['tiered-compilation', 'deoptimization'],
      },
    ],
    chapter: 'execution',
    explore: 'execution-engine',
    scenario: 'jit',
    related: ['what-is-bytecode', 'how-the-jvm-works', 'hotspot-vs-jvm-specification'],
  },
  {
    slug: 'hotspot-vs-jvm-specification',
    question: 'What is the difference between the JVM specification and HotSpot?',
    title: 'HotSpot versus the JVM specification',
    description:
      'What the Java Virtual Machine Specification requires and what HotSpot, the JVM in OpenJDK, chooses: the method area and Metaspace, the heap and its generations, the interpreter and the JIT.',
    blocks: [
      { kind: 'terms', heading: 'Two names to keep apart', ids: ['jvm', 'hotspot'] },
      {
        kind: 'provenance',
        ids: [
          'method-area',
          'heap',
          'interpreter',
          'jit-compiler',
          'garbage-collector',
          'class-loader-subsystem',
        ],
      },
      { kind: 'terms', heading: 'Metaspace', ids: ['metaspace'] },
    ],
    chapter: 'jvm',
    explore: 'jvm',
    related: ['what-is-the-jvm', 'jvm-architecture', 'garbage-collection'],
  },
];

export const topicBySlug = (slug: string | undefined) =>
  TOPICS.find((topic) => topic.slug === slug);
