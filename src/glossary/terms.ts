import type { GlossaryEntry } from '@/types/content';

/**
 * Glossary. Every `[[id]]` in the content layer must resolve to an entry here
 * (enforced by tests/unit/content-integrity.test.ts).
 */
export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  // ── Toolchain and platform ───────────────────────────────────────────────
  {
    id: 'jdk',
    term: 'JDK',
    aliases: ['Java Development Kit'],
    simple:
      'The download developers install: a Java runtime plus tools such as `javac`, `javap` and `jcmd`.',
    deep: "A JDK contains a full Java runtime (the JVM and the class library as a modular runtime image) and development tools: the compiler (`javac`), disassembler (`javap`), diagnostics (`jcmd`, `jfr`), packaging (`jar`, `jlink`, `jpackage`) and more. Distributions (Oracle JDK, Eclipse Temurin, Amazon Corretto, Ubuntu's OpenJDK…) are mostly built from the same OpenJDK sources.",
    whyItExists:
      'Developers need both a runtime to run programs and tools to build, inspect and diagnose them.',
    componentId: 'build-time',
    related: ['jre', 'jvm', 'javac', 'hotspot'],
    misconception: {
      myth: 'JDK, JRE and JVM are three names for the same thing.',
      truth:
        'The [[jvm|JVM]] runs bytecode; a runtime (historically the [[jre|JRE]]) is the JVM plus the class library; the JDK adds development tools.',
    },
    references: [{ source: 'tool-javac' }],
  },
  {
    id: 'jre',
    term: 'JRE',
    aliases: ['Java Runtime Environment'],
    simple:
      'A Java runtime without the developer tools: enough to run Java programs, not to build them.',
    deep: 'Historically a separate download containing the JVM and the class library. OpenJDK stopped producing a standalone JRE with JDK 11; today runtimes are either a full JDK or a custom, smaller runtime image built with `jlink` containing only the modules an application needs.',
    whyItExists: 'End users needed to run Java programs without installing developer tools.',
    componentId: 'jvm',
    related: ['jdk', 'jvm', 'module'],
    references: [{ source: 'jep-220' }],
  },
  {
    id: 'source-code',
    term: 'Source code',
    aliases: ['source file', '.java file'],
    simple:
      'Instructions written by people in a programming language. A Java source file, such as `Hello.java`, is plain text you can read and edit.',
    deep: 'Java source code is text in the Java programming language, defined by the Java Language Specification. The compiler (`javac`) checks it against the language rules and translates it into class files; no JVM executes source text directly. Even `java Hello.java` (source-file mode) compiles the program in memory first.',
    whyItExists:
      'People need a language they can read and reason about; machines need precise instructions. Source code is the human side of that translation.',
    related: ['javac', 'class-file', 'bytecode'],
    references: [{ source: 'jep-330' }],
  },
  {
    id: 'machine-code',
    term: 'Machine code',
    aliases: ['native code'],
    simple:
      'Instructions in the language of one particular kind of processor (CPU). It is the only kind of instruction a processor can run by itself.',
    deep: 'Binary instructions for a specific instruction-set architecture, such as x86-64 or AArch64. Java bytecode is not machine code: HotSpot executes it with a template interpreter (itself machine code generated at start-up) and compiles hot methods to machine code with its JIT compilers, storing the results in the code cache. JVMS §2.13 leaves this choice to each implementation.',
    whyItExists:
      'Processors differ. Bytecode stays the same everywhere, and each JVM produces machine code for the processor it runs on.',
    related: ['interpreter', 'jit-compilation', 'code-cache', 'bytecode'],
    references: [{ source: 'jvms-2.13' }, { source: 'src-template-interpreter' }],
  },
  {
    id: 'jvm',
    term: 'JVM',
    aliases: ['Java Virtual Machine'],
    simple:
      'The engine that runs Java bytecode on a real computer, managing memory and turning bytecode into machine work.',
    deep: 'An abstract machine defined by the Java Virtual Machine Specification: the class file format, instruction set, loading/linking/initialization rules and run-time data areas. Concrete implementations such as [[hotspot|HotSpot]] or Eclipse OpenJ9 realize it with their own memory layouts, garbage collectors and compilers.',
    whyItExists:
      '"Write once, run anywhere": one compiled class file behaves the same on every operating system and CPU.',
    componentId: 'jvm',
    related: ['hotspot', 'bytecode', 'jdk'],
    references: [{ source: 'jvms-2.13' }],
  },
  {
    id: 'hotspot',
    term: 'HotSpot',
    simple:
      'The JVM that ships with OpenJDK and most Java downloads. Its name comes from finding the "hot spots" of a program and compiling them.',
    deep: "OpenJDK's JVM implementation, written mostly in C++ (`libjvm`). It provides a template interpreter, the C1 and C2 JIT compilers with tiered compilation, several garbage collectors (Serial, Parallel, G1, ZGC, Shenandoah, Epsilon), Metaspace, class data sharing and extensive diagnostics. Everything dashed in this atlas is a HotSpot (JDK 25) structure.",
    whyItExists:
      'The specification describes behaviour; somebody has to build a fast, production-quality machine that implements it.',
    componentId: 'jvm',
    related: ['jvm', 'jit-compilation', 'garbage-collection'],
    references: [{ source: 'guide-vm' }],
  },
  {
    id: 'javac',
    term: 'javac',
    simple: 'The Java compiler. It checks your `.java` files and turns them into `.class` files.',
    deep: "The JDK's compiler implements the Java Language Specification and emits class files: it attributes types, resolves overloads, checks definite assignment, erases generics and lowers language features (lambdas and string concatenation become `invokedynamic`). It performs little optimization; that is the JIT's job.",
    whyItExists: 'To separate checking and translating the language from executing it.',
    componentId: 'javac',
    related: ['bytecode', 'class-file', 'jdk'],
    references: [{ source: 'tool-javac' }],
  },
  {
    id: 'bytecode',
    term: 'Bytecode',
    simple:
      'The compact instruction language inside `.class` files, designed for the JVM rather than for any particular CPU.',
    developer:
      'Each method in a class file is a list of bytecode instructions such as `getstatic`, `ldc`, `iadd`, `invokevirtual` and `return`; `javap -c Hello` prints them. Bytecode works on a small stack per method call (the operand stack) rather than on processor registers, which is one reason the same class file runs on every platform.',
    deep: 'The JVM instruction set (JVMS Chapter 6): one-byte opcodes such as `new` (0xbb), `dup` (0x59) and `invokespecial` (0xb7), followed by operands that are often indexes into the [[constant-pool|constant pool]]. Bytecode is a stack-machine code: instructions take operands from, and push results onto, the [[operand-stack|operand stack]].',
    whyItExists:
      'A portable, verifiable, compact format that any JVM can interpret or compile to native code.',
    componentId: 'class-file',
    related: ['class-file', 'interpreter', 'jit-compilation', 'verification'],
    misconception: {
      myth: 'The CPU executes bytecode.',
      truth:
        'CPUs execute only native machine code. Bytecode is interpreted by machine-code templates or compiled to machine code by the JIT.',
    },
    references: [{ source: 'jvms-2.11' }, { source: 'tool-javap' }],
  },
  {
    id: 'class-file',
    term: 'Class file',
    simple: 'The compiled form of one Java class: its name, fields, methods and their bytecode.',
    deep: 'The binary format of JVMS Chapter 4: magic number `0xCAFEBABE`, version (major 69 for Java 25), constant pool, access flags, this/super class, interfaces, fields, methods and attributes such as `Code`, `StackMapTable` and `LineNumberTable`.',
    whyItExists: 'A stable, documented contract between any compiler and any JVM.',
    componentId: 'class-file',
    related: ['bytecode', 'constant-pool', 'loading'],
    references: [{ source: 'jvms-4.1' }],
  },
  {
    id: 'constant-pool',
    term: 'Constant pool',
    simple:
      "A numbered table in each class file listing the names and constants the class's code uses.",
    deep: 'The `constant_pool` table of a class file (JVMS §4.4): entries such as `Class`, `Fieldref`, `Methodref`, `String`, `NameAndType`, `Utf8`, `MethodHandle` and `InvokeDynamic`. Instructions refer to entries by index (`new #7`). At run time it becomes the [[runtime-constant-pool|run-time constant pool]].',
    whyItExists:
      'Sharing names and constants in one table keeps bytecode small and lets references stay symbolic until run time.',
    componentId: 'class-file',
    related: ['runtime-constant-pool', 'symbolic-reference', 'resolution'],
    references: [{ source: 'jvms-4.4' }],
  },
  {
    id: 'runtime-constant-pool',
    term: 'Run-time constant pool',
    simple:
      "The in-memory version of a class's constant table. When code first uses an entry, the JVM looks up what it refers to and remembers the answer.",
    deep: "A per-class run-time data area (JVMS §2.5.5, §5.1) created from the class file's constant pool when the class is created. Its symbolic references are replaced by direct references through [[resolution]]. HotSpot: a `ConstantPool` in Metaspace plus a constant pool cache of resolved entries.",
    whyItExists:
      'To support late binding: code is linked to classes and methods only when it actually runs.',
    componentId: 'runtime-constant-pool',
    related: ['constant-pool', 'resolution', 'dynamic-linking', 'method-area'],
    references: [{ source: 'jvms-2.5.5' }, { source: 'jvms-5.1' }],
  },
  {
    id: 'symbolic-reference',
    term: 'Symbolic reference',
    simple: 'A reference by name ("the class called Person") instead of by location.',
    deep: 'A constant pool entry that names a class, field, method, method type, method handle or dynamically-computed constant by strings and descriptors, e.g. `Person.getName:()Ljava/lang/String;`. Resolution turns it into a direct reference such as a class pointer, field offset or vtable index.',
    whyItExists:
      'Classes can be compiled separately and evolve independently, as long as the names they use still exist at run time.',
    componentId: 'resolution',
    related: ['resolution', 'constant-pool', 'runtime-constant-pool'],
    references: [{ source: 'jvms-5.1' }],
  },

  // ── Class loading ────────────────────────────────────────────────────────
  {
    id: 'class-loader',
    term: 'Class loader',
    simple:
      'A part of the JVM, or a Java object, that finds the bytes of a class and hands them to the JVM.',
    deep: "Either the built-in bootstrap loader or an instance of `java.lang.ClassLoader`. A loader that calls `defineClass` becomes the class's [[defining-loader|defining loader]]; a run-time class is identified by its name together with that loader. Loaders delegate to each other ([[parent-delegation]]).",
    whyItExists:
      'To load classes from anywhere (files, JARs, modules, networks, memory) and to isolate groups of classes from each other.',
    componentId: 'class-loader-subsystem',
    related: [
      'bootstrap-class-loader',
      'platform-class-loader',
      'application-class-loader',
      'parent-delegation',
      'loading',
    ],
    references: [{ source: 'api-classloader' }, { source: 'jvms-5.3' }],
  },
  {
    id: 'bootstrap-class-loader',
    term: 'Bootstrap class loader',
    simple:
      "The JVM's built-in loader for the core classes such as `Object` and `String`. Java code sees it as `null`.",
    deep: 'Supplied by the JVM itself (JVMS §5.3.1), it defines the classes of the boot modules (`java.base`, `java.logging`, `java.xml`, …) from the runtime image and the CDS archive. `String.class.getClassLoader()` returns `null` to represent it.',
    whyItExists: 'Someone has to load the classes that class loaders themselves are made of.',
    componentId: 'bootstrap-loader',
    related: ['class-loader', 'platform-class-loader', 'cds', 'jimage'],
    references: [{ source: 'jvms-5.3.1' }, { source: 'src-module-loader-map' }],
  },
  {
    id: 'platform-class-loader',
    term: 'Platform class loader',
    simple:
      'The loader for parts of the Java platform that are not core, such as the database API `java.sql`.',
    deep: 'Introduced in JDK 9 (replacing the extension loader), returned by `ClassLoader.getPlatformClassLoader()`. In JDK 25 it defines modules such as `java.sql`, `java.net.http` and `java.xml.crypto`; its parent is the bootstrap loader.',
    whyItExists:
      'To load platform modules with fewer privileges than core classes, and to let them be left out of custom runtimes.',
    componentId: 'platform-loader',
    related: ['bootstrap-class-loader', 'application-class-loader', 'module'],
    references: [{ source: 'api-classloader' }, { source: 'jep-261' }],
  },
  {
    id: 'application-class-loader',
    term: 'Application class loader',
    aliases: ['System class loader'],
    simple: 'The loader for your own classes and the libraries on your class path.',
    deep: 'Returned by `ClassLoader.getSystemClassLoader()` (unless overridden), named `app`, with the platform loader as parent. It loads classes from `-cp` and defines application modules from `--module-path`; the launcher uses it to load the main class.',
    whyItExists: 'Applications need a default loader that knows where their classes are.',
    componentId: 'application-loader',
    related: ['platform-class-loader', 'parent-delegation', 'class-loader'],
    references: [{ source: 'api-classloader' }],
  },
  {
    id: 'parent-delegation',
    term: 'Parent delegation',
    simple:
      'The rule that a class loader asks its parent for a class before looking for it itself.',
    deep: "`ClassLoader.loadClass` checks already-loaded classes, delegates to the parent, then calls `findClass`. Since JDK 9 the built-in loaders first route a request to the loader that defines the class's module, if the package belongs to a named module; parent-first applies to the rest.",
    whyItExists:
      'To keep core classes authoritative and to give each loader a consistent view of types.',
    componentId: 'parent-delegation',
    related: ['class-loader', 'module', 'application-class-loader'],
    misconception: {
      myth: 'Loaders are always strictly parent-first.',
      truth:
        'Built-in loaders route by module first, and custom loaders (for example in web containers) may load child-first.',
    },
    references: [{ source: 'src-builtin-classloader' }, { source: 'api-classloader' }],
  },
  {
    id: 'defining-loader',
    term: 'Defining loader',
    simple:
      "The class loader that actually created a class from its bytes. It is part of the class's identity.",
    deep: 'The loader that called `defineClass` (or the bootstrap loader). Two classes with the same binary name but different defining loaders are different run-time types; the JVM uses loading constraints (JVMS §5.3.4) to keep their use consistent.',
    whyItExists:
      'Identity per loader makes isolation possible: two plugins can each have their own version of a class.',
    componentId: 'loading',
    related: ['class-loader', 'loading', 'parent-delegation'],
    misconception: {
      myth: 'Classes with the same fully qualified name are always the same class.',
      truth:
        'Only if the same loader defined them; otherwise casting between them fails with `ClassCastException`.',
    },
    references: [{ source: 'jvms-5.3' }, { source: 'jvms-5.3.4' }],
  },
  {
    id: 'initiating-loader',
    term: 'Initiating loader',
    simple:
      'The class loader the JVM asked for a class. It may hand the job to another loader, but it remembers the answer.',
    deep: 'JVMS §5.3: a loader that creates a class, by defining it or by delegating, is an initiating loader of it; the defining loader always is one. The JVM records the initiating loader when the request returns, and `ClassLoader.findLoadedClass` answers from that record. Loaders in between that only passed the request on through Java calls are not recorded (HotSpot: `SystemDictionary::load_instance_class`, JDK 25).',
    whyItExists:
      'So a second request for the same name is answered at once, and so the JVM can check loading constraints for every loader that uses a name.',
    componentId: 'parent-delegation',
    related: ['defining-loader', 'parent-delegation', 'loading-constraint'],
    misconception: {
      myth: 'Every loader a request passes through remembers the class.',
      truth:
        'Only the loader the JVM asked and the defining loader record it; a loader that just delegated has no record of it.',
    },
    references: [
      { source: 'jvms-5.3' },
      { source: 'api-classloader' },
      { source: 'src-systemdictionary' },
    ],
  },
  {
    id: 'loading-constraint',
    term: 'Loading constraint',
    simple:
      'A promise the JVM makes two class loaders keep: when they share a method or field, a type name in its signature must mean the same class to both.',
    deep: 'JVMS §5.3.4: when code defined by loader L1 resolves a field or method declared by a class of loader L2, every class type N in the descriptor gets the constraint N^L1 = N^L2. If both loaders already have a class for N and they differ, resolution fails with `LinkageError: loader constraint violation`; otherwise the constraint is recorded and enforced when either loader loads N later.',
    whyItExists:
      'Without it, two loaders could pass an object across a method call while disagreeing about its class, which would break type safety.',
    componentId: 'parent-delegation',
    related: ['defining-loader', 'initiating-loader', 'resolution'],
    misconception: {
      myth: 'Two classes with the same name in two loaders always fail when they meet.',
      truth:
        'They are different classes, so a cast between them fails, but nothing stops them existing side by side. A loading constraint fails only when a shared signature would make the two loaders disagree.',
    },
    references: [{ source: 'jvms-5.3.4' }, { source: 'src-systemdictionary' }],
  },
  {
    id: 'module',
    term: 'Module',
    simple:
      'A named group of Java packages that declares what it needs and what it shares, like `java.base` or `java.sql`.',
    deep: 'Introduced by the Java Platform Module System (JDK 9, JEP 261). A module has a `module-info` descriptor with `requires`, `exports` and other directives. Every package belongs to at most one module in a layer, and each module is defined to one class loader; classes on the class path form the unnamed module.',
    whyItExists:
      'Strong encapsulation and reliable configuration for the JDK and for large applications.',
    componentId: 'parent-delegation',
    related: ['platform-class-loader', 'jimage', 'parent-delegation'],
    references: [{ source: 'jep-261' }, { source: 'jvms-5.3.6' }],
  },
  {
    id: 'jimage',
    term: 'jimage (lib/modules)',
    simple: "The single file in a modern JDK that contains all the platform's classes.",
    deep: 'The runtime image format introduced in JDK 9 (JEP 220): `lib/modules` stores the classes and resources of all modules in the runtime, replacing `rt.jar`. The bootstrap loader reads from it through `libjimage`.',
    whyItExists: 'Faster lookup and a modular, linkable runtime layout.',
    componentId: 'bootstrap-loader',
    related: ['module', 'bootstrap-class-loader', 'cds'],
    references: [{ source: 'jep-220' }],
  },
  {
    id: 'cds',
    term: 'Class data sharing (CDS)',
    simple:
      'A start-up shortcut: the JVM maps pre-processed core classes from an archive file instead of loading them one by one.',
    deep: 'HotSpot can store parsed and verified class metadata (and some heap objects) in an archive that is memory-mapped at start-up and shareable between processes. A default archive for JDK classes ships with the JDK (JEP 341) — "source: shared objects file" in `-Xlog:class+load`. JDK 24 and 25 extend this into an ahead-of-time cache that also stores linked classes and method profiles (JEP 483, 515).',
    whyItExists:
      'Start-up time and memory: loading hundreds of classes from scratch on every launch is wasteful.',
    componentId: 'bootstrap-loader',
    related: ['bootstrap-class-loader', 'loading', 'jimage'],
    references: [{ source: 'jep-341' }, { source: 'jep-483' }],
  },
  {
    id: 'loading',
    term: 'Loading',
    simple:
      'The first step in using a class: find its compiled bytes and build an internal description of it.',
    deep: 'JVMS §5.3: creating a class from a binary representation. It checks the class file format and version, loads superclasses and superinterfaces, and records the defining loader. HotSpot builds an `InstanceKlass` in Metaspace and a `java.lang.Class` mirror in the heap.',
    whyItExists: 'Classes are needed on demand and can come from many sources.',
    componentId: 'loading',
    related: ['linking', 'initialization', 'class-loader', 'defining-loader'],
    misconception: {
      myth: 'Loading a class runs its static initializer.',
      truth: '[[initialization|Initialization]] is a separate, later step with its own triggers.',
    },
    references: [{ source: 'jvms-5.3' }],
  },
  {
    id: 'linking',
    term: 'Linking',
    simple:
      'Getting a loaded class ready: check it, set up its static fields, and connect its names to real classes and methods.',
    deep: 'JVMS §5.4: [[verification]], [[preparation]] and (possibly lazy) [[resolution]] of symbolic references. Errors from resolution must be reported where the reference is used, which is why HotSpot can resolve lazily.',
    whyItExists: 'To make sure a class is safe and complete before its code runs.',
    componentId: 'linking',
    related: ['verification', 'preparation', 'resolution', 'loading'],
    references: [{ source: 'jvms-5.4' }],
  },
  {
    id: 'verification',
    term: 'Verification',
    simple: "A safety check of a class's bytecode before it may run.",
    deep: 'JVMS §4.10, §5.4.1: the type-checking verifier uses `StackMapTable` frames to prove, method by method, that instructions get operands of the right types, the operand stack stays within bounds, objects are initialized before use and control flow stays inside the method. Failure throws `VerifyError`.',
    whyItExists:
      'Bytecode can come from anywhere; verification lets the JVM run it fast without checking every instruction at run time.',
    componentId: 'verification',
    related: ['linking', 'bytecode', 'operand-stack'],
    references: [{ source: 'jvms-4.10' }, { source: 'jvms-5.4.1' }],
  },
  {
    id: 'preparation',
    term: 'Preparation',
    simple:
      'Reserving the static variables of a class and setting them to defaults: 0, false or null.',
    deep: 'JVMS §5.4.2: creates the static fields of a class and initializes them to default values without executing any code. Explicit initial values are assigned later, during initialization.',
    whyItExists: 'So every static field has a defined value before any code can observe it.',
    componentId: 'preparation',
    related: ['linking', 'initialization', 'clinit'],
    references: [{ source: 'jvms-5.4.2' }],
  },
  {
    id: 'resolution',
    term: 'Resolution',
    simple: 'Looking up what a name in the bytecode really refers to, the first time it is used.',
    deep: 'JVMS §5.4.3: determining concrete values from symbolic references in the run-time constant pool, loading classes as needed and checking access. The result is cached; HotSpot resolves lazily at first execution and records the outcome in the constant pool cache.',
    whyItExists:
      'Late binding lets classes be compiled separately and lets the JVM load only what is used.',
    componentId: 'resolution',
    related: ['symbolic-reference', 'runtime-constant-pool', 'linking'],
    references: [{ source: 'jvms-5.4.3' }],
  },
  {
    id: 'initialization',
    term: 'Initialization (class)',
    simple: "Running a class's static setup code, once, the first time the class is really used.",
    deep: 'JVMS §5.5, JLS §12.4: executing the class initialization method `<clinit>` under an initialization lock, after initializing the superclass. Triggers include `new`, static field access and static method calls on the class.',
    whyItExists:
      'Static state must be set up exactly once, at a predictable time, safely across threads.',
    componentId: 'initialization',
    related: ['clinit', 'preparation', 'loading'],
    misconception: {
      myth: 'Static initializers run when the program starts.',
      truth: "They run at the class's first active use, which may be late in the program or never.",
    },
    references: [{ source: 'jvms-5.5' }, { source: 'jls-12.4.1' }],
  },
  {
    id: 'clinit',
    term: '<clinit>',
    aliases: ['class initialization method'],
    simple:
      "The hidden method the compiler builds from a class's static blocks and static field initializers.",
    deep: 'A static, argument-less method named `<clinit>` (JVMS §2.9.2) containing static field initializers and `static {}` blocks in textual order. Only the JVM can invoke it, during [[initialization]]. Classes without static initialization code have none.',
    whyItExists:
      'It gives static initialization ordinary bytecode that the JVM can run under its initialization rules.',
    componentId: 'initialization',
    related: ['initialization', 'init-method', 'preparation'],
    references: [{ source: 'jvms-2.9' }],
  },
  {
    id: 'init-method',
    term: '<init>',
    aliases: ['instance initialization method', 'constructor'],
    simple: 'The bytecode name of a constructor.',
    deep: 'Constructors compile to methods named `<init>` (JVMS §2.9.1), invoked only with `invokespecial` on a freshly created, uninitialized object. Every `<init>` first calls a superclass (or another) `<init>`, as `Person.<init>` calls `Object.<init>`.',
    whyItExists:
      'It separates allocation (`new`) from construction, while the verifier guarantees objects are initialized before use.',
    related: ['clinit', 'bytecode', 'verification'],
    references: [{ source: 'jvms-2.9' }, { source: 'jvms-6.5-invokespecial' }],
  },
  {
    id: 'class-unloading',
    term: 'Class unloading',
    simple:
      'Removing classes from memory, possible only together with the class loader that loaded them.',
    deep: 'JLS §12.7 permits unloading a class only when its defining loader is reclaimable by the GC; bootstrap classes are never unloaded. HotSpot unloads during garbage collection, per `ClassLoaderData`.',
    whyItExists:
      'Long-running programs that load code dynamically must eventually free the metadata of code no longer used.',
    componentId: 'unloading',
    related: ['class-loader', 'metaspace', 'garbage-collection'],
    references: [{ source: 'jls-12.7' }],
  },
  {
    id: 'hidden-class',
    term: 'Hidden class',
    simple:
      'A class created at run time that no other code can refer to by name, used behind the scenes for lambdas and frameworks.',
    deep: 'Defined with `MethodHandles.Lookup.defineHiddenClass` (JDK 15, JEP 371). Hidden classes are not discoverable through class loaders, can be unloaded independently of their loader, and are what the JDK generates to implement lambda expressions.',
    whyItExists:
      'Frameworks and language runtimes need to generate classes cheaply and safely without polluting the class namespace.',
    componentId: 'custom-loaders',
    related: ['class-loader', 'class-unloading'],
    references: [{ source: 'jep-371' }],
  },

  // ── Runtime data areas ───────────────────────────────────────────────────
  {
    id: 'method-area',
    term: 'Method area',
    simple:
      'Where the JVM keeps what it knows about each class: methods, bytecode, fields and constants.',
    deep: 'A shared run-time data area (JVMS §2.5.4) for per-class structures. The specification calls it logically part of the heap but leaves its location and management to the implementation; in HotSpot class metadata lives in [[metaspace]].',
    whyItExists:
      'Class definitions are shared by all objects and threads, so they are stored once.',
    componentId: 'method-area',
    related: ['metaspace', 'runtime-constant-pool', 'heap'],
    references: [{ source: 'jvms-2.5.4' }],
  },
  {
    id: 'metaspace',
    term: 'Metaspace',
    simple: "HotSpot's memory for class information. It lives outside the Java heap.",
    deep: 'Native memory where HotSpot allocates class metadata (`InstanceKlass`, `Method`, `ConstMethod`, `ConstantPool`, …), per class loader. It replaced the PermGen in JDK 8 (JEP 122), grows on demand (`MaxMetaspaceSize` is unlimited by default) and is released when loaders are unloaded.',
    whyItExists:
      'Sizing a fixed PermGen inside the heap was a frequent source of `OutOfMemoryError`s.',
    componentId: 'method-area',
    related: ['method-area', 'class-unloading', 'outofmemoryerror'],
    misconception: {
      myth: 'Static fields are stored in Metaspace.',
      truth:
        'In HotSpot static field values live in the `java.lang.Class` mirror object in the Java heap.',
    },
    references: [{ source: 'jep-122' }, { source: 'src-metaspace' }],
  },
  {
    id: 'heap',
    term: 'Heap (Java heap)',
    simple:
      'The shared memory where all objects and arrays live, cleaned up automatically by the garbage collector.',
    deep: 'The run-time data area from which all class instances and arrays are allocated (JVMS §2.5.3), shared by all threads and reclaimed by automatic storage management. Its size is bounded by `-Xmx`; its layout depends on the garbage collector.',
    whyItExists:
      'Objects must outlive the method call that creates them and be shareable between threads.',
    componentId: 'heap',
    related: ['garbage-collection', 'tlab', 'young-generation', 'old-generation'],
    misconception: {
      myth: 'The Java heap is the same as the operating system heap used by `malloc`.',
      truth:
        'They are separate parts of process memory. The JVM manages the Java heap itself; native code uses the C heap.',
    },
    references: [{ source: 'jvms-2.5.3' }],
  },
  {
    id: 'compressed-class-space',
    term: 'Compressed class space',
    simple:
      'A reserved part of HotSpot’s class memory that lets every object point to its class with a short, 4-byte number.',
    deep: 'With compressed class pointers (the default in JDK 25; turning them off is deprecated), each object header holds a 32-bit narrow `Klass*`, an offset into this space. `-XX:CompressedClassSpaceSize` (1 GB by default) reserves it; filling it throws `OutOfMemoryError: Compressed class space`.',
    whyItExists: 'Smaller object headers: a 4-byte class pointer instead of 8 bytes.',
    componentId: 'method-area',
    related: ['metaspace', 'object-header', 'compressed-oops'],
    references: [{ source: 'src-compressedklass' }, { source: 'src-metaspace' }],
  },
  {
    id: 'direct-buffer',
    term: 'Direct buffer',
    simple:
      'A block of memory outside the Java heap that a Java program can read and write, used for fast input and output.',
    developer:
      '`ByteBuffer.allocateDirect(n)` creates one. The total is limited by `-XX:MaxDirectMemorySize` (by default the maximum heap size); the memory is released when the buffer object is collected.',
    deep: 'Accounted by `java.nio.Bits.reserveMemory`; exceeding the limit throws `OutOfMemoryError: Cannot reserve … bytes of direct buffer memory`. Native Memory Tracking reports it under Other.',
    whyItExists:
      'The operating system can read and write it directly, without copying through the Java heap.',
    componentId: 'native-libraries',
    related: ['heap', 'native-memory-tracking'],
    references: [{ source: 'api-bytebuffer' }, { source: 'src-bits' }],
  },
  {
    id: 'native-memory-tracking',
    term: 'Native Memory Tracking',
    aliases: ['NMT'],
    simple:
      'A HotSpot feature that counts the memory the JVM itself uses outside the Java heap, category by category.',
    developer:
      'Start the JVM with `-XX:NativeMemoryTracking=summary`, then run `jcmd <pid> VM.native_memory summary`: Java Heap, Class, Thread, Code, GC, Other and more, each reserved and committed.',
    deep: 'Implemented in `src/hotspot/share/nmt`; it tracks HotSpot’s own `malloc`, `mmap` and arena allocations with a small overhead (reported under Native Memory Tracking). Memory a native library allocates on its own is not tracked.',
    whyItExists: 'A process uses far more memory than `-Xmx`; NMT shows where the rest goes.',
    componentId: 'runtime-data-areas',
    related: ['metaspace', 'heap', 'direct-buffer'],
    references: [{ source: 'src-nmt' }, { source: 'tool-jcmd' }],
  },
  {
    id: 'tlab',
    term: 'TLAB (thread-local allocation buffer)',
    simple:
      'A private slice of the heap that each thread uses to create objects quickly without waiting for other threads.',
    deep: 'A chunk of eden assigned to one thread. Allocation inside it is a pointer bump (`top += size`) with no synchronization; when it is exhausted the thread requests a new TLAB or, for large objects, allocates outside it. TLAB sizes adapt per thread.',
    whyItExists:
      'Allocation is extremely frequent in Java; making it lock-free and cache-friendly is a large performance win.',
    componentId: 'eden',
    related: ['eden', 'heap', 'escape-analysis'],
    references: [{ source: 'src-tlab' }],
  },
  {
    id: 'young-generation',
    term: 'Young generation',
    simple: 'The part of the heap for new objects, cleaned often because most objects die young.',
    deep: 'Eden plus survivor space in generational collectors. Young collections copy the few survivors elsewhere, so their cost depends on live data. In G1 the young generation is a variable set of regions.',
    whyItExists:
      'The weak generational hypothesis: most objects become unreachable soon after allocation.',
    componentId: 'young-generation',
    related: ['eden', 'survivor-space', 'old-generation', 'g1'],
    references: [{ source: 'guide-gc' }],
  },
  {
    id: 'eden',
    term: 'Eden',
    simple: 'Where new objects are born.',
    deep: 'The allocation area of the young generation, carved into TLABs. When it is full a young collection evacuates its live objects; afterwards eden is empty.',
    whyItExists:
      'A dedicated nursery makes allocation simple and collection of short-lived objects cheap.',
    componentId: 'eden',
    related: ['tlab', 'survivor-space', 'young-generation'],
    references: [{ source: 'guide-gc' }],
  },
  {
    id: 'survivor-space',
    term: 'Survivor space',
    simple:
      'A holding area for objects that survived a young collection, until they are old enough to move on.',
    deep: 'Live young objects are copied into survivor space at each young collection and their age (4 bits in the mark word) increases; at the tenuring threshold (at most 15) they are promoted to the old generation.',
    whyItExists:
      'It filters out medium-lived objects before they reach the expensive old generation.',
    componentId: 'survivor',
    related: ['eden', 'old-generation', 'mark-word'],
    references: [{ source: 'guide-gc' }],
  },
  {
    id: 'old-generation',
    term: 'Old generation',
    simple: 'The part of the heap for long-lived objects, cleaned less often.',
    deep: 'Holds objects promoted from the young generation and (in G1) humongous objects. G1 reclaims it incrementally with mixed collections after concurrent marking; a full GC is the fallback.',
    whyItExists: 'Long-lived objects should not be copied again and again by young collections.',
    componentId: 'old-generation',
    related: ['young-generation', 'humongous-object', 'g1'],
    references: [{ source: 'guide-gc' }],
  },
  {
    id: 'g1-region',
    term: 'G1 region',
    simple: 'One of many equal-sized blocks the G1 collector divides the heap into.',
    deep: 'G1 splits the heap into equal regions (a power of two between 1 MB and 512 MB, chosen from the heap size; 2 MB in our measured run). Each region is free, eden, survivor, old or humongous at any time, and its role changes across collections.',
    whyItExists:
      'Regions let G1 collect a chosen subset of the heap, the regions with the most garbage, to meet pause-time goals.',
    componentId: 'heap',
    related: ['g1', 'humongous-object', 'young-generation'],
    references: [{ source: 'guide-gc' }, { source: 'src-g1' }],
  },
  {
    id: 'humongous-object',
    term: 'Humongous object',
    simple: 'In G1, an object so big it gets its own run of heap regions.',
    deep: 'An object of at least half a G1 region. It is allocated directly in one or more contiguous humongous regions, which belong to the old generation. Many short-lived humongous objects can hurt G1 performance.',
    whyItExists: 'Copying very large objects during young collections would be expensive.',
    componentId: 'old-generation',
    related: ['g1-region', 'old-generation', 'g1'],
    references: [{ source: 'guide-gc' }],
  },
  {
    id: 'object-header',
    term: 'Object header',
    simple: 'Hidden bookkeeping stored at the start of every object.',
    deep: 'In HotSpot JDK 25 x64 by default: an 8-byte [[mark-word|mark word]] plus a 4-byte compressed class pointer (12 bytes); arrays add a 4-byte length. With `-XX:+UseCompactObjectHeaders` (JEP 519) the header is 8 bytes.',
    whyItExists:
      "The JVM needs per-object data for locking, hashing, GC and finding the object's class.",
    componentId: 'heap',
    related: ['mark-word', 'compressed-oops', 'heap'],
    references: [{ source: 'src-markword' }, { source: 'jep-519' }, { source: 'jvms-2.7' }],
  },
  {
    id: 'mark-word',
    term: 'Mark word',
    simple: "The first part of every object's header, holding things like its hash code and age.",
    deep: 'A 64-bit word in HotSpot holding the identity hash code (31 bits), GC age (4 bits), a self-forwarded bit and 2 lock bits; with compact headers it also holds a 22-bit class pointer (`markWord.hpp`, JDK 25).',
    whyItExists: 'It packs frequently needed per-object state into one word.',
    componentId: 'heap',
    related: ['object-header', 'survivor-space'],
    references: [{ source: 'src-markword' }],
  },
  {
    id: 'compressed-oops',
    term: 'Compressed oops',
    simple: 'A memory-saving trick: object references are stored in 4 bytes instead of 8.',
    deep: 'For heaps up to about 32 GB, HotSpot stores references as 32-bit offsets scaled by the 8-byte object alignment (on by default, `UseCompressedOops`). Decoding adds the heap base. Compressed class pointers apply the same idea to class metadata pointers.',
    whyItExists: 'Smaller references mean smaller objects and better cache use.',
    componentId: 'heap',
    related: ['reference', 'object-header'],
    misconception: {
      myth: 'A Java reference is the memory address of the object.',
      truth:
        'It may be an encoded 32-bit value, and moving collectors change addresses while the program runs.',
    },
    references: [{ source: 'tool-java' }],
  },
  {
    id: 'reference',
    term: 'Reference',
    simple:
      'A value that points to an object, like `p1` pointing to a Person. Copying it copies the pointer, not the object.',
    deep: "One of the JVM's value types (JVMS §2.4): a reference to a class instance or array, or `null`. Its representation is unspecified; in HotSpot it is usually a compressed oop. Strong references keep objects reachable; `java.lang.ref` adds soft, weak and phantom references.",
    whyItExists:
      'Objects live in the heap; variables and fields need a compact way to refer to them.',
    componentId: 'local-variables',
    related: ['compressed-oops', 'reachability', 'heap'],
    references: [{ source: 'api-java-lang-ref' }, { source: 'jvms-2.7' }],
  },
  {
    id: 'jvm-stack',
    term: 'JVM stack',
    simple: "Each thread's stack of method calls; every call adds a frame on top.",
    deep: "A per-thread run-time data area (JVMS §2.5.2) storing [[frame|frames]]. Exceeding its permitted size throws `StackOverflowError`. In HotSpot it is the thread's native stack, sized with `-Xss`.",
    whyItExists:
      'Nested calls need private, short-lived storage that is released automatically on return.',
    componentId: 'jvm-stack',
    related: ['frame', 'stackoverflowerror', 'native-method-stack'],
    references: [{ source: 'jvms-2.5.2' }],
  },
  {
    id: 'frame',
    term: 'Frame',
    aliases: ['stack frame'],
    simple: 'The workspace of one method call: its local variables and a scratch stack.',
    deep: 'Created on each invocation and destroyed when it completes (JVMS §2.6): a local variable array, an operand stack and a reference to the run-time constant pool, with sizes fixed at compile time.',
    whyItExists:
      'Each invocation needs its own state, separate from other calls of the same method.',
    componentId: 'stack-frame',
    related: ['local-variable-array', 'operand-stack', 'dynamic-linking', 'jvm-stack'],
    references: [{ source: 'jvms-2.6' }],
  },
  {
    id: 'local-variable-array',
    term: 'Local variable array',
    simple: "The numbered slots holding a method's parameters and local variables.",
    deep: 'JVMS §2.6.1: indexed from 0, sized by `max_locals`; slot 0 is `this` in instance methods; `long` and `double` take two slots. Accessed with `iload`, `astore` and similar instructions.',
    whyItExists: 'Fast, indexed storage that the verifier can type-check.',
    componentId: 'local-variables',
    related: ['frame', 'operand-stack', 'reference'],
    references: [{ source: 'jvms-2.6.1' }],
  },
  {
    id: 'operand-stack',
    term: 'Operand stack',
    simple: 'A small scratch stack in each frame where the JVM puts values while computing.',
    deep: 'JVMS §2.6.2: a LIFO stack with a maximum depth (`max_stack`) fixed at compile time. Instructions pop operands and push results; method calls pop their arguments from it.',
    whyItExists:
      'A stack machine needs no register names, which keeps bytecode compact and portable.',
    componentId: 'operand-stack',
    related: ['frame', 'bytecode', 'local-variable-array'],
    misconception: {
      myth: 'Compiled Java code still pushes and pops an operand stack.',
      truth: 'The JIT maps stack slots to CPU registers; the operand stack is a model.',
    },
    references: [{ source: 'jvms-2.6.2' }],
  },
  {
    id: 'dynamic-linking',
    term: 'Dynamic linking',
    simple:
      "Each frame knows which class's constant table to use, so names in its code can be looked up while running.",
    deep: "JVMS §2.6.3: every frame contains a reference to the run-time constant pool of the current method's class, so that symbolic references in its code can be resolved and their results used (in HotSpot via the constant pool cache).",
    whyItExists: 'Method and field references are bound at run time, not at compile time.',
    componentId: 'frame-data',
    related: ['runtime-constant-pool', 'resolution', 'frame'],
    references: [{ source: 'jvms-2.6.3' }],
  },
  {
    id: 'pc-register',
    term: 'PC register',
    aliases: ['program counter'],
    simple: "Each thread's bookmark: which bytecode instruction it is executing.",
    deep: "JVMS §2.5.1: per-thread, holding the address of the current JVM instruction, undefined while a native method runs. HotSpot's interpreter keeps a bytecode pointer in a register (`r13` on x86-64); compiled code uses the hardware pc.",
    whyItExists: 'A thread must know where to continue after a call or a context switch.',
    componentId: 'pc-register',
    related: ['interpreter', 'frame'],
    references: [{ source: 'jvms-2.5.1' }],
  },
  {
    id: 'native-method-stack',
    term: 'Native method stack',
    simple: 'Stack space for native (C/C++) code called from Java.',
    deep: 'JVMS §2.5.6: optional per-thread "C stacks" for native methods. HotSpot uses one native stack per thread for both Java and native frames.',
    whyItExists:
      "Native code follows the platform's C calling convention and needs a conventional stack.",
    componentId: 'native-method-stack',
    related: ['jvm-stack', 'jni'],
    references: [{ source: 'jvms-2.5.6' }],
  },
  {
    id: 'stackoverflowerror',
    term: 'StackOverflowError',
    simple:
      'The error thrown when a thread makes too many nested calls, usually from endless recursion.',
    deep: "Thrown when a thread needs a deeper JVM stack than permitted (JVMS §2.5.2). HotSpot detects it with protected guard pages at the end of each thread's stack and throws it as a recoverable error.",
    whyItExists: 'To stop runaway recursion safely instead of corrupting memory.',
    componentId: 'jvm-stack',
    related: ['jvm-stack', 'frame'],
    references: [{ source: 'jvms-2.5.2' }, { source: 'src-stackoverflow' }],
  },
  {
    id: 'outofmemoryerror',
    term: 'OutOfMemoryError',
    simple: 'The error thrown when the JVM cannot get memory it needs.',
    deep: 'Thrown when a run-time data area cannot satisfy an allocation. The message names the area: `Java heap space`, `Metaspace`, `Compressed class space`, `unable to create native thread`, `Direct buffer memory`.',
    whyItExists:
      'Memory is finite; the JVM reports exhaustion as an error the application can log or, rarely, handle.',
    componentId: 'heap',
    related: ['heap', 'metaspace', 'garbage-collection'],
    references: [{ source: 'jvms-2.5.3' }, { source: 'jvms-2.5.4' }],
  },

  // ── Execution engine ─────────────────────────────────────────────────────
  {
    id: 'interpreter',
    term: 'Interpreter',
    simple:
      'The part of the JVM that runs bytecode one instruction at a time, starting immediately.',
    deep: 'Executes bytecode by fetching, decoding and performing each instruction (JVMS §2.11). HotSpot uses a [[template-interpreter|template interpreter]] and collects counters and profiles for the JIT.',
    whyItExists: 'To run code with no compilation delay and to observe how it behaves.',
    componentId: 'interpreter',
    related: ['template-interpreter', 'jit-compilation', 'bytecode'],
    references: [{ source: 'jvms-2.11' }],
  },
  {
    id: 'template-interpreter',
    term: 'Template interpreter',
    simple: "HotSpot's interpreter: every bytecode has a ready-made piece of machine code.",
    deep: 'At start-up HotSpot generates a machine-code template per bytecode (`TemplateTable`) into the code cache and dispatches between them through a table indexed by opcode, keeping the bytecode pointer and top of stack in registers.',
    whyItExists: 'It is much faster than a C++ `switch` loop while staying simple to keep correct.',
    componentId: 'interpreter',
    related: ['interpreter', 'code-cache', 'pc-register'],
    references: [{ source: 'src-template-interpreter' }, { source: 'src-template-table' }],
  },
  {
    id: 'jit-compilation',
    term: 'JIT compilation',
    aliases: ['just-in-time compilation'],
    simple: 'Turning frequently used bytecode into native machine code while the program runs.',
    deep: 'HotSpot compiles hot methods and loops in background compiler threads, using run-time profiles for speculative optimizations, and installs the result in the code cache. JVMS §2.13 explicitly permits this.',
    whyItExists:
      'Interpreting is slow; compiling everything up front is slow to start and lacks run-time knowledge.',
    componentId: 'jit-compiler',
    related: ['tiered-compilation', 'c1', 'c2', 'deoptimization'],
    references: [{ source: 'src-compilation-policy' }, { source: 'jvms-2.13' }],
  },
  {
    id: 'tiered-compilation',
    term: 'Tiered compilation',
    simple:
      "HotSpot's step-by-step approach: interpret first, then compile quickly, then compile thoroughly.",
    deep: 'Five levels: 0 interpreter, 1 C1 without profiling, 2 C1 with counters, 3 C1 with full profiling, 4 C2. The usual path is 0 → 3 → 4, governed by thresholds such as `Tier3InvocationThreshold` (200) and `Tier4InvocationThreshold` (5000).',
    whyItExists: 'It combines fast warm-up (C1) with peak performance (C2).',
    componentId: 'jit-compiler',
    related: ['c1', 'c2', 'method-data', 'osr'],
    references: [{ source: 'src-compilation-policy' }],
  },
  {
    id: 'c1',
    term: 'C1',
    aliases: ['client compiler'],
    simple: "HotSpot's fast compiler.",
    deep: 'A quick, moderately optimizing JIT used for tiers 1–3; tier-3 code collects profiles for C2.',
    whyItExists: 'To get hot code out of the interpreter quickly.',
    componentId: 'c1',
    related: ['c2', 'tiered-compilation'],
    references: [{ source: 'src-c1' }],
  },
  {
    id: 'c2',
    term: 'C2',
    aliases: ['server compiler', 'opto'],
    simple: "HotSpot's thorough compiler, producing the fastest code.",
    deep: 'An aggressive, profile-guided optimizing JIT (tier 4) using a sea-of-nodes IR, escape analysis, loop optimizations and speculation.',
    whyItExists: 'Peak performance for the code that dominates run time.',
    componentId: 'c2',
    related: ['c1', 'escape-analysis', 'inlining', 'deoptimization'],
    references: [{ source: 'src-c2' }],
  },
  {
    id: 'osr',
    term: 'On-stack replacement (OSR)',
    simple:
      'Switching a method that is already running a long loop over to compiled code, mid-loop.',
    deep: "When a loop's back-edge counter crosses its threshold, HotSpot compiles the method with an entry at the loop header and migrates the live interpreter frame into it (`%` in `-XX:+PrintCompilation`).",
    whyItExists:
      'A method called once but looping for a long time (like `main`) would otherwise never benefit from compilation.',
    componentId: 'compilation',
    related: ['tiered-compilation', 'jit-compilation'],
    references: [{ source: 'src-compilation-policy' }],
  },
  {
    id: 'method-data',
    term: 'Method profile (MethodData)',
    simple:
      'Statistics the JVM records about a method while it runs: which types and branches it actually sees.',
    deep: "HotSpot's per-method `MethodData` object: receiver type profiles, branch counts, null-seen flags and more, filled by the interpreter and tier-3 C1 code and consumed by C2.",
    whyItExists: 'Profile-guided speculation lets C2 optimize for the common case.',
    componentId: 'profiler',
    related: ['tiered-compilation', 'c2', 'deoptimization'],
    references: [{ source: 'src-methoddata' }],
  },
  {
    id: 'inlining',
    term: 'Inlining',
    simple: "Copying a small method's body into the place that calls it, so the call disappears.",
    deep: "The JIT replaces a call with the callee's code (HotSpot: up to `MaxInlineSize` = 35 bytes at cold sites, `FreqInlineSize` = 325 at hot sites), using class hierarchy analysis and type profiles to inline virtual calls. It enables most other optimizations.",
    whyItExists: 'Removes call overhead and lets the optimizer see caller and callee together.',
    componentId: 'optimization',
    related: ['escape-analysis', 'c2', 'deoptimization'],
    references: [{ source: 'src-c2' }],
  },
  {
    id: 'escape-analysis',
    term: 'Escape analysis',
    simple:
      'The compiler checks whether an object ever leaves a method; if not, it may not need a real heap object at all.',
    deep: 'C2 determines whether an allocation escapes its compilation unit. Non-escaping objects can be scalar-replaced (their fields become locals, so no allocation happens) and their locks elided.',
    whyItExists:
      'Idiomatic Java creates many short-lived helper objects; removing them is a large win.',
    componentId: 'optimization',
    related: ['inlining', 'tlab', 'c2'],
    misconception: {
      myth: 'Every `new` creates an object in the heap.',
      truth: 'In compiled code, objects that do not escape may never be allocated.',
    },
    references: [{ source: 'src-escape' }],
  },
  {
    id: 'deoptimization',
    term: 'Deoptimization',
    simple:
      'Falling back from optimized code to the interpreter when an assumption turns out wrong.',
    deep: "HotSpot reconstructs interpreter frames from compiled code's debug information when an [[uncommon-trap]] is hit or a dependency is invalidated, then continues in the interpreter; the method may be recompiled later.",
    whyItExists: 'It makes speculative optimization safe.',
    componentId: 'deoptimization',
    related: ['uncommon-trap', 'c2', 'method-data'],
    references: [{ source: 'src-deoptimization' }],
  },
  {
    id: 'uncommon-trap',
    term: 'Uncommon trap',
    simple:
      'A tripwire in compiled code that fires when something the compiler did not expect happens.',
    deep: 'A check compiled into speculative code (unexpected class, null, unreached branch, unloaded class, …). Hitting it calls into the runtime, which records the reason and usually deoptimizes.',
    whyItExists: 'It lets the compiler omit code for rare paths while keeping exact semantics.',
    componentId: 'deoptimization',
    related: ['deoptimization', 'method-data'],
    references: [{ source: 'src-deoptimization' }],
  },
  {
    id: 'code-cache',
    term: 'Code cache',
    simple: 'The memory where the JVM keeps machine code it generated.',
    deep: "HotSpot's executable native memory for the interpreter, stubs and compiled methods (nmethods); 240 MB reserved by default with tiered compilation, split into three segments (JEP 197).",
    whyItExists: 'Generated code needs executable memory managed separately from the heap.',
    componentId: 'code-cache',
    related: ['nmethod', 'jit-compilation', 'template-interpreter'],
    references: [{ source: 'jep-197' }, { source: 'src-codecache' }],
  },
  {
    id: 'nmethod',
    term: 'nmethod',
    simple: "HotSpot's name for one compiled Java method.",
    deep: 'A code-cache blob holding the machine code of a compiled method plus metadata: embedded oops, dependencies, exception handlers and debug information for deoptimization. States include in use and not entrant.',
    whyItExists:
      'Compiled code needs metadata so the GC, deoptimization and stack walking can understand it.',
    componentId: 'code-cache',
    related: ['code-cache', 'deoptimization'],
    references: [{ source: 'src-nmethod' }],
  },

  // ── Garbage collection ───────────────────────────────────────────────────
  {
    id: 'garbage-collection',
    term: 'Garbage collection',
    simple:
      'Automatic cleanup: finding objects nothing refers to any more and reusing their memory.',
    deep: "Automatic storage management required by JVMS §2.5.3 without a mandated technique. HotSpot's collectors trace from roots, determine reachability, and reclaim memory by evacuation, compaction or freeing whole regions.",
    whyItExists: 'Manual memory management causes leaks, dangling pointers and double frees.',
    componentId: 'garbage-collector',
    related: ['gc-roots', 'reachability', 'g1', 'stop-the-world'],
    misconception: {
      myth: 'Objects are freed as soon as they become unreachable.',
      truth:
        'They become eligible; a later collection reclaims them, or none does before the program ends.',
    },
    references: [{ source: 'jvms-2.5.3' }, { source: 'guide-gc' }],
  },
  {
    id: 'gc-roots',
    term: 'GC roots',
    simple:
      'The starting points of the search for live objects: variables in running methods, static fields and a few JVM-held references.',
    deep: 'References in thread stacks, class statics (via loaded classes and loaders), JNI handles, monitors, code roots and VM-internal tables; partial collections add remembered sets.',
    whyItExists: 'Reachability must start from references the program can definitely use.',
    componentId: 'gc-roots',
    related: ['reachability', 'garbage-collection'],
    references: [{ source: 'guide-gc' }],
  },
  {
    id: 'reachability',
    term: 'Reachability',
    simple: 'Whether a program can still get to an object by following references from a root.',
    deep: 'JLS §12.6.1 defines reachable objects as those that can be accessed in any potential continuing computation from any live thread; `java.lang.ref` adds softly, weakly and phantom-reachable states. Unreachable objects are eligible for collection.',
    whyItExists: 'Reachability is the precise definition of "no longer needed".',
    componentId: 'gc-roots',
    related: ['gc-roots', 'reference', 'garbage-collection'],
    references: [{ source: 'jls-12.6' }, { source: 'api-java-lang-ref' }],
  },
  {
    id: 'safepoint',
    term: 'Safepoint',
    simple:
      'A moment when every Java thread has paused at a known, safe position so the JVM can do maintenance.',
    deep: 'A global state in which all Java threads are stopped at points where their stack layout is fully described (for GC, deoptimization and other VM operations). Threads reach them by polling at returns and loop back-edges; threads in native code count as safe. Thread-local handshakes stop individual threads.',
    whyItExists:
      "Some VM operations need a consistent view of every thread's stack and references.",
    componentId: 'garbage-collector',
    related: ['stop-the-world', 'garbage-collection', 'deoptimization'],
    references: [{ source: 'src-safepoint' }],
  },
  {
    id: 'stop-the-world',
    term: 'Stop-the-world pause',
    simple: 'A pause during which the application threads wait while the garbage collector works.',
    deep: 'A phase executed at a safepoint while Java threads are stopped. Concurrent collectors (G1 marking, ZGC, Shenandoah) do most work alongside the application and keep pauses short.',
    whyItExists: 'Some GC work is simplest and fastest when objects cannot change underneath it.',
    componentId: 'garbage-collector',
    related: ['safepoint', 'g1', 'zgc'],
    references: [{ source: 'guide-gc' }],
  },
  {
    id: 'g1',
    term: 'G1 (Garbage-First)',
    simple:
      'The default garbage collector, which divides the heap into regions and cleans the most wasteful ones first.',
    deep: 'A region-based, generational, mostly-concurrent collector with a pause-time goal (`MaxGCPauseMillis` = 200 ms); default on server-class machines since JDK 9 (JEP 248).',
    whyItExists: 'A balanced default: good throughput with predictable pauses.',
    componentId: 'g1',
    related: ['g1-region', 'humongous-object', 'zgc', 'shenandoah'],
    references: [{ source: 'jep-248' }, { source: 'guide-gc' }],
  },
  {
    id: 'zgc',
    term: 'ZGC',
    simple: 'A garbage collector built for very short pauses, even with huge heaps.',
    deep: 'Concurrent marking and relocation with coloured pointers and load barriers; generational since JDK 21 and generational-only since JDK 24.',
    whyItExists: 'Latency-sensitive applications cannot tolerate pauses that grow with heap size.',
    componentId: 'zgc',
    related: ['g1', 'shenandoah', 'stop-the-world'],
    references: [{ source: 'jep-439' }, { source: 'jep-490' }],
  },
  {
    id: 'shenandoah',
    term: 'Shenandoah',
    simple: 'A low-pause garbage collector that moves objects while your program runs.',
    deep: 'Concurrent marking and evacuation using load-reference barriers; its generational mode became a product feature in JDK 25 (JEP 521). Not included in every JDK build.',
    whyItExists: 'Low, heap-size-independent pause times.',
    componentId: 'shenandoah',
    related: ['zgc', 'g1'],
    references: [{ source: 'jep-379' }, { source: 'jep-521' }],
  },

  // ── Native interface and platform ───────────────────────────────────────
  {
    id: 'jni',
    term: 'JNI (Java Native Interface)',
    simple: 'The standard way for Java and C/C++ code to call each other.',
    deep: 'Defines native method binding (`Java_<class>_<method>` symbols or `RegisterNatives`), the per-thread `JNIEnv` function table, local and global references, and the Invocation API for creating JVMs.',
    whyItExists: 'To reach OS services, hardware and existing native libraries from Java.',
    componentId: 'jni',
    related: ['jnienv', 'native-library', 'ffm-api'],
    references: [{ source: 'jni-spec' }],
  },
  {
    id: 'jnienv',
    term: 'JNIEnv',
    simple: 'The handle native code receives to talk back to the JVM.',
    deep: 'A per-thread pointer to a table of JNI function pointers (`FindClass`, `NewStringUTF`, `CallStaticVoidMethod`, …), passed as the first argument to every native method.',
    whyItExists: 'It gives native code a stable, VM-independent way to use Java objects.',
    componentId: 'jni',
    related: ['jni', 'native-library'],
    references: [{ source: 'jni-spec' }],
  },
  {
    id: 'native-library',
    term: 'Native library',
    simple: 'A file of machine code (`.so`, `.dylib`, `.dll`) that Java can load and call.',
    deep: 'A shared library loaded into the JVM process with `System.loadLibrary` or `System.load`; `JNI_OnLoad` runs if present. Since JDK 24 loading one without `--enable-native-access` prints a warning (JEP 472).',
    whyItExists: 'Some functionality exists only as native code.',
    componentId: 'native-libraries',
    related: ['jni', 'ffm-api', 'system-call'],
    references: [{ source: 'api-system-loadlibrary' }, { source: 'jep-472' }],
  },
  {
    id: 'ffm-api',
    term: 'Foreign Function & Memory API',
    simple:
      'A modern Java API for calling C functions and using off-heap memory without writing C glue code.',
    deep: '`java.lang.foreign` (final in JDK 22, JEP 454): `Linker` creates downcall handles for native functions described by `FunctionDescriptor`s; `MemorySegment` and `Arena` manage native memory safely.',
    whyItExists:
      'JNI is verbose and error-prone; FFM is safer and needs no native code of your own.',
    componentId: 'native-interface',
    related: ['jni', 'native-library'],
    references: [{ source: 'jep-454' }, { source: 'api-foreign' }],
  },
  {
    id: 'platform-thread',
    term: 'Platform thread',
    simple: 'A normal Java thread, backed by one operating-system thread.',
    deep: 'In HotSpot each platform `Thread` is a `JavaThread` mapped 1:1 to an OS thread, with its own native stack.',
    whyItExists: 'It maps Java concurrency directly onto the OS scheduler.',
    componentId: 'java-thread',
    related: ['virtual-thread', 'jvm-stack'],
    references: [{ source: 'src-javathread' }],
  },
  {
    id: 'virtual-thread',
    term: 'Virtual thread',
    simple: 'A very lightweight Java thread; millions can exist, sharing a few OS threads.',
    deep: "Final in JDK 21 (JEP 444): scheduled by the JDK onto carrier platform threads. While unmounted (for example blocked on I/O) its frames live in heap objects; they are copied back to a carrier's stack to resume. JDK 24 removed pinning when synchronizing.",
    whyItExists: 'Thread-per-request code becomes affordable for I/O-heavy servers.',
    componentId: 'java-thread',
    related: ['platform-thread', 'jvm-stack'],
    references: [{ source: 'jep-444' }],
  },
  {
    id: 'system-call',
    term: 'System call',
    simple: 'A request from a program to the operating system, such as "read this file".',
    deep: 'The controlled entry from user space into the kernel (`read`, `write`, `mmap`, `futex`, …). All Java I/O ends in system calls made by native code.',
    whyItExists: "Only the kernel may access hardware and other processes' resources.",
    componentId: 'system-calls',
    related: ['native-library', 'virtual-memory'],
    references: [{ source: 'src-native-libraries' }],
  },
  {
    id: 'virtual-memory',
    term: 'Virtual memory',
    simple:
      'The private address space the operating system gives each process, backed by real memory as it is used.',
    deep: 'The JVM reserves address ranges (heap, code cache, Metaspace) and commits them as needed; the OS backs pages with physical memory on first touch. RSS is what is actually resident.',
    whyItExists: 'Isolation between processes and flexible use of physical memory.',
    componentId: 'virtual-memory',
    related: ['heap', 'compressed-oops'],
    references: [{ source: 'tool-java' }],
  },
];
