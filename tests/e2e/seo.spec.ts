import { expect, test } from './fixtures';

const SITE = 'https://jvmatlas.vercel.app';

test.describe('prerendered pages without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  const pages: [path: string, canonical: string, title: string, heading: string, text: RegExp][] = [
    [
      './',
      '/',
      'JVM Atlas · Explore the machine behind Java programs',
      'Explore the machine behind every Java program.',
      /Start with the basics/,
    ],
    [
      'start',
      '/start',
      'Start here · JVM Atlas',
      'What happens when you run a Java program?',
      /The compiler/,
    ],
    ['learn', '/learn', 'Learn · JVM Atlas', 'Start with a question', /What is bytecode\?/],
    ['paths', '/learn', 'Learn · JVM Atlas', 'Start with a question', /What is bytecode\?/],
    [
      'learn/heap-vs-stack',
      '/learn/heap-vs-stack',
      'Heap versus stack · JVM Atlas',
      'What is the difference between the heap and the stack?',
      /Picture it/,
    ],
    ['anatomy', '/anatomy', 'JVM anatomy · JVM Atlas', 'Explore the JVM', /Class loading/],
    ['glossary', '/glossary', 'Glossary · JVM Atlas', 'Glossary', /Bytecode/],
    [
      'references',
      '/references',
      'References · JVM Atlas',
      'References',
      /Java Virtual Machine Specification/,
    ],
    [
      'about',
      '/about',
      'About · JVM Atlas',
      "Don't memorize the JVM. Explore it.",
      /not affiliated with or endorsed by Oracle/,
    ],
  ];

  for (const [path, canonical, title, heading, text] of pages)
    test(`${path} has its content, title and canonical URL in the HTML`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      await expect(page.locator('main')).toContainText(text);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', SITE + canonical);
      const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
      for (const item of jsonLd) expect(JSON.parse(item)['@context']).toBe('https://schema.org');
      const types = jsonLd.map((item) => JSON.parse(item)['@type']);
      if (canonical === '/') expect(types).toEqual(['WebSite']);
      if (canonical.startsWith('/learn/')) expect(types).toEqual(['BreadcrumbList', 'TechArticle']);
      if (canonical === '/glossary') expect(types).toEqual(['DefinedTermSet']);
    });

  test('the 404 page tells search engines not to index it', async ({ page }) => {
    const response = await page.goto('no/such/page');
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle('Page not found · JVM Atlas');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });
});

test.describe('guides and metadata in the running app', () => {
  test('a guide is reachable from Learn and leads into the atlas', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') problems.push(message.text());
    });
    await page.goto('learn');
    await page.getByRole('link', { name: /^What is bytecode\?/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What is Java bytecode?');
    await expect(page).toHaveTitle('What is bytecode? · JVM Atlas');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${SITE}/learn/what-is-bytecode`,
    );
    await page
      .getByRole('complementary', { name: 'In the atlas' })
      .getByRole('link')
      .first()
      .click();
    await expect(page).toHaveURL(/\/anatomy\?c=/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/anatomy`);
    expect(problems).toEqual([]);
  });

  test('a prerendered page hydrates without warnings and keeps working', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') problems.push(message.text());
    });
    page.on('pageerror', (error) => problems.push(error.message));
    await page.goto('learn/interpreter-vs-jit-compiler');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'What is the difference between the interpreter and the JIT compiler?',
    );
    const details = page.locator('main details').first();
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
    await page.locator('main a[href*="glossary#"]').first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Glossary' })).toBeVisible();
    await expect(page).toHaveURL(/\/glossary#[a-z0-9-]+$/);
    expect(problems).toEqual([]);
  });

  test('the mirror build has no robots.txt or sitemap of its own', async ({ request, baseURL }) => {
    test.skip(new URL(baseURL!).pathname === '/', 'Only a subpath build is a mirror.');
    expect((await request.get('robots.txt')).status()).toBe(404);
    expect((await request.get('sitemap.xml')).status()).toBe(404);
  });
});
