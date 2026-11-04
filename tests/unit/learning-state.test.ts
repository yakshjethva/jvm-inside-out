import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  EMPTY_PROGRESS,
  isPreferences,
  isProgress,
  migratePreferences,
  migrateProgress,
  preferenceActions,
  preferencesStore,
  progressActions,
  progressStore,
} from '@/hooks/useLearningState';
import { textAtLevel } from '@/lib/levels';
import { createPersistentStore, storageKey } from '@/lib/storage';

/** Writes `stored` the way an older release would have, then reads it back through a store. */
function loadPreferences(stored: unknown) {
  localStorage.setItem(storageKey('prefs-under-test'), JSON.stringify(stored));
  return createPersistentStore(
    'prefs-under-test',
    isPreferences,
    DEFAULT_PREFERENCES,
    migratePreferences,
  ).get();
}

describe('preference migration', () => {
  it('maps the two old levels onto the new ones and keeps the motion choice', () => {
    expect(loadPreferences({ level: 'beginner', motion: 'reduce' })).toEqual({
      ...DEFAULT_PREFERENCES,
      level: 'simple',
      motion: 'reduce',
    });
    expect(loadPreferences({ level: 'technical', motion: 'allow' })).toEqual({
      ...DEFAULT_PREFERENCES,
      level: 'deep',
      motion: 'allow',
    });
  });

  it('keeps values that are already in the new format', () => {
    const current = {
      level: 'developer',
      motion: 'system',
      mapView: 'full',
      dismissed: { 'explorer-tour': 5 },
    };
    expect(loadPreferences(current)).toEqual(current);
  });

  it('repairs invalid fields one at a time instead of resetting everything', () => {
    expect(loadPreferences({ level: 'expert', motion: 'reduce', dismissed: 'yes' })).toEqual({
      ...DEFAULT_PREFERENCES,
      motion: 'reduce',
    });
  });

  it('falls back to defaults when the stored value is not an object', () => {
    expect(loadPreferences('beginner')).toEqual(DEFAULT_PREFERENCES);
  });

  it('starts new visitors at the simple level with the overview map', () => {
    expect(DEFAULT_PREFERENCES).toMatchObject({ level: 'simple', mapView: 'overview' });
  });
});

describe('progress migration', () => {
  const savedByM2 = {
    explored: { heap: 1 },
    understood: { heap: 2 },
    bookmarks: [{ key: 'anatomy:heap', title: 'Heap', href: '/anatomy?c=heap', at: 3 }],
    recent: [{ key: 'anatomy:heap', title: 'Heap', href: '/anatomy?c=heap', at: 3 }],
    quizzes: { 'anatomy-quiz': { answers: { q1: 'b' }, correct: 1, total: 8, updatedAt: 4 } },
    scenarios: { 'new-person': 3 },
    lastVisited: { key: 'anatomy:heap', title: 'Heap', href: '/anatomy?c=heap', at: 3 },
  };

  it('keeps everything saved before lessons existed', () => {
    localStorage.setItem(storageKey('progress-under-test'), JSON.stringify(savedByM2));
    const progress = createPersistentStore(
      'progress-under-test',
      isProgress,
      EMPTY_PROGRESS,
      migrateProgress,
    ).get();
    expect(progress).toEqual({ ...savedByM2, lessons: {} });
  });

  it('records completed lesson chapters without touching other progress', () => {
    progressStore.reset();
    progressActions.toggleUnderstood('heap');
    progressActions.completeChapter('first-run', 'compiler');
    progressActions.completeChapter('first-run', 'compiler');
    progressActions.completeChapter('first-run', 'memory');
    const state = progressStore.get();
    expect(Object.keys(state.lessons['first-run']!)).toEqual(['compiler', 'memory']);
    expect('heap' in state.understood).toBe(true);
  });

  it('keeps laboratory stations in the same record, so labs needed no migration', () => {
    progressStore.reset();
    progressActions.completeChapter('first-run', 'compiler');
    progressActions.completeChapter('lab:class-loading', 'observatory');
    progressActions.completeChapter('lab:memory', 'living');
    const saved = JSON.parse(localStorage.getItem(storageKey('progress'))!);
    // Data saved before the laboratories existed is still valid as it is.
    expect(migrateProgress(savedByM2)).toEqual({ ...savedByM2, lessons: {} });
    expect(isProgress(saved)).toBe(true);
    expect(Object.keys(saved.lessons).sort()).toEqual([
      'first-run',
      'lab:class-loading',
      'lab:memory',
    ]);
    expect(Object.keys(saved.lessons['lab:memory'])).toEqual(['living']);
  });
});

describe('preference actions', () => {
  it('remembers dismissed guides and the chosen map view', () => {
    preferencesStore.reset();
    preferenceActions.dismiss('explorer-tour');
    preferenceActions.setMapView('full');
    expect(preferencesStore.get().dismissed['explorer-tour']).toBeTypeOf('number');
    expect(preferencesStore.get().mapView).toBe('full');
    preferenceActions.undismiss('explorer-tour');
    expect(preferencesStore.get().dismissed).toEqual({});
  });
});

describe('textAtLevel', () => {
  const full = { simple: 'S', developer: 'D', deep: 'X' };

  it('returns the text written for each level', () => {
    expect(textAtLevel(full, 'simple')).toEqual({ text: 'S', level: 'simple', fallback: false });
    expect(textAtLevel(full, 'developer')).toEqual({
      text: 'D',
      level: 'developer',
      fallback: false,
    });
    expect(textAtLevel(full, 'deep')).toEqual({ text: 'X', level: 'deep', fallback: false });
  });

  it('falls back to the deep dive, and says so, when no developer text exists yet', () => {
    expect(textAtLevel({ simple: 'S', deep: 'X' }, 'developer')).toEqual({
      text: 'X',
      level: 'deep',
      fallback: true,
    });
  });
});
