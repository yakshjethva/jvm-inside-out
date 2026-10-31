import { act, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useAnatomyState } from '@/modules/jvm/useAnatomyState';
import {
  explodeAnnouncement,
  isolationAnnouncement,
  selectionAnnouncement,
} from '../accessibility/announcements';
import { handleViewerKey } from '../interactions/viewerKeys';
import type { CameraApi } from '../controls/CameraRig';

function probe(path: string) {
  const seen: { current: ReturnType<typeof useAnatomyState> | null } = { current: null };
  function Probe() {
    seen.current = useAnatomyState();
    return null;
  }
  const router = createMemoryRouter([{ path: '/anatomy', element: <Probe /> }], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
  return { state: () => seen.current!, search: () => router.state.location.search };
}

describe('the explorer viewer in the URL', () => {
  it('defaults to the 2D map and reads the 3D and list viewers', () => {
    expect(probe('/anatomy').state().viewer).toBe('2d');
    expect(probe('/anatomy?viewer=3d&c=heap').state().viewer).toBe('3d');
    expect(probe('/anatomy?viewer=list').state().viewer).toBe('list');
    expect(probe('/anatomy?viewer=vr').state().viewer).toBe('2d');
  });

  it('keeps the selection, mode and walkthrough when the viewer changes', () => {
    const { state, search } = probe('/anatomy?c=heap&mode=execution&s=jit&step=2');
    act(() => state().setViewer('3d'));
    expect(search()).toBe('?c=heap&mode=execution&s=jit&step=2&viewer=3d');
    act(() => state().setViewer('2d'));
    expect(search()).toBe('?c=heap&mode=execution&s=jit&step=2');
  });
});

describe('3D keyboard shortcuts', () => {
  const calls: string[] = [];
  const camera: CameraApi = {
    rotate: (a, p) => calls.push(`rotate ${Math.sign(a)} ${Math.sign(p)}`),
    zoom: (f) => calls.push(`zoom ${f < 1 ? 'in' : 'out'}`),
    reset: () => calls.push('reset'),
    frame: () => calls.push('frame'),
  };
  const actions = {
    frameSelection: () => calls.push('frame selection'),
    clearSelection: () => calls.push('clear'),
  };

  const key = (name: string, modifiers: Partial<KeyboardEvent> = {}) => ({
    key: name,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...modifiers,
  });

  it('orbit, zoom, reset, frame and clear; other keys are left alone', () => {
    for (const name of ['ArrowLeft', 'ArrowRight', 'ArrowUp', '+', '-', '0', 'f', 'Escape'])
      expect(handleViewerKey(key(name), camera, actions), name).toBe(true);
    expect(calls).toEqual([
      'rotate -1 0',
      'rotate 1 0',
      'rotate 0 -1',
      'zoom in',
      'zoom out',
      'reset',
      'frame selection',
      'clear',
    ]);
    expect(handleViewerKey(key('Tab'), camera, actions)).toBe(false);
    expect(handleViewerKey(key('a'), camera, actions)).toBe(false);
    expect(handleViewerKey(key('ArrowLeft'), null, actions)).toBe(false);
  });

  it('leaves browser shortcuts alone: Ctrl or Cmd with 0, +, − or F, and Alt combinations', () => {
    const before = calls.length;
    expect(handleViewerKey(key('0', { ctrlKey: true }), camera, actions)).toBe(false);
    expect(handleViewerKey(key('+', { metaKey: true }), camera, actions)).toBe(false);
    expect(handleViewerKey(key('f', { ctrlKey: true }), camera, actions)).toBe(false);
    expect(handleViewerKey(key('ArrowLeft', { altKey: true }), camera, actions)).toBe(false);
    expect(calls).toHaveLength(before);
  });
});

describe('3D announcements', () => {
  it('say what changed in plain words', () => {
    expect(selectionAnnouncement('heap')).toBe('Heap selected.');
    expect(selectionAnnouncement(null)).toBe('Nothing selected.');
    expect(isolationAnnouncement('heap', true)).toBe(
      'Showing only Heap, what contains it and its parts.',
    );
    expect(isolationAnnouncement('heap', false)).toBe('Showing every part again.');
    expect(explodeAnnouncement(0.6)).toBe('Exploded 60 percent.');
    expect(explodeAnnouncement(0)).toBe('Reassembled.');
  });
});
