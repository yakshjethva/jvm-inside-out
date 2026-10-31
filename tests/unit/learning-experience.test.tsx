import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { preferencesStore, progressStore } from '@/hooks/useLearningState';
import { usePageTitle } from '@/hooks/usePageTitle';
import { FIRST_RUN } from '@/content/lesson/firstRun';
import { progressActions } from '@/hooks/useLearningState';
import { HomePage } from '@/pages/HomePage';
import { LearningPathsPage } from '@/pages/LearningPathsPage';
import { JourneyMachine } from '@/modules/journey/JourneyMachine';
import { StartHerePage } from '@/pages/StartHerePage';
import indexHtml from '../../index.html?raw';

function renderAt(element: React.ReactNode, path = '/') {
  const router = createMemoryRouter([{ path: '*', element }], { initialEntries: [path] });
  return { router, ...render(<RouterProvider router={router} />) };
}

beforeEach(() => {
  preferencesStore.reset();
  progressStore.reset();
});

describe('Start here', () => {
  it('does not count a visit to the recap as starting the lesson', () => {
    progressActions.completeChapter(FIRST_RUN.id, 'recap');
    renderAt(<StartHerePage />, '/start');
    expect(screen.getByRole('link', { name: /Start chapter 1/ })).toBeInTheDocument();
  });

  it('introduces the lesson and lists its seven chapters', () => {
    renderAt(<StartHerePage />, '/start');
    expect(
      screen.getByRole('heading', { level: 1, name: 'What happens when you run a Java program?' }),
    ).toBeInTheDocument();
    const chapters = within(screen.getByRole('list', { name: 'Chapters' })).getAllByRole('link');
    expect(chapters).toHaveLength(8); // seven chapters and the recap
    expect(screen.getByRole('link', { name: /Start chapter 1/ })).toHaveAttribute(
      'href',
      '/start?chapter=program',
    );
  });

  it('asks for a prediction before showing what happens', async () => {
    const user = userEvent.setup();
    renderAt(<StartHerePage />, '/start?chapter=memory');
    expect(screen.getByRole('heading', { level: 1, name: 'Memory' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'What is going on' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /In the heap/ }));
    expect(screen.getByRole('heading', { name: 'What is going on' })).toBeInTheDocument();
    expect(screen.getByRole('figure', { name: /new Person\("Mia"\)/ })).toBeInTheDocument();
    expect(
      screen.getByText(/Objects live in the heap; the variable holds a reference/),
    ).toBeInTheDocument();
  });

  it('shows where each chapter lives on the JVM map', async () => {
    const user = userEvent.setup();
    renderAt(<StartHerePage />, '/start?chapter=memory');
    expect(screen.queryByRole('link', { name: /on the JVM map/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Skip the prediction and show me' }));
    expect(screen.getByRole('link', { name: 'Runtime data areas on the JVM map' })).toHaveAttribute(
      'href',
      '/anatomy?c=runtime-data-areas',
    );
  });

  it('explains at the chosen level and records the chapter when the learner moves on', async () => {
    const user = userEvent.setup();
    const { router } = renderAt(<StartHerePage />, '/start?chapter=compiler');
    await user.click(screen.getByRole('button', { name: 'Skip the prediction and show me' }));
    expect(screen.getByText(/checks it for mistakes, and writes a new file/)).toBeInTheDocument();
    await user.click(screen.getAllByRole('radio', { name: 'Developer' })[0]!);
    expect(screen.getByText(/410 bytes for this program/)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Next: The JVM/ }));
    expect(router.state.location.search).toBe('?chapter=jvm');
    expect(Object.keys(progressStore.get().lessons['first-run']!)).toEqual(['compiler']);
  });
});

describe('the journey machine', () => {
  it('follows the learner’s own line with the real class-file size', async () => {
    const user = userEvent.setup();
    renderAt(<JourneyMachine />);
    const input = screen.getByRole('textbox', { name: 'Your line of Java' });
    await user.clear(input);
    await user.type(input, 'Hi "there"');
    expect(input).toHaveValue('Hi there');
    await user.click(screen.getByRole('button', { name: '2. Class file' }));
    // 404 bytes plus the 8 bytes of "Hi there", measured with javac 25.0.4.
    expect(screen.getByText(/a file of 412 bytes/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '7. Output' }));
    expect(screen.getByText(/produced a result: "Hi there"/)).toBeInTheDocument();
  });

  it('plays again from the first station when Run again is pressed during playback', async () => {
    const user = userEvent.setup();
    renderAt(<JourneyMachine />);
    await user.click(screen.getByRole('button', { name: 'Run it' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Run again' }));
    expect(screen.getByText('1 of 7 · Compiler')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('calls the class file’s size the size of the whole file', async () => {
    const user = userEvent.setup();
    renderAt(<JourneyMachine />);
    await user.click(screen.getByRole('button', { name: '2. Class file' }));
    expect(screen.getByText(/a file of 410 bytes/)).toBeInTheDocument();
    expect(screen.queryByText(/bytes of bytecode/)).not.toBeInTheDocument();
  });
});

describe('the site header', () => {
  it('lists every main page in the order a new visitor needs them', () => {
    renderAt(<SiteHeader />);
    const primary = screen.getByRole('navigation', { name: 'Primary' });
    expect(
      within(primary)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Start here', 'Explore anatomy', 'Learn', 'Glossary', 'References', 'About']);
    expect(screen.getByRole('link', { name: 'JVM Atlas, home' })).toHaveAttribute('href', '/');
  });

  it('opens a mobile menu with Home and the project pages', async () => {
    const user = userEvent.setup();
    renderAt(<SiteHeader />);
    const button = screen.getByRole('button', { name: 'Open menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    const menu = screen.getByRole('navigation', { name: 'Mobile' });
    expect(within(menu).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(menu).getByRole('link', { name: 'Contributing' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Project status' })).toHaveAttribute(
      'href',
      '/about#project-status',
    );
    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument();
  });

  it('closes the mobile menu with Escape and returns focus to its button', async () => {
    const user = userEvent.setup();
    renderAt(<SiteHeader />);
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
  });

  it('shows the explanation level in plain words', () => {
    preferencesStore.set((p) => ({ ...p, level: 'deep' }));
    renderAt(<SiteHeader />);
    expect(screen.getByRole('button', { name: /Deep dive/ })).toBeInTheDocument();
  });
});

describe('page titles', () => {
  function Titled({ title }: { title?: string }) {
    usePageTitle(title);
    return null;
  }

  it('keep the homepage title identical to the one in index.html', () => {
    const staticTitle = indexHtml.match(/<title>([^<]*)<\/title>/)![1];
    render(<Titled />);
    expect(document.title).toBe(staticTitle);
    expect(document.title).toBe('JVM Atlas · Explore the machine behind Java programs');
  });

  it('name the page first everywhere else', () => {
    render(<Titled title="Glossary" />);
    expect(document.title).toBe('Glossary · JVM Atlas');
  });
});

const finishLesson = () => {
  for (const chapter of FIRST_RUN.chapters)
    progressActions.completeChapter(FIRST_RUN.id, chapter.id);
};

describe('returning learners', () => {
  it('Learn sends a learner who finished the lesson to the recap', () => {
    finishLesson();
    renderAt(<LearningPathsPage />, '/paths');
    expect(screen.getByRole('link', { name: 'Review what you learned' })).toHaveAttribute(
      'href',
      '/start?chapter=recap',
    );
  });

  it('the homepage sends a learner who finished the lesson to the recap', () => {
    finishLesson();
    renderAt(<HomePage />);
    expect(screen.getByRole('link', { name: /Review what you now know/ })).toHaveAttribute(
      'href',
      '/start?chapter=recap',
    );
  });

  it('Learn and the homepage list the parts explored most recently', () => {
    progressActions.markExplored(
      { key: 'anatomy:eden', title: 'Eden', href: '/anatomy?c=eden' },
      'eden',
    );
    const learn = renderAt(<LearningPathsPage />, '/paths');
    const list = screen.getByRole('list', { name: 'Recently explored' });
    expect(within(list).getByRole('link', { name: 'Eden' })).toHaveAttribute(
      'href',
      '/anatomy?c=eden',
    );
    learn.unmount();
    renderAt(<HomePage />);
    expect(
      within(screen.getByRole('list', { name: 'Recently explored' })).getByRole('link', {
        name: 'Eden',
      }),
    ).toBeInTheDocument();
  });

  it('Learn gives every section its own anchor', () => {
    const { container } = renderAt(<LearningPathsPage />, '/paths');
    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
});
