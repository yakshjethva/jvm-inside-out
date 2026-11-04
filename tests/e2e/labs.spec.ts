import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/** The only console output the 3D views may produce (see anatomy-3d.spec.ts). */
const FIBER_CLOCK_WARNING = /THREE\.Clock: This module has been deprecated/;
const HEADLESS_GL_MESSAGE = /GL Driver Message \(OpenGL, Performance/;

function watchForProblems(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !FIBER_CLOCK_WARNING.test(message.text()) &&
      !HEADLESS_GL_MESSAGE.test(message.text())
    )
      problems.push(`console ${message.type()}: ${message.text()}`);
  });
  return problems;
}

/** Replaces WebGL with nothing, as on a device without it. */
async function withoutWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (type.startsWith('webgl')) return null;
      return (original as (...args: unknown[]) => RenderingContext | null).call(
        this,
        type,
        ...rest,
      );
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
}

const stepText = (page: Page, n: number) => page.getByText(new RegExp(`^Step ${n} of \\d+$`));
const requestSteps = (page: Page) =>
  page.getByRole('region', { name: 'Every step of this request' }).getByRole('button');

test.describe('laboratories in the navigation', () => {
  test('the Labs menu opens, closes with Escape and leads to both laboratories', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'The mobile menu is checked below.');
    await page.goto('./');
    const button = page.getByRole('button', { name: 'Labs', exact: true });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();

    const primary = page.getByRole('navigation', { name: 'Primary' });
    await button.click();
    await primary.getByRole('link', { name: /^Class loader explorer/ }).click();
    await expect(page).toHaveTitle('Class loader explorer · JVM Atlas');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await primary.getByRole('link', { name: /^Memory laboratory/ }).click();
    await expect(page).toHaveTitle('Memory laboratory · JVM Atlas');
  });

  test('the mobile menu lists the laboratories', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The desktop menu is checked above.');
    await page.goto('./');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page
      .getByRole('navigation', { name: 'Mobile' })
      .getByRole('link', { name: /^Memory laboratory/ })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Where does a running Java program keep everything?',
    );
  });

  test('a guide and the inspector lead into the laboratories', async ({ page }) => {
    await page.goto('learn/how-class-loading-works');
    await page.getByRole('link', { name: 'Follow a request in the class loader explorer' }).click();
    await expect(page).toHaveURL(/\/class-loading\?lab=delegation$/);
    await expect(
      page.getByRole('heading', {
        level: 2,
        name: 'What happens, step by step, when the JVM asks a loader for a class?',
      }),
    ).toBeVisible();
  });
});

test.describe('class loader explorer', () => {
  test('direct links to every station answer HTTP 200', async ({ page }) => {
    // The first page is hydrated from its prerendered HTML: a mismatch would be logged.
    const problems = watchForProblems(page);
    for (const [path, station] of [
      ['class-loading', 'Station 1 of 3 · Loader observatory'],
      ['class-loading?lab=delegation', 'Station 2 of 3 · Delegation laboratory'],
      ['class-loading?lab=lifecycle&step=3', 'Station 3 of 3 · Lifecycle microscope'],
    ]) {
      const response = await page.goto(path!);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByText(station!), path).toBeVisible();
    }
    await expect(page).toHaveTitle('Class loader explorer · JVM Atlas');
    expect(problems).toEqual([]);
  });

  test('an experiment asks for a prediction, then steps through the request', async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto('class-loading?lab=delegation');
    await page.getByRole('button', { name: 'A platform module' }).click();
    await expect(page).toHaveURL(/exp=sql/);
    await expect(
      page.getByText('Make your prediction above, then step through the request.'),
    ).toBeVisible();

    await page.getByRole('group', { name: 'Make a prediction' }).getByRole('radio').first().check();
    await expect(stepText(page, 1)).toBeVisible();
    await page.getByRole('button', { name: 'Next step' }).click();
    await expect(page).toHaveURL(/step=1/);
    await expect(stepText(page, 2)).toBeVisible();

    await requestSteps(page).last().click();
    const result = page.getByRole('region', { name: 'Result' });
    await expect(result).toBeVisible();
    await expect(result).toContainText('java.sql.Connection');

    // The URL holds the experiment and the step: a reload shows the same view.
    await page.reload();
    await expect(page.getByRole('region', { name: 'Result' })).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('requests add up, and Back undoes the last one', async ({ page }) => {
    await page.goto('class-loading?lab=delegation');
    const own = page.getByRole('form', { name: 'Your own request' });
    await own.getByLabel('Ask this loader').selectOption({ label: 'Application class loader' });
    await own.getByLabel('for the class').selectOption('com.example.shared.Message');
    await own.getByRole('button', { name: 'Send request' }).click();
    await expect(page).toHaveURL(/run=app(%3A|:)com\.example\.shared\.Message/);
    const history = page.getByRole('region', { name: 'Requests so far' });
    await expect(history.getByRole('listitem')).toHaveCount(1);

    await own.getByRole('button', { name: 'Send request' }).click();
    await expect(history.getByRole('listitem')).toHaveCount(2);
    // The second request finds the class the first one loaded.
    await requestSteps(page).last().click();
    await expect(page.getByRole('region', { name: 'Result' })).toContainText(
      'which had defined it before this request',
    );

    await page.goBack();
    await expect(history.getByRole('listitem')).toHaveCount(1);
    await page.goForward();
    await expect(history.getByRole('listitem')).toHaveCount(2);
    await own.getByRole('button', { name: 'Fresh JVM' }).click();
    await expect(page.getByRole('region', { name: 'Requests so far' })).toHaveCount(0);
    await expect(page).not.toHaveURL(/run=/);
  });

  test('the lifecycle microscope steps from loading to initialization', async ({ page }) => {
    await page.goto('class-loading?lab=lifecycle');
    await page.getByRole('button', { name: 'Skip the prediction and show me' }).click();
    const rail = page.getByRole('list', { name: 'Phases of Config' });
    const console_ = page.getByRole('region', { name: 'Console: output and log' });
    await expect(stepText(page, 1)).toBeVisible();
    await expect(console_).toContainText('main started');
    await expect(rail).toContainText('Initialization: not yet');

    await page.getByRole('button', { name: 'Next step' }).click();
    await expect(page).toHaveURL(/lab=lifecycle.*step=1|step=1.*lab=lifecycle/);
    await expect(console_).toContainText('loaded Config; not initialized yet');

    // The last step: Config is initialized and its initializers ran in order.
    for (let i = 2; i < 9; i += 1) await page.getByRole('button', { name: 'Next step' }).click();
    await expect(stepText(page, 9)).toBeVisible();
    await expect(rail).toContainText('Initialization: done');
    await expect(console_).toContainText('label = ready');
    await page.getByRole('button', { name: 'Restart' }).click();
    await expect(stepText(page, 1)).toBeVisible();
  });
});

test.describe('memory laboratory', () => {
  test('direct links to every station answer HTTP 200', async ({ page }) => {
    const problems = watchForProblems(page);
    for (const [path, station] of [
      ['memory', 'Station 1 of 5 · Memory observatory'],
      ['memory?lab=living&step=7', 'Station 2 of 5 · Living stack and heap'],
      ['memory?lab=frames&step=4', 'Station 3 of 5 · Stack frame dissection'],
      [
        'memory?lab=layout&object=person&config=compact',
        'Station 4 of 5 · Object layout laboratory',
      ],
      ['memory?lab=heap&gc=zgc', 'Station 5 of 5 · Heap and native memory'],
    ]) {
      const response = await page.goto(path!);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByText(station!), path).toBeVisible();
    }
    await expect(page).toHaveTitle('Memory laboratory · JVM Atlas');
    expect(problems).toEqual([]);
  });

  test('a reference lights up its object; null removes references, never objects', async ({
    page,
  }) => {
    const problems = watchForProblems(page);
    await page.goto('memory?lab=living&step=7');
    const exhibit = page.getByRole('figure', { name: /^Living stack and heap/ });
    await expect(exhibit).toContainText('Person p2 = p1: the reference is copied.');
    // args, p1 and p2 in main's frame, and the name field: four references, four arrows.
    await expect(exhibit.locator('svg path[marker-end]')).toHaveCount(4);
    const references = exhibit.getByRole('button', { name: 'Reference to Person' });
    await expect(references).toHaveCount(2);
    await references.first().click();
    await expect(page).toHaveURL(/select=ref/);
    await expect(exhibit).toContainText('Lit: Person, and 1 reference to it.');
    // The object lights up every reference to it: p1 and p2.
    const heap = exhibit.getByRole('region', { name: 'Heap: shared by every thread' });
    await heap.getByRole('button', { name: /^Person/ }).click();
    await expect(exhibit).toContainText('Lit: Person, and 2 references to it.');

    // p2 = null: the object is still there, unreachable, until a collection runs.
    await page.goto('memory?lab=living&step=12');
    await expect(heap).toContainText('unreachable: eligible for collection');
    await heap.getByRole('button', { name: /Run a collection here/ }).click();
    await expect(exhibit).toContainText(
      'A collection ran: it reclaimed Person, which nothing could reach.',
    );
    await expect(heap).toContainText('reclaimed: its memory can be reused');
    expect(problems).toEqual([]);
  });

  test('the prediction opens the station, and steps play forward and back', async ({ page }) => {
    await page.goto('memory?lab=living');
    await page.getByRole('group', { name: 'Make a prediction' }).getByRole('radio').first().check();
    await expect(stepText(page, 1)).toBeVisible();
    await page.getByRole('button', { name: 'Next step' }).click();
    await page.getByRole('button', { name: 'Next step' }).click();
    await expect(stepText(page, 3)).toBeVisible();
    await page.getByRole('button', { name: 'Previous step' }).click();
    await expect(stepText(page, 2)).toBeVisible();
    await expect(page).toHaveURL(/step=1/);

    await page.getByRole('radio', { name: 'Two threads' }).click();
    await expect(page).toHaveURL(/program=threads/);
    await expect(stepText(page, 1)).toBeVisible();
  });

  test('the layout laboratory changes with the configuration', async ({ page }) => {
    await page.goto('memory?lab=layout&object=person');
    const exhibit = page.getByRole('figure', { name: /^Object layout laboratory/ });
    await expect(exhibit).toContainText('Person: 16 bytes');
    await expect(exhibit).toContainText('12-byte header, 0 bytes of padding');
    await exhibit.getByRole('radio', { name: /^No compressed oops/ }).click();
    await expect(page).toHaveURL(/config=nocoops/);
    await expect(exhibit).toContainText('Person: 24 bytes');
    await exhibit.getByRole('radio', { name: /^Compact headers/ }).click();
    await expect(exhibit).toContainText('8-byte header, 4 bytes of padding');
    // The configuration is part of the URL: a reload shows the same layout.
    await page.reload();
    await expect(exhibit).toContainText('8-byte header, 4 bytes of padding');
  });
});

test.describe('laboratory 3D models', () => {
  test('Three.js loads only when a 3D model is chosen', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'script') scripts.push(request.url());
    });
    await page.goto('class-loading?loader=app');
    await page.waitForLoadState('networkidle');
    expect(scripts.filter((url) => /Observatory3D|LabViewer3D/.test(url))).toEqual([]);

    await page.getByRole('radio', { name: /3D model/ }).click();
    await expect(page).toHaveURL(/viewer=3d/);
    const model = page.getByRole('group', { name: '3D model of the class loaders' });
    await expect(model).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
    expect(scripts.some((url) => /LoaderObservatory3D/.test(url))).toBe(true);
  });

  test('the guided tour and the keyboard change the shared selection', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Keyboard use is exercised on desktop.');
    const problems = watchForProblems(page);
    await page.goto('class-loading?viewer=3d');
    const model = page.getByRole('group', { name: '3D model of the class loaders' });
    await expect(model).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });

    await page.getByRole('button', { name: 'Guided tour' }).click();
    await expect(page).toHaveURL(/loader=bootstrap/);
    const tour = page.getByRole('group', { name: 'Guided tour' });
    await tour.getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(/loader=platform/);
    await tour.getByRole('button', { name: 'End tour' }).click();
    await page.getByRole('button', { name: /^Watch the request/ }).click();
    await expect(page.getByRole('button', { name: /^Replay the request/ })).toBeVisible();

    await model.focus();
    for (const key of ['ArrowLeft', 'ArrowUp', '+', '-', '0', 'f']) await page.keyboard.press(key);
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/loader=/);
    await page.getByRole('button', { name: 'Use the 2D structure' }).click();
    await expect(page).not.toHaveURL(/viewer=/);
    expect(problems).toEqual([]);
  });

  test('without WebGL the memory model says why and offers the 2D layers', async ({ page }) => {
    await withoutWebGL(page);
    await page.goto('memory?viewer=3d&area=heap');
    await expect(page.getByText('This browser cannot show the 3D model')).toBeVisible();
    await page.getByRole('button', { name: 'Use the 2D layers' }).click();
    await expect(page).not.toHaveURL(/viewer=3d/);
    await expect(page.getByRole('button', { name: /^Heap/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('after the graphics context is lost, the memory model can be restarted', async ({
    page,
  }) => {
    await page.goto('memory?viewer=3d');
    const model = page.getByRole('group', { name: '3D model of the memory of a running JVM' });
    await expect(model).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas')!;
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    await expect(page.getByText('The 3D view stopped', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Restart the 3D view' }).click();
    await expect(page.getByText('The 3D view stopped', { exact: true })).toHaveCount(0);
    await expect(model).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
  });
});
