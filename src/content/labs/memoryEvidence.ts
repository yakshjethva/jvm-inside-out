import type { CodeListing } from '@/types/content';

/**
 * Real programs and their real output for the Memory Laboratory, produced with
 * OpenJDK 25.0.4 (Ubuntu build 25.0.4.1+1-1-24.04.4) on Linux x64, 4 CPUs.
 * Paths are shortened to `/…/`; process ids, addresses, timings and sizes
 * marked as measured differ between machines and runs. Nothing here is
 * written by hand.
 */
const V = 'OpenJDK 25.0.4 · Linux x64';
const JOL = `${V}; JOL 0.17 (java -jar jol-cli.jar internals)`;

export const MAIN_JAVA: CodeListing = {
  id: 'mem-main-java',
  title: 'Main.java',
  language: 'java',
  code: `public class Main {
    public static void main(String[] args) {
        Person p1 = new Person("Alex");
        Person p2 = p1;
        p2.setName("Yaksh");
        p1 = null;
        p2 = null;
    }
}`,
  verifiedWith: V,
};

export const PERSON_JAVA: CodeListing = {
  id: 'mem-person-java',
  title: 'Person.java',
  language: 'java',
  code: `public class Person {
    private String name;

    public Person(String name) {
        this.name = name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }
}`,
  verifiedWith: V,
};

export const MAIN_JAVAP: CodeListing = {
  id: 'mem-main-javap',
  title: 'javap -c -l Main · main(String[]) (javac -g)',
  language: 'text',
  code: ` 0: new           #7                  // class Person
 3: dup
 4: ldc           #9                  // String Alex
 6: invokespecial #11                 // Method Person."<init>":(Ljava/lang/String;)V
 9: astore_1
10: aload_1
11: astore_2
12: aload_2
13: ldc           #14                 // String Yaksh
15: invokevirtual #16                 // Method Person.setName:(Ljava/lang/String;)V
18: aconst_null
19: astore_1
20: aconst_null
21: astore_2
22: return
LocalVariableTable:
  Start  Length  Slot  Name   Signature
      0      23     0  args   [Ljava/lang/String;
     10      13     1    p1   LPerson;
     12      11     2    p2   LPerson;`,
  verifiedWith: `${V}; main: stack=3, locals=3`,
};

export const PERSON_JAVAP: CodeListing = {
  id: 'mem-person-javap',
  title: 'javap -c -p Person · the constructor and setName',
  language: 'text',
  code: `public Person(java.lang.String);
  Code:
     0: aload_0
     1: invokespecial #1                  // Method java/lang/Object."<init>":()V
     4: aload_0
     5: aload_1
     6: putfield      #7                  // Field name:Ljava/lang/String;
     9: return

public void setName(java.lang.String);
  Code:
     0: aload_0
     1: aload_1
     2: putfield      #7                  // Field name:Ljava/lang/String;
     5: return`,
  verifiedWith: `${V}; javap -v gives both methods stack=2, locals=2`,
};

export const MAIN_CONSTANT_POOL: CodeListing = {
  id: 'mem-main-cp',
  title: 'javap -v Main · constant pool entries main() uses',
  language: 'text',
  code: `   #7 = Class              #8             // Person
   #9 = String             #10            // Alex
  #11 = Methodref          #7.#12         // Person."<init>":(Ljava/lang/String;)V
  #14 = String             #15            // Yaksh
  #16 = Methodref          #7.#17         // Person.setName:(Ljava/lang/String;)V`,
  verifiedWith: V,
};

export const IDENTITY_JAVA: CodeListing = {
  id: 'mem-identity-java',
  title: 'Identity.java: the same statements, observed',
  language: 'java',
  code: `Person p1 = new Person("Alex");
Person p2 = p1;
p2.setName("Yaksh");
System.out.println("p1.getName() = " + p1.getName());
System.out.println("p1 == p2: " + (p1 == p2));

WeakReference<Person> watch = new WeakReference<>(p1);
p1 = null;
p2 = null;
System.out.println("after p1 = null and p2 = null, still in the heap: " + (watch.get() != null));
System.gc();
System.out.println("after System.gc(), weak reference cleared: " + (watch.get() == null));`,
  verifiedWith: V,
};

export const IDENTITY_OUTPUT: CodeListing = {
  id: 'mem-identity-output',
  title: 'java -cp . Identity',
  language: 'text',
  code: `p1.getName() = Yaksh
p1 == p2: true
after p1 = null and p2 = null, still in the heap: true
after System.gc(), weak reference cleared: true`,
  verifiedWith: `${V} (G1; System.gc() is a request, and the JVM decides what a collection does)`,
};

export const TWO_THREADS_JAVA: CodeListing = {
  id: 'mem-two-threads-java',
  title: 'TwoThreads.java',
  language: 'java',
  code: `public class TwoThreads {
    public static void main(String[] args) throws InterruptedException {
        Person shared = new Person("Alex");
        Thread worker = new Thread(new Renamer(shared), "worker");
        worker.start();
        worker.join();
        System.out.println(Thread.currentThread().getName() + " sees: " + shared.getName());
        StackWalker.getInstance().forEach(frame -> System.out.println("  main stack: " + frame));
    }
}

class Renamer implements Runnable {
    private final Person target;

    Renamer(Person target) {
        this.target = target;
    }

    @Override
    public void run() {
        target.setName("Yaksh");
        System.out.println(Thread.currentThread().getName() + " renamed the shared Person");
        StackWalker.getInstance().forEach(frame -> System.out.println("  worker stack: " + frame));
    }
}`,
  verifiedWith: V,
};

export const TWO_THREADS_OUTPUT: CodeListing = {
  id: 'mem-two-threads-output',
  title: 'java -cp . TwoThreads',
  language: 'text',
  code: `worker renamed the shared Person
  worker stack: Renamer.run(TwoThreads.java:23)
  worker stack: java.base/java.lang.Thread.run(Thread.java:1474)
main sees: Yaksh
  main stack: TwoThreads.main(TwoThreads.java:8)`,
  verifiedWith: `${V}; StackWalker skips JDK frames it treats as hidden, such as Thread.runWith`,
};

export const COUNTDOWN_JAVA: CodeListing = {
  id: 'mem-countdown-java',
  title: 'Countdown.java',
  language: 'java',
  code: `public class Countdown {
    static int countdown(int n) {
        if (n == 0) {
            return 0;
        }
        return 1 + countdown(n - 1);
    }

    public static void main(String[] args) {
        System.out.println(countdown(3));
    }
}`,
  verifiedWith: `${V}; prints 3`,
};

export const COUNTDOWN_JAVAP: CodeListing = {
  id: 'mem-countdown-javap',
  title: 'javap -c Countdown · countdown(int) (stack=3, locals=1)',
  language: 'text',
  code: ` 0: iload_0
 1: ifne          6
 4: iconst_0
 5: ireturn
 6: iconst_1
 7: iload_0
 8: iconst_1
 9: isub
10: invokestatic  #7                  // Method countdown:(I)I
13: iadd
14: ireturn`,
  verifiedWith: V,
};

export const OVERFLOW_JAVA: CodeListing = {
  id: 'mem-overflow-java',
  title: 'Overflow.java: recursion without a base case',
  language: 'java',
  code: `public class Overflow {
    static int depth = 0;

    static void down() {
        depth++;
        down();
    }

    public static void main(String[] args) {
        try {
            down();
        } catch (StackOverflowError e) {
            System.out.println("StackOverflowError after " + depth + " frames of down()");
        }
    }
}`,
  verifiedWith: V,
};

export const OVERFLOW_OUTPUT: CodeListing = {
  id: 'mem-overflow-output',
  title: 'Three runs: twice with the default stack, once with -Xss256k',
  language: 'text',
  code: `$ java -cp . Overflow
StackOverflowError after 22182 frames of down()
$ java -cp . Overflow
StackOverflowError after 22071 frames of down()
$ java -Xss256k -cp . Overflow
StackOverflowError after 2470 frames of down()`,
  verifiedWith: `${V}; ThreadStackSize = 1024 KB by default here; the depth differs between runs as methods are JIT-compiled`,
};

export const UNCAUGHT_OUTPUT: CodeListing = {
  id: 'mem-uncaught-output',
  title: 'The same recursion, uncaught (first lines)',
  language: 'text',
  code: `Exception in thread "main" java.lang.StackOverflowError
	at Uncaught.down(Uncaught.java:3)
	at Uncaught.down(Uncaught.java:3)
	at Uncaught.down(Uncaught.java:3)
…`,
  verifiedWith: `${V}; 1,025 lines in all, because MaxJavaStackTraceDepth is 1024`,
};

export const JOL_DEFAULT: CodeListing = {
  id: 'mem-jol-default',
  title: 'JOL · Person, default flags (compressed oops and class pointers)',
  language: 'text',
  code: `# VM mode: 64 bits
# Compressed references (oops): 3-bit shift
# Compressed class pointers: 0-bit shift and 0x32000000 base
# Object alignment: 8 bytes

Person object internals:
OFF  SZ               TYPE DESCRIPTION               VALUE
  0   8                    (object header: mark)     0x0000000000000001 (non-biasable; age: 0)
  8   4                    (object header: class)    0x01052000
 12   4   java.lang.String Person.name               null
Instance size: 16 bytes
Space losses: 0 bytes internal + 0 bytes external = 0 bytes total`,
  verifiedWith: `${JOL}; header values differ between runs`,
};

export const JOL_COMPACT: CodeListing = {
  id: 'mem-jol-compact',
  title: 'JOL · Person with -XX:+UseCompactObjectHeaders',
  language: 'text',
  code: `Person object internals:
OFF  SZ               TYPE DESCRIPTION               VALUE
  0   8                    (object header: mark)     0x010c000000000001 (Lilliput)
  8   4   java.lang.String Person.name               null
 12   4                    (object alignment gap)
Instance size: 16 bytes
Space losses: 0 bytes internal + 4 bytes external = 4 bytes total`,
  verifiedWith: `${JOL}; JOL calls compact headers by their project name, Lilliput`,
};

export const JOL_NO_COOPS: CodeListing = {
  id: 'mem-jol-nocoops',
  title: 'JOL · Person with -XX:-UseCompressedOops',
  language: 'text',
  code: `# Compressed references (oops): disabled
# Compressed class pointers: 0-bit shift and 0xD000000 base

Person object internals:
OFF  SZ               TYPE DESCRIPTION               VALUE
  0   8                    (object header: mark)     0x0000000000000001 (non-biasable; age: 0)
  8   4                    (object header: class)    0x01052000
 12   4                    (alignment/padding gap)
 16   8   java.lang.String Person.name               null
Instance size: 24 bytes
Space losses: 4 bytes internal + 0 bytes external = 4 bytes total`,
  verifiedWith: JOL,
};

export const JOL_MIXED: CodeListing = {
  id: 'mem-jol-mixed',
  title: 'JOL · class Mixed { byte flag; long id; Object ref; int count; } (default flags)',
  language: 'text',
  code: `Mixed object internals:
OFF  SZ               TYPE DESCRIPTION               VALUE
  0   8                    (object header: mark)     0x0000000000000001 (non-biasable; age: 0)
  8   4                    (object header: class)    0x01052438
 12   4                int Mixed.count               0
 16   8               long Mixed.id                  0
 24   1               byte Mixed.flag                0
 25   3                    (alignment/padding gap)
 28   4   java.lang.Object Mixed.ref                 null
Instance size: 32 bytes
Space losses: 3 bytes internal + 0 bytes external = 3 bytes total`,
  verifiedWith: `${JOL}; HotSpot does not keep the declaration order`,
};

export const JOL_ARRAYS: CodeListing = {
  id: 'mem-jol-arrays',
  title: 'JOL · the header of an int[] (default flags, then compact headers)',
  language: 'text',
  code: `$ java -jar jol-cli.jar internals "[I"
[I object internals:
OFF  SZ   TYPE DESCRIPTION               VALUE
  0   8        (object header: mark)     N/A
  8   4        (object header: class)    N/A
 12   4        (array length)            N/A
 16   0    int [I.<elements>             N/A

$ java -XX:+UseCompactObjectHeaders -jar jol-cli.jar internals "[I"
[I object internals:
OFF  SZ   TYPE DESCRIPTION               VALUE
  0   8        (object header: mark)     N/A
  8   4        (array length)            N/A
 12   0    int [I.<elements>             N/A`,
  verifiedWith: `${JOL}; JOL shows the layout of a zero-length array`,
};

export const SIZES_OUTPUT: CodeListing = {
  id: 'mem-sizes',
  title: 'Instrumentation.getObjectSize, three configurations',
  language: 'text',
  code: `                           default   compact headers   -UseCompressedOops
new Object()                    16                 8                   16
new Person("Alex")              16                16                   24
new Point()   (int x, int y)    24                16                   24
new Mixed()                     32                32                   40
"Alex" (the String object)      24                24                   32
new int[0]                      16                16                   16
new int[3]                      32                24                   32
new Person[2]                   24                24                   32
new byte[4]                     24                16                   24`,
  verifiedWith: `${V}; sizes in bytes, from a java agent calling Instrumentation.getObjectSize (three runs, tabulated)`,
};

export const MARK_WORD_SOURCE: CodeListing = {
  id: 'mem-markword',
  title: 'src/hotspot/share/oops/markWord.hpp (the layout comment)',
  language: 'text',
  code: `//  64 bits:
//  --------
//  unused:22 hash:31 -->| unused_gap:4  age:4  self-fwd:1  lock:2 (normal object)
//
//  64 bits (with compact headers):
//  -------------------------------
//  klass:22  hash:31 -->| unused_gap:4  age:4  self-fwd:1  lock:2 (normal object)`,
  verifiedWith: 'OpenJDK source at the jdk-25-ga tag, the version OpenJDK 25.0.4 is built from',
};

export const FLAGS_OUTPUT: CodeListing = {
  id: 'mem-flags',
  title: 'java -XX:+PrintFlagsFinal -version (selected flags)',
  language: 'text',
  code: `   size_t CompressedClassSpaceSize                 = 1073741824                                {product} {default}
   size_t G1HeapRegionSize                         = 2097152                                   {product} {ergonomic}
   size_t InitialHeapSize                          = 224395264                                 {product} {ergonomic}
 uint64_t MaxDirectMemorySize                      = 0                                         {product} {default}
   size_t MaxHeapSize                              = 3586129920                                {product} {ergonomic}
   double MaxRAMPercentage                         = 25.000000                                 {product} {default}
   size_t MaxMetaspaceSize                         = 18446744073709551615                      {product} {default}
   size_t MetaspaceSize                            = 22020096                                  {product} {default}
      int ObjectAlignmentInBytes                   = 8                              {product lp64_product} {default}
    uintx ReservedCodeCacheSize                    = 251662336                              {pd product} {ergonomic}
     intx ThreadStackSize                          = 1024                                   {pd product} {default}
     bool UseCompactObjectHeaders                  = false                          {product lp64_product} {default}
     bool UseCompressedClassPointers               = true                           {product lp64_product} {default}
     bool UseCompressedOops                        = true                           {product lp64_product} {ergonomic}
     bool UseG1GC                                  = true                                      {product} {ergonomic}`,
  verifiedWith: `${V}; on a machine with 4 CPUs and 13.4 GB of memory, so the ergonomic values are this machine's`,
};

export const NO_CCP_WARNING: CodeListing = {
  id: 'mem-no-ccp',
  title: 'java -XX:-UseCompressedClassPointers …',
  language: 'text',
  code: `OpenJDK 64-Bit Server VM warning: Option UseCompressedClassPointers was deprecated in version 25.0 and will likely be removed in a future release.
[0.005s][warning][cds] Unable to use shared archive file.
[                    ] The saved state of UseCompressedOops and UseCompressedClassPointers is different from runtime, CDS will be disabled.`,
  verifiedWith: V,
};

export const HEAP_INFO: Record<'serial' | 'parallel' | 'g1' | 'zgc' | 'shenandoah', CodeListing> = {
  serial: {
    id: 'mem-heap-serial',
    title: 'jcmd <pid> GC.heap_info (-XX:+UseSerialGC -Xms64m -Xmx64m)',
    language: 'text',
    code: `DefNew     total 19648K, used 3631K [0x00000000fc000000, 0x00000000fd550000, 0x00000000fd550000)
 eden space 17472K,  20% used [0x00000000fc000000, 0x00000000fc38bf78, 0x00000000fd110000)
 from space 2176K,   0% used [0x00000000fd110000, 0x00000000fd110000, 0x00000000fd330000)
 to   space 2176K,   0% used [0x00000000fd330000, 0x00000000fd330000, 0x00000000fd550000)
Tenured    total 43712K, used 1156K [0x00000000fd550000, 0x0000000100000000, 0x0000000100000000)
 the  space 43712K,   2% used [0x00000000fd550000, 0x00000000fd671198, 0x0000000100000000)`,
    verifiedWith: `${V}; addresses are virtual addresses of this run`,
  },
  parallel: {
    id: 'mem-heap-parallel',
    title: 'jcmd <pid> GC.heap_info (-XX:+UseParallelGC -Xms64m -Xmx64m)',
    language: 'text',
    code: `PSYoungGen      total 18944K, used 3277K [0x00000000feb00000, 0x0000000100000000, 0x0000000100000000)
 eden space 16384K, 20% used [0x00000000feb00000,0x00000000fee33418,0x00000000ffb00000)
 from space 2560K, 0% used [0x00000000ffd80000,0x00000000ffd80000,0x0000000100000000)
 to   space 2560K, 0% used [0x00000000ffb00000,0x00000000ffb00000,0x00000000ffd80000)
ParOldGen       total 44032K, used 1156K [0x00000000fc000000, 0x00000000feb00000, 0x00000000feb00000)
 object space 44032K, 2% used [0x00000000fc000000,0x00000000fc121198,0x00000000feb00000)`,
    verifiedWith: `${V}; addresses are virtual addresses of this run`,
  },
  g1: {
    id: 'mem-heap-g1',
    title: 'jcmd <pid> GC.heap_info (-XX:+UseG1GC -Xms64m -Xmx64m)',
    language: 'text',
    code: `garbage-first heap   total reserved 65536K, committed 65536K, used 5252K [0x00000000fc000000, 0x0000000100000000)
 region size 1024K, 4 young (4096K), 0 survivors (0K)`,
    verifiedWith: `${V}; G1 is the default collector here`,
  },
  zgc: {
    id: 'mem-heap-zgc',
    title: 'jcmd <pid> GC.heap_info (-XX:+UseZGC -Xms64m -Xmx64m)',
    language: 'text',
    code: ` ZHeap            used 6M, capacity 64M, max capacity 64M
 Cache           58M (1)
  size classes   32M (1)`,
    verifiedWith: V,
  },
  shenandoah: {
    id: 'mem-heap-shenandoah',
    title: 'jcmd <pid> GC.heap_info (-XX:+UseShenandoahGC -Xms64m -Xmx64m)',
    language: 'text',
    code: `Shenandoah Heap
 65536K max, 65536K soft max, 65536K committed, 4096K used
 256 x 256 K regions
Status: not cancelled
Reserved region:
 - [0x00000000fc000000, 0x0000000100000000)`,
    verifiedWith: `${V}; the collection-set lines are left out`,
  },
};

export const GC_INIT: CodeListing = {
  id: 'mem-gc-init',
  title: 'java -Xms64m -Xmx64m -Xlog:gc+init -version, one collector at a time (selected lines)',
  language: 'text',
  code: `-XX:+UseG1GC          [gc,init] Heap Region Size: 1M
-XX:+UseParallelGC    [gc,init] Alignments: Space 512K, Generation 512K, Heap 2M
-XX:+UseShenandoahGC  [gc,init] Heap Region Count: 256
                      [gc,init] Heap Region Size: 256K
                      [gc,init] Mode: Snapshot-At-The-Beginning (SATB)
-XX:+UseZGC           [gc,init] Initializing The Z Garbage Collector
                      [gc,init] Medium Page Size: N/A`,
  verifiedWith: `${V}; the [0.004s][info] prefixes are left out`,
};

export const GC_LOG_G1: CodeListing = {
  id: 'mem-gclog-g1',
  title: 'java -Xms32m -Xmx32m -Xlog:gc,gc+heap=info -cp . Churn (G1)',
  language: 'text',
  code: `[0.004s][info][gc] Using G1
[0.026s][info][gc,heap] GC(0) Eden regions: 17->0(13)
[0.026s][info][gc,heap] GC(0) Survivor regions: 0->1(3)
[0.026s][info][gc,heap] GC(0) Old regions: 2->2
[0.026s][info][gc,heap] GC(0) Humongous regions: 0->0
[0.026s][info][gc     ] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 18M->1M(32M) 0.932ms
…
[0.037s][info][gc,heap] GC(5) Eden regions: 18->0(17)
[0.037s][info][gc,heap] GC(5) Survivor regions: 1->2(3)
[0.037s][info][gc,heap] GC(5) Old regions: 2->2
[0.037s][info][gc     ] GC(5) Pause Young (Normal) (G1 Evacuation Pause) 20M->2M(32M) 0.690ms
kept 2000 arrays`,
  verifiedWith: `${V}; Churn allocates 200,000 long[64] arrays and keeps every hundredth`,
};

export const GC_LOG_SERIAL: CodeListing = {
  id: 'mem-gclog-serial',
  title: 'The same program with -XX:+UseSerialGC',
  language: 'text',
  code: `[0.003s][info][gc] Using Serial
[0.022s][info][gc,heap] GC(0) DefNew: 8704K(9792K)->189K(9792K) Eden: 8704K(8704K)->0K(8704K) From: 0K(1088K)->189K(1088K)
[0.022s][info][gc,heap] GC(0) Tenured: 1156K(21888K)->1156K(21888K)
[0.022s][info][gc     ] GC(0) Pause Young (Allocation Failure) 9M->1M(30M) 0.457ms
…
[0.029s][info][gc,heap] GC(6) DefNew: 9330K(9792K)->524K(9792K) Eden: 8704K(8704K)->0K(8704K) From: 626K(1088K)->524K(1088K)
[0.029s][info][gc,heap] GC(6) Tenured: 1156K(21888K)->1345K(21888K)
[0.029s][info][gc     ] GC(6) Pause Young (Allocation Failure) 10M->1M(30M) 0.495ms`,
  verifiedWith: `${V}; in GC(6) survivors are promoted: Tenured grows from 1156K to 1345K`,
};

export const NMT_SUMMARY: CodeListing = {
  id: 'mem-nmt',
  title:
    'jcmd <pid> VM.native_memory summary (java -XX:NativeMemoryTracking=summary -Xms256m -Xmx256m)',
  language: 'text',
  code: `Total: reserved=1720258KB, committed=344462KB
       malloc: 21478KB #7510, peak=21503KB #7481
       mmap:   reserved=1698780KB, committed=322984KB

-                 Java Heap (reserved=262144KB, committed=262144KB)
-                     Class (reserved=1048645KB, committed=197KB)
                            (classes #789)
                            (  Metadata:   )
                            (    reserved=65536KB, committed=320KB)
                            (  Class space:)
                            (    reserved=1048576KB, committed=128KB)
-                    Thread (reserved=20545KB, committed=1061KB)
                            (threads #20)
                            (stack: reserved=20480KB, committed=996KB, peak=996KB)
-                      Code (reserved=247775KB, committed=7631KB)
-                        GC (reserved=46390KB, committed=46390KB)
-                     Other (reserved=8192KB, committed=8192KB)
                            (malloc=8192KB tag=Other #1) (at peak)
-                    Symbol (reserved=1134KB, committed=1134KB)
-        Shared class space (reserved=16384KB, committed=13880KB, readonly=0KB)
…`,
  verifiedWith: `${V}; the program held 20,000 Person objects and one 8 MB direct buffer (Other); several detail lines and small categories are left out`,
};

export const HISTOGRAM: CodeListing = {
  id: 'mem-histogram',
  title: 'jcmd <pid> GC.class_histogram (first rows)',
  language: 'text',
  code: ` num     #instances         #bytes  class name (module)
-------------------------------------------------------
   1:         28781        1031072  [B (java.base@25.0.4.1)
   2:         28704         688896  java.lang.String (java.base@25.0.4.1)
   3:         20000         320000  Person
   4:          1468         236944  [Ljava.lang.Object; (java.base@25.0.4.1)
   5:          1699         224824  java.lang.Class (java.base@25.0.4.1)`,
  verifiedWith: `${V}; 320000 / 20000 = 16 bytes per Person, as JOL shows`,
};

export const THREAD_PRINT: CodeListing = {
  id: 'mem-thread-print',
  title: 'jcmd <pid> Thread.print (two of the threads)',
  language: 'text',
  code: `"main" #3 [4764] prio=5 os_prio=0 cpu=35.56ms elapsed=3.49s tid=0x00007f306001a5f0 nid=4764 waiting on condition  [0x00007f30657fe000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
	at java.lang.Thread.sleepNanos0(java.base@25.0.4.1/Native Method)
	at java.lang.Thread.sleepNanos(java.base@25.0.4.1/Thread.java:509)
	at java.lang.Thread.sleep(java.base@25.0.4.1/Thread.java:540)
	at Workload.main(Workload.java:18)

"helper" #23 [4784] daemon prio=5 os_prio=0 cpu=0.38ms elapsed=3.45s tid=0x00007f30601764c0 nid=4784 waiting on condition  [0x00007f30392fd000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
	at java.lang.Thread.sleepNanos0(java.base@25.0.4.1/Native Method)
	…`,
  verifiedWith: `${V}; ids and addresses differ between runs`,
};

export const HEAP_DUMP: CodeListing = {
  id: 'mem-heap-dump',
  title: 'Heap dumps: on request, and automatically on OutOfMemoryError',
  language: 'text',
  code: `$ jcmd <pid> GC.heap_dump /…/workload.hprof
Dumping heap to /…/workload.hprof ...
Heap dump file created [6188057 bytes in 0.021 secs]

$ java -Xmx16m -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=dumps/ -cp . HeapSpace
java.lang.OutOfMemoryError: Java heap space
Dumping heap to dumps/java_pid7799.hprof ...
Heap dump file created [11160666 bytes in 0.012 secs]
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at HeapSpace.main(HeapSpace.java:8)`,
  verifiedWith: V,
};

export const OOM: Record<'heap' | 'metaspace' | 'classSpace' | 'direct' | 'threads', CodeListing> =
  {
    heap: {
      id: 'mem-oom-heap',
      title: 'java -Xmx16m -cp . HeapSpace (keeps 1 MB arrays in a list)',
      language: 'text',
      code: `Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
	at HeapSpace.main(HeapSpace.java:8)`,
      verifiedWith: V,
    },
    metaspace: {
      id: 'mem-oom-metaspace',
      title:
        'java -XX:MaxMetaspaceSize=24m -cp . MetaspaceFill (defines a class in loader after loader)',
      language: 'text',
      code: `Exception in thread "main" java.lang.OutOfMemoryError: Metaspace
	at java.base/java.lang.ClassLoader.defineClass1(Native Method)
	at java.base/java.lang.ClassLoader.defineClass(ClassLoader.java:962)
	at java.base/java.lang.ClassLoader.defineClass(ClassLoader.java:826)
	at MetaspaceFill.main(MetaspaceFill.java:17)`,
      verifiedWith: V,
    },
    classSpace: {
      id: 'mem-oom-class-space',
      title: 'java -XX:CompressedClassSpaceSize=8m -cp . MetaspaceFill',
      language: 'text',
      code: `[0.001s][warning][metaspace] CompressedClassSpaceSize adjusted from user input 8388608 bytes to 16777216 bytes
Exception in thread "main" java.lang.OutOfMemoryError: Compressed class space
	at java.base/java.lang.ClassLoader.defineClass1(Native Method)
	…`,
      verifiedWith: V,
    },
    direct: {
      id: 'mem-oom-direct',
      title: 'java -XX:MaxDirectMemorySize=1m -cp . DirectBuffers (keeps 256 KB direct buffers)',
      language: 'text',
      code: `Exception in thread "main" java.lang.OutOfMemoryError: Cannot reserve 262144 bytes of direct buffer memory (allocated: 1048576, limit: 1048576)
	at java.base/java.nio.Bits.reserveMemory(Bits.java:178)
	at java.base/java.nio.DirectByteBuffer.<init>(DirectByteBuffer.java:108)
	at java.base/java.nio.ByteBuffer.allocateDirect(ByteBuffer.java:367)
	at DirectBuffers.main(DirectBuffers.java:9)`,
      verifiedWith: V,
    },
    threads: {
      id: 'mem-oom-threads',
      title:
        'Starting threads until the process limit is reached (address space capped with ulimit -v)',
      language: 'text',
      code: `$ ulimit -v 2500000
$ java -Xmx64m -XX:ReservedCodeCacheSize=32m -cp . ManyThreads
[0.041s][warning][os,thread] Failed to start thread "Unknown thread" - pthread_create failed (EAGAIN) for attributes: stacksize: 1024k, guardsize: 0k, detached.
[0.041s][warning][os,thread] Failed to start the native thread for java.lang.Thread "Thread-52"
started 52 threads, then: java.lang.OutOfMemoryError: unable to create native thread: possibly out of memory or process/resource limits reached`,
      verifiedWith: `${V}; the limit was artificial, so only 52 threads fit`,
    },
  };
