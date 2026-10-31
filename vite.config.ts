import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
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
/**
 * Not precached: the 3D viewer (Three.js) is downloaded only by readers who
 * open it, and then cached by the service worker on first use.
 */
const ON_DEMAND = /^Anatomy3D-/;

/**
 * Writes sw.js after the client build: the service worker, prefixed with its
 * cache version and the list of files to precache. Route HTML, 404.html, the
 * sitemap and robots.txt are written afterwards by scripts/prerender.mjs.
 */
function serviceWorkerOutput(): Plugin {
  let outDir = path.join(root, 'dist');
  let ssr = false;
  return {
    name: 'jvm-atlas:service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      ssr = Boolean(config.build.ssr);
    },
    closeBundle() {
      const indexFile = path.join(outDir, 'index.html');
      if (ssr || !fs.existsSync(indexFile)) return;
      const html = fs.readFileSync(indexFile, 'utf8');
      const assets = fs
        .readdirSync(path.join(outDir, 'assets'))
        .filter(
          (file) =>
            (/\.(js|css)$/.test(file) && !ON_DEMAND.test(file)) || PRECACHED_FONT.test(file),
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
