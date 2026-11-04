import type { LeveledText } from '@/lib/levels';
import type { FrameSpec, Op, Value } from '@/simulators/memory';
import type { CodeListing } from '@/types/content';
import * as E from './memoryEvidence';

/**
 * The programs of the living stack and heap, as scripts for the memory model
 * (src/simulators/memory.ts). Each step is what the real bytecode does
 * (javap -c, javac 25.0.4); the model applies it and refuses anything the JVM
 * could not do. A unit test replays every program and checks its invariants.
 */

export interface MemoryStep {
  id: string;
  title: string;
  /** 1-based lines of the program's source to highlight. */
  lines: number[];
  /** The bytecode behind the step. */
  instruction?: string;
  ops: Op[];
  text: LeveledText;
  /** What the learner's eye should go to. */
  focus?: { kind: 'object' | 'frame' | 'reference'; id: string };
}

export interface MemoryProgram {
  id: 'core' | 'threads' | 'recursion';
  title: string;
  /** The question the program answers. */
  question: string;
  source: CodeListing;
  listings: CodeListing[];
  steps: MemoryStep[];
  /** Real output of the program, or of the program that observes it. */
  evidence: CodeListing[];
  accuracyNote: string;
}

const ref = (target: string): Value => ({ kind: 'ref', target });
const int = (value: number): Value => ({ kind: 'int', value });
const NULL: Value = { kind: 'null' };

const MAIN_FRAME: FrameSpec = {
  id: 'f-main',
  method: 'main(String[])',
  owner: 'Main',
  maxLocals: 3,
  maxStack: 3,
  locals: [
    { index: 0, name: 'args', type: 'String[]' },
    { index: 1, name: 'p1', type: 'Person' },
    { index: 2, name: 'p2', type: 'Person' },
  ],
};

const personFrame = (id: string, method: string): FrameSpec => ({
  id,
  method,
  owner: 'Person',
  maxLocals: 2,
  maxStack: 2,
  locals: [
    { index: 0, name: 'this', type: 'Person' },
    { index: 1, name: 'name', type: 'String' },
  ],
});

const CORE: MemoryProgram = {
  id: 'core',
  title: 'Two variables, one object',
  question: 'What happens in memory, statement by statement?',
  source: E.MAIN_JAVA,
  listings: [E.MAIN_JAVA, E.PERSON_JAVA, E.MAIN_JAVAP, E.PERSON_JAVAP, E.MAIN_CONSTANT_POOL],
  evidence: [E.IDENTITY_JAVA, E.IDENTITY_OUTPUT],
  accuracyNote:
    'The specification’s model, step by step: frames, local variable slots, the operand stack and the heap. HotSpot keeps the same information in its own forms (interpreter frames in the native thread stack, values in registers once code is compiled), may never allocate an object that does not escape, and decides when a collection runs. Positions on screen are not addresses.',
  steps: [
    {
      id: 'start',
      title: 'main is called',
      lines: [2],
      ops: [
        {
          op: 'allocate',
          object: { id: 'o-args', className: 'String[]', label: 'String[] (length 0)', fields: [] },
        },
        { op: 'start-thread', thread: { id: 't-main', name: 'main' } },
        { op: 'push-frame', thread: 't-main', frame: MAIN_FRAME },
        { op: 'set-local', thread: 't-main', slot: 0, value: ref('o-args') },
      ],
      text: {
        simple:
          'The program starts. The main thread gets a **frame** for `main`: a workspace with numbered boxes for its variables. `p1` and `p2` have boxes, but nothing in them yet.',
        developer:
          'A frame for `main(String[])` is pushed on the main thread’s stack. Its local variable array has three slots (`max_locals = 3`): `args`, `p1`, `p2`. Only `args` holds a value, a reference to an empty `String[]`.',
        deep: 'JVMS §2.6: a new frame is created on invocation with a local variable array and an operand stack whose sizes `max_locals = 3` and `max_stack = 3` come from the `Code` attribute. The `LocalVariableTable` (javac -g) names slots 1 and 2 only from pc 10 and 12: before that they are unassigned.',
      },
      focus: { kind: 'frame', id: 'f-main' },
    },
    {
      id: 'new',
      title: 'new Person: an object with default values',
      lines: [3],
      instruction: '0: new #7 · 3: dup',
      ops: [
        {
          op: 'allocate',
          object: {
            id: 'o-person',
            className: 'Person',
            label: 'Person',
            fields: [{ name: 'name', type: 'String' }],
          },
        },
        { op: 'push', thread: 't-main', value: ref('o-person') },
        { op: 'push', thread: 't-main', value: ref('o-person') },
      ],
      text: {
        simple:
          'A Person object appears in the **heap**, the shared memory for objects. Its `name` is empty (`null`) for now. The frame holds two copies of a **reference** to it: an arrow, not the object.',
        developer:
          '`new` allocates the object with every field at its default and pushes a reference; `dup` copies the reference. The object exists, but its constructor has not run yet.',
        deep: 'JVMS §6.5 `new`: the class is resolved (and initialized, since `new` is a trigger), memory is allocated from the heap with instance variables at their default values, and a reference to the uninitialized object is pushed. HotSpot allocates in the thread’s TLAB; the reference is a 32-bit compressed oop by default, not necessarily a raw address.',
      },
      focus: { kind: 'object', id: 'o-person' },
    },
    {
      id: 'ldc',
      title: 'ldc "Alex": a string constant',
      lines: [3],
      instruction: '4: ldc #9',
      ops: [
        {
          op: 'allocate',
          object: {
            id: 'o-alex',
            className: 'String',
            label: '"Alex"',
            root: 'literal',
            fields: [],
          },
        },
        { op: 'push', thread: 't-main', value: ref('o-alex') },
      ],
      text: {
        simple: 'The text "Alex" is an object in the heap too. The frame gets a reference to it.',
        developer:
          'String literals are objects. `ldc #9` pushes a reference to the interned `String` "Alex"; the operand stack now holds three references: `max_stack = 3` is exactly enough.',
        deep: '`#9` is a `CONSTANT_String`. On first execution it is resolved to an interned `java.lang.String` instance (JVMS §5.1, §5.4.3), which the run-time constant pool keeps reachable. The string’s characters live in a separate `byte[]` that the model does not draw.',
      },
      focus: { kind: 'object', id: 'o-alex' },
    },
    {
      id: 'init',
      title: 'invokespecial: the constructor gets its own frame',
      lines: [3],
      instruction: '6: invokespecial #11',
      ops: [
        { op: 'pop', thread: 't-main', count: 2 },
        { op: 'push-frame', thread: 't-main', frame: personFrame('f-init', 'Person(String)') },
        { op: 'set-local', thread: 't-main', slot: 0, value: ref('o-person') },
        { op: 'set-local', thread: 't-main', slot: 1, value: ref('o-alex') },
      ],
      text: {
        simple:
          'Calling the constructor creates a second frame on top of main’s. Its boxes `this` and `name` point to the new Person and to "Alex". Main waits underneath.',
        developer:
          '`invokespecial` pops the object reference and the argument and pushes a frame for `Person(String)`: slot 0 is `this`, slot 1 is `name`. One reference from `dup` stays on main’s operand stack.',
        deep: 'JVMS §6.5 `invokespecial` and §2.6: arguments are popped from the caller’s operand stack and become the new frame’s locals; `this` is local 0 of an instance method. The constructor first calls `Object.<init>` (pc 1), a frame the model does not draw.',
      },
      focus: { kind: 'frame', id: 'f-init' },
    },
    {
      id: 'putfield',
      title: 'this.name = name: the field is set',
      lines: [3],
      instruction: 'Person(String) 4: aload_0 · 5: aload_1 · 6: putfield #7',
      ops: [{ op: 'set-field', object: 'o-person', field: 'name', value: ref('o-alex') }],
      text: {
        simple: 'Inside the constructor, the Person’s `name` now points to "Alex".',
        developer:
          '`aload_0` and `aload_1` push `this` and `name`, and `putfield` stores the reference in the object’s field. Only the reference is copied; the string itself stays where it is.',
        deep: 'JVMS §6.5 `putfield`: pops the value and the object reference and sets the field, resolved through `#7 Fieldref name`. In HotSpot the field is at offset 12 of the object (after the 12-byte header), as the object layout station shows.',
      },
      focus: { kind: 'reference', id: 'ref:o-person.name' },
    },
    {
      id: 'return-init',
      title: 'return: the constructor’s frame disappears',
      lines: [3],
      instruction: 'Person(String) 9: return',
      ops: [{ op: 'pop-frame', thread: 't-main' }],
      text: {
        simple:
          'The constructor is done, so its frame is removed. The Person object stays: objects live in the heap, not in frames.',
        developer:
          'Normal completion pops the frame and main continues at pc 9. The constructor’s locals are gone; the object and the reference left on main’s operand stack are not.',
        deep: 'JVMS §2.6.4: on normal completion the current frame is discarded and control returns to the invoker. Nothing in the heap changes when a frame is popped.',
      },
      focus: { kind: 'frame', id: 'f-main' },
    },
    {
      id: 'astore',
      title: 'astore_1: p1 holds the reference',
      lines: [3],
      instruction: '9: astore_1',
      ops: [
        { op: 'pop', thread: 't-main' },
        { op: 'set-local', thread: 't-main', slot: 1, value: ref('o-person') },
      ],
      text: {
        simple: 'Now `p1` points to the Person. The first line of code is finished.',
        developer:
          '`astore_1` moves the reference from the operand stack into local slot 1, `p1`. The statement `Person p1 = new Person("Alex");` took five instructions in `main`.',
        deep: 'The verifier guaranteed that the value stored is an initialized `Person` reference (JVMS §4.10.1.9 tracks `uninitializedThis` and `uninitialized(Offset)` types until `<init>` returns).',
      },
      focus: { kind: 'reference', id: 'ref:t-main/f-main/1' },
    },
    {
      id: 'copy',
      title: 'Person p2 = p1: the reference is copied',
      lines: [4],
      instruction: '10: aload_1 · 11: astore_2',
      ops: [{ op: 'set-local', thread: 't-main', slot: 2, value: ref('o-person') }],
      text: {
        simple:
          'This does not make a second person. `p2` gets a copy of the arrow, so both variables point to the **same** object.',
        developer:
          '`aload_1` pushes the reference in `p1` and `astore_2` stores it in `p2`. There is still one Person: `p1 == p2` is `true`, as the real program prints.',
        deep: 'Reference assignment copies the reference value (JLS §4.3.1); object identity is unchanged. Two GC roots now lead to the same object.',
      },
      focus: { kind: 'object', id: 'o-person' },
    },
    {
      id: 'call',
      title: 'p2.setName("Yaksh"): a frame for setName',
      lines: [5],
      instruction: '12: aload_2 · 13: ldc #14 · 15: invokevirtual #16',
      ops: [
        {
          op: 'allocate',
          object: {
            id: 'o-yaksh',
            className: 'String',
            label: '"Yaksh"',
            root: 'literal',
            fields: [],
          },
        },
        { op: 'push-frame', thread: 't-main', frame: personFrame('f-set', 'setName(String)') },
        { op: 'set-local', thread: 't-main', slot: 0, value: ref('o-person') },
        { op: 'set-local', thread: 't-main', slot: 1, value: ref('o-yaksh') },
      ],
      text: {
        simple:
          'Calling `setName` through `p2` creates a new frame. Its `this` points to the same Person that `p1` points to.',
        developer:
          '`invokevirtual` finds `setName` in the object’s class and pushes its frame; `this` is the reference that was in `p2`.',
        deep: 'JVMS §6.5 `invokevirtual`: the method is selected from the receiver’s class (here `Person`); HotSpot does that through the vtable entry cached at resolution. The string constant `#14` is resolved and interned like "Alex".',
      },
      focus: { kind: 'frame', id: 'f-set' },
    },
    {
      id: 'mutate',
      title: 'this.name = name: the one object changes',
      lines: [5],
      instruction: 'setName 0: aload_0 · 1: aload_1 · 2: putfield #7',
      ops: [{ op: 'set-field', object: 'o-person', field: 'name', value: ref('o-yaksh') }],
      text: {
        simple:
          'The Person’s name is now "Yaksh". Since `p1` points to the same object, `p1.getName()` also gives "Yaksh".',
        developer:
          'The real program confirms it: `p1.getName() = Yaksh`. "Alex" is no longer referenced by the Person, but it stays: the string constant pool keeps literals alive.',
        deep: 'One object, many references: any change made through one reference is seen through all of them. Interned literals stay reachable from the class’s resolved constant pool entry (and the string table) for as long as the class is loaded.',
      },
      focus: { kind: 'reference', id: 'ref:o-person.name' },
    },
    {
      id: 'return-set',
      title: 'return: back in main',
      lines: [5],
      instruction: 'setName 5: return',
      ops: [{ op: 'pop-frame', thread: 't-main' }],
      text: {
        simple: 'setName is finished and its frame disappears. main continues where it left off.',
        developer: 'Normal return pops the frame; main resumes at pc 18.',
        deep: 'JVMS §2.6.4. The return address is implicit: the invoker’s frame records where it stopped (HotSpot keeps the bytecode pointer in the interpreter frame).',
      },
      focus: { kind: 'frame', id: 'f-main' },
    },
    {
      id: 'p1-null',
      title: 'p1 = null: one reference removed',
      lines: [6],
      instruction: '18: aconst_null · 19: astore_1',
      ops: [{ op: 'set-local', thread: 't-main', slot: 1, value: NULL }],
      text: {
        simple:
          '`p1` no longer points anywhere. The Person is not affected: `p2` still points to it.',
        developer:
          'Setting a variable to `null` removes one reference. It does not delete the object, and it does not free memory.',
        deep: '`aconst_null` pushes the null reference, which refers to no object (JVMS §2.4). The Person is still reachable from local slot 2.',
      },
      focus: { kind: 'object', id: 'o-person' },
    },
    {
      id: 'p2-null',
      title: 'p2 = null: no reference left',
      lines: [7],
      instruction: '20: aconst_null · 21: astore_2',
      ops: [{ op: 'set-local', thread: 't-main', slot: 2, value: NULL }],
      text: {
        simple:
          'Nothing points to the Person any more. It is still in the heap, but the program can never use it again: it is **unreachable**, so the garbage collector may reclaim it.',
        developer:
          'The object is eligible for collection, not gone. The real program shows it: a `WeakReference` still finds it right after `p2 = null`, and is cleared only after a collection.',
        deep: 'JLS §12.6.1: an object is unreachable when no chain of references from any live thread can reach it. When, or whether, a collection reclaims it is up to the collector; the JIT may even treat a variable as dead before its last assignment.',
      },
      focus: { kind: 'object', id: 'o-person' },
    },
    {
      id: 'return-main',
      title: 'main returns',
      lines: [8],
      instruction: '22: return',
      ops: [{ op: 'pop-frame', thread: 't-main' }],
      text: {
        simple:
          'main is finished, so its frame is removed too. The objects are still in the heap until a collection runs or the program ends.',
        developer:
          'With no frames left, even the `String[]` of `args` is unreachable. In this program the JVM then exits, and the whole heap goes back to the operating system at once.',
        deep: 'After `main` returns the launcher’s thread calls `DestroyJavaVM`; the JVM exits once no non-daemon threads remain. Reclamation of individual objects is never guaranteed before exit.',
      },
    },
  ],
};

const TWO_MAIN: FrameSpec = {
  id: 't2-main',
  method: 'main(String[])',
  owner: 'TwoThreads',
  maxLocals: 3,
  maxStack: 5,
  locals: [
    { index: 0, name: 'args', type: 'String[]' },
    { index: 1, name: 'shared', type: 'Person' },
    { index: 2, name: 'worker', type: 'Thread' },
  ],
};

const THREADS: MemoryProgram = {
  id: 'threads',
  title: 'Two threads, one heap',
  question: 'Do threads share objects, and what do they keep to themselves?',
  source: E.TWO_THREADS_JAVA,
  listings: [E.TWO_THREADS_JAVA],
  evidence: [E.TWO_THREADS_OUTPUT, E.THREAD_PRINT],
  accuracyNote:
    'The model draws the frames that matter: main waits inside `join()`, whose own frames are left out, and the worker’s stack shows `Thread.run`, `Thread.runWith` and `Renamer.run` as a thread dump does. The `Thread` object reaches its `Runnable` through an internal holder object, drawn as one field; values the model does not follow, such as `run`’s scoped-value bindings, show as —.',
  steps: [
    {
      id: 'start',
      title: 'main is called',
      lines: [2],
      ops: [
        {
          op: 'allocate',
          object: { id: 'o-args', className: 'String[]', label: 'String[] (length 0)', fields: [] },
        },
        { op: 'start-thread', thread: { id: 't-main', name: 'main' } },
        { op: 'push-frame', thread: 't-main', frame: TWO_MAIN },
        { op: 'set-local', thread: 't-main', slot: 0, value: ref('o-args') },
      ],
      text: {
        simple: 'One thread so far, `main`, with one frame.',
        developer: '`main(String[])` has three slots: `args`, `shared`, `worker`.',
        deep: 'JVMS §2.5.2: each thread has its own JVM stack, created with the thread.',
      },
    },
    {
      id: 'shared',
      title: 'Person shared = new Person("Alex")',
      lines: [3],
      instruction: '0: new #7 … 9: astore_1',
      ops: [
        {
          op: 'allocate',
          object: {
            id: 'o-alex',
            className: 'String',
            label: '"Alex"',
            root: 'literal',
            fields: [],
          },
        },
        {
          op: 'allocate',
          object: {
            id: 'o-person',
            className: 'Person',
            label: 'Person',
            fields: [{ name: 'name', type: 'String', value: ref('o-alex') }],
          },
        },
        { op: 'set-local', thread: 't-main', slot: 1, value: ref('o-person') },
      ],
      text: {
        simple: 'The same Person as before, created in one step this time.',
        developer: 'The two-variable program shows these five instructions one by one.',
        deep: 'Allocation, constructor frame and `astore_1`, as in the first program.',
      },
      focus: { kind: 'object', id: 'o-person' },
    },
    {
      id: 'thread-object',
      title: 'new Thread(new Renamer(shared), "worker")',
      lines: [4],
      instruction: '10: new #14 … 27: astore_2',
      ops: [
        {
          op: 'allocate',
          object: {
            id: 'o-renamer',
            className: 'Renamer',
            label: 'Renamer',
            fields: [{ name: 'target', type: 'Person', value: ref('o-person') }],
          },
        },
        {
          op: 'allocate',
          object: {
            id: 'o-worker-name',
            className: 'String',
            label: '"worker"',
            root: 'literal',
            fields: [],
          },
        },
        {
          op: 'allocate',
          object: {
            id: 'o-thread',
            className: 'Thread',
            label: 'Thread "worker"',
            fields: [{ name: 'holder.task', type: 'Runnable', value: ref('o-renamer') }],
          },
        },
        { op: 'set-local', thread: 't-main', slot: 2, value: ref('o-thread') },
      ],
      text: {
        simple:
          'A `Thread` object is just an object in the heap. It does not run anything yet. Through the `Renamer`, it can reach the shared Person.',
        developer:
          'Creating a `Thread` creates no operating-system thread. `Renamer.target` holds a second reference to the Person: the object is shared, not copied.',
        deep: '`java.lang.Thread` keeps its `Runnable` in `holder.task` (a `Thread$FieldHolder`, JDK 25). The native thread and its stack appear only at `start()`.',
      },
      focus: { kind: 'object', id: 'o-thread' },
    },
    {
      id: 'start-worker',
      title: 'worker.start(): a second stack',
      lines: [5, 6],
      instruction: '29: invokevirtual #26 (start) · 33: invokevirtual #29 (join)',
      ops: [
        { op: 'start-thread', thread: { id: 't-worker', name: 'worker' } },
        {
          op: 'push-frame',
          thread: 't-worker',
          frame: {
            id: 'w-run',
            method: 'run()',
            owner: 'java.lang.Thread',
            maxLocals: 3,
            maxStack: 3,
            locals: [
              { index: 0, name: 'this', type: 'Thread' },
              { index: 1, name: 'task', type: 'Runnable' },
              { index: 2, name: 'bindings', type: 'Object' },
            ],
          },
        },
        { op: 'set-local', thread: 't-worker', slot: 0, value: ref('o-thread') },
        { op: 'set-local', thread: 't-worker', slot: 1, value: ref('o-renamer') },
        {
          op: 'push-frame',
          thread: 't-worker',
          frame: {
            id: 'w-runwith',
            method: 'runWith(Object, Runnable)',
            owner: 'java.lang.Thread',
            maxLocals: 3,
            maxStack: 1,
            locals: [
              { index: 0, name: 'this', type: 'Thread' },
              { index: 1, name: 'bindings', type: 'Object' },
              { index: 2, name: 'task', type: 'Runnable' },
            ],
          },
        },
        { op: 'set-local', thread: 't-worker', slot: 0, value: ref('o-thread') },
        { op: 'set-local', thread: 't-worker', slot: 2, value: ref('o-renamer') },
        {
          op: 'push-frame',
          thread: 't-worker',
          frame: {
            id: 'w-renamer',
            method: 'run()',
            owner: 'Renamer',
            maxLocals: 1,
            maxStack: 2,
            locals: [{ index: 0, name: 'this', type: 'Renamer' }],
          },
        },
        { op: 'set-local', thread: 't-worker', slot: 0, value: ref('o-renamer') },
        { op: 'thread-status', thread: 't-main', status: 'waiting' },
      ],
      text: {
        simple:
          'Now a real second thread runs, with a stack of its own. Main waits for it. Both threads see the same heap.',
        developer:
          '`start()` creates the native thread, which runs `Thread.run`, then `runWith`, then your `Renamer.run`: the same frames a thread dump shows. Main calls `join()` and waits.',
        deep: 'JVMS §2.5.2: a JVM stack per thread; §2.5.3: one heap shared by all threads. In HotSpot each Java thread is a native thread with one native stack holding both Java and native frames, sized by `-Xss` (1 MB by default here).',
      },
      focus: { kind: 'frame', id: 'w-renamer' },
    },
    {
      id: 'worker-set',
      title: 'The worker renames the shared Person',
      lines: [21],
      instruction: 'Renamer.run 0: aload_0 · 1: getfield #7 · 4: ldc #13 · 6: invokevirtual #15',
      ops: [
        {
          op: 'allocate',
          object: {
            id: 'o-yaksh',
            className: 'String',
            label: '"Yaksh"',
            root: 'literal',
            fields: [],
          },
        },
        { op: 'push-frame', thread: 't-worker', frame: personFrame('w-set', 'setName(String)') },
        { op: 'set-local', thread: 't-worker', slot: 0, value: ref('o-person') },
        { op: 'set-local', thread: 't-worker', slot: 1, value: ref('o-yaksh') },
        { op: 'set-field', object: 'o-person', field: 'name', value: ref('o-yaksh') },
      ],
      text: {
        simple:
          'The worker calls `setName` on its own stack, but the object it changes is the same one main refers to.',
        developer:
          '`target.setName("Yaksh")` pushes a `setName` frame on the worker’s stack and writes the shared object’s field.',
        deep: 'Two threads touching one object need a happens-before edge for one to see the other’s write (JLS §17.4). Here `join()` provides it: everything the worker did happens-before `join()` returns.',
      },
      focus: { kind: 'reference', id: 'ref:o-person.name' },
    },
    {
      id: 'worker-done',
      title: 'The worker finishes',
      lines: [23],
      ops: [
        { op: 'pop-frame', thread: 't-worker' },
        { op: 'pop-frame', thread: 't-worker' },
        { op: 'pop-frame', thread: 't-worker' },
        { op: 'pop-frame', thread: 't-worker' },
        { op: 'thread-status', thread: 't-worker', status: 'terminated' },
        { op: 'thread-status', thread: 't-main', status: 'running' },
      ],
      text: {
        simple: 'The worker’s frames are gone and the thread has ended. Main wakes up.',
        developer: 'All four frames return; the native thread exits and `join()` returns in main.',
        deep: 'A terminated thread has no stack, so it holds no roots. The `Thread` object itself is still referenced by main’s `worker` variable.',
      },
    },
    {
      id: 'read',
      title: 'main reads the name',
      lines: [7],
      instruction: '45: aload_1 · 46: invokevirtual #46 (getName)',
      ops: [],
      text: {
        simple:
          'main asks the Person for its name and gets "Yaksh": the object the worker changed.',
        developer: 'The real program prints `main sees: Yaksh`.',
        deep: 'Shared heap, private stacks: objects are visible to any thread that holds a reference; locals and operand stacks never are.',
      },
      focus: { kind: 'object', id: 'o-person' },
    },
  ],
};

const COUNTDOWN_MAIN: FrameSpec = {
  id: 'r-main',
  method: 'main(String[])',
  owner: 'Countdown',
  maxLocals: 1,
  maxStack: 2,
  locals: [{ index: 0, name: 'args', type: 'String[]' }],
};

const countdownFrame = (n: number): FrameSpec => ({
  id: `r-${n}`,
  method: 'countdown(int)',
  owner: 'Countdown',
  maxLocals: 1,
  maxStack: 3,
  locals: [{ index: 0, name: 'n', type: 'int' }],
});

/** The ops of countdown(n) calling countdown(n - 1): 1 and n − 1 are pushed, n − 1 is passed on. */
const callDeeper = (n: number): Op[] => [
  { op: 'push', thread: 't-main', value: int(1) },
  { op: 'push', thread: 't-main', value: int(n - 1) },
  { op: 'pop', thread: 't-main' },
  { op: 'push-frame', thread: 't-main', frame: countdownFrame(n - 1) },
  { op: 'set-local', thread: 't-main', slot: 0, value: int(n - 1) },
];

/** countdown(n) returns `result` to its caller, which holds 1 and adds it. */
const returnTo = (result: number, add: boolean): Op[] => [
  { op: 'pop-frame', thread: 't-main' },
  { op: 'push', thread: 't-main', value: int(result) },
  ...(add
    ? ([
        { op: 'pop', thread: 't-main', count: 2 },
        { op: 'push', thread: 't-main', value: int(result + 1) },
      ] as Op[])
    : []),
];

const RECURSION: MemoryProgram = {
  id: 'recursion',
  title: 'Frames that pile up',
  question: 'What does a recursive call do to the stack?',
  source: E.COUNTDOWN_JAVA,
  listings: [E.COUNTDOWN_JAVA, E.COUNTDOWN_JAVAP],
  evidence: [E.OVERFLOW_JAVA, E.OVERFLOW_OUTPUT, E.UNCAUGHT_OUTPUT],
  accuracyNote:
    'Each step groups the few instructions between two calls or returns; the operand stack shows the values those instructions leave. `System.out` is held by a static field, so it is drawn as reachable on its own. A compiled `countdown` would keep these values in registers and might not use frames this way at all.',
  steps: [
    {
      id: 'start',
      title: 'main is called',
      lines: [9],
      ops: [
        {
          op: 'allocate',
          object: { id: 'o-args', className: 'String[]', label: 'String[] (length 0)', fields: [] },
        },
        {
          op: 'allocate',
          object: {
            id: 'o-out',
            className: 'PrintStream',
            label: 'PrintStream (System.out)',
            root: 'static',
            fields: [],
          },
        },
        { op: 'start-thread', thread: { id: 't-main', name: 'main' } },
        { op: 'push-frame', thread: 't-main', frame: COUNTDOWN_MAIN },
        { op: 'set-local', thread: 't-main', slot: 0, value: ref('o-args') },
      ],
      text: {
        simple: 'One frame, for `main`.',
        developer: '`main` has one slot (`args`) and room for two values on its operand stack.',
        deep: '`main`: `max_stack = 2`, `max_locals = 1`.',
      },
    },
    {
      id: 'call-3',
      title: 'countdown(3)',
      lines: [10],
      instruction: 'main 0: getstatic #13 · 3: iconst_3 · 4: invokestatic #7',
      ops: [
        { op: 'push', thread: 't-main', value: ref('o-out') },
        { op: 'push', thread: 't-main', value: int(3) },
        { op: 'pop', thread: 't-main' },
        { op: 'push-frame', thread: 't-main', frame: countdownFrame(3) },
        { op: 'set-local', thread: 't-main', slot: 0, value: int(3) },
      ],
      text: {
        simple: 'main calls `countdown(3)`: a new frame, with its own `n`, set to 3.',
        developer:
          '`System.out` waits on main’s operand stack while `countdown` runs. The argument `3` moves from main’s operand stack into the new frame’s slot 0.',
        deep: '`invokestatic` pops the argument and creates the frame (JVMS §2.6). An `int` local holds the value itself, not a reference.',
      },
      focus: { kind: 'frame', id: 'r-3' },
    },
    {
      id: 'call-2',
      title: 'countdown(2)',
      lines: [6],
      instruction: '6: iconst_1 · 7: iload_0 · 8: iconst_1 · 9: isub · 10: invokestatic #7',
      ops: callDeeper(3),
      text: {
        simple:
          'Not 0 yet, so countdown calls itself with 2. A second countdown frame, with its own `n`.',
        developer:
          'Each call has its own frame: there are now two `n` variables, 3 and 2. The `1` waits on the caller’s operand stack for the addition.',
        deep: 'Recursion needs no special support: each invocation gets a new frame (JVMS §2.6). The `1` stays on the caller’s operand stack across the call.',
      },
      focus: { kind: 'frame', id: 'r-2' },
    },
    {
      id: 'call-1',
      title: 'countdown(1)',
      lines: [6],
      instruction: '6–10 again',
      ops: callDeeper(2),
      text: {
        simple: 'Again: a third frame, `n` = 1.',
        developer: 'Three countdown frames, each waiting for the one above it.',
        deep: 'Stack depth grows by one frame per call.',
      },
      focus: { kind: 'frame', id: 'r-1' },
    },
    {
      id: 'call-0',
      title: 'countdown(0)',
      lines: [6],
      instruction: '6–10 again',
      ops: callDeeper(1),
      text: {
        simple: 'A fourth frame, `n` = 0. This one will stop the recursion.',
        developer: 'Five frames now: main and four countdowns.',
        deep: 'Without the `n == 0` test, frames would keep coming until the stack ran out: `StackOverflowError` (see the evidence).',
      },
      focus: { kind: 'frame', id: 'r-0' },
    },
    {
      id: 'return-0',
      title: 'countdown(0) returns 0',
      lines: [3, 4],
      instruction: '0: iload_0 · 1: ifne 6 · 4: iconst_0 · 5: ireturn',
      ops: returnTo(0, true),
      text: {
        simple: 'The base case answers 0 and its frame disappears. The caller adds 1.',
        developer:
          '`ireturn` pops the frame and pushes `0` on the caller’s operand stack; the caller’s `iadd` makes `1`.',
        deep: 'JVMS §6.5 `ireturn`: the value is pushed onto the invoker’s operand stack and the current frame is discarded.',
      },
      focus: { kind: 'frame', id: 'r-1' },
    },
    {
      id: 'return-1',
      title: 'countdown(1) returns 1',
      lines: [6],
      instruction: '13: iadd · 14: ireturn',
      ops: returnTo(1, true),
      text: {
        simple: 'Frames unwind one by one, each adding 1.',
        developer: 'The caller now holds `2`.',
        deep: 'Unwinding mirrors the calls.',
      },
      focus: { kind: 'frame', id: 'r-2' },
    },
    {
      id: 'return-2',
      title: 'countdown(2) returns 2',
      lines: [6],
      instruction: '13: iadd · 14: ireturn',
      ops: returnTo(2, true),
      text: {
        simple: 'Back to the first countdown frame.',
        developer: 'countdown(3) now holds `3`.',
        deep: 'One frame left above main.',
      },
      focus: { kind: 'frame', id: 'r-3' },
    },
    {
      id: 'return-3',
      title: 'countdown(3) returns 3',
      lines: [10],
      instruction: '13: iadd · 14: ireturn',
      ops: returnTo(3, false),
      text: {
        simple: 'The answer, 3, arrives in main.',
        developer:
          'main’s operand stack holds `System.out` and `3`: the two arguments for `println`.',
        deep: 'Exactly `max_stack = 2` for main.',
      },
      focus: { kind: 'frame', id: 'r-main' },
    },
    {
      id: 'print',
      title: 'println(3)',
      lines: [10],
      instruction: '7: invokevirtual #19 · 10: return',
      ops: [
        { op: 'pop', thread: 't-main', count: 2 },
        { op: 'pop-frame', thread: 't-main' },
      ],
      text: {
        simple: 'main prints 3 and finishes. Every frame is gone.',
        developer: 'The real program prints `3`.',
        deep: 'The `println` frames (and everything below them in `PrintStream`) are left out.',
      },
    },
  ],
};

export const MEMORY_PROGRAMS: MemoryProgram[] = [CORE, THREADS, RECURSION];
export type MemoryProgramId = MemoryProgram['id'];
export const isProgramId = (value: string | null): value is MemoryProgramId =>
  MEMORY_PROGRAMS.some((p) => p.id === value);
