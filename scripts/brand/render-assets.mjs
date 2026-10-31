/**
 * Renders the JVM Atlas brand artwork (scripts/brand/artwork.html) to the PNGs
 * committed under public/: the social card and the app icons. Run it after
 * changing the artwork:
 *
 *   node scripts/brand/render-assets.mjs
 *
 * It needs the Playwright browser (npx playwright install chromium).
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const page = pathToFileURL(path.join(here, 'artwork.html')).href;

const jobs = [
  { query: 'kind=og', width: 1200, height: 630, out: 'public/og/jvm-atlas.png' },
  {
    query: 'kind=icon&size=180',
    width: 180,
    height: 180,
    out: 'public/icons/apple-touch-icon.png',
  },
  { query: 'kind=icon&size=192', width: 192, height: 192, out: 'public/icons/icon-192.png' },
  { query: 'kind=icon&size=512', width: 512, height: 512, out: 'public/icons/icon-512.png' },
];

const browser = await chromium.launch();
for (const job of jobs) {
  const tab = await browser.newPage({ viewport: { width: job.width, height: job.height } });
  await tab.goto(`${page}?${job.query}`);
  await tab.waitForSelector('body[data-ready="1"]');
  const file = path.join(root, job.out);
  mkdirSync(path.dirname(file), { recursive: true });
  await tab.locator('#art').screenshot({ path: file, omitBackground: true });
  console.log('wrote', job.out);
  await tab.close();
}
await browser.close();
