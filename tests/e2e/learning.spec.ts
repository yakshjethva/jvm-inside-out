import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const chapterHeading = (page: Page, name: string) =>
  page.getByRole('heading', { level: 1, name, exact: true });

test.describe('Start here', () => {
  test('a newcomer can go from the homepage through the whole first lesson', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(error.message));
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text());
    });

    await page.goto('./');
    await page.getByRole('link', { name: 'Start with the basics' }).click();
    await page.getByRole('link', { name: /Start chapter 1/ }).click();

    const titles = [
      'Your first Java program',
      'The compiler',
      'The JVM',
      'Loading classes',
      'Memory',
      'Execution',
      'Garbage collection',
    ];
    for (const [i, title] of titles.entries()) {
      await expect(chapterHeading(page, title)).toBeVisible();
      // Predict first: nothing is explained until the learner commits.
      await expect(page.getByRole('heading', { name: 'What is going on' })).toHaveCount(0);
      await page.getByRole('radio').first().check();
      await expect(page.getByRole('heading', { name: 'What is going on' })).toBeVisible();
      await expect(page.getByRole('figure').first()).toBeVisible();
      const next = titles[i + 1];
      await page
        .getByRole('link', { name: next ? `Next: ${next}` : 'Finish: what you now know' })
        .click();
    }

    await expect(chapterHeading(page, 'What you now know')).toBeVisible();
    await page.getByRole('textbox', { name: /In your own words/ }).fill('javac makes bytecode');
    await page.getByRole('button', { name: 'Compare with the key points' }).click();
    await page.getByRole('checkbox', { name: /compiler \(javac\)/ }).check();
    await expect(page.getByText('1 of 6 covered')).toBeVisible();

    await page.goto('start');
    await expect(page.getByRole('link', { name: 'Review what you now know' })).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('chapters work with the back and forward buttons', async ({ page }) => {
    await page.goto('start?chapter=compiler');
    await page.getByRole('link', { name: 'Next: The JVM' }).click();
    await expect(chapterHeading(page, 'The JVM')).toBeVisible();
    await page.goBack();
    await expect(chapterHeading(page, 'The compiler')).toBeVisible();
    await page.goForward();
    await expect(chapterHeading(page, 'The JVM')).toBeVisible();
  });

  test('the memory exhibit steps through the real bytecode', async ({ page }) => {
    await page.goto('start?chapter=memory');
    await page.getByRole('button', { name: 'Skip the prediction and show me' }).click();
    const exhibit = page.getByRole('figure', { name: /new Person\("Mia"\)/ });
    await expect(exhibit.getByText('Step 1 of 8')).toBeVisible();
    for (const instruction of ['new #7', 'dup', 'ldc #9', 'invokespecial #11']) {
      await exhibit.getByRole('button', { name: 'Next step' }).click();
      await expect(exhibit.getByText(instruction, { exact: true }).first()).toBeVisible();
    }
    await expect(exhibit.getByText('Person(String name)')).toBeVisible();
    await exhibit.getByRole('button', { name: 'Previous step' }).click();
    await expect(exhibit.getByText('Person(String name)')).toHaveCount(0);
  });

  test('each chapter opens the same part on the JVM map', async ({ page }) => {
    await page.goto('start?chapter=memory');
    await page.getByRole('button', { name: 'Skip the prediction and show me' }).click();
    await page.getByRole('link', { name: 'Runtime data areas on the JVM map' }).click();
    await expect(page).toHaveURL(/\/anatomy\?c=runtime-data-areas$/);
    await expect(
      page
        .getByRole('complementary', { name: 'Component inspector' })
        .getByRole('heading', { level: 2, name: 'Runtime data areas', exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(chapterHeading(page, 'Memory')).toBeVisible();
  });

  test('the garbage-collection sandbox keeps eligible and reclaimed apart', async ({ page }) => {
    await page.goto('start?chapter=gc');
    await page.getByRole('button', { name: 'Skip the prediction and show me' }).click();
    const exhibit = page.getByRole('figure', { name: 'Reachable, eligible, reclaimed' });
    await exhibit.getByRole('combobox').first().selectOption({ label: 'null' });
    await expect(exhibit.getByText('Eligible for collection')).toHaveCount(2);
    await exhibit.getByRole('button', { name: /Run garbage collection/ }).click();
    await expect(exhibit.getByText(/reclaimed: its memory can be reused/)).toHaveCount(2);
    await expect(exhibit.getByText('Eligible for collection')).toHaveCount(0);
  });
});

test.describe('the journey machine', () => {
  test('follows the visitor’s own line of Java to the output', async ({ page }) => {
    await page.goto('./');
    const machine = page.getByRole('figure', { name: /Follow one line of Java/ });
    await machine.getByRole('textbox', { name: 'Your line of Java' }).fill('Hi from Mia');
    await machine.getByRole('button', { name: 'Run it' }).click();
    await expect(machine.getByText('1 of 7 · Compiler')).toBeVisible();
    await machine.getByRole('button', { name: '2. Class file' }).click();
    await expect(machine.getByText(/a file of 415 bytes/)).toBeVisible();
    await machine.getByRole('button', { name: '7. Output' }).click();
    await expect(machine.getByText('Hi from Mia', { exact: true })).toBeVisible();
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('every state is still reachable, without animation', async ({ page }) => {
    await page.goto('./');
    const machine = page.getByRole('figure', { name: /Follow one line of Java/ });
    await machine.getByRole('button', { name: 'Run it' }).click();
    await machine.getByRole('button', { name: 'Pause' }).click();
    await machine.getByRole('button', { name: 'Next step' }).click();
    await expect(machine.getByText(/2 of 7 · Class file/)).toBeVisible();
    const seconds = await page.evaluate(() => {
      const track = document.querySelector('figure [style*="scaleX"]');
      return track ? parseFloat(getComputedStyle(track).transitionDuration) : Number.NaN;
    });
    expect(seconds).toBeLessThan(0.01);
  });
});

test.describe('stored progress', () => {
  test('preferences and progress from the previous release are kept', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('migration-seeded')) return;
      localStorage.setItem('migration-seeded', '1');
      localStorage.setItem(
        'inside-java:v1:preferences',
        JSON.stringify({ level: 'technical', motion: 'reduce' }),
      );
      localStorage.setItem(
        'inside-java:v1:progress',
        JSON.stringify({
          explored: { heap: 1 },
          understood: { heap: 2 },
          bookmarks: [{ key: 'anatomy:heap', title: 'Heap', href: '/anatomy?c=heap', at: 3 }],
          recent: [],
          quizzes: {},
          scenarios: {},
        }),
      );
    });
    await page.goto('paths');
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
    await expect(page.getByRole('link', { name: 'Heap', exact: true })).toBeVisible();
    await expect(page.getByText('1 / 66')).toBeVisible();
    await page.goto('glossary');
    await expect(page.getByRole('radio', { name: 'Deep dive' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

test.describe('links', () => {
  test('every internal link on the main pages leads somewhere that exists', async ({
    page,
    request,
    baseURL,
    isMobile,
  }) => {
    test.skip(isMobile, 'Link checking runs once.');
    const base = new URL(baseURL!);
    const seen = new Set<string>();
    for (const path of [
      './',
      'start',
      'start?chapter=recap',
      'paths',
      'about',
      'contributing',
      'glossary',
    ]) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
      for (const href of hrefs) {
        const url = new URL(href);
        if (url.origin !== base.origin) continue;
        url.hash = '';
        url.search = '';
        seen.add(url.href);
      }
    }
    for (const href of seen) {
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});
