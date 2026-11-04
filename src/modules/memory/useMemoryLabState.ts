import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  COLLECTORS,
  isAreaId,
  LAYOUT_CONFIGS,
  LAYOUT_SUBJECTS,
  MEMORY_STATIONS,
  type CollectorId,
  type LayoutConfigId,
  type LayoutSubjectId,
  type MemoryAreaId,
  type MemoryStationId,
} from '@/content/labs/memory';
import { isProgramId, MEMORY_PROGRAMS, type MemoryProgramId } from '@/content/labs/memoryPrograms';
import { memoryTimeline } from '@/simulators/memory';

const STATIONS = MEMORY_STATIONS.map((s) => s.id);
const isStation = (value: string | null): value is MemoryStationId =>
  STATIONS.includes(value as MemoryStationId);

/** Timelines are pure and fixed: computed once per program. */
const TIMELINES = Object.fromEntries(
  MEMORY_PROGRAMS.map((p) => [p.id, memoryTimeline(p.steps)]),
) as Record<MemoryProgramId, ReturnType<typeof memoryTimeline>>;

/**
 * The Memory Laboratory's state, all in the URL so any view can be shared:
 *   lab      observatory | living | frames | layout | heap
 *   area     the memory area selected in the observatory
 *   viewer   3d for the 3D observatory
 *   program  core | threads | recursion (living stack and heap, frames)
 *   step     the step of the program
 *   select   the object, reference or frame selected in the living lab
 *   frame    the frame being dissected
 *   object   the layout subject, config the configuration
 *   gc       the collector shown
 */
export function useMemoryLabState() {
  const [params, setParams] = useSearchParams();
  const rawStation = params.get('lab');
  const station: MemoryStationId = isStation(rawStation) ? rawStation : 'observatory';
  const rawArea = params.get('area');
  const area: MemoryAreaId | null = isAreaId(rawArea) ? rawArea : null;
  const viewer: '2d' | '3d' = params.get('viewer') === '3d' ? '3d' : '2d';
  const rawProgram = params.get('program');
  const programId: MemoryProgramId = isProgramId(rawProgram)
    ? rawProgram
    : station === 'frames'
      ? 'recursion'
      : 'core';
  const program = MEMORY_PROGRAMS.find((p) => p.id === programId)!;
  const states = TIMELINES[programId];
  const rawStep = Number(params.get('step') ?? '0');
  const step =
    Number.isInteger(rawStep) && rawStep > 0 ? Math.min(rawStep, program.steps.length - 1) : 0;
  const selected = params.get('select');
  const frame = params.get('frame');
  const rawObject = params.get('object');
  const subject =
    LAYOUT_SUBJECTS.find((s) => s.id === rawObject)?.id ?? ('person' as LayoutSubjectId);
  const rawConfig = params.get('config');
  const config =
    LAYOUT_CONFIGS.find((c) => c.id === rawConfig)?.id ?? ('default' as LayoutConfigId);
  const rawGc = params.get('gc');
  const collector = COLLECTORS.find((c) => c.id === rawGc)?.id ?? ('g1' as CollectorId);
  /** Whether the URL holds something the learner did in this station's exhibit (a shared view). */
  const programChosen = isProgramId(rawProgram) || step > 0;
  const hasExhibitState = {
    observatory: area !== null || viewer === '3d',
    living: programChosen || selected !== null,
    frames: programChosen || frame !== null,
    layout:
      LAYOUT_SUBJECTS.some((s) => s.id === rawObject) ||
      LAYOUT_CONFIGS.some((c) => c.id === rawConfig),
    heap: COLLECTORS.some((c) => c.id === rawGc),
  }[station];

  const update = useCallback(
    (changes: Record<string, string | null>, replace = false) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace, preventScrollReset: true },
      );
    },
    [setParams],
  );

  return useMemo(
    () => ({
      station,
      area,
      viewer,
      program,
      states,
      step,
      selected,
      frame,
      subject,
      config,
      collector,
      hasExhibitState,
      selectArea: (id: MemoryAreaId | null) => update({ area: id }),
      setViewer: (next: '2d' | '3d') => update({ viewer: next === '3d' ? '3d' : null }),
      setProgram: (id: MemoryProgramId) =>
        update({
          program: id === (station === 'frames' ? 'recursion' : 'core') ? null : id,
          step: null,
          select: null,
          frame: null,
        }),
      setStep: (index: number) => update({ step: index > 0 ? String(index) : null }, true),
      select: (id: string | null) => update({ select: id }, true),
      setFrame: (id: string | null) => update({ frame: id }, true),
      setSubject: (id: LayoutSubjectId) => update({ object: id === 'person' ? null : id }, true),
      setConfig: (id: LayoutConfigId) => update({ config: id === 'default' ? null : id }, true),
      setCollector: (id: CollectorId) => update({ gc: id === 'g1' ? null : id }, true),
    }),
    [
      station,
      area,
      viewer,
      program,
      states,
      step,
      selected,
      frame,
      subject,
      config,
      collector,
      hasExhibitState,
      update,
    ],
  );
}

/** The link to a station of the Memory Laboratory. */
export function memoryStationHref(station: string) {
  return station === 'observatory' ? '/memory' : `/memory?lab=${station}`;
}
