import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/** Collects console errors and warnings, uncaught exceptions and failed requests for a page. */
function watchForProblems(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      problems.push(`console ${message.type()}: ${message.text()}`);
  });
  page.on('requestfailed', (request) =>
    problems.push(`request failed: ${request.url()} (${request.failure()?.errorText})`),
  );
  return problems;
}

test.describe('GitHub Pages deployment', () => {
  test('the home page loads from the subpath and every request stays under it', async ({
    page,
    baseURL,
  }) => {
    const base = new URL(baseURL!);
    const outside: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.origin === base.origin && !url.pathname.startsWith(base.pathname))
        outside.push(url.pathname);
    });
    const problems = watchForProblems(page);

    const response = await page.goto('./');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('JVM Atlas · Explore the machine behind Java programs');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Explore the machine behind every Java program.',
    );
    await expect(page.getByRole('link', { name: 'Explore the anatomy' })).toHaveAttribute(
      'href',
      /\/anatomy$/,
    );
    await expect(page.getByRole('link', { name: 'Start with the basics' })).toHaveAttribute(
      'href',
      /\/start$/,
    );
    const areas = page.getByRole('list', {
      name: 'The areas of the atlas, from source code to processor',
    });
    await expect(areas.getByRole('link')).toHaveCount(7);
    await expect(areas.getByRole('link', { name: /Class loading/ })).toBeVisible();
    await expect(page.getByRole('figure', { name: /Follow one line of Java/ })).toBeVisible();

    await page.waitForLoadState('networkidle');
    expect(outside).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('direct links to every kind of page answer HTTP 200', async ({ page }) => {
    const cases: [string, RegExp | string][] = [
      ['start', 'What happens when you run a Java program?'],
      ['start?chapter=memory', 'Memory'],
      ['paths', 'Start with a question'],
      ['anatomy?c=heap&mode=internal', 'Explore the JVM'],
      ['glossary', 'Glossary'],
      ['references', 'References'],
    ];
    for (const [path, heading] of cases) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: heading }), path).toBeVisible();
      if (path.startsWith('anatomy')) await expect(page.getByText('Inside the heap')).toBeVisible();
    }
  });

  test('a component deep link keeps its query string and opens the component', async ({ page }) => {
    const response = await page.goto('anatomy?c=heap');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/anatomy\/?\?c=heap$/);
    await expect(page).toHaveTitle('JVM anatomy · JVM Atlas');
    await expect(page.getByRole('heading', { level: 2, name: 'Heap', exact: true })).toBeVisible();
  });

  test('unknown paths answer 404 and still offer a way back', async ({ page, baseURL }) => {
    const response = await page.goto('class-loading/delegation');
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { level: 1, name: 'This page could not be found' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Go home' }).click();
    await expect(page).toHaveURL(baseURL!);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Explore the machine');
  });
});

test.describe('navigation', () => {
  const pages = [
    ['Start here', 'What happens when you run a Java program?', 'Start here'],
    ['Explore anatomy', 'Explore the JVM', 'JVM anatomy'],
    ['Learn', 'Start with a question', 'Learn'],
    ['Glossary', 'Glossary', 'Glossary'],
    ['References', 'References', 'References'],
    ['About', "Don't memorize the JVM. Explore it.", 'About'],
  ] as const;

  test('the primary navigation reaches every page', async ({ page, isMobile }) => {
    const problems = watchForProblems(page);
    await page.goto('./');
    for (const [label, heading, title] of pages) {
      if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
      const nav = page.getByRole('navigation', { name: isMobile ? 'Mobile' : 'Primary' });
      await nav.getByRole('link', { name: new RegExp(`^${label}`) }).click();
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page).toHaveTitle(`${title} · JVM Atlas`);
    }
    expect(problems).toEqual([]);
  });

  test('project pages are in the mobile menu and the footer', async ({ page, isMobile }) => {
    await page.goto('./');
    if (isMobile) {
      await page.getByRole('button', { name: 'Open menu' }).click();
      await page
        .getByRole('navigation', { name: 'Mobile' })
        .getByRole('link', { name: 'Project status' })
        .click();
    } else {
      await page.getByRole('contentinfo').getByRole('link', { name: 'Project status' }).click();
    }
    await expect(page).toHaveURL(/\/about#project-status$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Project status' })).toBeVisible();
  });

  test('the footer links to About and Contributing', async ({ page }) => {
    await page.goto('./');
    const footer = page.getByRole('contentinfo');
    await footer.getByRole('link', { name: 'About', exact: true }).click();
    await expect(page).toHaveTitle('About · JVM Atlas');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Contributing' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Contributing' })).toBeVisible();
  });

  test('glossary terms open in place and link to the glossary', async ({ page }) => {
    await page.goto('anatomy?c=class-file');
    const inspector = page.getByRole('complementary', { name: 'Component inspector' });
    const term = inspector.locator('button[aria-haspopup="dialog"]:visible').first();
    await term.click();
    const card = page.getByRole('dialog');
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading', { level: 2 })).not.toBeEmpty();
    await card.getByRole('link', { name: 'Open in glossary' }).click();
    await expect(page).toHaveURL(/\/glossary#[a-z0-9-]+$/);
    const id = new URL(page.url()).hash.slice(1);
    await expect(page.locator(`[id="${id}"]`)).toBeFocused();
  });

  test('a keyboard user can skip straight to the content', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard navigation is exercised on desktop.');
    await page.goto('./');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('after the first visit the site works offline, including a reload', async ({
    page,
    context,
  }) => {
    await page.goto('./');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await context.setOffline(true);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Explore the machine');

    await page.goto('start?chapter=gc');
    await expect(page.getByRole('heading', { level: 1, name: 'Garbage collection' })).toBeVisible();

    await page.goto('anatomy?c=interpreter');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Interpreter', exact: true }),
    ).toBeVisible();
    await page.getByRole('radio', { name: /Watch it run/ }).click();
    await expect(page.getByText('Step 1 of', { exact: false })).toBeVisible();
  });
});

test.describe('small screens', () => {
  test('no page scrolls sideways on a 360 px screen', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Checked once, on the mobile project.');
    await page.setViewportSize({ width: 360, height: 780 });
    for (const path of [
      './',
      'start?chapter=memory',
      'learn',
      'learn/heap-vs-stack',
      'anatomy',
      'anatomy?viewer=list',
      'anatomy?mode=execution&s=jit',
      'glossary',
      'references',
      'contributing',
    ]) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBe(0);
    }
  });
});
