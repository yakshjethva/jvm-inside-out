import type { LeveledText } from '@/lib/levels';
import type { ClassModel, LifecycleAction } from '@/simulators/classLifecycle';
import type { LoaderWorld, LoadRequest } from '@/simulators/classLoading';
import type { Citation, Provenance, Quiz } from '@/types/content';
import type { ComponentId } from '@/content/jvm/ids';
import type { ExperimentPrediction, Investigation, LabStation } from '@/types/lab';
import * as E from './classLoadingEvidence';

/**
 * The Class Loader Explorer: one representative JVM, the same setup as the
 * real programs in classLoadingEvidence.ts (JDK 25.0.4). The simulator
 * (src/simulators/classLoading.ts) runs on this world, and the unit tests
 * check that it reaches the same answers the real JVM printed.
 */

export const LOADER_WORLD: LoaderWorld = {
  loaders: [
    {
      id: 'bootstrap',
      name: '',
      kind: 'bootstrap',
      policy: 'bootstrap',
      parent: null,
      sources: ['runtime-image'],
    },
    {
      id: 'platform',
      name: 'platform',
      kind: 'builtin',
      policy: 'module-aware',
      parent: 'bootstrap',
      sources: ['runtime-image'],
    },
    {
      id: 'app',
      name: 'app',
      kind: 'builtin',
      policy: 'module-aware',
      parent: 'platform',
      sources: ['runtime-image', 'class-path'],
    },
    {
      id: 'parent-first',
      name: 'parent-first',
      kind: 'user',
      policy: 'parent-first',
      parent: 'app',
      sources: ['plugin-dir'],
    },
    {
      id: 'child-first',
      name: 'child-first',
      kind: 'user',
      policy: 'child-first',
      parent: 'app',
      sources: ['plugin-dir'],
    },
  ],
  sources: [
    {
      id: 'runtime-image',
      kind: 'runtime-image',
      label: 'Runtime image (lib/modules)',
      classes: [
        'java.lang.Object',
        'java.lang.String',
        'java.util.logging.Logger',
        'java.sql.Connection',
        'com.sun.tools.javac.Main',
      ],
    },
    {
      id: 'class-path',
      kind: 'class-path',
      label: 'Class path (app/)',
      classes: [
        'Delegation',
        'ChildFirstLoader',
        'com.example.shared.Message',
        'com.example.shared.Bus',
      ],
    },
    {
      id: 'plugin-dir',
      kind: 'directory',
      label: 'Plugin directory (plugin/)',
      classes: ['com.example.plugin.Greeter', 'com.example.shared.Message'],
    },
  ],
  modules: [
    { name: 'java.base', loader: 'bootstrap', packages: ['java.lang'] },
    { name: 'java.logging', loader: 'bootstrap', packages: ['java.util.logging'] },
    { name: 'java.sql', loader: 'platform', packages: ['java.sql'] },
    { name: 'jdk.compiler', loader: 'app', packages: ['com.sun.tools.javac'] },
  ],
  preloaded: [
    { name: 'java.lang.Object', loader: 'bootstrap', source: 'runtime-image' },
    { name: 'java.lang.String', loader: 'bootstrap', source: 'runtime-image' },
    { name: 'Delegation', loader: 'app', source: 'class-path' },
  ],
  members: [
    {
      id: 'bus-send',
      fromClass: 'com.example.plugin.Greeter',
      fromLoader: 'child-first',
      owner: 'com.example.shared.Bus',
      signature: 'void com.example.shared.Bus.send(com.example.shared.Message)',
      types: ['com.example.shared.Message'],
    },
  ],
};

export type LoaderId = 'bootstrap' | 'platform' | 'app' | 'parent-first' | 'child-first';
export const LOADER_IDS: LoaderId[] = [
  'bootstrap',
  'platform',
  'app',
  'parent-first',
  'child-first',
];
export const isLoaderId = (value: string | null): value is LoaderId =>
  LOADER_IDS.includes(value as LoaderId);

/** What the observatory says about each loader. */
export interface LoaderProfile {
  id: LoaderId;
  title: string;
  /** The name on the loader's plate in the observatory. */
  plateTitle: string;
  /** How Java code sees it. */
  javaView: string;
  /** Its implementation class in OpenJDK 25, or how the JVM provides it. */
  implementation: string;
  kindLabel: string;
  provenance: Provenance;
  role: LeveledText;
  /** Where it looks for classes itself. */
  scope: string;
  policyLabel: string;
  component: ComponentId;
  evidence: string[];
  references: Citation[];
}

export const LOADER_PROFILES: Record<LoaderId, LoaderProfile> = {
  bootstrap: {
    id: 'bootstrap',
    title: 'Bootstrap class loader',
    plateTitle: 'Bootstrap class loader',
    javaView: 'null',
    implementation: 'Built into the JVM (C++ in HotSpot)',
    kindLabel: 'Built into the JVM',
    provenance: 'spec',
    role: {
      simple:
        'The first loader, part of the JVM itself. It loads the classes everything else depends on, such as `Object` and `String`. Java code cannot hold it as an object, so it shows up as `null`.',
      developer:
        '`String.class.getClassLoader()` returns `null`: that is how the Java API names the bootstrap loader. In JDK 25 it defines the classes of the boot modules, such as `java.base` and `java.logging`, most of them mapped straight from the class data sharing archive.',
      deep: 'JVMS §5.3.1: supplied by the JVM, it finds classes in an implementation-dependent way. In JDK 25 it defines the modules listed as `BOOT_MODULES` in `make/conf/module-loader-map.conf` and reads them from the runtime image (`lib/modules`) or maps them from the default [[cds|CDS]] archive. On the Java side, `ClassLoaders.BootClassLoader.loadClassOrNull` simply calls `findBootstrapClassOrNull`. Classes it defines are never unloaded (JLS §12.7).',
    },
    scope: 'Boot modules in the runtime image and the CDS archive',
    policyLabel: 'Looks only in the boot modules',
    component: 'bootstrap-loader',
    evidence: ['loaders-output', 'loaders-log'],
    references: [
      { source: 'jvms-5.3.1' },
      { source: 'src-module-loader-map' },
      { source: 'src-classloaders' },
      { source: 'jep-220' },
    ],
  },
  platform: {
    id: 'platform',
    title: 'Platform class loader',
    plateTitle: 'Platform class loader',
    javaView: 'ClassLoader.getPlatformClassLoader()',
    implementation: 'jdk.internal.loader.ClassLoaders$PlatformClassLoader',
    kindLabel: 'JDK loader',
    provenance: 'spec',
    role: {
      simple:
        'A loader for parts of the Java platform that not every program needs, such as the database API in `java.sql`.',
      developer:
        'Named `"platform"`; `getParent()` returns `null`, meaning the bootstrap loader. It defines platform modules such as `java.sql` and `java.net.http`. It is not the old extension loader: `lib/ext` no longer exists.',
      deep: 'A `BuiltinClassLoader` (JDK 9+). It defines the `PLATFORM_MODULES` of `module-loader-map.conf`. Its lookup is module-aware (`loadClassOrNull`): a package in a named module goes to the loader that defines that module, which can be the application loader below it; other packages go to the boot loader. It has no class path of its own.',
    },
    scope: 'Platform modules in the runtime image',
    policyLabel: 'Module first, then the parent',
    component: 'platform-loader',
    evidence: ['loaders-output'],
    references: [
      { source: 'api-classloader' },
      { source: 'src-builtin-classloader' },
      { source: 'src-module-loader-map' },
      { source: 'jep-261' },
    ],
  },
  app: {
    id: 'app',
    title: 'Application class loader',
    plateTitle: 'Application class loader',
    javaView: 'ClassLoader.getSystemClassLoader()',
    implementation: 'jdk.internal.loader.ClassLoaders$AppClassLoader',
    kindLabel: 'JDK loader',
    provenance: 'spec',
    role: {
      simple:
        'The loader for your own code and the libraries you add. It looks in the folders and JAR files you list on the class path.',
      developer:
        'Named `"app"`, parent `platform`. It loaded `Delegation`, the main class, and reads `-cp` / `--class-path` (the unnamed module) and `--module-path`. Some JDK tool modules are defined to it too: `com.sun.tools.javac.Main` reports `app`.',
      deep: 'A `BuiltinClassLoader` with a `URLClassPath`. Module-aware lookup first; packages in no named module go to the parent and then to `findClassOnClassPathOrNull`. JDK modules not listed as boot or platform modules in `module-loader-map.conf` (for example `jdk.compiler`) are defined to it. It can be replaced with `-Djava.system.class.loader`.',
    },
    scope: 'The class path, the module path, and JDK modules defined to it',
    policyLabel: 'Module first, then the parent, then the class path',
    component: 'application-loader',
    evidence: ['loaders-output', 'delegation-log'],
    references: [
      { source: 'api-classloader' },
      { source: 'src-builtin-classloader' },
      { source: 'src-classloaders' },
    ],
  },
  'parent-first': {
    id: 'parent-first',
    title: 'User-defined loader, parent first',
    plateTitle: 'Parent-first loader',
    javaView: 'new URLClassLoader("parent-first", urls, app)',
    implementation: 'java.net.URLClassLoader (inherits ClassLoader.loadClass)',
    kindLabel: 'User-defined',
    provenance: 'spec',
    role: {
      simple:
        'A loader a program creates itself, here to load plugins from a folder. It always asks its parent first, so it only loads what nobody above it has.',
      developer:
        'A plain `URLClassLoader` over `plugin/`. It keeps `ClassLoader.loadClass`: `findLoadedClass`, then `parent.loadClass`, then `findClass`. The plugin folder also holds a copy of `Message`, but the copy on the class path wins.',
      deep: 'JVMS §5.3.2: the JVM invokes `loadClass` on a user-defined loader and takes the class it returns; the defining loader is the one that called `defineClass`. The classic algorithm is `java.lang.ClassLoader.loadClass` (JDK 25 source). Each user-defined loader is its own namespace.',
    },
    scope: 'The plugin directory',
    policyLabel: 'Already loaded? Parent first, then its own folder',
    component: 'custom-loaders',
    evidence: ['delegation-output'],
    references: [
      { source: 'jvms-5.3.2' },
      { source: 'src-classloader' },
      { source: 'api-classloader' },
    ],
  },
  'child-first': {
    id: 'child-first',
    title: 'User-defined loader, child first',
    plateTitle: 'Child-first loader',
    javaView: 'new ChildFirstLoader("child-first", urls, app)',
    implementation: 'ChildFirstLoader (overrides loadClass)',
    kindLabel: 'User-defined',
    provenance: 'spec',
    role: {
      simple:
        'A loader that looks in its own folder before asking its parent. Plugin systems and servers use this so each plugin can bring its own version of a library.',
      developer:
        'It overrides `loadClass`: `findLoadedClass`, then `findClass` in `plugin/`, and the parent only if that fails. `java.*` names always go to the parent: `defineClass` refuses them in any loader but the JDK’s platform loader (`Prohibited package name`).',
      deep: 'Overriding `loadClass` is legal; the JVM only requires a consistent answer for each name (JVMS §5.3.2) and enforces loading constraints (§5.3.4) where types meet. Defining its own `com.example.shared.Message` gives a second run-time class named `Message`: same binary name, different defining loader.',
    },
    scope: 'The plugin directory, before the parent',
    policyLabel: 'Already loaded? Its own folder first (except java.*), then the parent',
    component: 'custom-loaders',
    evidence: ['child-first-java', 'delegation-output'],
    references: [{ source: 'jvms-5.3.2' }, { source: 'jvms-5.3.4' }, { source: 'src-classloader' }],
  },
};

/** Where classes come from. */
export const SOURCE_PROFILES: Record<
  string,
  { title: string; provenance: Provenance; text: string; owner: LoaderId[] }
> = {
  'runtime-image': {
    title: 'Runtime image',
    provenance: 'platform',
    text: 'The JDK’s own classes, in `lib/modules` (a jimage file, JEP 220). The boot loader also maps many of them from the CDS archive.',
    owner: ['bootstrap', 'platform', 'app'],
  },
  'class-path': {
    title: 'Class path',
    provenance: 'platform',
    text: 'Directories and JAR files given with `-cp`. Here, `app/` holds `Delegation`, `Message` and `Bus`.',
    owner: ['app'],
  },
  'plugin-dir': {
    title: 'Plugin directory',
    provenance: 'platform',
    text: '`plugin/` holds `Greeter` and its own copy of `Message`, compiled from the same source.',
    owner: ['parent-first', 'child-first'],
  },
};

/** Class names the request composer offers, with what they are. */
export const CLASS_CHOICES: { name: string; note: string }[] = [
  { name: 'java.lang.String', note: 'java.base, a boot module' },
  { name: 'java.util.logging.Logger', note: 'java.logging, a boot module' },
  { name: 'java.sql.Connection', note: 'java.sql, a platform module' },
  { name: 'com.sun.tools.javac.Main', note: 'jdk.compiler, defined to the application loader' },
  { name: 'com.example.shared.Message', note: 'on the class path and in plugin/' },
  { name: 'com.example.shared.Bus', note: 'on the class path' },
  { name: 'com.example.plugin.Greeter', note: 'only in plugin/' },
  { name: 'com.example.Missing', note: 'nowhere' },
];

/** A guided delegation experiment. */
export interface DelegationExperiment {
  id: string;
  title: string;
  question: string;
  /** Requests run first, so the JVM is in the right state. */
  setup: LoadRequest[];
  request: LoadRequest;
  prediction: ExperimentPrediction;
  explanation: LeveledText;
  evidence: string[];
  references: Citation[];
}

const cls = (loader: LoaderId, name: string): LoadRequest => ({ kind: 'class', loader, name });

const whoDefines = (
  prompt: string,
  correct: LoaderId | 'none',
  feedback: string,
  choices: (LoaderId | 'none')[] = ['app', 'platform', 'bootstrap'],
): ExperimentPrediction => ({
  prompt,
  options: choices.map((id) => ({
    id,
    text:
      id === 'none'
        ? 'No loader: the class is not found'
        : `The ${LOADER_PROFILES[id].title.charAt(0).toLowerCase()}${LOADER_PROFILES[id].title.slice(1)}`,
    correct: id === correct,
    feedback,
  })),
});

export const DELEGATION_EXPERIMENTS: DelegationExperiment[] = [
  {
    id: 'string',
    title: 'Where does String come from?',
    question: 'Your code asks the application loader for `java.lang.String`. Who defines it?',
    setup: [],
    request: cls('app', 'java.lang.String'),
    prediction: whoDefines(
      'The application loader is asked for `java.lang.String`. Which loader defines the class you get?',
      'bootstrap',
      'The bootstrap loader defined `String` when the JVM started. The application loader looks up the package, finds `java.base`, and passes the request straight to the boot loader, which already has it.',
    ),
    explanation: {
      simple:
        'Core classes always come from the JVM’s own loader. Your loader is asked, but it hands the job to the loader that owns the core classes, which had `String` ready from the start.',
      developer:
        '`String.class.getClassLoader()` prints `null`, the bootstrap loader. The application loader recognizes `java.lang` as a package of `java.base` and delegates to the boot loader; a `java/lang/String.class` on your class path would never be read.',
      deep: '`BuiltinClassLoader.loadClassOrNull`: `findLoadedClass` misses, `findLoadedModule` maps `java.lang` to `java.base`, whose loader is `BOOT_LOADER`, so `loader.loadClassOrNull(cn)` is called on it and it answers with `findBootstrapClassOrNull`. The JVM then records the application loader as an initiating loader of `String` (JVMS §5.3).',
    },
    evidence: ['loaders-output'],
    references: [{ source: 'src-builtin-classloader' }, { source: 'jvms-5.3.1' }],
  },
  {
    id: 'logging',
    title: 'One parent at a time?',
    question: 'Does a request for `java.util.logging.Logger` pass through the platform loader?',
    setup: [],
    request: cls('app', 'java.util.logging.Logger'),
    prediction: {
      prompt:
        'The application loader’s parent is the platform loader. On its way to the loader that defines `java.util.logging.Logger`, does the request pass through the platform loader?',
      options: [
        {
          id: 'yes',
          text: 'Yes: application, then platform, then bootstrap, one parent at a time',
          correct: false,
          feedback:
            'That is the classic parent-first picture, but the built-in loaders look up the module first. `java.logging` is a boot module, so the request goes straight to the boot loader.',
        },
        {
          id: 'no',
          text: 'No: it goes straight to the loader that owns the module',
          correct: true,
          feedback:
            'Right. `java.util.logging` belongs to `java.logging`, a module defined to the boot loader, so the application loader delegates to it directly. The platform loader is never involved.',
        },
      ],
    },
    explanation: {
      simple:
        'The JDK’s loaders keep a table of which loader owns which part of the platform. They send a request straight to the owner instead of climbing step by step.',
      developer:
        'Run `Loaders.java`: `java.util.logging.Logger` is defined by the bootstrap loader (`null`). In the steps above, the platform loader never appears.',
      deep: 'Since JDK 9 the built-in loaders share one static `packageToModule` map for the boot layer. `loadClassOrNull` delegates to `loadedModule.loader()`, which is any built-in loader, not necessarily the parent. Parent-first applies only to packages in no named module.',
    },
    evidence: ['loaders-output'],
    references: [{ source: 'src-builtin-classloader' }, { source: 'jep-261' }],
  },
  {
    id: 'sql',
    title: 'A platform module',
    question: 'Who defines `java.sql.Connection`?',
    setup: [],
    request: cls('app', 'java.sql.Connection'),
    prediction: whoDefines(
      'Your code asks for `java.sql.Connection`. Which loader defines it?',
      'platform',
      '`java.sql` is a platform module, defined to the platform loader. The application loader routes the request there, and the platform loader reads the class from the runtime image.',
    ),
    explanation: {
      simple:
        'The database classes are part of Java, but not of its core. A middle loader, the platform loader, is responsible for them.',
      developer:
        '`java.sql.Connection.class.getClassLoader()` prints `jdk.internal.loader.ClassLoaders$PlatformClassLoader@…` and `getModule()` prints `module java.sql`.',
      deep: '`java.sql` is in `PLATFORM_MODULES` of `module-loader-map.conf`. The platform loader finds the class with `findClassInModuleOrNull` in the runtime image and defines it; the JVM records the application loader as an initiating loader once the request returns.',
    },
    evidence: ['loaders-output'],
    references: [{ source: 'src-module-loader-map' }, { source: 'api-classloader' }],
  },
  {
    id: 'down',
    title: 'Can a parent ask its child?',
    question: 'The platform loader is asked for `com.sun.tools.javac.Main`. What happens?',
    setup: [],
    request: cls('platform', 'com.sun.tools.javac.Main'),
    prediction: whoDefines(
      'The platform loader is asked for `com.sun.tools.javac.Main`, the Java compiler’s entry point. Which loader defines it?',
      'app',
      'The application loader. `jdk.compiler` is a JDK module defined to the application loader, so the platform loader delegates down to its own child. Real JDK 25 output confirms it.',
      ['platform', 'app', 'none'],
    ),
    explanation: {
      simple:
        'Delegation is not a one-way street. If the part of Java that holds a class belongs to a loader further down, the request goes down to it.',
      developer:
        '`ClassLoader.getPlatformClassLoader().loadClass("com.sun.tools.javac.Main")` returns a class defined by `app`, the same `Class` object your code gets.',
      deep: 'JDK modules that are neither boot nor platform modules are defined to the application loader. Because `packageToModule` is shared, the platform loader finds `jdk.compiler` and calls the application loader’s `loadClassOrNull`. The `ClassLoader` API documentation allows this: the platform loader may delegate to the application loader for modules defined to it.',
    },
    evidence: ['loaders-output'],
    references: [{ source: 'src-builtin-classloader' }, { source: 'api-classloader' }],
  },
  {
    id: 'own',
    title: 'Your own class',
    question: 'How does the application loader find a class on the class path?',
    setup: [],
    request: cls('app', 'com.example.shared.Message'),
    prediction: {
      prompt:
        '`com.example.shared.Message` is on the class path. What does the application loader do first?',
      options: [
        {
          id: 'search',
          text: 'It searches the class path straight away',
          correct: false,
          feedback:
            'Not yet. The package is in no named module, so the application loader asks its parent first. Only after the platform and boot loaders come back empty does it search the class path.',
        },
        {
          id: 'parent',
          text: 'It asks its parent; only if that fails does it search the class path',
          correct: true,
          feedback:
            'Right. Parent first for packages in no named module: the boot loader searches and misses, the platform loader has no class path, and then the application loader finds `Message` in `app/`.',
        },
      ],
    },
    explanation: {
      simple:
        'For your own classes the old rule applies: ask the parent first, search yourself only if the parent has nothing.',
      developer:
        'The log line `com.example.shared.Message source: file:/…/app/` shows where the bytes came from. A class with a JDK package name on the class path would be ignored, because the module lookup comes first.',
      deep: '`findLoadedModule` returns null for `com.example.shared`, so `parent.loadClassOrNull` runs (platform, then the boot loader through `BootClassLoader`), and only then `findClassOnClassPathOrNull` defines the class from `URLClassPath`.',
    },
    evidence: ['delegation-log'],
    references: [{ source: 'src-builtin-classloader' }, { source: 'jvms-5.3.2' }],
  },
  {
    id: 'parent-first',
    title: 'A plugin loader, parent first',
    question:
      'Both the class path and the plugin folder hold `Message`. Which copy does a parent-first plugin loader get?',
    setup: [cls('app', 'com.example.shared.Message')],
    request: cls('parent-first', 'com.example.shared.Message'),
    prediction: whoDefines(
      'The parent-first plugin loader is asked for `com.example.shared.Message`, which exists in `plugin/` and on the class path. Which loader defines the class it returns?',
      'app',
      'The application loader. Parent first means the class path copy wins, so the plugin loader never reads its own `Message.class`.',
      ['parent-first', 'app', 'bootstrap'],
    ),
    explanation: {
      simple:
        'A parent-first loader is polite: anything its parent can provide, it takes from the parent. Its own copy is never used.',
      developer:
        'Real output: `parent-first.loadClass("com.example.shared.Message") -> defined by app`. The application loader had already loaded it, so its `findLoadedClass` answered at once.',
      deep: '`ClassLoader.loadClass` delegates before `findClass`. The JVM records `parent-first` as an initiating loader of `Message@app`; the application loader is the defining loader. The platform loader, which the request never reached, records nothing.',
    },
    evidence: ['delegation-output', 'delegation-log'],
    references: [{ source: 'src-classloader' }, { source: 'jvms-5.3' }],
  },
  {
    id: 'plugin',
    title: 'A class only the plugin has',
    question: 'Who defines `com.example.plugin.Greeter`?',
    setup: [],
    request: cls('parent-first', 'com.example.plugin.Greeter'),
    prediction: whoDefines(
      '`Greeter` exists only in `plugin/`. Asked by the parent-first loader, which loader defines it?',
      'parent-first',
      'The parent-first loader itself: every parent misses, so its own `findClass` reads `plugin/com/example/plugin/Greeter.class` and defines it.',
      ['parent-first', 'app', 'none'],
    ),
    explanation: {
      simple:
        'When nobody above has the class, the plugin loader looks in its own folder and builds the class itself.',
      developer:
        'Real output: `parent-first.loadClass("com.example.plugin.Greeter") -> defined by parent-first`, and the log shows `source: file:/…/plugin/`.',
      deep: 'The delegation returns `ClassNotFoundException` from the application loader, which `ClassLoader.loadClass` catches; `findClass` then calls `defineClass`, making `parent-first` the defining loader of `Greeter`.',
    },
    evidence: ['delegation-output', 'delegation-log'],
    references: [{ source: 'src-classloader' }, { source: 'jvms-5.3.2' }],
  },
  {
    id: 'child-first',
    title: 'Same name, two classes',
    question:
      'A child-first loader is asked for `com.example.shared.Message`. Is it the same class the application loader has?',
    setup: [cls('app', 'com.example.shared.Message')],
    request: cls('child-first', 'com.example.shared.Message'),
    prediction: {
      prompt:
        'The application loader has already loaded `com.example.shared.Message`. The child-first loader is now asked for the same name. What does it return?',
      options: [
        {
          id: 'same',
          text: 'The same class: a name means one class in the whole JVM',
          correct: false,
          feedback:
            'Not here. The child-first loader looks in `plugin/` first, finds a `Message.class` there and defines it. The result is a second class with the same name.',
        },
        {
          id: 'second',
          text: 'A second class with the same name, defined by the child-first loader',
          correct: true,
          feedback:
            'Right. A run-time class is its name and its defining loader. `Message@app` and `Message@child-first` are two classes; a cast between them throws `ClassCastException`.',
        },
      ],
    },
    explanation: {
      simple:
        'Two loaders can each build a class with the same name. For Java they are two different classes, like two people with the same name.',
      developer:
        'Real output: `same runtime class: false`, then `ClassCastException: class com.example.shared.Message cannot be cast to class com.example.shared.Message`, with the two loaders named in the message.',
      deep: 'JVMS §5.3: a class is determined by its binary name and its defining loader. Two namespaces now map `Message` to different classes. The JVM allows this; it only intervenes, with loading constraints, when the two meet in a shared signature (try the next experiment).',
    },
    evidence: ['delegation-output', 'child-first-java'],
    references: [{ source: 'jvms-5.3' }, { source: 'jvms-5.3.2' }],
  },
  {
    id: 'java-prefix',
    title: 'A child-first loader and java.*',
    question: 'Can a child-first loader bring its own `java.lang.String`?',
    setup: [],
    request: cls('child-first', 'java.lang.String'),
    prediction: whoDefines(
      'The child-first loader is asked for `java.lang.String`. Which loader defines what it returns?',
      'bootstrap',
      'The bootstrap loader. The child-first loader sends `java.*` names to its parent: no user-defined loader may define a class in a `java.*` package, and `defineClass` would throw `SecurityException: Prohibited package name`.',
      ['child-first', 'app', 'bootstrap'],
    ),
    explanation: {
      simple:
        'No loader you write can replace Java’s own classes. Even a loader that prefers its own copies passes these to the JVM’s loaders.',
      developer:
        'Real output: `child-first.loadClass("java.lang.String") -> defined by the bootstrap loader`. Trying to define `java.lang.Future` in a user-defined loader fails with `SecurityException: Prohibited package name: java.lang`.',
      deep: '`ClassLoader.preDefineClass` rejects names in `java.*` unless the loader is the platform loader (JDK 25 source). Well-behaved child-first loaders therefore delegate `java.*` before trying their own sources.',
    },
    evidence: ['delegation-output', 'prohibited-output'],
    references: [{ source: 'src-classloader' }],
  },
  {
    id: 'missing',
    title: 'A class nobody has',
    question: 'What happens when no loader can find a class?',
    setup: [],
    request: cls('parent-first', 'com.example.Missing'),
    prediction: whoDefines(
      'The parent-first loader is asked for `com.example.Missing`, which exists nowhere. What happens?',
      'none',
      'Every loader looks and comes back empty, then the loader that was asked throws `ClassNotFoundException`. If the JVM itself was resolving a reference in your code, it reports `NoClassDefFoundError` with that exception as the cause.',
      ['none', 'app', 'parent-first'],
    ),
    explanation: {
      simple:
        'If nobody finds the class, the program gets an error naming the missing class. The JVM does not guess or create an empty one.',
      developer:
        '`Class.forName` and `loadClass` throw `ClassNotFoundException`. Code that was compiled against a class that has since disappeared gets `NoClassDefFoundError` instead, with the `ClassNotFoundException` as its cause. Both real outputs are under the investigations below.',
      deep: 'Each `loadClassOrNull` returns null, and the classic `loadClass` turns that into `ClassNotFoundException` once `findClass` fails too. When the JVM itself needed the class, the failure becomes a `LinkageError` at the point of use (JVMS §5.3): HotSpot throws `NoClassDefFoundError` with the loader’s exception as its cause, as the real run shows. A failed resolution is remembered and rethrown on later attempts (JVMS §5.4.3).',
    },
    evidence: ['delegation-output', 'cnfe-output', 'ncdfe-output'],
    references: [{ source: 'jvms-5.3.2' }, { source: 'jvms-5.4.3' }, { source: 'src-classloader' }],
  },
  {
    id: 'constraint',
    title: 'A loading constraint',
    question:
      'The plugin’s `Greeter` calls `Bus.send(Message)`. The plugin and the application each have their own `Message`. What happens?',
    setup: [
      cls('app', 'com.example.shared.Message'),
      cls('child-first', 'com.example.plugin.Greeter'),
      cls('child-first', 'com.example.shared.Message'),
    ],
    request: { kind: 'member', member: 'bus-send' },
    prediction: {
      prompt:
        '`Greeter` (child-first) calls `Bus.send(Message)`; `Bus` comes from the application loader. Each side already has its own `Message`. What does the JVM do?',
      options: [
        {
          id: 'works',
          text: 'The call works: both classes are called Message',
          correct: false,
          feedback:
            'No: the two loaders mean different classes by `Message`, so `Bus.send` would receive an object of a class it does not know. The JVM refuses before the call happens.',
        },
        {
          id: 'cce',
          text: 'Bus.send throws ClassCastException when it uses the message',
          correct: false,
          feedback:
            'The JVM stops it earlier: while resolving the method reference, before any code of `Bus.send` runs.',
        },
        {
          id: 'linkage',
          text: 'Resolving the call fails with LinkageError: loader constraint violation',
          correct: true,
          feedback:
            'Right. When `Greeter` resolves `Bus.send(Message)`, `Message` must mean the same class to the child-first loader and to the application loader. It does not, so the JVM throws `LinkageError`.',
        },
      ],
    },
    explanation: {
      simple:
        'When two loaders share a method, they must agree on what the names in it mean. If they disagree, the JVM stops the call instead of letting a wrong object through.',
      developer:
        "The real message names the method, both loaders and the type: `loader constraint violation: when resolving method 'void com.example.shared.Bus.send(com.example.shared.Message)' … have different Class objects for the type com/example/shared/Message`. The fix is to share `Message` through the parent: leave it out of `plugin/` or make the loader parent-first for that package.",
      deep: 'JVMS §5.4.3.3 and §5.3.4: resolving a method declared by a class of loader L2 from a class of loader L1 imposes `Message^L1 = Message^L2`. Both loaders already have different classes for `Message`, so resolution throws `LinkageError`. Had one of them not loaded `Message` yet, HotSpot would record the constraint and enforce it when that loader loads `Message` (`SystemDictionary::check_constraints`).',
    },
    evidence: ['greeter-java', 'delegation-output'],
    references: [
      { source: 'jvms-5.3.4' },
      { source: 'jvms-5.4.3' },
      { source: 'src-systemdictionary' },
    ],
  },
  {
    id: 'again',
    title: 'Asking twice',
    question:
      'What happens the second time the application loader is asked for `java.sql.Connection`?',
    setup: [cls('app', 'java.sql.Connection')],
    request: cls('app', 'java.sql.Connection'),
    prediction: {
      prompt:
        'The application loader was asked for `java.sql.Connection` a moment ago. It is asked again. What happens?',
      options: [
        {
          id: 'repeat',
          text: 'The whole delegation runs again',
          correct: false,
          feedback:
            'No. The JVM recorded the application loader as an initiating loader of the class the first time, so `findLoadedClass` answers at once.',
        },
        {
          id: 'cached',
          text: 'findLoadedClass answers at once, with the same class',
          correct: true,
          feedback:
            'Right. One check, no delegation, the same `Class` object. That is why a name always means the same class to one loader.',
        },
      ],
    },
    explanation: {
      simple: 'The loader remembers what it was given. The second time, the answer is immediate.',
      developer:
        '`findLoadedClass(name)` returns the class if the JVM recorded this loader as an initiating loader of it. Every loader’s `loadClass` starts there.',
      deep: 'JVMS §5.3: after a loader initiates loading of a class, the JVM records it as an initiating loader; `findLoadedClass` consults that record (HotSpot: the loader’s `Dictionary`). The request in this experiment ends after one step.',
    },
    evidence: [],
    references: [{ source: 'jvms-5.3' }, { source: 'api-classloader' }],
  },
];

/** The class the Lifecycle Microscope follows, as javac 25.0.4 compiled it. */
export const CONFIG_MODEL: ClassModel = {
  name: 'Config',
  fields: [
    { name: 'count', type: 'int', defaultValue: '0', value: '3' },
    { name: 'label', type: 'String', defaultValue: 'null', value: 'ready' },
    { name: 'LIMIT', type: 'int', defaultValue: '0', value: '42', constant: true },
  ],
  entries: [
    { index: 44, text: 'String LIMIT = 42' },
    { index: 46, text: 'Fieldref Config.count:I' },
    { index: 53, text: 'Fieldref Config.label:Ljava/lang/String;' },
  ],
};

export interface LifecycleStep {
  id: string;
  title: string;
  /** The JVMS phase this step belongs to, as the phase rail shows it. */
  phase: 'running' | 'loading' | 'preparation' | 'resolution' | 'verification' | 'initialization';
  actions: LifecycleAction[];
  /** 1-based lines of Lifecycle.java to highlight. */
  lines: number[];
  /** The instruction that causes this step, when there is one. */
  instruction?: string;
  text: LeveledText;
}

/**
 * The microscope's walkthrough. Every output and log line comes from the real
 * run (LIFECYCLE_LOG); a unit test checks that the model replays it exactly.
 */
export const LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    id: 'start',
    title: 'main starts',
    phase: 'running',
    actions: [
      {
        kind: 'log',
        lines: [
          '[0.020s][info][class,load] Lifecycle source: file:/…/',
          '[0.020s][info][class,init] Start class verification for: Lifecycle',
          '[0.020s][info][class,init] End class verification for: Lifecycle',
          `[0.020s][info][class,init] 311 Initializing 'Lifecycle'(no method) (0x0000000076040000) by thread "main"`,
        ],
      },
      { kind: 'print', text: 'main started' },
    ],
    lines: [3],
    text: {
      simple:
        'The program is running, but nothing has needed `Config` yet, so the JVM has not even looked for it.',
      developer:
        'Only the main class, `Lifecycle`, has been loaded, verified and initialized: the first four log lines. `Config` is still just a name in `Lifecycle`’s constant pool.',
      deep: 'JVMS §5.2: the JVM creates, links and initializes the initial class, then invokes `main`. Every other class waits for a reason to be loaded. In the log, `Lifecycle` is verified and initialized before `main started` is printed.',
    },
  },
  {
    id: 'load',
    title: 'Loading: Class.forName("Config", false, loader)',
    phase: 'loading',
    actions: [
      { kind: 'load', log: ['[0.020s][info][class,load] Config source: file:/…/'] },
      { kind: 'print', text: 'loaded Config; not initialized yet' },
    ],
    lines: [4, 5],
    instruction: '16: invokestatic #31 // Method java/lang/Class.forName',
    text: {
      simple:
        'The class loader finds `Config.class`, and the JVM builds a class from its bytes. The `false` means: load it, but do not set it up yet.',
      developer:
        '`Class.forName(name, false, loader)` loads the class and returns it without initializing it: its static block has not run, so `<clinit> starts` is not printed yet.',
      deep: 'JVMS §5.3: the application loader creates `Config` (after delegating; it is in no named module) and the log records the source. HotSpot parses the bytes into an `InstanceKlass` in Metaspace and creates the `java.lang.Class` mirror in the heap. `forName` with `initialize = false` is not an initialization trigger (JLS §12.4.1).',
    },
  },
  {
    id: 'prepare',
    title: 'Preparation: static fields with default values',
    phase: 'preparation',
    actions: [{ kind: 'prepare' }],
    lines: [17, 18, 19],
    text: {
      simple:
        'Room for the class’s shared variables is set aside, each with a default: `0` for numbers, `null` for references. The values in the code are not there yet.',
      developer:
        '`count` is `0`, `label` is `null`, and in the specification’s model even `LIMIT` is still `0`. Preparation runs no Java code.',
      deep: 'JVMS §5.4.2: preparation creates the static fields and gives them default values, at any time after creation and before initialization. HotSpot (JDK 25) does it while creating the mirror during loading: static fields live in the `java.lang.Class` object, zero-filled, and `ConstantValue` constants such as `LIMIT` are written there at the same moment (`javaClasses.cpp`, `initialize_mirror_fields`), where the JVMS model assigns them in initialization step 6. No program can see the difference: reading a static field initializes the class first.',
    },
  },
  {
    id: 'constant',
    title: 'A constant needs no class',
    phase: 'running',
    actions: [
      { kind: 'resolve', entry: 44 },
      { kind: 'print', text: 'LIMIT = 42' },
    ],
    lines: [6],
    instruction: '38: ldc #44 // String LIMIT = 42',
    text: {
      simple:
        '`LIMIT` is a fixed number known when the program was compiled. The compiler copied `42` into the code, so printing it does not need `Config` at all.',
      developer:
        '`static final int LIMIT = 42` is a constant variable, and javac folded `"LIMIT = " + Config.LIMIT` into one string: `ldc #44 // String LIMIT = 42`. No instruction names `Config`, so nothing triggers initialization.',
      deep: 'JLS §13.1: a reference to a constant variable is compiled to its value, and JLS §12.4.1 excludes constant variables from the initialization triggers. Executing `ldc #44` resolves a string constant of `Lifecycle`, which involves no other class. `Config` keeps the field with a `ConstantValue` attribute (JVMS §4.7.2), applied when the class is initialized.',
    },
  },
  {
    id: 'resolve',
    title: 'Resolution: getstatic Config.count',
    phase: 'resolution',
    actions: [{ kind: 'resolve', entry: 46 }],
    lines: [7],
    instruction: '46: getstatic #46 // Field Config.count:I',
    text: {
      simple:
        'Now the code really reads one of `Config`’s variables. First the JVM looks up what the name `Config.count` points to, and remembers the answer.',
      developer:
        '`getstatic #46` is the first instruction that names a field of `Config`. Its constant pool entry is resolved now, the first time it runs, not when `Lifecycle` was linked; `#53` (`Config.label`) is still symbolic.',
      deep: 'JVMS §5.4.3.2: field resolution resolves the class reference (`Config`, already loaded) and finds the field. Resolution belongs to linking, here of `Lifecycle`; HotSpot resolves each entry lazily, on first execution, and caches the result in `Lifecycle`’s constant pool cache.',
    },
  },
  {
    id: 'verify',
    title: 'Verification: just before initialization',
    phase: 'verification',
    actions: [
      {
        kind: 'verify',
        log: [
          '[0.026s][info][class,init] Start class verification for: Config',
          '[0.026s][info][class,init] End class verification for: Config',
        ],
      },
    ],
    lines: [12],
    text: {
      simple:
        'Before running any of `Config`’s code, the JVM checks its bytecode for anything unsafe.',
      developer:
        'The log shows verification only now, after `LIMIT = 42` was printed: HotSpot links a class when it is about to be initialized, not when it is loaded, so `Class.forName(…, false, …)` skipped it.',
      deep: 'JVMS §5.4 lets an implementation link lazily, as long as a class is verified and prepared before it is initialized. HotSpot links at the first initialization trigger (`InstanceKlass::link_class`) and verifies with the type-checking verifier and the `StackMapTable` (JVMS §4.10.1).',
    },
  },
  {
    id: 'clinit',
    title: 'Initialization: constants, then <clinit>',
    phase: 'initialization',
    actions: [
      {
        kind: 'begin-init',
        log: [
          `[0.026s][info][class,init] 479 Initializing 'Config' (0x0000000076040210) by thread "main"`,
        ],
      },
      { kind: 'assign-constants' },
      { kind: 'print-statics', template: '<clinit> starts: count = {count}, label = {label}' },
    ],
    lines: [13, 14],
    instruction: '<clinit> 0–14: getstatic count, getstatic label, println',
    text: {
      simple:
        'The class’s setup code runs now, top to bottom. Its first line prints the variables, and they still hold their defaults: `0` and `null`.',
      developer:
        'Reading a static field that `Config` declares is an initialization trigger. The static block comes first in the source, so `<clinit>` prints before the field initializers below it have run: `count = 0, label = null`.',
      deep: 'JVMS §5.5: the thread takes `Config`’s initialization lock and marks it as being initialized by itself; step 6 assigns the `ConstantValue` fields (`LIMIT = 42`), step 7 makes sure the superclass (`Object`) is initialized, and step 9 runs `<clinit>`. Its first instructions, `getstatic #13` and `getstatic #19`, read the prepared defaults.',
    },
  },
  {
    id: 'assign',
    title: 'Initializers run in textual order',
    phase: 'initialization',
    actions: [
      { kind: 'assign', field: 'count' },
      { kind: 'assign', field: 'label' },
      { kind: 'finish-init' },
    ],
    lines: [17, 18],
    instruction: '<clinit> 17–23: iconst_3 putstatic count, ldc "ready" putstatic label',
    text: {
      simple:
        'Now the values written in the code are stored: `count` becomes `3`, `label` becomes `ready`. The class is ready.',
      developer:
        'javac compiled the field initializers into `<clinit>` after the static block: `iconst_3; putstatic count`, then `ldc "ready"; putstatic label`. When `<clinit>` returns, `Config` is initialized.',
      deep: 'JLS §12.4.2 step 9: class variable initializers and static initializers run in textual order. On normal completion the class is marked fully initialized and waiting threads are notified (step 10).',
    },
  },
  {
    id: 'done',
    title: 'Back in main: the class is ready',
    phase: 'running',
    actions: [
      { kind: 'print-statics', template: 'count = {count}' },
      { kind: 'resolve', entry: 53 },
      { kind: 'print-statics', template: 'label = {label}' },
    ],
    lines: [7, 8],
    instruction: '60: getstatic #53 // Field Config.label:Ljava/lang/String;',
    text: {
      simple:
        'The program reads `count` and gets `3`. The class is ready, so later uses need no setup at all.',
      developer:
        'The `getstatic` that started initialization completes and reads `3`. The next line resolves `#53` (`Config.label`) on first use; no initialization is needed any more.',
      deep: 'Later `getstatic` and `putstatic` instructions on `Config` find the class initialized and use the resolved entries cached in `Lifecycle`’s constant pool cache; the values themselves live in `Config`’s mirror.',
    },
  },
];

export type ClassLoadingStationId = 'observatory' | 'delegation' | 'lifecycle';

export const CLASS_LOADING_STATIONS: LabStation<ClassLoadingStationId>[] = [
  {
    id: 'observatory',
    title: 'Loader observatory',
    scale: 'Subsystem',
    question: 'Who loads the classes of a running Java program?',
    summary: 'The loaders of one JVM, what each searches, and the classes each has defined.',
    prediction: {
      prompt:
        'A running Java program uses `java.lang.String`, `java.sql.Connection` and your own class `Delegation`. How many different class loaders defined them?',
      options: [
        {
          id: 'one',
          text: 'One: the JVM has a single class loader',
          correct: false,
          feedback:
            'There are at least three: the bootstrap loader defined `String`, the platform loader `java.sql.Connection`, and the application loader `Delegation`.',
        },
        {
          id: 'three',
          text: 'Three: one for core classes, one for platform modules, one for your code',
          correct: true,
          feedback:
            'Right: bootstrap, platform and application. Programs can add their own loaders on top, like the two plugin loaders in this observatory.',
        },
      ],
    },
    tryIt:
      'Select a loader to see what it is responsible for, where it searches and which classes it holds. Switch to the 3D model to turn the structure around.',
    explanation: {
      simple:
        'The JVM does not load every class the same way. A chain of **class loaders** shares the work: one for the JVM’s core classes, one for the rest of the Java platform, one for your program, and any number that programs create themselves. Each loader can only see what it loaded and what its parents give it.',
      developer:
        '`getClassLoader()` tells you who defined a class: `null` for the bootstrap loader, `platform`, `app`, or a loader your code created. `getParent()` gives the delegation chain: `app` → `platform` → bootstrap (`null`). Each loader is a namespace: the same class name can exist once per loader.',
      deep: 'JVMS §5.3 distinguishes the bootstrap loader from user-defined loaders; the Java SE API adds the platform and system (application) loaders, implemented in OpenJDK 25 by `jdk.internal.loader.ClassLoaders` as `BuiltinClassLoader`s. A run-time class is the pair (binary name, defining loader). HotSpot keeps each loader’s classes in its `ClassLoaderData`, whose `Dictionary` holds the classes the loader initiated; class metadata goes to Metaspace, the `Class` mirror to the heap.',
    },
    term: {
      glossaryId: 'defining-loader',
      term: 'Defining loader',
      definition:
        'The loader that actually created a class from its bytes. Together with the class name, it is the class’s identity.',
    },
    check: {
      id: 'cl-observatory-check',
      kind: 'concept',
      prompt: 'Why does `String.class.getClassLoader()` return `null`?',
      options: [
        {
          id: 'a',
          text: '`String` has no class loader: it is built into the language',
          correct: false,
          explanation:
            '`String` is an ordinary class with a defining loader: the bootstrap loader.',
        },
        {
          id: 'b',
          text: 'The bootstrap loader that defined it is part of the JVM and has no Java object',
          correct: true,
          explanation:
            'The Java API represents the bootstrap loader as `null`, because it is implemented inside the JVM, not as a `ClassLoader` object.',
        },
        {
          id: 'c',
          text: 'The class was loaded before any loader existed',
          correct: false,
          explanation:
            'It was loaded early, by the bootstrap loader, which exists from the very start.',
        },
      ],
    },
    component: 'class-loader-subsystem',
    listings: [E.LOADERS_JAVA, E.LOADERS_OUTPUT, E.LOADERS_LOG, E.CLASSLOADERS_TREE],
    accuracyNote:
      'A teaching selection, not every loader of a real JVM: real programs often have more user-defined loaders, and hidden classes (lambdas, for example) have no name a loader can be asked for. The positions show delegation, not memory. Loader, module and class names are the ones in the real runs of `Loaders.java` and `Delegation.java` on JDK 25.0.4.',
    references: [
      { source: 'jvms-5.3' },
      { source: 'api-classloader' },
      { source: 'src-classloaders' },
      { source: 'src-classloaderdata' },
    ],
  },
  {
    id: 'delegation',
    title: 'Delegation laboratory',
    scale: 'One request',
    question: 'What happens, step by step, when the JVM asks a loader for a class?',
    summary: 'Send a request through the hierarchy and watch every check, hand-off and definition.',
    tryIt:
      'Pick a guided experiment, make your prediction, then step through the request. Or ask any loader for any class and watch the result change what each loader knows.',
    explanation: {
      simple:
        'A request travels between loaders before any class file is read. Each loader first checks what it already has, then usually asks another loader, and only searches its own files if that fails. The loader that finally builds the class is part of its identity.',
      developer:
        'Two algorithms are at work. User-defined loaders inherit `ClassLoader.loadClass`: `findLoadedClass`, `parent.loadClass`, `findClass`. The JDK’s own loaders (`BuiltinClassLoader`) look up the package’s module first and go straight to the loader that owns it; only packages in no named module go to the parent and then the class path. A loader that overrides `loadClass` can choose child-first.',
      deep: 'JVMS §5.3.1–5.3.2: the JVM asks the bootstrap loader directly or invokes `loadClass` on a user-defined loader; when the request returns, it records the requested loader as an initiating loader (HotSpot: `SystemDictionary::load_instance_class`, which also checks loading constraints and records a dependency on the defining loader). Loaders that only passed the request on are not recorded. Loading constraints (§5.3.4) are imposed during field and method resolution across loaders.',
    },
    term: {
      glossaryId: 'initiating-loader',
      term: 'Initiating loader',
      definition:
        'The loader the JVM asked for a class. It may hand the job on, but it is recorded as knowing the answer.',
    },
    check: {
      id: 'cl-delegation-check',
      kind: 'concept',
      prompt:
        'A parent-first plugin loader is asked for a class that both its own folder and the class path contain. Which copy is used?',
      options: [
        {
          id: 'a',
          text: 'The plugin folder’s copy, because the plugin loader was asked',
          correct: false,
          explanation:
            'Parent first: the application loader is asked before the plugin loader searches, and it finds the class path copy.',
        },
        {
          id: 'b',
          text: 'The class path copy, defined by the application loader',
          correct: true,
          explanation:
            'The classic `loadClass` asks the parent before `findClass`. The plugin loader becomes an initiating loader of the application loader’s class.',
        },
        {
          id: 'c',
          text: 'Both: the JVM loads both copies and picks one at run time',
          correct: false,
          explanation:
            'A request returns exactly one class. The plugin loader never reads its own copy in this case.',
        },
      ],
    },
    component: 'parent-delegation',
    listings: [E.DELEGATION_JAVA, E.CHILD_FIRST_JAVA, E.DELEGATION_OUTPUT, E.DELEGATION_LOG],
    accuracyNote:
      'A deterministic model of the JDK 25 algorithms, checked against the real runs above. It leaves out locking (each loader synchronizes per class name), the class data sharing archive’s shortcuts, hidden classes, and the classes the JVM loads at startup beyond the three shown. A real request often starts from resolution inside running code; the steps are the same.',
    references: [
      { source: 'src-builtin-classloader' },
      { source: 'src-classloader' },
      { source: 'jvms-5.3.2' },
      { source: 'jvms-5.3.4' },
      { source: 'src-systemdictionary' },
    ],
  },
  {
    id: 'lifecycle',
    title: 'Lifecycle microscope',
    scale: 'One class',
    question: 'What happens to a class between being loaded and being ready to use?',
    summary:
      'Follow Config through loading, linking (verification, preparation, resolution) and initialization.',
    prediction: {
      prompt:
        '`Config` has `static { … }` first, then `static int count = 3;`. The static block prints `count`. What does it print?',
      options: [
        {
          id: 'three',
          text: '3: the value written in the code',
          correct: false,
          feedback:
            'The assignment `count = 3` runs after the static block, because initializers run in textual order. At that moment `count` still holds the default from preparation.',
        },
        {
          id: 'zero',
          text: '0: the default value from preparation',
          correct: true,
          feedback:
            'Right. Preparation gave `count` the default `0`; the initializer that stores `3` comes later in `<clinit>`. The real run prints `count = 0, label = null`.',
        },
        {
          id: 'error',
          text: 'Nothing: the compiler rejects reading a field before its initializer',
          correct: false,
          feedback:
            'javac rejects a forward reference by simple name, but `Config.count` with the class name is allowed, and the program compiles and runs.',
        },
      ],
    },
    tryIt:
      'Step through the program. Watch the phase rail, the static fields and the constant pool entries change, and compare each step with the real log.',
    explanation: {
      simple:
        'Getting a class ready happens in stages. **Loading** builds the class from its bytes. **Linking** checks it, reserves its shared variables with default values, and connects names to what they mean. **Initialization** runs its setup code once. These stages can be far apart: a class can be loaded long before it is used.',
      developer:
        '`Class.forName(name, false, loader)` loads without initializing. Initialization happens on the first `new`, static method call, or read or write of a static field the class declares (constant variables excepted, because javac inlines them). Static blocks and static field initializers run in source order, so code can see default values.',
      deep: 'JVMS §5.3–§5.5. Linking is verification, preparation and resolution; resolution may be lazy and per reference. JVMS fixes only the orderings (loaded before linked; verified and prepared before initialized). HotSpot creates the mirror with zeroed statics during loading, verifies when the class is first initialized, resolves on first execution, and initializes under a per-class lock (`InstanceKlass::initialize_impl`).',
    },
    term: {
      glossaryId: 'preparation',
      term: 'Preparation',
      definition:
        'The part of linking that creates a class’s static fields and gives them default values: `0`, `false` or `null`. No code runs.',
    },
    check: {
      id: 'cl-lifecycle-check',
      kind: 'ordering',
      prompt: 'Which statement about `Class.forName("Config", false, loader)` is true?',
      options: [
        {
          id: 'a',
          text: 'It loads, verifies and initializes `Config`',
          correct: false,
          explanation:
            'With `false` it does not initialize, and the real log shows HotSpot verified `Config` only later, just before initialization.',
        },
        {
          id: 'b',
          text: 'It loads `Config` without running its static initializer',
          correct: true,
          explanation:
            'Right. The class exists afterwards, but `<clinit>` runs only at the first initialization trigger.',
        },
        {
          id: 'c',
          text: 'It only checks that `Config.class` exists',
          correct: false,
          explanation:
            'It loads the class: the log shows `Config source: file:/…/` right after the call.',
        },
      ],
    },
    component: 'initialization',
    listings: [E.LIFECYCLE_JAVA, E.LIFECYCLE_MAIN_JAVAP, E.CONFIG_JAVAP, E.LIFECYCLE_LOG],
    accuracyNote:
      'Every log line and every printed line is from the real run on JDK 25.0.4. The phase rail follows the JVMS names; HotSpot does preparation while creating the class during loading, which the preparation step explains. Resolution is shown for the two references that matter here; `Lifecycle` resolves many others (for example `System.out`) as it runs.',
    references: [
      { source: 'jvms-5.3' },
      { source: 'jvms-5.4' },
      { source: 'jvms-5.4.2' },
      { source: 'jvms-5.4.3' },
      { source: 'jvms-5.5' },
      { source: 'jls-12.4.1' },
      { source: 'jls-12.4.2' },
      { source: 'api-class-forname' },
      { source: 'src-javaclasses' },
    ],
  },
];

export const CLASS_LOADING_INVESTIGATIONS: Investigation[] = [
  {
    id: 'defining-vs-initiating',
    group: 'Identity and namespaces',
    title: 'Defining versus initiating loaders',
    question: 'Which loaders “have” a class after a request?',
    body: {
      simple:
        'Two loaders end up knowing a class: the one that built it, and the one that was asked for it. The loaders in between only passed the question along and forget it.',
      developer:
        '`getClassLoader()` names the defining loader. `findLoadedClass` on another loader returns the class only if the JVM recorded that loader as an initiating loader, which happens when the JVM itself asked it (resolution, `Class.forName`), not when Java code calls `loadClass` directly.',
      deep: 'JVMS §5.3: the defining loader is an initiating loader too. HotSpot’s `SystemDictionary::load_instance_class` calls `loadClass` on the requested loader and, when another loader defined the result, checks constraints, records a dependency so the defining loader cannot be unloaded first, and adds the class to the requested loader’s dictionary. The delegation laboratory shows both records in each loader’s namespace.',
    },
    listings: [E.CLASSLOADERS_TREE],
    references: [
      { source: 'jvms-5.3' },
      { source: 'src-systemdictionary' },
      { source: 'tool-jcmd' },
    ],
  },
  {
    id: 'class-cast',
    group: 'Identity and namespaces',
    title: 'ClassCastException between two classes with one name',
    question: 'How can a cast from Message to Message fail?',
    body: {
      simple:
        'The object was made from the plugin’s `Message`; the variable expects the application’s `Message`. They share a name, not an identity.',
      developer:
        "The message names both loaders: `com.example.shared.Message is in unnamed module of loader 'child-first'` and `… of loader 'app'`. Look for two loaders in such messages whenever a cast between identically named types fails.",
      deep: '`checkcast` compares run-time classes, which are (binary name, defining loader) pairs (JVMS §5.3). Reflection (`newInstance` here) creates objects without the loading constraints that a direct method call would impose, so the mismatch surfaces at the cast.',
    },
    listings: [E.DELEGATION_OUTPUT],
    references: [{ source: 'jvms-5.3' }, { source: 'jvms-5.3.4' }],
  },
  {
    id: 'constraints',
    group: 'Identity and namespaces',
    title: 'Loading constraints',
    question: 'When does the JVM stop two loaders from disagreeing?',
    body: {
      simple:
        'When code from one loader calls a method of a class from another loader, both must agree on every class named in that method. Otherwise the call is refused.',
      developer:
        'The real `LinkageError` names the method, the two loaders and the type. Typical fixes: let the parent supply shared API types (remove them from the plugin), or make the loader parent-first for shared packages.',
      deep: 'JVMS §5.3.4 and §5.4.3.2–5.4.3.4: resolving a field or method across loaders imposes `N^L1 = N^L2` for each class type in the descriptor. If both loaders already loaded N differently, resolution fails; otherwise the constraint is recorded and checked when either loads N later (HotSpot: `SystemDictionary::check_signature_loaders` and `check_constraints`).',
    },
    listings: [E.GREETER_JAVA, E.DELEGATION_OUTPUT],
    references: [
      { source: 'jvms-5.3.4' },
      { source: 'jvms-5.4.3' },
      { source: 'src-systemdictionary' },
    ],
  },
  {
    id: 'module-layers',
    group: 'Identity and namespaces',
    title: 'Modules and layers',
    question: 'How do modules decide which loader defines a class?',
    body: {
      simple:
        'Since Java 9 the platform is split into modules, and each module is given to one loader. A loader that is asked for a class in a module sends the request to that module’s loader.',
      developer:
        '`Class.getModule()` tells you the module (`module java.sql`), and the class path forms the unnamed module. Frameworks can create further module layers at run time with `ModuleLayer.defineModulesWithOneLoader` or `…WithManyLoaders`.',
      deep: 'JVMS §5.3.6: every class belongs to a run-time module, and a loader that defines classes of a module in a layer is a defining loader for that module’s packages. The boot layer’s package-to-loader map lives in `BuiltinClassLoader.packageToModule`; `module-loader-map.conf` decides which JDK modules go to the boot, platform and application loaders. Layers created at run time map their modules to loaders through `ModuleLayer`.',
    },
    listings: [E.LOADERS_OUTPUT],
    references: [
      { source: 'jvms-5.3.6' },
      { source: 'api-modulelayer' },
      { source: 'jep-261' },
      { source: 'src-module-loader-map' },
    ],
  },
  {
    id: 'circular',
    group: 'Initialization',
    title: 'Circular initialization',
    question: 'What does a class see when initialization goes round in a circle?',
    body: {
      simple:
        '`A` needs `B` and `B` needs `A`. The JVM does not loop forever: when `B` asks for `A`, which is already being set up, it gets `A`’s variables as they are at that moment, still at their defaults.',
      developer:
        'Real output: `A.a = 2, B.b = 1`. `A` starts first, so `B` reads `A.a` while it is still `0`. Touch `B` first and the numbers swap: the result depends on which class is used first.',
      deep: 'JVMS §5.5 step 3: a recursive request for initialization by the thread already initializing the class completes normally at once. `B.<clinit>` therefore reads `A.a` with its prepared default (`0`).',
    },
    listings: [E.CIRCULAR_JAVA, E.CIRCULAR_OUTPUT],
    references: [{ source: 'jvms-5.5' }, { source: 'jls-12.4.2' }],
  },
  {
    id: 'init-errors',
    group: 'Initialization',
    title: 'Initialization errors',
    question: 'What happens when a static initializer throws?',
    body: {
      simple:
        'The first time, the program sees the real problem. After that, the class is marked broken for good, and every later use fails immediately.',
      developer:
        'The first use gets `ExceptionInInitializerError` wrapping the original exception. Every later use gets `NoClassDefFoundError: Could not initialize class Fragile`, and since JDK 17 its cause records the original failure and its thread.',
      deep: 'JVMS §5.5 steps 11–12: if `<clinit>` completes abruptly, the class is marked erroneous and the exception (wrapped in `ExceptionInInitializerError` unless it is an `Error`) is thrown; any later attempt to initialize an erroneous class throws `NoClassDefFoundError`.',
    },
    listings: [E.INIT_FAILURE_JAVA, E.INIT_FAILURE_OUTPUT],
    references: [{ source: 'jvms-5.5' }, { source: 'jls-12.4.2' }],
  },
  {
    id: 'init-lock',
    group: 'Initialization',
    title: 'Initialization locks and deadlock',
    question: 'Can two threads deadlock just by using two classes?',
    body: {
      simple:
        'Each class can be set up by only one thread at a time. If thread one sets up `Left` and needs `Right`, while thread two sets up `Right` and needs `Left`, both wait forever.',
      developer:
        'A thread dump shows the cause: `waiting on the Class initialization monitor for Right`. Note the state: `RUNNABLE`, not `BLOCKED`, so a deadlock detector that looks only at thread states misses it.',
      deep: 'JVMS §5.5 steps 1–2: a thread that finds a class being initialized by another thread waits on its initialization lock until that initialization completes. Nothing in the procedure breaks a cycle between threads, so they wait forever. HotSpot reports the class each thread waits for in `Thread.print`.',
    },
    listings: [E.INIT_DEADLOCK_JAVA, E.INIT_DEADLOCK_DUMP],
    references: [{ source: 'jvms-5.5' }, { source: 'jls-12.4.2' }, { source: 'tool-jcmd' }],
  },
  {
    id: 'unloading',
    group: 'Unloading and leaks',
    title: 'Class unloading',
    question: 'When does a class leave memory?',
    body: {
      simple:
        'Never on its own. A class can go only together with the loader that built it, and only once nothing can reach that loader, its classes or their objects.',
      developer:
        'With `-Xlog:class+unload` you can watch it: after the plugin loader and every reference to it are dropped, a collection unloads `com.example.plugin.Hello`. `jcmd <pid> VM.classloader_stats` shows each loader’s classes and Metaspace use.',
      deep: 'JLS §12.7: a class may be unloaded only if its defining loader may be reclaimed; boot classes never are. HotSpot unloads whole `ClassLoaderData` units during GC, releasing their Metaspace. The JVM’s record of initiating loaders adds a dependency so a defining loader stays alive as long as a loader that uses its classes.',
    },
    listings: [E.UNLOAD_JAVA, E.UNLOAD_LOG, E.CLASSLOADER_STATS],
    references: [
      { source: 'jls-12.7' },
      { source: 'src-classloaderdata' },
      { source: 'src-metaspace' },
    ],
  },
  {
    id: 'leaks',
    group: 'Unloading and leaks',
    title: 'Class loader leaks',
    question: 'Why does Metaspace grow after every redeploy?',
    body: {
      simple:
        'One forgotten reference to anything from an old plugin keeps the whole plugin in memory: its loader, every class it loaded, and their data.',
      developer:
        'Typical holders: a thread the plugin started, a `ThreadLocal` value, a static cache or registry in a shared library (JDBC drivers, logging), a shutdown hook. Compare `jcmd <pid> VM.classloader_stats` across redeploys, then take a heap dump (`jcmd <pid> GC.heap_dump file.hprof`) and follow the path from GC roots to the old loader.',
      deep: 'Because unloading works per loader (JLS §12.7, `ClassLoaderData`), a single strong path from a GC root to any class, instance or the loader itself pins all of the loader’s classes and their Metaspace. The symptom is `OutOfMemoryError: Metaspace`, or `Compressed class space`, after enough redeploys.',
    },
    listings: [E.CLASSLOADER_STATS],
    references: [
      { source: 'jls-12.7' },
      { source: 'src-classloaderdata' },
      { source: 'tool-jcmd' },
    ],
  },
  {
    id: 'errors',
    group: 'Errors and diagnostics',
    title: 'Six errors, and where each one comes from',
    question: 'ClassNotFoundException or NoClassDefFoundError? VerifyError or ClassFormatError?',
    body: {
      simple:
        'Each error names a different stage. The class cannot be found, it was there when compiling but is missing now, its bytes are damaged, it was made for a newer Java, its code is unsafe, or two loaders disagree.',
      developer:
        '- `ClassNotFoundException`: your code asked by name (`Class.forName`, `loadClass`) and nobody has it.\n- `NoClassDefFoundError`: the JVM needed a class your code was compiled against, and it is missing (or failed to initialize earlier).\n- `ClassFormatError`: the bytes are not a valid class file.\n- `UnsupportedClassVersionError`: compiled for a newer Java (class file version 70 needs JDK 26).\n- `VerifyError`: well-formed, but its bytecode breaks the type rules.\n- `LinkageError`: duplicate definitions in one loader, or loader constraints.',
      deep: 'Loading (JVMS §5.3.5) checks the format and version; verification (§5.4.1, §4.10) the bytecode; resolution (§5.4.3) wraps a loader’s `ClassNotFoundException` in `NoClassDefFoundError`; `defineClass` rejects a second definition of the same name in one loader and `java.*` names outside the platform loader. All outputs below are real, from JDK 25.0.4.',
    },
    listings: [
      E.CNFE_OUTPUT,
      E.NCDFE_OUTPUT,
      E.CLASS_FORMAT_OUTPUT,
      E.UCVE_OUTPUT,
      E.VERIFY_ERROR_OUTPUT,
      E.DUPLICATE_OUTPUT,
      E.PROHIBITED_OUTPUT,
    ],
    references: [
      { source: 'jvms-5.3.5' },
      { source: 'jvms-5.4.1' },
      { source: 'jvms-4.10' },
      { source: 'jvms-5.4.3' },
      { source: 'src-classloader' },
    ],
  },
  {
    id: 'logging',
    group: 'Errors and diagnostics',
    title: 'Watching class loading in a real JVM',
    question: 'How do you see what a JVM loads, from where, and when?',
    body: {
      simple:
        'The JVM can write a line for every class it loads, checks and sets up. Reading that log is the most direct way to see this lab’s steps in a real program.',
      developer:
        '- `-Xlog:class+load` prints each class and its source (`shared objects file` for the CDS archive, `jrt:/…` for the runtime image, `file:/…` for the class path).\n- `-Xlog:class+init` prints verification and initialization.\n- `-Xlog:class+unload` prints unloading.\n- `jcmd <pid> VM.classloaders` prints the loader tree of a running JVM; `VM.classloader_stats` its numbers.',
      deep: 'Unified logging (JEP 158) tags: `class+load`, `class+init`, `class+unload`, `class+loader+constraints` and more; levels `info`, `debug`, `trace`. A trivial JDK 25 program loads about 430 classes, almost all from the CDS archive.',
    },
    listings: [E.LIFECYCLE_LOG, E.CLASSLOADERS_TREE],
    references: [{ source: 'jep-158' }, { source: 'tool-java' }, { source: 'tool-jcmd' }],
  },
];

export const CLASS_LOADING_QUIZ: Quiz = {
  id: 'lab:class-loading',
  title: 'Check your understanding: class loading',
  questions: [
    {
      id: 'q1',
      kind: 'concept',
      prompt: 'What identifies a class at run time?',
      options: [
        {
          id: 'a',
          text: 'Its fully qualified name',
          correct: false,
          explanation:
            'Two loaders can each define a class with the same name; they are different classes.',
        },
        {
          id: 'b',
          text: 'Its binary name and its defining loader',
          correct: true,
          explanation: 'JVMS §5.3: the pair (binary name, defining loader).',
        },
        {
          id: 'c',
          text: 'The path of its class file',
          correct: false,
          explanation:
            'The same bytes defined by two loaders give two classes; the file does not decide identity.',
        },
      ],
    },
    {
      id: 'q2',
      kind: 'concept',
      prompt:
        'The application loader is asked for `java.util.logging.Logger`. Which loaders take part?',
      options: [
        {
          id: 'a',
          text: 'Application, then platform, then bootstrap',
          correct: false,
          explanation:
            'The built-in loaders route by module: `java.logging` is a boot module, so the application loader goes straight to the boot loader.',
        },
        {
          id: 'b',
          text: 'Application, then bootstrap',
          correct: true,
          explanation: 'Module-aware delegation skips the platform loader here.',
        },
        {
          id: 'c',
          text: 'Only the application loader',
          correct: false,
          explanation: 'It does not define JDK classes from boot modules itself.',
        },
      ],
    },
    {
      id: 'q3',
      kind: 'ordering',
      prompt: 'In which order does the JVM get a class ready?',
      options: [
        {
          id: 'a',
          text: 'Load, initialize, then link when a method is first called',
          correct: false,
          explanation: 'A class must be verified and prepared before it is initialized.',
        },
        {
          id: 'b',
          text: 'Load, link (verify, prepare; resolve, possibly later), initialize',
          correct: true,
          explanation:
            'Resolution may happen lazily, one reference at a time, but verification and preparation always precede initialization.',
        },
        {
          id: 'c',
          text: 'Link, load, initialize',
          correct: false,
          explanation: 'A class must exist (be loaded) before it can be linked.',
        },
      ],
    },
    {
      id: 'q4',
      kind: 'predict-output',
      prompt:
        'A static block reads `Config.count` before `static int count = 3;` runs. What does it see?',
      options: [
        { id: 'a', text: '`3`', correct: false, explanation: 'The initializer has not run yet.' },
        {
          id: 'b',
          text: '`0`',
          correct: true,
          explanation: 'Preparation gave it the default `0`; the real run prints `count = 0`.',
        },
        {
          id: 'c',
          text: 'A `NullPointerException`',
          correct: false,
          explanation: 'An `int` field has the default `0`, never null.',
        },
      ],
    },
    {
      id: 'q5',
      kind: 'concept',
      prompt:
        'Code that was compiled against `Helper` runs, but `Helper.class` has been deleted. What does the program get?',
      options: [
        {
          id: 'a',
          text: '`ClassNotFoundException`',
          correct: false,
          explanation:
            'That is what `Class.forName` throws. When the JVM resolves a reference in your code, it reports `NoClassDefFoundError`, with the `ClassNotFoundException` as the cause.',
        },
        {
          id: 'b',
          text: '`NoClassDefFoundError: Helper`',
          correct: true,
          explanation:
            'The real run: `NoClassDefFoundError: Helper`, caused by `ClassNotFoundException: Helper`.',
        },
        {
          id: 'c',
          text: '`VerifyError`',
          correct: false,
          explanation: 'Verification checks bytecode that was found; here nothing was found.',
        },
      ],
    },
  ],
};

/** Listings by id, for evidence links from experiments and loader profiles. */
export const CLASS_LOADING_LISTINGS = Object.fromEntries(
  Object.values(E).map((listing) => [listing.id, listing]),
);
