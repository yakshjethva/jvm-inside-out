import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { ComponentSearch } from '@/components/anatomy/ComponentSearch';
import { ComponentTree, type TreeItem } from '@/components/anatomy/ComponentTree';
import { ComponentInspector } from '@/components/inspector/ComponentInspector';
import { KnowledgeCheck } from '@/components/learning/KnowledgeCheck';
import { getComponentDoc, type ComponentId } from '@/content/jvm';
import { JVM_REGIONS } from '@/content/jvm/regions';
import { ANATOMY_QUIZ } from '@/content/jvm/quiz';
import { relationshipsOf } from '@/content/jvm/relationships';
import { preferencesStore, progressStore } from '@/hooks/useLearningState';
import { JvmAnatomyPage } from '@/pages/JvmAnatomyPage';

function renderInRouter(element: React.ReactNode, path = '/') {
  const router = createMemoryRouter([{ path: '*', element }], { initialEntries: [path] });
  return { router, ...render(<RouterProvider router={router} />) };
}

describe('ComponentInspector', () => {
  const doc = getComponentDoc('heap');
  const { outgoing, incoming } = relationshipsOf('heap');
  const setup = (level: 'simple' | 'developer' | 'deep' = 'simple') => {
    const onNavigate = vi.fn();
    const onLevelChange = vi.fn();
    renderInRouter(
      <ComponentInspector
        doc={doc}
        ancestry={[
          { id: 'jvm', name: 'Java Virtual Machine' },
          { id: 'heap', name: 'Heap' },
        ]}
        parts={[{ id: 'young-generation', name: 'Young generation' }]}
        outgoing={outgoing.map((rel) => ({
          rel,
          other: { id: rel.to, name: getComponentDoc(rel.to).name },
        }))}
        incoming={incoming.map((rel) => ({
          rel,
          other: { id: rel.from, name: getComponentDoc(rel.from).name },
        }))}
        level={level}
        onLevelChange={onLevelChange}
        onNavigate={onNavigate}
        bookmarked={false}
        onToggleBookmark={() => {}}
        understood={false}
        onToggleUnderstood={() => {}}
      />,
    );
    return { onNavigate, onLevelChange };
  };

  it('shows the component, its provenance and the chosen explanation level', () => {
    setup('deep');
    expect(screen.getByRole('heading', { level: 2, name: 'Heap' })).toBeInTheDocument();
    expect(screen.getAllByText('JVM specification').length).toBeGreaterThan(0);
    expect(screen.getByText('What actually happens?')).toBeInTheDocument();
    expect(screen.getByText('Common misconceptions')).toBeInTheDocument();
    expect(screen.getByText('Sources')).toBeInTheDocument();
  });

  it('navigates through relationships, parts and breadcrumbs', async () => {
    const user = userEvent.setup();
    const { onNavigate, onLevelChange } = setup();
    const fit = screen.getByRole('heading', { name: 'Where does it fit?' }).closest('section')!;
    await user.click(within(fit).getByRole('button', { name: 'Garbage collector' }));
    expect(onNavigate).toHaveBeenCalledWith('garbage-collector');
    await user.click(within(fit).getByRole('button', { name: 'Young generation' }));
    expect(onNavigate).toHaveBeenCalledWith('young-generation');
    const breadcrumb = screen.getByRole('navigation', { name: 'Component breadcrumb' });
    await user.click(within(breadcrumb).getByRole('button', { name: 'Java Virtual Machine' }));
    expect(onNavigate).toHaveBeenCalledWith('jvm');
    await user.click(screen.getByRole('radio', { name: 'Deep dive' }));
    expect(onLevelChange).toHaveBeenCalledWith('deep');
  });

  it('opens with plain answers and keeps the technical details one step away', () => {
    setup('simple');
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([
      'What is this?',
      'Picture it',
      'What actually happens?',
      'Where does it fit?',
      'Check your understanding',
    ]);
    expect(screen.getByText('Where the picture stops working')).toBeInTheDocument();
    const details = screen.getByText('Explore the technical details').closest('details')!;
    expect(details.open).toBe(false);
    // Nothing was removed: citations and misconceptions are inside the details.
    expect(within(details).getByText('Sources')).toBeInTheDocument();
    expect(within(details).getByText('Common misconceptions')).toBeInTheDocument();
  });

  it('opens the technical details by default at the deep-dive level', () => {
    setup('deep');
    expect(screen.getByText('Explore the technical details').closest('details')!.open).toBe(true);
  });

  it('says when a developer explanation has not been written yet', () => {
    const doc = getComponentDoc('eden');
    expect(doc.developer).toBeUndefined();
    renderInRouter(
      <ComponentInspector
        doc={doc}
        ancestry={[{ id: 'eden', name: 'Eden' }]}
        parts={[]}
        outgoing={[]}
        incoming={[]}
        level="developer"
        onLevelChange={() => {}}
        onNavigate={() => {}}
        bookmarked={false}
        onToggleBookmark={() => {}}
        understood={false}
        onToggleUnderstood={() => {}}
      />,
    );
    expect(
      screen.getByText(/developer explanation for this has not been written yet/),
    ).toBeInTheDocument();
  });
});

describe('ComponentInspector between components', () => {
  function Switcher() {
    const [id, setId] = useState<ComponentId>('eden');
    return (
      <>
        <button type="button" onClick={() => setId('survivor')}>
          Next component
        </button>
        <ComponentInspector
          doc={getComponentDoc(id)}
          ancestry={[]}
          parts={[]}
          outgoing={[]}
          incoming={[]}
          level="simple"
          onLevelChange={() => {}}
          onNavigate={() => {}}
          bookmarked={false}
          onToggleBookmark={() => {}}
          understood={false}
          onToggleUnderstood={() => {}}
        />
      </>
    );
  }

  it('starts a fresh teach-back for each component', async () => {
    const user = userEvent.setup();
    renderInRouter(<Switcher />);
    const answer = () => screen.getByRole('textbox', { name: /In your own words/ });
    await user.type(answer(), 'Where new objects start');
    await user.click(screen.getByRole('button', { name: 'Next component' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Survivor space' })).toBeInTheDocument();
    expect(answer()).toHaveValue('');
  });
});

describe('ComponentSearch', () => {
  it('does not choose a suggestion the learner dismissed with Escape', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ComponentSearch onSelect={onSelect} />);
    await user.type(screen.getByRole('combobox', { name: 'Find a component' }), 'heap');
    await user.keyboard('{Escape}{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('heap');
  });
});

describe('KnowledgeCheck', () => {
  it('explains answers and stores the result', async () => {
    const user = userEvent.setup();
    progressStore.reset();
    renderInRouter(<KnowledgeCheck quiz={ANATOMY_QUIZ} />);
    const first = ANATOMY_QUIZ.questions[0]!;
    const wrong = first.options.find((o) => !o.correct)!;
    const group = screen.getAllByRole('group')[0]!;
    await user.click(within(group).getAllByRole('radio')[first.options.indexOf(wrong)]!);
    expect(screen.getByText('Not quite')).toBeInTheDocument();
    expect(screen.getByText('The correct answer')).toBeInTheDocument();
    expect(progressStore.get().quizzes[ANATOMY_QUIZ.id]).toMatchObject({ correct: 0 });
    await user.click(screen.getByRole('button', { name: /start again/i }));
    expect(progressStore.get().quizzes[ANATOMY_QUIZ.id]!.answers).toEqual({});
  });
});

describe('ComponentTree', () => {
  const roots: TreeItem[] = [
    {
      id: 'jvm',
      name: 'Java Virtual Machine',
      provenance: 'spec',
      children: [
        { id: 'heap', name: 'Heap', provenance: 'spec', children: [] },
        { id: 'interpreter', name: 'Interpreter', provenance: 'spec', children: [] },
      ],
    },
  ];

  it('supports arrow-key navigation and selection', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ComponentTree roots={roots} selectedId={null} onSelect={onSelect} explored={{}} filter="" />,
    );
    const items = screen.getAllByRole('treeitem');
    expect(items).toHaveLength(3);
    act(() => items[0]!.focus());
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[1]);
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('heap');
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(items[0]);
    await user.keyboard('{ArrowLeft}');
    expect(screen.getAllByRole('treeitem')).toHaveLength(1);
  });

  it('stays reachable by keyboard when the selection is in a collapsed branch', () => {
    const withCollapsedRoot: TreeItem[] = [
      {
        id: 'build-time',
        name: 'Build time',
        provenance: 'platform',
        children: [{ id: 'class-file', name: 'Class file', provenance: 'spec', children: [] }],
      },
      { id: 'jvm', name: 'Java Virtual Machine', provenance: 'spec', children: [] },
    ];
    render(
      <ComponentTree
        roots={withCollapsedRoot}
        selectedId="class-file"
        onSelect={() => {}}
        explored={{}}
        filter=""
      />,
    );
    const items = screen.getAllByRole('treeitem');
    expect(items.map((el) => el.textContent)).toEqual(['Build time', 'Java Virtual Machine']);
    expect(items.map((el) => el.tabIndex)).toEqual([0, -1]);
  });

  it('filters by name', () => {
    render(
      <ComponentTree
        roots={roots}
        selectedId={null}
        onSelect={() => {}}
        explored={{}}
        filter="interp"
      />,
    );
    expect(screen.getAllByRole('treeitem').map((el) => el.textContent)).toEqual([
      'Java Virtual Machine',
      'Interpreter',
    ]);
  });
});

describe('JVM anatomy page', () => {
  beforeEach(() => {
    preferencesStore.reset();
    progressStore.reset();
  });

  it('starts with the six main parts and opens the one you select', async () => {
    const { router } = renderInRouter(<JvmAnatomyPage />, '/anatomy');
    const memory = await screen.findByRole('button', { name: /^Memory \(Runtime data areas\)/ });
    expect(screen.queryByRole('button', { name: /^Heap, / })).not.toBeInTheDocument();
    fireEvent.click(memory);
    expect(router.state.location.search).toBe('?c=runtime-data-areas');
    const heap = await screen.findByRole('button', { name: /^Heap, JVM specification concept/ });
    fireEvent.click(heap);
    expect(await screen.findByRole('heading', { level: 2, name: 'Heap' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?c=heap');
  });

  it('shows the full map on request and remembers the choice', async () => {
    const user = userEvent.setup();
    const { router } = renderInRouter(<JvmAnatomyPage />, '/anatomy');
    await user.click(
      await screen.findAllByRole('button', { name: 'Show the full JVM map' }).then((b) => b[0]!),
    );
    expect(router.state.location.search).toBe('?view=full');
    expect(await screen.findByRole('button', { name: /^Heap, / })).toBeInTheDocument();
    expect(preferencesStore.get().mapView).toBe('full');
  });

  it('opens a deep link inside the region that contains it', async () => {
    renderInRouter(<JvmAnatomyPage />, '/anatomy?c=eden');
    expect(await screen.findByRole('heading', { level: 2, name: 'Eden' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Eden, / })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Execution engine \(Execution engine\)/ }),
    ).toBeInTheDocument();
  });

  it('offers the guided tour once, and remembers when it is dismissed', async () => {
    const user = userEvent.setup();
    preferencesStore.reset();
    const first = renderInRouter(<JvmAnatomyPage />, '/anatomy');
    // jsdom applies no CSS: both placements (over the map, and under it on small
    // screens) are present here; a browser shows exactly one (see the e2e tests).
    expect(
      await screen.findAllByRole('region', { name: 'Guided tour of the explorer' }),
    ).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Close the tour' })[0]!);
    expect('explorer-tour' in preferencesStore.get().dismissed).toBe(true);
    first.unmount();
    renderInRouter(<JvmAnatomyPage />, '/anatomy');
    await screen.findAllByRole('button', { name: 'Show the full JVM map' });
    expect(
      screen.queryByRole('region', { name: 'Guided tour of the explorer' }),
    ).not.toBeInTheDocument();
  });

  it('opens the guided tour on the map from any view', async () => {
    const user = userEvent.setup();
    preferencesStore.set((p) => ({ ...p, dismissed: { 'explorer-tour': 1 } }));
    const { router } = renderInRouter(<JvmAnatomyPage />, '/anatomy?mode=internal&c=heap');
    // jsdom applies no CSS, so the button's visible and screen-reader labels both count here.
    await user.click((await screen.findAllByRole('button', { name: /^Guided tour/ }))[0]!);
    expect(
      (await screen.findAllByRole('region', { name: 'Guided tour of the explorer' })).length,
    ).toBeGreaterThan(0);
    expect(router.state.location.search).not.toContain('mode=internal');
  });

  it('reads each region’s plain-language description to screen readers', async () => {
    renderInRouter(<JvmAnatomyPage />, '/anatomy');
    const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const region of JVM_REGIONS)
      expect(
        await screen.findByRole('button', {
          name: new RegExp(`^${literal(region.title)} \\(.*${literal(region.blurb)}$`),
        }),
        region.id,
      ).toBeInTheDocument();
  });

  it('opens the execution walkthrough and steps forward', async () => {
    const user = userEvent.setup();
    renderInRouter(<JvmAnatomyPage />, '/anatomy?mode=execution&s=new-person');
    expect(await screen.findByText('Step 1 of 10')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next step' }));
    expect(await screen.findByText('Step 2 of 10')).toBeInTheDocument();
  });

  it('shows a dissection in internal mode', async () => {
    renderInRouter(<JvmAnatomyPage />, '/anatomy?mode=internal&c=heap');
    expect(await screen.findByText('Inside the heap')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Thread-local allocation buffers/ }).length,
    ).toBeGreaterThan(0);
  });
});
