import { act, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { DELEGATION_EXPERIMENTS } from '@/content/labs/classLoading';
import { stationHref, useClassLoadingState } from '@/modules/class-loading/useClassLoadingState';
import { memoryStationHref, useMemoryLabState } from '@/modules/memory/useMemoryLabState';

/** Renders a hook inside a router at `url` and returns its latest value and the router. */
function renderAt<T>(url: string, useHook: () => T) {
  const latest: { current: T | null } = { current: null };
  function Probe() {
    latest.current = useHook();
    return null;
  }
  const router = createMemoryRouter([{ path: '*', element: <Probe /> }], { initialEntries: [url] });
  render(<RouterProvider router={router} />);
  return { latest: latest as { current: T }, router };
}
const search = (router: ReturnType<typeof createMemoryRouter>) =>
  new URLSearchParams(router.state.location.search);

describe('the class loader explorer’s URL state', () => {
  it('reads every view from the URL, and ignores what it does not know', () => {
    const { latest } = renderAt(
      '/class-loading?lab=delegation&loader=app&run=app:com.example.shared.Message&step=2',
      useClassLoadingState,
    );
    expect(latest.current).toMatchObject({ station: 'delegation', loader: 'app', step: 2 });
    expect(latest.current.results).toHaveLength(1);
    expect(latest.current.hasExhibitState).toBe(true);

    const odd = renderAt(
      '/class-loading?lab=nowhere&loader=nobody&step=-3&run=x:!!',
      useClassLoadingState,
    );
    expect(odd.latest.current).toMatchObject({ station: 'observatory', loader: null, step: 0 });
    expect(odd.latest.current.results).toEqual([]);
    expect(odd.latest.current.hasExhibitState).toBe(false);
  });

  it('opens the observatory on the JVM a learner built in the delegation laboratory', () => {
    const { latest } = renderAt(
      '/class-loading?run=app:com.example.shared.Message',
      useClassLoadingState,
    );
    expect(latest.current.station).toBe('observatory');
    expect(latest.current.results).toHaveLength(1);
    expect(latest.current.hasExhibitState).toBe(true);
    // Moving there from the delegation laboratory keeps the run.
    expect(
      stationHref('observatory', '?lab=delegation&run=app:com.example.shared.Message&step=2'),
    ).toBe('/class-loading?run=app%3Acom.example.shared.Message');
  });

  it('treats an experiment without a run as the experiment’s own requests', () => {
    const experiment = DELEGATION_EXPERIMENTS.find((e) => e.id === 'constraint')!;
    const { latest } = renderAt(
      '/class-loading?lab=delegation&exp=constraint&step=1',
      useClassLoadingState,
    );
    expect(latest.current.experiment?.id).toBe('constraint');
    expect(latest.current.requests).toEqual([...experiment.setup, experiment.request]);
    expect(latest.current.results).toHaveLength(experiment.setup.length + 1);
  });

  it('records each request in the history, so Back undoes it', async () => {
    const { latest, router } = renderAt('/class-loading?lab=delegation', useClassLoadingState);
    act(() => latest.current.openExperiment('sql'));
    expect(search(router).get('exp')).toBe('sql');
    act(() => latest.current.send({ kind: 'class', loader: 'app', name: 'java.lang.String' }));
    expect(search(router).get('exp')).toBeNull();
    expect(latest.current.results).toHaveLength(2);
    await act(() => router.navigate(-1));
    expect(latest.current.experiment?.id).toBe('sql');
    expect(latest.current.results).toHaveLength(1);
    act(() => latest.current.reset());
    expect(router.state.location.search).toBe('?lab=delegation');
  });

  it('keeps the JVM and the selection when moving between stations, not the step', () => {
    expect(
      stationHref('lifecycle', '?lab=delegation&loader=app&run=app:Delegation&exp=sql&step=3'),
    ).toBe('/class-loading?lab=lifecycle&loader=app&run=app%3ADelegation');
    expect(stationHref('observatory', '?lab=lifecycle&step=2')).toBe('/class-loading');
  });
});

describe('the memory laboratory’s URL state', () => {
  it('reads the station, program and step, and keeps the step inside the program', () => {
    const { latest } = renderAt('/memory?lab=living&step=999', useMemoryLabState);
    expect(latest.current.station).toBe('living');
    expect(latest.current.program.id).toBe('core');
    expect(latest.current.step).toBe(latest.current.program.steps.length - 1);
    expect(latest.current.hasExhibitState).toBe(true);

    const frames = renderAt('/memory?lab=frames', useMemoryLabState);
    expect(frames.latest.current.program.id).toBe('recursion');
    expect(frames.latest.current.hasExhibitState).toBe(false);
  });

  it('falls back to defaults for unknown values', () => {
    const { latest } = renderAt(
      '/memory?lab=attic&area=lungs&program=nope&object=ghost&config=huge&gc=broom',
      useMemoryLabState,
    );
    expect(latest.current).toMatchObject({
      station: 'observatory',
      area: null,
      subject: 'person',
      config: 'default',
      collector: 'g1',
    });
    expect(latest.current.program.id).toBe('core');
  });

  it('leaves defaults out of the URL and replaces fine-grained changes in the history', () => {
    const { latest, router } = renderAt('/memory?lab=layout', useMemoryLabState);
    const before = router.state.historyAction;
    act(() => latest.current.setConfig('compact'));
    expect(search(router).get('config')).toBe('compact');
    expect(router.state.historyAction).toBe('REPLACE');
    act(() => latest.current.setConfig('default'));
    expect(search(router).has('config')).toBe(false);
    expect(before).toBe('POP');
    act(() => latest.current.selectArea('heap'));
    expect(router.state.historyAction).toBe('PUSH');
    expect(memoryStationHref('observatory')).toBe('/memory');
    expect(memoryStationHref('heap')).toBe('/memory?lab=heap');
  });
});
