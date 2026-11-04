import type { MemoryProgramId } from '@/content/labs/memoryPrograms';
import type { HeapObject, Value } from '@/simulators/memory';

/** The programs' names on the program switch. */
export const PROGRAM_LABEL: Record<MemoryProgramId, string> = {
  core: 'Two variables',
  threads: 'Two threads',
  recursion: 'Recursion',
};

/** A value as the laboratory writes it: a reference names the object it points to. */
export function describeValue(value: Value, objects: HeapObject[]) {
  switch (value.kind) {
    case 'ref': {
      const target = objects.find((o) => o.id === value.target);
      return target ? `→ ${target.label}` : '→ ?';
    }
    case 'null':
      return 'null';
    case 'int':
      return String(value.value);
    case 'unset':
      return '—';
  }
}
