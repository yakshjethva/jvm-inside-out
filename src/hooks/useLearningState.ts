import { useSyncExternalStore } from 'react';
import { createPersistentStore, isRecord } from '@/lib/storage';

/**
 * How deep explanations go. The same concept, connected to the same diagrams,
 * at three depths: no programming needed, for people who write Java, and the
 * exact engineering model.
 */
export type ExplanationLevel = 'simple' | 'developer' | 'deep';
export type MotionPreference = 'system' | 'reduce' | 'allow';
/** The explorer's default map: the six main parts, or every component. */
export type MapView = 'overview' | 'full';

export const EXPLANATION_LEVELS: {
  value: ExplanationLevel;
  label: string;
  description: string;
}[] = [
  { value: 'simple', label: 'Simple', description: 'Plain words, no programming needed' },
  {
    value: 'developer',
    label: 'Developer',
    description: 'Real Java code and what you see when it runs',
  },
  {
    value: 'deep',
    label: 'Deep dive',
    description: 'Specification sections, HotSpot internals and bytecode',
  },
];

export const levelLabel = (level: ExplanationLevel) =>
  EXPLANATION_LEVELS.find((option) => option.value === level)!.label;

export interface Preferences {
  level: ExplanationLevel;
  motion: MotionPreference;
  mapView: MapView;
  /** Guides the learner has dismissed: guide id → when. */
  dismissed: Record<string, number>;
}

export interface QuizResult {
  answers: Record<string, string>;
  correct: number;
  total: number;
  updatedAt: number;
}

export interface VisitedItem {
  /** e.g. "anatomy:heap" or "page:/glossary" */
  key: string;
  title: string;
  href: string;
  at: number;
}

export interface Progress {
  /** Component ids opened in the inspector → first time explored. */
  explored: Record<string, number>;
  /** Component ids the learner marked as understood. */
  understood: Record<string, number>;
  /** Bookmarked items, newest first. */
  bookmarks: VisitedItem[];
  /** Most recently explored items, newest first (max 8). */
  recent: VisitedItem[];
  quizzes: Record<string, QuizResult>;
  /** Scenario id → number of the furthest step reached. */
  scenarios: Record<string, number>;
  /** Lesson id → chapter id → when the chapter was completed. */
  lessons: Record<string, Record<string, number>>;
  lastVisited?: VisitedItem;
}

export const DEFAULT_PREFERENCES: Preferences = {
  level: 'simple',
  motion: 'system',
  mapView: 'overview',
  dismissed: {},
};

export const EMPTY_PROGRESS: Progress = {
  explored: {},
  understood: {},
  bookmarks: [],
  recent: [],
  quizzes: {},
  scenarios: {},
  lessons: {},
};

const isVisited = (v: unknown): v is VisitedItem =>
  isRecord(v) &&
  typeof v.key === 'string' &&
  typeof v.title === 'string' &&
  typeof v.href === 'string' &&
  typeof v.at === 'number';

const isNumberRecord = (v: unknown): v is Record<string, number> =>
  isRecord(v) && Object.values(v).every((n) => typeof n === 'number');

const LEVELS: readonly ExplanationLevel[] = ['simple', 'developer', 'deep'];
const MOTIONS: readonly MotionPreference[] = ['system', 'reduce', 'allow'];
const MAP_VIEWS: readonly MapView[] = ['overview', 'full'];

/** Levels saved by releases before three-level explanations existed. */
const LEGACY_LEVELS: Record<string, ExplanationLevel> = { beginner: 'simple', technical: 'deep' };

const oneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (options as readonly string[]).includes(value);

export function isPreferences(v: unknown): v is Preferences {
  return (
    isRecord(v) &&
    oneOf(LEVELS, v.level) &&
    oneOf(MOTIONS, v.motion) &&
    oneOf(MAP_VIEWS, v.mapView) &&
    isNumberRecord(v.dismissed)
  );
}

/**
 * Upgrades stored preferences field by field: old level names are mapped, and
 * a field that is missing or invalid takes its default without discarding the
 * others.
 */
export function migratePreferences(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  const level = typeof raw.level === 'string' ? (LEGACY_LEVELS[raw.level] ?? raw.level) : undefined;
  return {
    level: oneOf(LEVELS, level) ? level : DEFAULT_PREFERENCES.level,
    motion: oneOf(MOTIONS, raw.motion) ? raw.motion : DEFAULT_PREFERENCES.motion,
    mapView: oneOf(MAP_VIEWS, raw.mapView) ? raw.mapView : DEFAULT_PREFERENCES.mapView,
    dismissed: isNumberRecord(raw.dismissed) ? raw.dismissed : {},
  };
}

export function isProgress(v: unknown): v is Progress {
  return (
    isRecord(v) &&
    isNumberRecord(v.explored) &&
    isNumberRecord(v.understood) &&
    Array.isArray(v.bookmarks) &&
    v.bookmarks.every(isVisited) &&
    Array.isArray(v.recent) &&
    v.recent.every(isVisited) &&
    isRecord(v.quizzes) &&
    isNumberRecord(v.scenarios) &&
    isRecord(v.lessons) &&
    Object.values(v.lessons).every(isNumberRecord) &&
    (v.lastVisited === undefined || isVisited(v.lastVisited))
  );
}

/** Progress saved before lessons existed gains an empty lesson record; nothing else changes. */
export function migrateProgress(raw: unknown): unknown {
  if (!isRecord(raw) || raw.lessons !== undefined) return raw;
  return { ...raw, lessons: {} };
}

export const preferencesStore = createPersistentStore(
  'preferences',
  isPreferences,
  DEFAULT_PREFERENCES,
  migratePreferences,
);
export const progressStore = createPersistentStore(
  'progress',
  isProgress,
  EMPTY_PROGRESS,
  migrateProgress,
);

export const preferenceActions = {
  setLevel(level: ExplanationLevel) {
    preferencesStore.set((p) => ({ ...p, level }));
  },
  setMotion(motion: MotionPreference) {
    preferencesStore.set((p) => ({ ...p, motion }));
  },
  setMapView(mapView: MapView) {
    preferencesStore.set((p) => (p.mapView === mapView ? p : { ...p, mapView }));
  },
  dismiss(id: string) {
    preferencesStore.set((p) => ({ ...p, dismissed: { ...p.dismissed, [id]: Date.now() } }));
  },
  undismiss(id: string) {
    preferencesStore.set((p) => {
      if (!(id in p.dismissed)) return p;
      const dismissed = { ...p.dismissed };
      delete dismissed[id];
      return { ...p, dismissed };
    });
  },
};

/**
 * The server render, and the hydration pass that must match it, use the
 * defaults; React then re-renders with what this browser has stored.
 */
const serverPreferences = () => DEFAULT_PREFERENCES;
const serverProgress = () => EMPTY_PROGRESS;

export function usePreferences() {
  const preferences = useSyncExternalStore(
    preferencesStore.subscribe,
    preferencesStore.get,
    serverPreferences,
  );
  return {
    preferences,
    setLevel: preferenceActions.setLevel,
    setMotion: preferenceActions.setMotion,
  };
}

export function useProgress() {
  return useSyncExternalStore(progressStore.subscribe, progressStore.get, serverProgress);
}

const RECENT_LIMIT = 8;

export const progressActions = {
  markExplored(item: Omit<VisitedItem, 'at'>, componentId?: string) {
    const visited: VisitedItem = { ...item, at: Date.now() };
    progressStore.set((p) => {
      const recent = [visited, ...p.recent.filter((r) => r.key !== visited.key)].slice(
        0,
        RECENT_LIMIT,
      );
      const explored =
        componentId && !(componentId in p.explored)
          ? { ...p.explored, [componentId]: visited.at }
          : p.explored;
      return { ...p, recent, explored, lastVisited: visited };
    });
  },
  setLastVisited(item: VisitedItem) {
    progressStore.set((p) => ({ ...p, lastVisited: item }));
  },
  toggleUnderstood(componentId: string) {
    progressStore.set((p) => {
      const understood = { ...p.understood };
      if (componentId in understood) delete understood[componentId];
      else understood[componentId] = Date.now();
      return { ...p, understood };
    });
  },
  toggleBookmark(item: Omit<VisitedItem, 'at'>) {
    progressStore.set((p) => {
      const exists = p.bookmarks.some((b) => b.key === item.key);
      return {
        ...p,
        bookmarks: exists
          ? p.bookmarks.filter((b) => b.key !== item.key)
          : [{ ...item, at: Date.now() }, ...p.bookmarks],
      };
    });
  },
  saveQuiz(quizId: string, result: Omit<QuizResult, 'updatedAt'>) {
    progressStore.set((p) => ({
      ...p,
      quizzes: { ...p.quizzes, [quizId]: { ...result, updatedAt: Date.now() } },
    }));
  },
  recordScenarioStep(scenarioId: string, step: number) {
    progressStore.set((p) => {
      const previous = p.scenarios[scenarioId] ?? 0;
      if (step <= previous) return p;
      return { ...p, scenarios: { ...p.scenarios, [scenarioId]: step } };
    });
  },
  /** Marks a lesson chapter as completed (the first completion time is kept). */
  completeChapter(lessonId: string, chapterId: string) {
    progressStore.set((p) => {
      const lesson = p.lessons[lessonId] ?? {};
      if (chapterId in lesson) return p;
      return {
        ...p,
        lessons: { ...p.lessons, [lessonId]: { ...lesson, [chapterId]: Date.now() } },
      };
    });
  },
  reset() {
    progressStore.reset();
  },
};
