import type { CodeListing } from '@/types/content';

/**
 * Real programs and their real output, produced with OpenJDK 25.0.4
 * (Ubuntu build 25.0.4.1+1-1-24.04.4) on Linux x64. Paths are shortened to
 * `/…/`; hash codes such as `@764c12b6` and timestamps differ between runs.
 * Nothing here is written by hand.
 */
const V = 'OpenJDK 25.0.4 · Linux x64';

export const LOADERS_JAVA: CodeListing = {
  id: 'loaders-java',
  title: 'Loaders.java',
  language: 'java',
  code: `public class Loaders {
    public static void main(String[] args) throws Exception {
        show(String.class);
        show(java.util.logging.Logger.class);
        show(java.sql.Connection.class);
        show(Loaders.class);
        Class<?> javac = Class.forName("com.sun.tools.javac.Main");
        show(javac);

        ClassLoader app = ClassLoader.getSystemClassLoader();
        ClassLoader platform = ClassLoader.getPlatformClassLoader();
        System.out.println("app loader: " + app.getName() + ", parent: " + app.getParent().getName());
        System.out.println("platform loader: " + platform.getName() + ", parent: " + platform.getParent());

        Class<?> viaPlatform = platform.loadClass("com.sun.tools.javac.Main");
        System.out.println("platform.loadClass(\\"com.sun.tools.javac.Main\\"): defined by "
                + viaPlatform.getClassLoader().getName() + ", same Class object: " + (viaPlatform == javac));
    }

    static void show(Class<?> c) {
        ClassLoader loader = c.getClassLoader();
        System.out.println(c.getName() + " | " + c.getModule() + " | defined by "
                + (loader == null ? "the bootstrap loader (null)" : loader.getName()));
    }
}`,
  verifiedWith: V,
};

export const LOADERS_OUTPUT: CodeListing = {
  id: 'loaders-output',
  title: 'java -cp . Loaders',
  language: 'text',
  code: `java.lang.String | module java.base | defined by the bootstrap loader (null)
java.util.logging.Logger | module java.logging | defined by the bootstrap loader (null)
java.sql.Connection | module java.sql | defined by platform
Loaders | unnamed module @c387f44 | defined by app
com.sun.tools.javac.Main | module jdk.compiler | defined by app
app loader: app, parent: platform
platform loader: platform, parent: null
platform.loadClass("com.sun.tools.javac.Main"): defined by app, same Class object: true`,
  verifiedWith: `${V} (hash codes vary between runs)`,
};

export const LOADERS_LOG: CodeListing = {
  id: 'loaders-log',
  title: 'java -Xlog:class+load -cp . Loaders (where each class came from)',
  language: 'text',
  code: `[0.043s][info][class,load] Loaders source: file:/…/
[0.052s][info][class,load] java.util.logging.Logger source: shared objects file
java.util.logging.Logger | module java.logging | defined by the bootstrap loader (null)
[0.057s][info][class,load] java.sql.Connection source: jrt:/java.sql
java.sql.Connection | module java.sql | defined by platform
[0.058s][info][class,load] com.sun.tools.javac.Main source: jrt:/jdk.compiler
com.sun.tools.javac.Main | module jdk.compiler | defined by app`,
  verifiedWith: `${V}; "shared objects file" is the CDS archive, jrt:/ the runtime image`,
};

export const CHILD_FIRST_JAVA: CodeListing = {
  id: 'child-first-java',
  title: 'ChildFirstLoader.java',
  language: 'java',
  code: `/** A representative child-first loader: java.* goes to the parent, everything else is tried here first. */
public class ChildFirstLoader extends URLClassLoader {
    public ChildFirstLoader(String name, URL[] urls, ClassLoader parent) {
        super(name, urls, parent);
    }

    @Override
    protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
        synchronized (getClassLoadingLock(name)) {
            Class<?> c = findLoadedClass(name);
            if (c == null && !name.startsWith("java.")) {
                try {
                    c = findClass(name);
                } catch (ClassNotFoundException notHere) {
                    // fall back to the parent
                }
            }
            if (c == null) {
                c = super.loadClass(name, false);
            }
            if (resolve) {
                resolveClass(c);
            }
            return c;
        }
    }
}`,
  verifiedWith: V,
};

export const DELEGATION_JAVA: CodeListing = {
  id: 'delegation-java',
  title: 'Delegation.java (the body of main)',
  language: 'java',
  code: `URL[] plugin = { Path.of("plugin").toUri().toURL() };
ClassLoader app = ClassLoader.getSystemClassLoader();
try (URLClassLoader parentFirst = new URLClassLoader("parent-first", plugin, app);
     ChildFirstLoader childFirst = new ChildFirstLoader("child-first", plugin, app)) {
    report(parentFirst, "com.example.shared.Message");
    report(parentFirst, "com.example.plugin.Greeter");
    report(childFirst, "com.example.shared.Message");
    report(childFirst, "java.lang.String");
    try {
        parentFirst.loadClass("com.example.Missing");
    } catch (ClassNotFoundException e) {
        System.out.println(e);
    }

    Class<?> pluginCopy = childFirst.loadClass("com.example.shared.Message");
    System.out.println("same runtime class: " + (pluginCopy == Message.class));
    Object message = pluginCopy.getConstructor(String.class).newInstance("hi");
    try {
        Message cast = (Message) message;
        System.out.println(cast.text());
    } catch (ClassCastException e) {
        System.out.println(e);
    }

    try {
        childFirst.loadClass("com.example.plugin.Greeter").getMethod("run").invoke(null);
    } catch (java.lang.reflect.InvocationTargetException e) {
        System.out.println(e.getCause());
    }
}`,
  verifiedWith: `${V}; app/ holds Message and Bus, plugin/ holds Greeter and its own copy of Message`,
};

export const GREETER_JAVA: CodeListing = {
  id: 'greeter-java',
  title: 'plugin/com/example/plugin/Greeter.java',
  language: 'java',
  code: `package com.example.plugin;

import com.example.shared.Bus;
import com.example.shared.Message;

public class Greeter {
    public static void run() {
        Bus.send(new Message("hello from the plugin"));
    }
}`,
  verifiedWith: V,
};

export const DELEGATION_OUTPUT: CodeListing = {
  id: 'delegation-output',
  title: 'java -cp app Delegation',
  language: 'text',
  code: `parent-first.loadClass("com.example.shared.Message") -> defined by app
parent-first.loadClass("com.example.plugin.Greeter") -> defined by parent-first
child-first.loadClass("com.example.shared.Message") -> defined by child-first
child-first.loadClass("java.lang.String") -> defined by the bootstrap loader
java.lang.ClassNotFoundException: com.example.Missing
same runtime class: false
java.lang.ClassCastException: class com.example.shared.Message cannot be cast to class com.example.shared.Message (com.example.shared.Message is in unnamed module of loader 'child-first' @764c12b6; com.example.shared.Message is in unnamed module of loader 'app')
java.lang.LinkageError: loader constraint violation: when resolving method 'void com.example.shared.Bus.send(com.example.shared.Message)' the class loader 'child-first' @764c12b6 of the current class, com/example/plugin/Greeter, and the class loader 'app' for the method's defining class, com/example/shared/Bus, have different Class objects for the type com/example/shared/Message used in the signature (com.example.plugin.Greeter is in unnamed module of loader 'child-first' @764c12b6, parent loader 'app'; com.example.shared.Bus is in unnamed module of loader 'app')`,
  verifiedWith: `${V} (hash codes vary between runs)`,
};

export const DELEGATION_LOG: CodeListing = {
  id: 'delegation-log',
  title: 'java -Xlog:class+load -cp app Delegation (com.example lines and output)',
  language: 'text',
  code: `[0.023s][info][class,load] com.example.shared.Message source: file:/…/app/
parent-first.loadClass("com.example.shared.Message") -> defined by app
[0.031s][info][class,load] com.example.plugin.Greeter source: file:/…/plugin/
parent-first.loadClass("com.example.plugin.Greeter") -> defined by parent-first
[0.032s][info][class,load] com.example.shared.Message source: file:/…/plugin/
child-first.loadClass("com.example.shared.Message") -> defined by child-first
…
[0.035s][info][class,load] com.example.plugin.Greeter source: file:/…/plugin/
[0.037s][info][class,load] com.example.shared.Bus source: file:/…/app/`,
  verifiedWith: `${V}; timestamps vary`,
};

export const LIFECYCLE_JAVA: CodeListing = {
  id: 'lifecycle-java',
  title: 'Lifecycle.java',
  language: 'java',
  code: `public class Lifecycle {
    public static void main(String[] args) throws Exception {
        System.out.println("main started");
        Class<?> c = Class.forName("Config", false, Lifecycle.class.getClassLoader());
        System.out.println("loaded " + c.getName() + "; not initialized yet");
        System.out.println("LIMIT = " + Config.LIMIT);
        System.out.println("count = " + Config.count);
        System.out.println("label = " + Config.label);
    }
}

class Config {
    static {
        System.out.println("<clinit> starts: count = " + Config.count + ", label = " + Config.label);
    }

    static int count = 3;
    static String label = "ready";
    static final int LIMIT = 42;
}`,
  verifiedWith: V,
};

export const LIFECYCLE_OUTPUT: CodeListing = {
  id: 'lifecycle-output',
  title: 'java -cp . Lifecycle',
  language: 'text',
  code: `main started
loaded Config; not initialized yet
LIMIT = 42
<clinit> starts: count = 0, label = null
count = 3
label = ready`,
  verifiedWith: V,
};

export const LIFECYCLE_LOG: CodeListing = {
  id: 'lifecycle-log',
  title: 'java -Xlog:class+load,class+init -cp . Lifecycle (lines for Lifecycle and Config)',
  language: 'text',
  code: `[0.020s][info][class,load] Lifecycle source: file:/…/
[0.020s][info][class,init] Start class verification for: Lifecycle
[0.020s][info][class,init] End class verification for: Lifecycle
[0.020s][info][class,init] 311 Initializing 'Lifecycle'(no method) (0x0000000076040000) by thread "main"
main started
[0.020s][info][class,load] Config source: file:/…/
loaded Config; not initialized yet
LIMIT = 42
[0.026s][info][class,init] Start class verification for: Config
[0.026s][info][class,init] End class verification for: Config
[0.026s][info][class,init] 479 Initializing 'Config' (0x0000000076040210) by thread "main"
<clinit> starts: count = 0, label = null
count = 3
label = ready`,
  verifiedWith: `${V}; timestamps, counters and addresses vary between runs`,
};

export const LIFECYCLE_MAIN_JAVAP: CodeListing = {
  id: 'lifecycle-main-javap',
  title: 'javap -c Lifecycle · main(String[]) (excerpt)',
  language: 'text',
  code: ` 8: ldc           #21                 // String Config
10: iconst_0
11: ldc           #23                 // class Lifecycle
13: invokevirtual #25                 // Method java/lang/Class.getClassLoader:()Ljava/lang/ClassLoader;
16: invokestatic  #31                 // Method java/lang/Class.forName:(Ljava/lang/String;ZLjava/lang/ClassLoader;)Ljava/lang/Class;
…
35: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
38: ldc           #44                 // String LIMIT = 42
40: invokevirtual #15                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
43: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
46: getstatic     #46                 // Field Config.count:I
…
60: getstatic     #53                 // Field Config.label:Ljava/lang/String;`,
  verifiedWith: V,
};

export const CONFIG_JAVAP: CodeListing = {
  id: 'config-javap',
  title: 'javap -c -v -p Config (fields and static initializer)',
  language: 'text',
  code: `  static int count;
    descriptor: I
    flags: (0x0008) ACC_STATIC

  static java.lang.String label;
    descriptor: Ljava/lang/String;
    flags: (0x0008) ACC_STATIC

  static final int LIMIT;
    descriptor: I
    flags: (0x0018) ACC_STATIC, ACC_FINAL
    ConstantValue: int 42
…
  static {};
    descriptor: ()V
    flags: (0x0008) ACC_STATIC
    Code:
      stack=3, locals=0, args_size=0
         0: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
         3: getstatic     #13                 // Field count:I
         6: getstatic     #19                 // Field label:Ljava/lang/String;
         9: invokedynamic #23,  0             // InvokeDynamic #0:makeConcatWithConstants:(ILjava/lang/String;)Ljava/lang/String;
        14: invokevirtual #27                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
        17: iconst_3
        18: putstatic     #13                 // Field count:I
        21: ldc           #33                 // String ready
        23: putstatic     #19                 // Field label:Ljava/lang/String;
        26: return`,
  verifiedWith: V,
};

export const CIRCULAR_JAVA: CodeListing = {
  id: 'circular-java',
  title: 'Circular.java',
  language: 'java',
  code: `public class Circular {
    public static void main(String[] args) {
        System.out.println("A.a = " + A.a + ", B.b = " + B.b);
    }
}

class A {
    static int a = B.b + 1;
}

class B {
    static int b = A.a + 1;
}`,
  verifiedWith: V,
};

export const CIRCULAR_OUTPUT: CodeListing = {
  id: 'circular-output',
  title: 'java -cp . Circular',
  language: 'text',
  code: 'A.a = 2, B.b = 1',
  verifiedWith: V,
};

export const INIT_FAILURE_JAVA: CodeListing = {
  id: 'init-failure-java',
  title: 'InitFailure.java',
  language: 'java',
  code: `public class InitFailure {
    public static void main(String[] args) {
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                System.out.println(Fragile.value);
            } catch (Throwable t) {
                System.out.println("attempt " + attempt + ": " + t);
                System.out.println("  cause: " + t.getCause());
            }
        }
    }
}

class Fragile {
    static int value = 1 / zero();

    static int zero() {
        return 0;
    }
}`,
  verifiedWith: V,
};

export const INIT_FAILURE_OUTPUT: CodeListing = {
  id: 'init-failure-output',
  title: 'java -cp . InitFailure',
  language: 'text',
  code: `attempt 1: java.lang.ExceptionInInitializerError
  cause: java.lang.ArithmeticException: / by zero
attempt 2: java.lang.NoClassDefFoundError: Could not initialize class Fragile
  cause: java.lang.ExceptionInInitializerError: Exception java.lang.ArithmeticException: / by zero [in thread "main"]`,
  verifiedWith: V,
};

export const INIT_DEADLOCK_JAVA: CodeListing = {
  id: 'init-deadlock-java',
  title: 'InitDeadlock.java (the two classes)',
  language: 'java',
  code: `// Thread "first" reads Left.value, thread "second" reads Right.value, at the same time.
class Left {
    static int value = pause() + Right.value;

    static int pause() {
        try { Thread.sleep(200); } catch (InterruptedException e) { }
        return 1;
    }
}

class Right {
    static int value = Left.pause() + Left.value;
}`,
  verifiedWith: V,
};

export const INIT_DEADLOCK_DUMP: CodeListing = {
  id: 'init-deadlock-dump',
  title: 'jcmd <pid> Thread.print (the two threads, 4 s later)',
  language: 'text',
  code: `"first" #23 [2323] prio=5 os_prio=0 cpu=0.91ms elapsed=4.17s tid=0x00007efd6c1603a0 nid=2323 in Object.wait()  [0x00007efd44cf6000]
   java.lang.Thread.State: RUNNABLE
	at Left.<clinit>(InitDeadlock.java:15)
	- waiting on the Class initialization monitor for Right
	at InitDeadlock.lambda$main$0(InitDeadlock.java:3)
	…

"second" #24 [2324] prio=5 os_prio=0 cpu=0.53ms elapsed=4.17s tid=0x00007efd6c161640 nid=2324 in Object.wait()  [0x00007efd44bf6000]
   java.lang.Thread.State: RUNNABLE
	at Right.<clinit>(InitDeadlock.java:24)
	- waiting on the Class initialization monitor for Left
	at InitDeadlock.lambda$main$1(InitDeadlock.java:4)
	…`,
  verifiedWith: `${V}; thread ids and addresses vary`,
};

export const CNFE_OUTPUT: CodeListing = {
  id: 'cnfe-output',
  title: 'Class.forName("com.example.Missing")',
  language: 'text',
  code: `Exception in thread "main" java.lang.ClassNotFoundException: com.example.Missing
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:580)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:490)
	at java.base/java.lang.Class.forName0(Native Method)
	at java.base/java.lang.Class.forName(Class.java:467)
	at java.base/java.lang.Class.forName(Class.java:458)
	at FindMissing.main(FindMissing.java:3)`,
  verifiedWith: V,
};

export const NCDFE_OUTPUT: CodeListing = {
  id: 'ncdfe-output',
  title: 'Uses.main calls Helper.help(); Helper.class was deleted after compiling',
  language: 'text',
  code: `main started
Exception in thread "main" java.lang.NoClassDefFoundError: Helper
	at Uses.main(Uses.java:4)
Caused by: java.lang.ClassNotFoundException: Helper
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:580)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:490)
	... 1 more`,
  verifiedWith: V,
};

export const VERIFY_ERROR_OUTPUT: CodeListing = {
  id: 'verify-error-output',
  title: 'Loading Broken.class: make() returns an int where an Object is declared',
  language: 'text',
  code: `$ javap -c Broken.class
public class Broken {
  public static java.lang.Object make();
    Code:
         0: iconst_1
         1: areturn
}

$ java -cp . LoadBroken
Exception in thread "main" java.lang.VerifyError: Bad type on operand stack
Exception Details:
  Location:
    Broken.make()Ljava/lang/Object; @1: areturn
  Reason:
    Type integer (current frame, stack[0]) is not assignable to reference type
  Current Frame:
    bci: @1
    flags: { }
    locals: { }
    stack: { integer }
  Bytecode:
    0000000: 04b0

	at java.base/java.lang.Class.forName0(Native Method)
	at java.base/java.lang.Class.forName(Class.java:467)
	…`,
  verifiedWith: `${V}; Broken.class (123 bytes) was written with the java.lang.classfile API, since javac never produces it`,
};

export const CLASS_FORMAT_OUTPUT: CodeListing = {
  id: 'class-format-output',
  title: 'defineClass with damaged bytes: a wrong magic number, then a truncated file',
  language: 'text',
  code: `Exception in thread "main" java.lang.ClassFormatError: Incompatible magic value 3405691583 in class file Future
	at java.base/java.lang.ClassLoader.defineClass1(Native Method)
	…

Exception in thread "main" java.lang.ClassFormatError: Truncated class file
	at java.base/java.lang.ClassLoader.defineClass1(Native Method)
	…`,
  verifiedWith: `${V}; byte 3 changed from 0xBE to 0xBF (3405691583 = 0xCAFEBABF), and the file cut to 40 bytes`,
};

export const UCVE_OUTPUT: CodeListing = {
  id: 'ucve-output',
  title: 'A class file whose major version was raised from 69 to 70',
  language: 'text',
  code: `$ od -A d -t x1 -N 8 Future.class
0000000 ca fe ba be 00 00 00 45
$ od -A d -t x1 -N 8 future/Future.class
0000000 ca fe ba be 00 00 00 46

$ java -cp future Future
Error: LinkageError occurred while loading main class Future
	java.lang.UnsupportedClassVersionError: Future has been compiled by a more recent version of the Java Runtime (class file version 70.0), this version of the Java Runtime only recognizes class file versions up to 69.0`,
  verifiedWith: V,
};

export const DUPLICATE_OUTPUT: CodeListing = {
  id: 'duplicate-output',
  title: 'One loader calls defineClass twice for Future',
  language: 'text',
  code: `defined Future once
Exception in thread "main" java.lang.LinkageError: loader 'bytes' @251a69d7 attempted duplicate class definition for Future. (Future is in unnamed module of loader 'bytes' @251a69d7, parent loader 'platform')
	at java.base/java.lang.ClassLoader.defineClass1(Native Method)
	…`,
  verifiedWith: `${V} (hash codes vary between runs)`,
};

export const PROHIBITED_OUTPUT: CodeListing = {
  id: 'prohibited-output',
  title: 'A user-defined loader tries to define java.lang.Future',
  language: 'text',
  code: `Exception in thread "main" java.lang.SecurityException: Prohibited package name: java.lang
	at java.base/java.lang.ClassLoader.preDefineClass(ClassLoader.java:847)
	at java.base/java.lang.ClassLoader.defineClass(ClassLoader.java:960)
	…`,
  verifiedWith: V,
};

export const UNLOAD_JAVA: CodeListing = {
  id: 'unload-java',
  title: 'Unload.java',
  language: 'java',
  code: `URL[] plugin = { Path.of("plugin").toUri().toURL() };
URLClassLoader loader = new URLClassLoader("plugin", plugin, ClassLoader.getSystemClassLoader());
Class<?> hello = loader.loadClass("com.example.plugin.Hello");
System.out.println(hello.getMethod("greet").invoke(null));
loader.close();
loader = null;
hello = null;
System.out.println("dropped every reference to the loader; requesting a collection");
System.gc();
System.out.println("done");`,
  verifiedWith: V,
};

export const UNLOAD_LOG: CodeListing = {
  id: 'unload-log',
  title: 'java -Xlog:class+load,class+unload -cp . Unload (the plugin lines)',
  language: 'text',
  code: `[0.022s][info][class,load] com.example.plugin.Hello source: file:/…/plugin/
hello from a plugin
dropped every reference to the loader; requesting a collection
[0.029s][info][class,unload] unloading class com.example.plugin.Hello 0x000000001f040800
done`,
  verifiedWith: `${V} (G1, the default collector here; System.gc() is a request the JVM may ignore)`,
};

export const CLASSLOADERS_TREE: CodeListing = {
  id: 'classloaders-tree',
  title: 'jcmd <pid> VM.classloaders show-classes (while the plugin is loaded)',
  language: 'text',
  code: `+-- <bootstrap>
      |
      |               Classes: java.lang.Object
      |                        [Ljava.lang.Object;
      …
      |                        (825 classes)
      |
      |        Hidden Classes: java.lang.invoke.LambdaForm$MH/0x0000000043041000
      |                        (1 hidden class)
      |
      +-- "platform", jdk.internal.loader.ClassLoaders$PlatformClassLoader
            |
            +-- "app", jdk.internal.loader.ClassLoaders$AppClassLoader
                  |
                  |               Classes: Unload
                  |                        (1 class)
                  |
                  +-- "plugin", java.net.URLClassLoader

                                        Classes: com.example.plugin.Hello
                                                 (1 class)`,
  verifiedWith: `${V}; 823 of the bootstrap loader's class names are left out`,
};

export const CLASSLOADER_STATS: CodeListing = {
  id: 'classloader-stats',
  title: 'jcmd <pid> VM.classloader_stats',
  language: 'text',
  code: `ClassLoader         Parent              CLD*               Classes   ChunkSz   BlockSz  Type
0x0000000043001810  0x00000000421c95c8  0x00007fbdc415eaf0       1      6144      1304  java.net.URLClassLoader
0x00000000421c95c8  0x00000000421c9ae8  0x00007fbdc4150660       1      6144      2848  jdk.internal.loader.ClassLoaders$AppClassLoader
0x00000000421c9ae8  0x0000000000000000  0x00007fbdc40d63b0       0         0         0  jdk.internal.loader.ClassLoaders$PlatformClassLoader
0x0000000000000000  0x0000000000000000  0x00007fbdc40c6a10     825   4456448    227256  <boot class loader>
                                                                 1      3072      1736   + hidden classes
Total = 4                                                      828   4471808    233144
ChunkSz: Total size of all allocated metaspace chunks
BlockSz: Total size of all allocated metaspace blocks (each chunk has several blocks)`,
  verifiedWith: `${V}; addresses differ between runs`,
};
