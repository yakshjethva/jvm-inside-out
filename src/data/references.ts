import type { Reference } from '@/types/content';

const JVMS = 'https://docs.oracle.com/javase/specs/jvms/se25/html';
const JLS = 'https://docs.oracle.com/javase/specs/jls/se25/html';
const API = 'https://docs.oracle.com/en/java/javase/25/docs/api';
const SPECS = 'https://docs.oracle.com/en/java/javase/25/docs/specs';
const SRC = 'https://github.com/openjdk/jdk/blob/jdk-25-ga';

const jvms = (section: string, title: string, description: string): Reference => ({
  title: `JVMS §${section} ${title}`,
  publisher: 'Oracle · Java Virtual Machine Specification',
  url: `${JVMS}/jvms-${section.split('.')[0]}.html#jvms-${section}`,
  version: 'Java SE 25',
  kind: 'specification',
  description,
});

const jls = (section: string, title: string, description: string): Reference => ({
  title: `JLS §${section} ${title}`,
  publisher: 'Oracle · Java Language Specification',
  url: `${JLS}/jls-${section.split('.')[0]}.html#jls-${section}`,
  version: 'Java SE 25',
  kind: 'specification',
  description,
});

const jep = (n: number, title: string, release: string, description: string): Reference => ({
  title: `JEP ${n}: ${title}`,
  publisher: 'OpenJDK',
  url: `https://openjdk.org/jeps/${n}`,
  version: release,
  kind: 'jep',
  description,
});

const src = (path: string, description: string): Reference => ({
  title: path.split('/').pop() ?? path,
  publisher: `OpenJDK source · ${path}`,
  url: `${SRC}/${path}`,
  version: 'JDK 25 GA (tag jdk-25-ga)',
  kind: 'source',
  description,
});

export const REFERENCES = {
  // ── Java Virtual Machine Specification (Java SE 25) ─────────────────────
  'jvms-2.5': jvms(
    '2.5',
    'Run-Time Data Areas',
    'Defines the data areas used during program execution and which are per thread.',
  ),
  'jvms-2.5.1': jvms(
    '2.5.1',
    'The pc Register',
    'Each thread has its own pc register; undefined while a native method runs.',
  ),
  'jvms-2.5.2': jvms(
    '2.5.2',
    'Java Virtual Machine Stacks',
    'Per-thread stacks of frames; StackOverflowError and OutOfMemoryError conditions.',
  ),
  'jvms-2.5.3': jvms(
    '2.5.3',
    'Heap',
    'Shared heap for all class instances and arrays, reclaimed by automatic storage management.',
  ),
  'jvms-2.5.4': jvms(
    '2.5.4',
    'Method Area',
    'Shared per-class structures; "logically part of the heap", location not mandated.',
  ),
  'jvms-2.5.5': jvms(
    '2.5.5',
    'Run-Time Constant Pool',
    'Per-class run-time representation of the constant_pool table.',
  ),
  'jvms-2.5.6': jvms(
    '2.5.6',
    'Native Method Stacks',
    'Conventional "C stacks" used to support native methods.',
  ),
  'jvms-2.6': jvms(
    '2.6',
    'Frames',
    'A frame is created per method invocation and destroyed when it completes.',
  ),
  'jvms-2.6.1': jvms(
    '2.6.1',
    'Local Variables',
    'Array of local variables sized at compile time; long and double use two slots.',
  ),
  'jvms-2.6.2': jvms(
    '2.6.2',
    'Operand Stacks',
    'LIFO operand stack with a maximum depth fixed at compile time.',
  ),
  'jvms-2.6.3': jvms(
    '2.6.3',
    'Dynamic Linking',
    "Each frame refers to the run-time constant pool of the current method's class.",
  ),
  'jvms-2.6.4': jvms(
    '2.6.4',
    'Normal Method Invocation Completion',
    "Return values and restoring the invoker's state.",
  ),
  'jvms-2.6.5': jvms(
    '2.6.5',
    'Abrupt Method Invocation Completion',
    'Completion by an uncaught exception.',
  ),
  'jvms-2.7': jvms(
    '2.7',
    'Representation of Objects',
    'The JVM does not mandate any particular internal structure for objects.',
  ),
  'jvms-2.9': jvms(
    '2.9',
    'Special Methods',
    'Instance initialization methods <init> and class initialization methods <clinit>.',
  ),
  'jvms-2.11': jvms(
    '2.11',
    'Instruction Set Summary',
    'Opcodes, operands and the inner loop of a JVM interpreter.',
  ),
  'jvms-2.13': jvms(
    '2.13',
    'Public Design, Private Implementation',
    'Implementations may translate bytecode to native code and choose their own internals.',
  ),
  'jvms-4.1': jvms(
    '4.1',
    'The ClassFile Structure',
    'Magic number, versions, constant pool, fields, methods and attributes.',
  ),
  'jvms-4.4': jvms(
    '4.4',
    'The Constant Pool',
    'Constant pool entry kinds such as Class, Fieldref, Methodref and String.',
  ),
  'jvms-4.10': jvms(
    '4.10',
    'Verification of class Files',
    'Type checking with StackMapTable frames and the constraints a class file must meet.',
  ),
  'jvms-4.7.2': jvms(
    '4.7.2',
    'The ConstantValue Attribute',
    'The constant value of a static final field, assigned when the class is initialized.',
  ),
  'jvms-5.1': jvms(
    '5.1',
    'The Run-Time Constant Pool',
    'How symbolic references in the class file become run-time constant pool entries.',
  ),
  'jvms-5.2': jvms(
    '5.2',
    'Java Virtual Machine Startup',
    'The initial class is created by the bootstrap loader or an implementation-defined loader.',
  ),
  'jvms-5.3': jvms(
    '5.3',
    'Creation and Loading',
    'Defining and initiating loaders; loading with the bootstrap and user-defined loaders.',
  ),
  'jvms-5.3.1': jvms(
    '5.3.1',
    'Loading Using the Bootstrap Class Loader',
    'The bootstrap loader searches for a class representation in an implementation-dependent way.',
  ),
  'jvms-5.3.2': jvms(
    '5.3.2',
    'Loading Using a User-defined Class Loader',
    'loadClass, defineClass, and the loader recorded as initiating or defining.',
  ),
  'jvms-5.3.4': jvms(
    '5.3.4',
    'Loading Constraints',
    'Constraints that keep type safety when classes are visible through different loaders.',
  ),
  'jvms-5.3.5': jvms(
    '5.3.5',
    'Deriving a Class from a class File Representation',
    'Format checks, superclass loading, and LinkageError / ClassFormatError conditions.',
  ),
  'jvms-5.3.6': jvms(
    '5.3.6',
    'Modules and Layers',
    'Run-time modules, layers and how class loaders map to them.',
  ),
  'jvms-5.4': jvms('5.4', 'Linking', 'Verification, preparation and (optionally lazy) resolution.'),
  'jvms-5.4.1': jvms(
    '5.4.1',
    'Verification',
    'Ensures the binary representation of a class is structurally correct.',
  ),
  'jvms-5.4.2': jvms(
    '5.4.2',
    'Preparation',
    'Creates static fields and initializes them to default values.',
  ),
  'jvms-5.4.3': jvms(
    '5.4.3',
    'Resolution',
    'Dynamically determines concrete values from symbolic references.',
  ),
  'jvms-5.5': jvms(
    '5.5',
    'Initialization',
    'Executing <clinit>; the conditions that trigger initialization and its locking procedure.',
  ),
  'jvms-5.6': jvms(
    '5.6',
    'Binding Native Method Implementations',
    'Integrating native code so a native method can be invoked.',
  ),
  'jvms-6.5-new': {
    title: 'JVMS §6.5 new',
    publisher: 'Oracle · Java Virtual Machine Specification',
    url: `${JVMS}/jvms-6.html#jvms-6.5.new`,
    version: 'Java SE 25',
    kind: 'specification',
    description: 'Creates a new object; may trigger resolution and initialization of the class.',
  },
  'jvms-6.5-invokespecial': {
    title: 'JVMS §6.5 invokespecial',
    publisher: 'Oracle · Java Virtual Machine Specification',
    url: `${JVMS}/jvms-6.html#jvms-6.5.invokespecial`,
    version: 'Java SE 25',
    kind: 'specification',
    description: 'Invokes instance initialization methods, private methods and superclass methods.',
  },

  'jvms-6.5-getstatic': {
    title: 'JVMS §6.5 getstatic',
    publisher: 'Oracle · Java Virtual Machine Specification',
    url: `${JVMS}/jvms-6.html#jvms-6.5.getstatic`,
    version: 'Java SE 25',
    kind: 'specification',
    description:
      'Reads a static field; resolves the field reference and initializes its class first.',
  },

  // ── Java Language Specification (Java SE 25) ────────────────────────────
  'jls-12.1': jls(
    '12.1',
    'Java Virtual Machine Startup',
    'Loading, linking and initializing the initial class, then invoking main.',
  ),
  'jls-12.4.1': jls(
    '12.4.1',
    'When Initialization Occurs',
    'The exact events that trigger class or interface initialization.',
  ),
  'jls-12.4.2': jls(
    '12.4.2',
    'Detailed Initialization Procedure',
    'The initialization lock, recursive requests, textual order and the erroneous state.',
  ),
  'jls-12.6': jls(
    '12.6',
    'Finalization of Class Instances',
    'Reachability terminology and the (deprecated) finalization mechanism.',
  ),
  'jls-12.7': jls(
    '12.7',
    'Unloading of Classes and Interfaces',
    'Unloading is permitted, and only when the defining loader is reclaimable.',
  ),
  'jls-13.1': jls(
    '13.1',
    'The Form of a Binary',
    'A reference to a constant variable is compiled to its value: no field access remains.',
  ),

  // ── Java SE API and tool documentation (JDK 25) ─────────────────────────
  'api-classloader': {
    title: 'java.lang.ClassLoader',
    publisher: 'Oracle · Java SE 25 API',
    url: `${API}/java.base/java/lang/ClassLoader.html`,
    version: 'Java SE 25',
    kind: 'api',
    description:
      'Built-in loaders, the delegation model, and getPlatformClassLoader / getSystemClassLoader.',
  },
  'api-system-loadlibrary': {
    title: 'System.loadLibrary(String)',
    publisher: 'Oracle · Java SE 25 API',
    url: `${API}/java.base/java/lang/System.html#loadLibrary(java.lang.String)`,
    version: 'Java SE 25',
    kind: 'api',
    description: 'Loads a native library; the name is mapped to a platform-specific file name.',
  },
  'api-java-lang-ref': {
    title: 'java.lang.ref package',
    publisher: 'Oracle · Java SE 25 API',
    url: `${API}/java.base/java/lang/ref/package-summary.html`,
    version: 'Java SE 25',
    kind: 'api',
    description: 'Strong, soft, weak and phantom reachability.',
  },
  'api-foreign': {
    title: 'java.lang.foreign package',
    publisher: 'Oracle · Java SE 25 API',
    url: `${API}/java.base/java/lang/foreign/package-summary.html`,
    version: 'Java SE 25',
    kind: 'api',
    description:
      'Foreign Function & Memory API: calling native code and accessing off-heap memory.',
  },
  'api-class-forname': {
    title: 'Class.forName(String, boolean, ClassLoader)',
    publisher: 'Oracle · Java SE 25 API',
    url: `${API}/java.base/java/lang/Class.html#forName(java.lang.String,boolean,java.lang.ClassLoader)`,
    version: 'Java SE 25',
    kind: 'api',
    description: 'Loads a class through a given loader, and initializes it only when asked to.',
  },
  'api-modulelayer': {
    title: 'java.lang.ModuleLayer',
    publisher: 'Oracle · Java SE 25 API',
    url: `${API}/java.base/java/lang/ModuleLayer.html`,
    version: 'Java SE 25',
    kind: 'api',
    description:
      'The boot layer and layers created at run time; each module is mapped to a class loader.',
  },
  'api-bytebuffer': {
    title: 'ByteBuffer.allocateDirect(int)',
    publisher: 'Oracle · Java SE 25 API',
    url: `${API}/java.base/java/nio/ByteBuffer.html#allocateDirect(int)`,
    version: 'Java SE 25',
    kind: 'api',
    description:
      'Direct buffers: memory outside the Java heap, limited by -XX:MaxDirectMemorySize.',
  },
  'api-instrumentation-size': {
    title: 'Instrumentation.getObjectSize(Object)',
    publisher: 'Oracle · Java SE 25 API',
    url: `${API}/java.instrument/java/lang/instrument/Instrumentation.html#getObjectSize(java.lang.Object)`,
    version: 'Java SE 25',
    kind: 'api',
    description: "The JVM's own estimate of the storage one object uses (not what it refers to).",
  },
  'api-stackwalker': {
    title: 'java.lang.StackWalker',
    publisher: 'Oracle · Java SE 25 API',
    url: `${API}/java.base/java/lang/StackWalker.html`,
    version: 'Java SE 25',
    kind: 'api',
    description: "Walks the frames of the current thread's stack.",
  },
  'jni-spec': {
    title: 'Java Native Interface Specification',
    publisher: 'Oracle',
    url: `${SPECS}/jni/index.html`,
    version: 'Java SE 25',
    kind: 'specification',
    description:
      'JNIEnv, local and global references, native method registration and the Invocation API.',
  },
  'tool-java': {
    title: 'The java command',
    publisher: 'Oracle · JDK 25 tool reference',
    url: `${SPECS}/man/java.html`,
    version: 'JDK 25',
    kind: 'tool',
    description: 'Launcher syntax, -Xss, -Xmx, -Xlog and the HotSpot -XX options.',
  },
  'tool-javac': {
    title: 'The javac command',
    publisher: 'Oracle · JDK 25 tool reference',
    url: `${SPECS}/man/javac.html`,
    version: 'JDK 25',
    kind: 'tool',
    description: 'Compiles Java source files into class files.',
  },
  'tool-javap': {
    title: 'The javap command',
    publisher: 'Oracle · JDK 25 tool reference',
    url: `${SPECS}/man/javap.html`,
    version: 'JDK 25',
    kind: 'tool',
    description: 'Disassembles class files: constant pool, descriptors and bytecode.',
  },
  'tool-jcmd': {
    title: 'The jcmd command',
    publisher: 'Oracle · JDK 25 tool reference',
    url: `${SPECS}/man/jcmd.html`,
    version: 'JDK 25',
    kind: 'tool',
    description:
      'Diagnostic commands for a running JVM: VM.classloaders, GC.heap_info, VM.native_memory, Thread.print, GC.heap_dump.',
  },
  'tool-jmap': {
    title: 'The jmap command',
    publisher: 'Oracle · JDK 25 tool reference',
    url: `${SPECS}/man/jmap.html`,
    version: 'JDK 25',
    kind: 'tool',
    description: 'Class histograms and heap dumps of a running JVM (jcmd offers the same).',
  },
  'tool-jol': {
    title: 'JOL (Java Object Layout)',
    publisher: 'OpenJDK Code Tools',
    url: 'https://github.com/openjdk/jol',
    version: '0.17',
    kind: 'tool',
    description: 'Prints the field offsets, headers and padding of objects in the running JVM.',
  },
  'guide-gc': {
    title: 'HotSpot Virtual Machine Garbage Collection Tuning Guide',
    publisher: 'Oracle',
    url: 'https://docs.oracle.com/en/java/javase/25/gctuning/',
    version: 'JDK 25',
    kind: 'guide',
    description: 'Generations, ergonomics, and the G1, Parallel, Serial, Z and other collectors.',
  },
  'guide-vm': {
    title: 'Java Virtual Machine Guide',
    publisher: 'Oracle',
    url: 'https://docs.oracle.com/en/java/javase/25/vm/',
    version: 'JDK 25',
    kind: 'guide',
    description: 'HotSpot features including class data sharing, compilation and signal handling.',
  },
  'hotspot-runtime-overview': {
    title: 'HotSpot Runtime Overview',
    publisher: 'OpenJDK HotSpot group',
    url: 'https://openjdk.org/groups/hotspot/docs/RuntimeOverview.html',
    version: 'Background (older JDKs)',
    kind: 'guide',
    description:
      "Background on HotSpot's runtime: class loading, interpreter, threads and synchronization. Some details predate JDK 25.",
  },

  // ── JDK Enhancement Proposals ────────────────────────────────────────────
  'jep-122': jep(
    122,
    'Remove the Permanent Generation',
    'JDK 8',
    'Class metadata moved from PermGen (Java heap) to Metaspace (native memory).',
  ),
  'jep-158': jep(
    158,
    'Unified JVM Logging',
    'JDK 9',
    'The -Xlog framework used for class, GC and other logs.',
  ),
  'jep-197': jep(
    197,
    'Segmented Code Cache',
    'JDK 9',
    'Code cache split into non-method, profiled and non-profiled segments.',
  ),
  'jep-220': jep(
    220,
    'Modular Run-Time Images',
    'JDK 9',
    'The runtime image layout and the lib/modules jimage file.',
  ),
  'jep-248': jep(
    248,
    'Make G1 the Default Garbage Collector',
    'JDK 9',
    'G1 became the default collector on server-class machines.',
  ),
  'jep-261': jep(
    261,
    'Module System',
    'JDK 9',
    'Platform class loader, module-aware delegation, and the module path.',
  ),
  'jep-318': jep(
    318,
    'Epsilon: A No-Op Garbage Collector',
    'JDK 11',
    'A collector that allocates but never reclaims memory.',
  ),
  'jep-330': jep(
    330,
    'Launch Single-File Source-Code Programs',
    'JDK 11',
    'java Main.java compiles in memory and runs the result.',
  ),
  'jep-341': jep(
    341,
    'Default CDS Archives',
    'JDK 12',
    'A class data sharing archive is shipped and used by default.',
  ),
  'jep-363': jep(
    363,
    'Remove the Concurrent Mark Sweep (CMS) Garbage Collector',
    'JDK 14',
    'The CMS mark-sweep collector was removed.',
  ),
  'jep-371': jep(
    371,
    'Hidden Classes',
    'JDK 15',
    'Classes that cannot be referenced by name, used by lambdas and frameworks.',
  ),
  'jep-377': jep(
    377,
    'ZGC: A Scalable Low-Latency Garbage Collector (Production)',
    'JDK 15',
    'ZGC became a product feature.',
  ),
  'jep-379': jep(
    379,
    'Shenandoah: A Low-Pause-Time Garbage Collector (Production)',
    'JDK 15',
    'Shenandoah became a product feature.',
  ),
  'jep-387': jep(
    387,
    'Elastic Metaspace',
    'JDK 16',
    'Metaspace allocator rewritten to return memory to the OS more promptly.',
  ),
  'jep-410': jep(
    410,
    'Remove the Experimental AOT and JIT Compiler',
    'JDK 17',
    'Graal-based compilers were removed from OpenJDK builds.',
  ),
  'jep-439': jep(
    439,
    'Generational ZGC',
    'JDK 21',
    'ZGC gained separate young and old generations.',
  ),
  'jep-444': jep(
    444,
    'Virtual Threads',
    'JDK 21',
    'Lightweight threads scheduled by the JDK on carrier platform threads.',
  ),
  'jep-450': jep(
    450,
    'Compact Object Headers (Experimental)',
    'JDK 24',
    '8-byte object headers on 64-bit platforms (experimental).',
  ),
  'jep-454': jep(
    454,
    'Foreign Function & Memory API',
    'JDK 22',
    'A supported alternative to JNI for calling native code.',
  ),
  'jep-458': jep(
    458,
    'Launch Multi-File Source-Code Programs',
    'JDK 22',
    'Extends source-file mode to programs made of several source files; they are still compiled in memory before running.',
  ),
  'jep-472': jep(
    472,
    'Prepare to Restrict the Use of JNI',
    'JDK 24',
    'Warnings when JNI is used without --enable-native-access.',
  ),
  'jep-474': jep(
    474,
    'ZGC: Generational Mode by Default',
    'JDK 23',
    'Generational mode became the default for ZGC.',
  ),
  'jep-483': jep(
    483,
    'Ahead-of-Time Class Loading & Linking',
    'JDK 24',
    'Classes can be loaded and linked ahead of time into an AOT cache.',
  ),
  'jep-490': jep(
    490,
    'ZGC: Remove the Non-Generational Mode',
    'JDK 24',
    'ZGC is generational only.',
  ),
  'jep-512': jep(
    512,
    'Compact Source Files and Instance Main Methods',
    'JDK 25',
    'Instance main methods and compact source files.',
  ),
  'jep-514': jep(
    514,
    'Ahead-of-Time Command-Line Ergonomics',
    'JDK 25',
    'Simpler creation of AOT caches.',
  ),
  'jep-515': jep(
    515,
    'Ahead-of-Time Method Profiling',
    'JDK 25',
    'Method profiles from a training run are stored in the AOT cache.',
  ),
  'jep-519': jep(
    519,
    'Compact Object Headers',
    'JDK 25',
    'Compact object headers became a product feature (off by default).',
  ),
  'jep-521': jep(
    521,
    'Generational Shenandoah',
    'JDK 25',
    "Shenandoah's generational mode became a product feature.",
  ),

  // ── OpenJDK source code (tag jdk-25-ga) ──────────────────────────────────
  'src-builtin-classloader': src(
    'src/java.base/share/classes/jdk/internal/loader/BuiltinClassLoader.java',
    'loadClassOrNull: module-aware lookup, then parent delegation, then class path.',
  ),
  'src-classloaders': src(
    'src/java.base/share/classes/jdk/internal/loader/ClassLoaders.java',
    'Creates the platform and application (system) class loaders.',
  ),
  'src-classloader': src(
    'src/java.base/share/classes/java/lang/ClassLoader.java',
    'loadClass: findLoadedClass, the parent, then findClass; preDefineClass forbids java.* names.',
  ),
  'src-module-loader-map': src(
    'make/conf/module-loader-map.conf',
    'Which JDK modules are defined by the boot loader and which by the platform loader.',
  ),
  'src-native-libraries': src(
    'src/java.base/share/classes/jdk/internal/loader/NativeLibraries.java',
    'Loading native libraries and finding JNI symbols.',
  ),
  'src-launcher': src(
    'src/java.base/share/native/libjli/java.c',
    'The java launcher: parses options, loads libjvm, calls JNI_CreateJavaVM, invokes main.',
  ),
  'src-systemdictionary': src(
    'src/hotspot/share/classfile/systemDictionary.cpp',
    "HotSpot's registry of loaded classes per class loader.",
  ),
  'src-javaclasses': src(
    'src/hotspot/share/classfile/javaClasses.cpp',
    'Creates java.lang.Class mirrors: static fields live in the mirror, ConstantValue fields are written when it is created.',
  ),
  'src-classfileparser': src(
    'src/hotspot/share/classfile/classFileParser.cpp',
    'Parses class file bytes into HotSpot metadata.',
  ),
  'src-verifier': src(
    'src/hotspot/share/classfile/verifier.cpp',
    'Bytecode verification (type-checking verifier).',
  ),
  'src-linkresolver': src(
    'src/hotspot/share/interpreter/linkResolver.cpp',
    'Resolution of field and method references.',
  ),
  'src-classloaderdata': src(
    'src/hotspot/share/classfile/classLoaderData.hpp',
    'Per-loader metadata ownership; unit of class unloading.',
  ),
  'src-instanceklass': src(
    'src/hotspot/share/oops/instanceKlass.hpp',
    "HotSpot's in-memory representation of a Java class.",
  ),
  'src-constantpool': src(
    'src/hotspot/share/oops/constantPool.hpp',
    'Run-time constant pool representation.',
  ),
  'src-cpcache': src(
    'src/hotspot/share/oops/cpCache.hpp',
    'Resolved field, method and invokedynamic entries.',
  ),
  'src-method': src(
    'src/hotspot/share/oops/method.hpp',
    'Per-method metadata including entry points and counters.',
  ),
  'src-markword': src(
    'src/hotspot/share/oops/markWord.hpp',
    'Object header (mark word) bit layout, with and without compact headers.',
  ),
  'src-metaspace': src(
    'src/hotspot/share/memory/metaspace.hpp',
    'Metaspace: native memory for class metadata.',
  ),
  'src-compressedklass': src(
    'src/hotspot/share/oops/compressedKlass.hpp',
    'Compressed class pointers: 32-bit references to classes in the class space.',
  ),
  'src-bits': src(
    'src/java.base/share/classes/java/nio/Bits.java',
    'reserveMemory: counts direct buffer memory against MaxDirectMemorySize.',
  ),
  'src-nmt': src(
    'src/hotspot/share/nmt/memTracker.hpp',
    "Native Memory Tracking: HotSpot's accounting of its own native memory, by category.",
  ),
  'src-tlab': src(
    'src/hotspot/share/gc/shared/threadLocalAllocBuffer.hpp',
    'Thread-local allocation buffers.',
  ),
  'src-javathread': src(
    'src/hotspot/share/runtime/javaThread.hpp',
    "HotSpot's representation of a Java thread.",
  ),
  'src-stackoverflow': src(
    'src/hotspot/share/runtime/stackOverflow.hpp',
    'Stack guard zones: reserved, yellow, red and shadow zones.',
  ),
  'src-frame-x86': src(
    'src/hotspot/cpu/x86/frame_x86.hpp',
    'Interpreter frame layout on x86: method, mdp, cache, locals, bcp, sender sp.',
  ),
  'src-interp-masm-x86': src(
    'src/hotspot/cpu/x86/interp_masm_x86.hpp',
    'x86 interpreter macro assembler: the bytecode pointer lives in r13.',
  ),
  'src-template-interpreter': src(
    'src/hotspot/share/interpreter/templateInterpreter.hpp',
    "HotSpot's template interpreter, generated at VM startup.",
  ),
  'src-template-table': src(
    'src/hotspot/share/interpreter/templateTable.hpp',
    'The per-bytecode machine-code templates.',
  ),
  'src-compilation-policy': src(
    'src/hotspot/share/compiler/compilationPolicy.hpp',
    'Tiered compilation levels 0–4 and the thresholds that move methods between them.',
  ),
  'src-compilebroker': src(
    'src/hotspot/share/compiler/compileBroker.hpp',
    'Compile queues and compiler threads.',
  ),
  'src-methoddata': src(
    'src/hotspot/share/oops/methodData.hpp',
    'MethodData (MDO): per-method profiling information.',
  ),
  'src-c1': src('src/hotspot/share/c1/c1_Compilation.hpp', 'The C1 (client) compiler.'),
  'src-c2': src('src/hotspot/share/opto/compile.hpp', 'The C2 (server, "opto") compiler.'),
  'src-escape': src('src/hotspot/share/opto/escape.hpp', 'C2 escape analysis.'),
  'src-codecache': src(
    'src/hotspot/share/code/codeCache.hpp',
    'Code cache and its code heaps (segments).',
  ),
  'src-nmethod': src(
    'src/hotspot/share/code/nmethod.hpp',
    'Compiled Java methods (nmethods) and their states.',
  ),
  'src-deoptimization': src(
    'src/hotspot/share/runtime/deoptimization.hpp',
    'Deoptimization and the reasons uncommon traps record.',
  ),
  'src-safepoint': src(
    'src/hotspot/share/runtime/safepoint.hpp',
    'Safepoints: bringing Java threads to a stop for VM operations.',
  ),
  'src-gcconfig': src(
    'src/hotspot/share/gc/shared/gcConfig.cpp',
    'How the default garbage collector is selected.',
  ),
  'src-os': src(
    'src/hotspot/share/runtime/os.cpp',
    'Includes is_server_class_machine(), used for GC ergonomics.',
  ),
  'src-oopstorage': src(
    'src/hotspot/share/gc/shared/oopStorage.hpp',
    'Storage for off-heap references such as JNI global handles.',
  ),
  'src-g1': src('src/hotspot/share/gc/g1/g1CollectedHeap.hpp', "The G1 collector's heap."),
  'src-zgc': src('src/hotspot/share/gc/z/zCollectedHeap.hpp', "The Z garbage collector's heap."),
  'src-shenandoah': src(
    'src/hotspot/share/gc/shenandoah/shenandoahHeap.hpp',
    "The Shenandoah collector's heap.",
  ),
  'src-parallel': src(
    'src/hotspot/share/gc/parallel/parallelScavengeHeap.hpp',
    "The Parallel collector's heap.",
  ),
  'src-serial': src('src/hotspot/share/gc/serial/serialHeap.hpp', "The Serial collector's heap."),
  'src-epsilon': src(
    'src/hotspot/share/gc/epsilon/epsilonHeap.hpp',
    "The Epsilon (no-op) collector's heap.",
  ),
  'src-jni': src(
    'src/hotspot/share/prims/jni.cpp',
    "HotSpot's implementation of the JNI function table.",
  ),
} as const satisfies Record<string, Reference>;

export type ReferenceId = keyof typeof REFERENCES;

export const REFERENCE_IDS = Object.keys(REFERENCES) as ReferenceId[];

export function getReference(id: ReferenceId): Reference {
  return REFERENCES[id];
}
