import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  CLASS_LOADING_STATIONS,
  DELEGATION_EXPERIMENTS,
  isLoaderId,
  LOADER_WORLD,
  type ClassLoadingStationId,
  type LoaderId,
} from '@/content/labs/classLoading';
import { parseRun, replay, serializeRun, type LoadRequest } from '@/simulators/classLoading';

const STATION_IDS = CLASS_LOADING_STATIONS.map((s) => s.id);
const isStation = (value: string | null): value is ClassLoadingStationId =>
  STATION_IDS.includes(value as ClassLoadingStationId);

/**
 * Everything the Class Loader Explorer shows lives in the URL, so a view can
 * be shared and the back button undoes a request:
 *   lab      observatory | delegation | lifecycle
 *   loader   the selected loader
 *   run      the requests made so far (replayed to rebuild the JVM's state)
 *   exp      the guided experiment, when one is open (without run: its own requests)
 *   step     the step shown (of the last request, or of the lifecycle walkthrough)
 *   viewer   3d for the 3D observatory (absent: the 2D structure)
 */
export function useClassLoadingState() {
  const [params, setParams] = useSearchParams();
  const rawStation = params.get('lab');
  const station: ClassLoadingStationId = isStation(rawStation) ? rawStation : 'observatory';
  const rawLoader = params.get('loader');
  const loader: LoaderId | null = isLoaderId(rawLoader) ? rawLoader : null;
  const experiment = DELEGATION_EXPERIMENTS.find((e) => e.id === params.get('exp')) ?? null;
  const runText = params.get('run');
  // An experiment without a run (a shortened link) implies the experiment's own requests.
  const requests = useMemo(
    () =>
      runText === null && experiment
        ? [...experiment.setup, experiment.request]
        : parseRun(LOADER_WORLD, runText),
    [runText, experiment],
  );
  const results = useMemo(() => replay(LOADER_WORLD, requests), [requests]);
  const viewer: '2d' | '3d' = params.get('viewer') === '3d' ? '3d' : '2d';
  const rawStep = Number(params.get('step') ?? '0');
  const step = Number.isInteger(rawStep) && rawStep > 0 ? rawStep : 0;
  /**
   * Whether the URL holds something the learner did in this station's exhibit
   * (a shared view): the requests sent so far count for the observatory and the
   * delegation laboratory, which both show the JVM they built.
   */
  const hasExhibitState = {
    observatory: loader !== null || viewer === '3d' || requests.length > 0,
    delegation: experiment !== null || step > 0 || requests.length > 0,
    lifecycle: step > 0,
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
      loader,
      requests,
      results,
      experiment,
      viewer,
      step,
      hasExhibitState,
      select: (id: LoaderId | null) => update({ loader: id }),
      setViewer: (next: '2d' | '3d') => update({ viewer: next === '3d' ? '3d' : null }),
      setStep: (index: number) => update({ step: index > 0 ? String(index) : null }, true),
      /** Sends one more request; Back undoes it. */
      send: (request: LoadRequest) =>
        update({ run: serializeRun([...requests, request]), exp: null, step: null }),
      /** Opens a guided experiment: its setup and its request, at the first step. */
      openExperiment: (id: string) => {
        const found = DELEGATION_EXPERIMENTS.find((e) => e.id === id);
        if (!found) return;
        update({ exp: id, run: serializeRun([...found.setup, found.request]), step: null });
      },
      /** A fresh JVM: no requests, no experiment. */
      reset: () => update({ run: null, exp: null, step: null }),
    }),
    [station, loader, requests, results, experiment, viewer, step, hasExhibitState, update],
  );
}

/** The link to a station, keeping the JVM's state and the selection. */
export function stationHref(station: string, search: string) {
  const params = new URLSearchParams(search);
  params.delete('step');
  params.delete('exp');
  if (station === 'observatory') params.delete('lab');
  else params.set('lab', station);
  const query = params.toString();
  return `/class-loading${query ? `?${query}` : ''}`;
}
