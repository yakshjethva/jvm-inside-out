import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * @react-three/fiber 9.8.2 creates a THREE.Clock, which Three.js has marked
 * deprecated since r183, so every canvas logs this warning. It is harmless and
 * is the only console output these tests tolerate (docs/3D_EXPERIENCE.md).
 */
const FIBER_CLOCK_WARNING = /THREE\.Clock: This module has been deprecated/;
/**
 * Headless Chromium draws WebGL with a software renderer and reads each frame
 * back to composite it, which its GL layer reports as a performance message.
 * It comes from the test browser, not from the page.
 */
const HEADLESS_GL_MESSAGE = /GL Driver Message \(OpenGL, Performance/;

const inspector = (page: Page) => page.getByRole('complementary', { name: 'Component inspector' });
const model = (page: Page) =>
  page.getByRole('group', { name: '3D model of the Java Virtual Machine' });
/** The renderer exists and listens for context loss: the viewer's own readiness signal. */
const modelReady = (page: Page) =>
  expect(model(page)).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });

/** Opens the explorer as a returning visitor (tour already dismissed). */
async function openExplorer(page: Page, path: string) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('inside-java:v1:preferences'))
      localStorage.setItem(
        'inside-java:v1:preferences',
        JSON.stringify({
          level: 'simple',
          motion: 'system',
          mapView: 'overview',
          dismissed: { 'explorer-tour': 1 },
        }),
      );
  });
  await page.goto(path);
}

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

test.describe('3D anatomy', () => {
  test('Three.js loads only when the 3D viewer is chosen', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'script') scripts.push(request.url());
    });
    await openExplorer(page, 'anatomy');
    await expect(page.getByRole('heading', { level: 1, name: 'Explore the JVM' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(scripts.filter((url) => /Anatomy3D/.test(url))).toEqual([]);

    await page.getByRole('radio', { name: /3D model/ }).click();
    await expect(page).toHaveURL(/viewer=3d/);
    await expect(model(page).locator('canvas')).toBeVisible();
    expect(scripts.some((url) => /Anatomy3D/.test(url))).toBe(true);
  });

  test('the model, the list of parts and the inspector share one selection', async ({ page }) => {
    const problems = watchForProblems(page);
    await openExplorer(page, 'anatomy?viewer=3d');
    await expect(model(page).locator('canvas')).toBeVisible();

    await page.getByRole('button', { name: 'List of parts' }).click();
    await page.getByRole('searchbox', { name: 'Filter components' }).fill('heap');
    await page.getByRole('treeitem', { name: /^Heap/ }).click();
    await expect(page).toHaveURL(/viewer=3d.*c=heap|c=heap.*viewer=3d/);
    await expect(
      inspector(page).getByRole('heading', { level: 2, name: 'Heap', exact: true }),
    ).toBeVisible();

    const isolate = page.getByRole('button', { name: 'Isolate Heap' });
    await isolate.click();
    await expect(isolate).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Add to comparison' }).click();
    await expect(page.getByText('Comparing Heap')).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/c=heap/);
    await page.getByRole('radio', { name: /2D map/ }).click();
    await expect(page).not.toHaveURL(/viewer=/);
    expect(problems).toEqual([]);
  });

  test('a click on a part selects it', async ({ page }) => {
    await openExplorer(page, 'anatomy?viewer=3d&view=full');
    const canvas = model(page).locator('canvas');
    await modelReady(page);
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect(page).toHaveURL(/[?&]c=[a-z0-9-]+/);
    await expect(inspector(page).getByRole('heading', { level: 2 })).toBeVisible();
  });

  test('a keyboard user can turn and zoom the model and clear the selection', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Keyboard use is exercised on desktop.');
    await openExplorer(page, 'anatomy?viewer=3d&c=heap');
    await expect(model(page).locator('canvas')).toBeVisible();
    await model(page).focus();
    await expect(model(page)).toBeFocused();
    for (const key of ['ArrowLeft', 'ArrowUp', '+', '-', '0', 'f']) await page.keyboard.press(key);
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/c=heap/);
    for (const name of ['Rotate left', 'Rotate right', 'Zoom in', 'Zoom out', 'Reset the view'])
      await page.getByRole('button', { name }).click();
  });

  test('the parts come apart and go back together', async ({ page }) => {
    await openExplorer(page, 'anatomy?viewer=3d');
    const slider = page.getByRole('slider', { name: 'Explode' });
    const reassemble = page.getByRole('button', { name: 'Reassemble' });
    await expect(reassemble).toBeDisabled();
    await slider.fill('60');
    await expect(slider).toHaveAttribute('aria-valuetext', '60 percent apart');
    await reassemble.click();
    await expect(slider).toHaveValue('0');

    // "Show the parts" is the fully exploded model; reassembling returns to the overview.
    await page.getByRole('radio', { name: /Show the parts/ }).click();
    await expect(slider).toHaveValue('100');
    await reassemble.click();
    await expect(page).not.toHaveURL(/mode=exploded/);
  });

  test('walkthroughs play in 3D with the same narrative and steps', async ({ page }) => {
    const problems = watchForProblems(page);
    await openExplorer(page, 'anatomy?viewer=3d&mode=execution&s=new-person');
    await expect(model(page).locator('canvas')).toBeVisible();
    await expect(page.getByText(/Step 1 of 10/)).toBeVisible();
    await page.getByRole('button', { name: 'Next step' }).click();
    await expect(page).toHaveURL(/step=1/);
    await expect(page.getByText(/Step 2 of 10/)).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('without WebGL the viewer says why and offers the 2D map', async ({ page }) => {
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
    await openExplorer(page, 'anatomy?viewer=3d');
    await expect(page.getByText('This browser cannot show the 3D model')).toBeVisible();
    await page.getByRole('button', { name: 'Use the 2D map' }).click();
    await expect(page).not.toHaveURL(/viewer=3d/);
    await expect(page.getByRole('button', { name: /^Memory \(/ })).toBeVisible();
  });

  test('after the graphics context is lost, the view can be restarted', async ({ page }) => {
    await openExplorer(page, 'anatomy?viewer=3d');
    await modelReady(page);
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas')!;
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    });
    await expect(page.getByText('The 3D view stopped', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Restart the 3D view' }).click();
    await expect(page.getByText('The 3D view stopped', { exact: true })).toHaveCount(0);
    await modelReady(page);
  });

  test.describe('when the 3D code fails to download', () => {
    // Without a service worker every request goes through page.route.
    test.use({ serviceWorkers: 'block' });

    test('trying again downloads it again and starts the model', async ({ page }) => {
      let requests = 0;
      await page.route(/\/assets\/Anatomy3D-[^/]+\.js$/, (route) => {
        requests += 1;
        return requests === 1 ? route.abort('failed') : route.continue();
      });
      await openExplorer(page, 'anatomy?viewer=3d');
      await expect(page.getByText('The 3D model could not start')).toBeVisible();
      await page.getByRole('button', { name: 'Try again' }).click();
      await modelReady(page);
      await expect(page).toHaveURL(/viewer=3d/);
      expect(requests).toBeGreaterThan(1);
    });
  });

  test('the list viewer shows every part without any drawing', async ({ page }) => {
    await openExplorer(page, 'anatomy?viewer=list');
    await expect(page.getByText('Every part, as a list')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.getByRole('searchbox', { name: 'Filter components' }).fill('interpreter');
    await page.getByRole('treeitem', { name: /^Interpreter/ }).click();
    await expect(page).toHaveURL(/c=interpreter/);
    await expect(
      inspector(page).getByRole('heading', { level: 2, name: 'Interpreter', exact: true }),
    ).toBeVisible();
  });
});
