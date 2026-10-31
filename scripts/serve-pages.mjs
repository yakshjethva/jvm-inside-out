#!/usr/bin/env node
/**
 * Serves the production build the way GitHub Pages serves a project site, so
 * the Playwright tests exercise the real deployment conditions:
 *
 *  - every file lives under the base path (for example /jvm-inside-out/);
 *  - a directory requested without a trailing slash is redirected (301) to the
 *    slash form, keeping the query string;
 *  - a directory answers with its index.html;
 *  - anything else answers with 404.html and HTTP status 404;
 *  - text files are gzip-compressed when the browser accepts it, as GitHub
 *    Pages and Vercel do, so performance measurements see realistic sizes.
 *
 * Usage: node scripts/serve-pages.mjs [--dir dist] [--base /jvm-inside-out/] [--port 4173]
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';
import zlib from 'node:zlib';

const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: 'dist' },
    base: { type: 'string', default: process.env.BASE_PATH ?? '/jvm-inside-out/' },
    port: { type: 'string', default: '4173' },
  },
});

const root = path.resolve(values.dir);
const trimmed = values.base.replace(/^\/+|\/+$/g, '');
const base = trimmed ? `/${trimmed}/` : '/';
const port = Number(values.port);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const COMPRESSIBLE = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.svg',
  '.txt',
  '.xml',
  '.webmanifest',
]);

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(`No build found in ${root}. Run "npm run build" first.`);
  process.exit(1);
}

/** Whether Accept-Encoding allows gzip: listed (or `*`) with a quality above zero. */
function acceptsGzip(header = '') {
  let quality = 0;
  for (const part of header.split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';');
    if (name !== 'gzip' && name !== '*') continue;
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const value = q ? Number(q.slice(2)) : 1;
    // An explicit gzip entry wins over the wildcard.
    if (name === 'gzip') return value > 0;
    quality = value;
  }
  return quality > 0;
}

function sendFile(req, res, status, file, method) {
  const gzip = COMPRESSIBLE.has(path.extname(file)) && acceptsGzip(req.headers['accept-encoding']);
  res.writeHead(status, {
    'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
    vary: 'accept-encoding',
    ...(gzip ? { 'content-encoding': 'gzip' } : {}),
  });
  if (method === 'HEAD') res.end();
  else if (gzip) fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res);
  else fs.createReadStream(file).pipe(res);
}

function notFound(req, res, method) {
  const page = path.join(root, '404.html');
  if (fs.existsSync(page)) sendFile(req, res, 404, page, method);
  else res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
}

const server = http.createServer((req, res) => {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }).end();
    return;
  }
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (`${url.pathname}/` === base) {
    res.writeHead(301, { location: `${base}${url.search}` }).end();
    return;
  }
  if (!url.pathname.startsWith(base)) {
    notFound(req, res, method);
    return;
  }

  let relative;
  try {
    relative = decodeURIComponent(url.pathname.slice(base.length));
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  const target = path.join(root, relative);
  if (path.relative(root, target).startsWith('..')) {
    notFound(req, res, method);
    return;
  }

  const stat = fs.statSync(target, { throwIfNoEntry: false });
  if (stat?.isFile()) {
    sendFile(req, res, 200, target, method);
    return;
  }
  if (stat?.isDirectory()) {
    if (!url.pathname.endsWith('/')) {
      res.writeHead(301, { location: `${url.pathname}/${url.search}` }).end();
      return;
    }
    const index = path.join(target, 'index.html');
    if (fs.existsSync(index)) {
      sendFile(req, res, 200, index, method);
      return;
    }
  }
  notFound(req, res, method);
});

server.listen(port, '127.0.0.1', () => {
  console.log(
    `Serving ${path.relative(process.cwd(), root) || '.'} at http://localhost:${port}${base}`,
  );
});
