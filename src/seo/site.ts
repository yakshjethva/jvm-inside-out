/**
 * The canonical origin. Every build, including the GitHub Pages mirror, points
 * search engines here; set VITE_SITE_URL to change it.
 */
export const SITE_URL = String(
  import.meta.env.VITE_SITE_URL ?? 'https://jvmatlas.vercel.app',
).replace(/\/+$/, '');

/** The site path for a browser pathname: no base path, no trailing slash. */
export function sitePath(pathname: string, base = import.meta.env.BASE_URL): string {
  const trimmedBase = base.replace(/\/+$/, '');
  let path = pathname.startsWith(trimmedBase) ? pathname.slice(trimmedBase.length) : pathname;
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path;
}

/** Absolute canonical URL for a site path (never includes a query or fragment). */
export const canonicalUrl = (path: string) => SITE_URL + (path === '/' ? '/' : path);
