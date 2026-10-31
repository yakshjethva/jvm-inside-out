import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const inspector = (page: Page) => page.getByRole('complementary', { name: 'Component inspector' });
const plateNode = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name}, `) });
const region = (page: Page, title: string) =>
  page.getByRole('button', { name: new RegExp(`^${title} \\(`) });

/** Opens the explorer as a returning visitor (tour already dismissed). */
async function openExplorer(page: Page, path = 'anatomy') {
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

test.describe('JVM explorer: the beginner entry', () => {
  test('starts with the six main parts and opens the one you select', async ({ page }) => {
    await openExplorer(page);
    for (const title of [
      'Class loading',
      'Memory',
      'Execution engine',
      'Garbage collection',
      'Native interface',
      'Platform',
    ])
      await expect(region(page, title)).toBeVisible();
    await expect(plateNode(page, 'Interpreter')).toHaveCount(0);

    await region(page, 'Execution engine').click();
    await expect(page).toHaveURL(/\?c=execution-engine$/);
    await plateNode(page, 'Interpreter').click();
    const panel = inspector(page);
    await expect(
      panel.getByRole('heading', { level: 2, name: 'Interpreter', exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\?c=interpreter$/);
    await expect(panel.getByRole('heading', { name: 'What is this?' })).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Picture it' })).toBeVisible();
  });

  test('shows the full map on request and remembers it', async ({ page }) => {
    await openExplorer(page);
    await page
      .getByRole('button', { name: /Show the full JVM map/ })
      .first()
      .click();
    await expect(page).toHaveURL(/view=full/);
    await expect(plateNode(page, 'Code cache')).toBeVisible();
    await page.goto('anatomy');
    await expect(plateNode(page, 'Code cache')).toBeVisible();
    await page.getByRole('button', { name: 'Show the six main parts' }).click();
    await expect(plateNode(page, 'Code cache')).toHaveCount(0);
  });

  test('offers a guided tour on the first visit only', async ({ page }) => {
    await page.goto('anatomy');
    const tour = page.getByRole('region', { name: 'Guided tour of the explorer' });
    await expect(tour).toBeVisible();
    for (let i = 0; i < 4; i++) await tour.getByRole('button', { name: 'Next' }).click();
    await tour.getByRole('button', { name: 'Start exploring' }).click();
    await expect(tour).toHaveCount(0);
    await page.reload();
    await expect(region(page, 'Memory')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Guided tour of the explorer' })).toHaveCount(0);
    // It can always be reopened.
    await page.getByRole('button', { name: 'Guided tour', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Guided tour of the explorer' })).toBeVisible();
  });

  test('finds a component by name', async ({ page }) => {
    await openExplorer(page);
    const search = page.getByRole('combobox', { name: 'Find a component' });
    await search.fill('code cache');
    await expect(page.getByRole('option', { name: /Code cache/ })).toBeVisible();
    await search.press('Enter');
    await expect(page).toHaveURL(/c=code-cache/);
    await expect(
      inspector(page).getByRole('heading', { level: 2, name: 'Code cache', exact: true }),
    ).toBeVisible();
  });

  test('keeps technical depth one step away, open at the deep-dive level', async ({ page }) => {
    await openExplorer(page, 'anatomy?c=heap');
    const panel = inspector(page);
    const details = panel.locator('details', { hasText: 'Explore the technical details' });
    await expect(details).not.toHaveAttribute('open', '');
    await panel.getByText('Explore the technical details').click();
    await expect(panel.getByRole('heading', { name: 'Sources' })).toBeVisible();
    await panel.getByRole('radio', { name: 'Deep dive' }).click();
    await expect(details).toHaveAttribute('open', '');
    await expect(panel.getByRole('heading', { name: 'Developer explanation' })).toBeVisible();
  });
});

test.describe('JVM explorer: expert tools', () => {
  test('relationships, breadcrumbs and the back button navigate between components', async ({
    page,
  }) => {
    await openExplorer(page, 'anatomy?c=heap');
    const panel = inspector(page);
    await panel.getByRole('button', { name: 'Garbage collector', exact: true }).first().click();
    await expect(
      panel.getByRole('heading', { level: 2, name: 'Garbage collector', exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/c=garbage-collector/);

    await panel
      .getByRole('navigation', { name: 'Component breadcrumb' })
      .getByRole('button', { name: 'Java Virtual Machine' })
      .click();
    await expect(page).toHaveURL(/c=jvm/);

    await page.goBack();
    await expect(page).toHaveURL(/c=garbage-collector/);
    await page.goBack();
    await expect(page).toHaveURL(/c=heap/);
    await page.goForward();
    await expect(page).toHaveURL(/c=garbage-collector/);
  });

  test('the diagram is keyboard operable', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard navigation is exercised on desktop.');
    await openExplorer(page, 'anatomy?c=heap');
    await plateNode(page, 'Heap').focus();
    await page.keyboard.press('Escape');
    await expect(plateNode(page, 'Runtime data areas')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/c=runtime-data-areas/);
    await page.keyboard.press('ArrowRight');
    await expect(plateNode(page, 'Runtime data areas')).not.toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).not.toHaveURL(/c=runtime-data-areas/);
  });

  test('the full component list filters and selects', async ({ page }) => {
    await openExplorer(page);
    await page.getByRole('button', { name: 'Advanced options' }).click();
    await page.getByRole('button', { name: 'Browse all components' }).click();
    await page.keyboard.press('Escape');
    const list = page.getByRole('complementary', { name: 'Component list' });
    await list.getByRole('searchbox', { name: 'Filter components' }).fill('code cache');
    await list.getByRole('treeitem', { name: /Code cache/ }).click();
    await expect(page).toHaveURL(/c=code-cache/);
  });

  test('advanced options can hide HotSpot implementation details', async ({ page }) => {
    await openExplorer(page, 'anatomy?view=full');
    await expect(plateNode(page, 'Code cache')).toBeVisible();
    await page.getByRole('button', { name: 'Advanced options' }).click();
    await page.getByRole('checkbox', { name: /HotSpot implementation details/ }).uncheck();
    await expect(plateNode(page, 'Code cache')).toHaveCount(0);
    await expect(plateNode(page, 'Method area')).toBeVisible();
  });

  test('"Show the parts" numbers every part', async ({ page }) => {
    await openExplorer(page);
    await page.getByRole('radio', { name: /Show the parts/ }).click();
    await expect(page).toHaveURL(/mode=exploded/);
    await expect(page.getByText('Parts list')).toBeVisible();
    await page.getByRole('button', { name: /^\d+\s*Code cache$/ }).click();
    await expect(page).toHaveURL(/c=code-cache/);
  });

  test('"Look inside" dissects the selected component', async ({ page }) => {
    await openExplorer(page, 'anatomy?c=heap&mode=internal');
    await expect(page.getByText('Inside the heap')).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Accuracy note' }).first()).toContainText(
      'illustrative',
    );
  });

  test('"Watch it run" steps through a scenario', async ({ page }) => {
    await openExplorer(page, 'anatomy?mode=execution&s=new-person');
    const narrative = page.getByRole('complementary', { name: 'Execution narrative' });
    await expect(narrative.getByText('Step 1 of 10')).toBeVisible();
    await narrative.getByRole('button', { name: 'Next step' }).click();
    await expect(narrative.getByText('Step 2 of 10')).toBeVisible();
    await expect(page).toHaveURL(/step=1/);
    await narrative.getByRole('button', { name: 'Step 5:', exact: false }).click();
    await expect(narrative.getByText('Step 5 of 10')).toBeVisible();
  });

  test('the inspector links a component to a walkthrough step where it takes part', async ({
    page,
  }) => {
    await openExplorer(page, 'anatomy?c=operand-stack');
    await inspector(page)
      .getByRole('button', { name: /Watch it run:/ })
      .click();
    await expect(page).toHaveURL(/mode=execution/);
    await expect(
      page.getByRole('complementary', { name: 'Execution narrative' }).getByText(/Step \d+ of/),
    ).toBeVisible();
  });

  test('the inspector opens the lesson’s interactive model of a core concept', async ({ page }) => {
    await openExplorer(page, 'anatomy?c=heap');
    const panel = inspector(page);
    await panel.getByRole('button', { name: 'Try the interactive model' }).click();
    const model = panel.getByRole('figure', { name: /new Person\("Mia"\)/ });
    await expect(model.getByText('Step 1 of 8')).toBeVisible();
    await model.getByRole('button', { name: 'Next step' }).click();
    await expect(model.getByText('Step 2 of 8')).toBeVisible();
    await panel.getByRole('button', { name: 'Hide the interactive model' }).click();
    await expect(model).toHaveCount(0);
  });

  test('"Center selected part" works while the camera follows a scenario', async ({ page }) => {
    await openExplorer(page, 'anatomy?mode=execution&s=new-person&c=native-libraries');
    const canvas = page.getByRole('group', { name: 'Anatomy of the Java Virtual Machine' });
    const node = plateNode(page, 'Native libraries');
    const centred = async () => {
      const [area, box] = await Promise.all([canvas.boundingBox(), node.boundingBox()]);
      if (!area || !box) return false;
      const dx = box.x + box.width / 2 - (area.x + area.width / 2);
      const dy = box.y + box.height / 2 - (area.y + area.height / 2);
      return Math.abs(dx) < area.width * 0.15 && Math.abs(dy) < area.height * 0.15;
    };
    await expect(page.getByText('Step 1 of 10')).toBeVisible();
    await expect.poll(centred).toBe(false);
    await page.getByRole('button', { name: 'Center selected part' }).click();
    await expect.poll(centred).toBe(true);
    await page.getByRole('button', { name: 'Next step' }).click();
    await expect.poll(centred).toBe(false);
  });

  test('the full map on the home page opens a component in the explorer', async ({ page }) => {
    await openExplorer(page, './');
    const preview = page.getByRole('group', { name: 'Interactive preview of the JVM anatomy' });
    // The preview mounts only as its section comes near the viewport.
    await expect(preview).toHaveCount(0);
    await page
      .getByRole('heading', { name: 'The whole machine on one plate' })
      .scrollIntoViewIfNeeded();
    await preview.getByRole('button', { name: /^Interpreter, / }).click();
    await page.getByRole('link', { name: 'Open in the explorer' }).click();
    await expect(page).toHaveURL(/\/anatomy\/?\?c=interpreter$/);
    await expect(
      inspector(page).getByRole('heading', { level: 2, name: 'Interpreter', exact: true }),
    ).toBeVisible();
  });
});
