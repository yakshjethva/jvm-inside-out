import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin, Rolldown } from 'vite';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

/** Normalises BASE_PATH to the "/segment/" form Vite expects. */
function resolveBase(raw: string | undefined): string {
  if (!raw || raw === '/') return '/';
  const trimmed = raw.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

/** Fonts subsets precached for offline use; other subsets are cached when first used. */
const PRECACHED_FONT = /-latin-[a-z]+-normal-[\w-]+\.woff2$/;
const THREE_MODULE = /[\\/]node_modules[\\/]three[\\/]/;

/**
 * The chunks only the 3D viewers need: a 3D viewer is a lazy chunk whose
 * static imports include Three.js (the anatomy model and the laboratories'
 * models share Three.js, Fiber and the scene code), and these are the chunks
 * its static imports reach that no other entry or lazy chunk needs. They are
 * not precached: they are downloaded only by readers who open a 3D view, and
 * then cached by the service worker on first use.
 */
function viewerOnlyChunks(bundle: Rolldown.OutputBundle): Set<string> {
  const chunks = new Map<string, Rolldown.OutputChunk>();
  for (const item of Object.values(bundle))
    if (item.type === 'chunk') chunks.set(item.fileName, item);
  const closure = (roots: Iterable<string>) => {
    const seen = new Set<string>();
    const queue = [...roots];
    while (queue.length) {
      const file = queue.pop()!;
      if (seen.has(file) || !chunks.has(file)) continue;
      seen.add(file);
      queue.push(...chunks.get(file)!.imports);
    }
    return seen;
  };
  const usesThree = (file: string) =>
    [...closure([file])].some((f) => chunks.get(f)!.moduleIds.some((id) => THREE_MODULE.test(id)));
  const entries = [...chunks.values()].filter((chunk) => chunk.isEntry || chunk.isDynamicEntry);
  const viewers = entries.filter((chunk) => chunk.isDynamicEntry && usesThree(chunk.fileName));
  const others = closure(
    entries.filter((chunk) => !viewers.includes(chunk)).map((c) => c.fileName),
  );
  return new Set([...closure(viewers.map((c) => c.fileName))].filter((file) => !others.has(file)));
}

/**
 * Writes sw.js after the client build: the service worker, prefixed with its
 * cache version and the list of files to precache. Route HTML, 404.html, the
 * sitemap and robots.txt are written afterwards by scripts/prerender.mjs.
 */
function serviceWorkerOutput(): Plugin {
  let outDir = path.join(root, 'dist');
  let ssr = false;
  let onDemand = new Set<string>();
  return {
    name: 'jvm-atlas:service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      ssr = Boolean(config.build.ssr);
    },
    generateBundle(_options, bundle) {
      if (!ssr) onDemand = viewerOnlyChunks(bundle);
    },
    closeBundle() {
      const indexFile = path.join(outDir, 'index.html');
      if (ssr || !fs.existsSync(indexFile)) return;
      const html = fs.readFileSync(indexFile, 'utf8');
      const assets = fs
        .readdirSync(path.join(outDir, 'assets'))
        .filter(
          (file) =>
            (/\.(js|css)$/.test(file) && !onDemand.has(`assets/${file}`)) ||
            PRECACHED_FONT.test(file),
        )
        .sort()
        .map((file) => `assets/${file}`);
      const precache = ['./', 'favicon.svg', ...assets];
      const version = createHash('sha256')
        .update(html)
        .update(precache.join('\n'))
        .digest('hex')
        .slice(0, 12);
      const worker = fs.readFileSync(path.join(root, 'src/sw/service-worker.js'), 'utf8');
      fs.writeFileSync(
        path.join(outDir, 'sw.js'),
        `const VERSION = '${version}';\nconst PRECACHE = ${JSON.stringify(precache)};\n${worker}`,
      );
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  base: resolveBase(process.env.BASE_PATH),
  plugins: [react(), tailwindcss(), serviceWorkerOutput()],
  resolve: {
    alias: { '@': path.join(root, 'src') },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    // The SSR bundle only renders HTML; static files come from the client build.
    copyPublicDir: !isSsrBuild,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}', 'src/**/tests/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
    css: false,
  },
}));
