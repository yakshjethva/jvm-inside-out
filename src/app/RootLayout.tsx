import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { usePreferences } from '@/hooks/useLearningState';
import { pageMeta } from '@/seo/pages';
import { canonicalUrl, sitePath } from '@/seo/site';

/** Application shell: skip link, header, main landmark, footer. */
export function RootLayout() {
  const location = useLocation();
  const navigation = useNavigation();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const { preferences } = usePreferences();

  // Move focus to the main landmark after client-side navigation so screen
  // readers start reading the new page (query-only changes keep focus).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!location.hash) mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname, location.hash]);

  // Description and canonical URL follow client-side navigation (titles are set by each page).
  useEffect(() => {
    const meta = pageMeta(sitePath(location.pathname));
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description);
    // Unknown pages are noindex with no canonical URL, as in their prerendered HTML.
    let canonical = document.querySelector('link[rel="canonical"]');
    let robots = document.querySelector('meta[name="robots"]');
    if (meta.indexable) {
      robots?.remove();
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.append(canonical);
      }
      canonical.setAttribute('href', canonicalUrl(meta.path));
    } else {
      canonical?.remove();
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.append(robots);
      }
      robots.setAttribute('content', 'noindex');
    }
  }, [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (preferences.motion === 'system') root.removeAttribute('data-reduced-motion');
    else root.setAttribute('data-reduced-motion', String(preferences.motion === 'reduce'));
  }, [preferences.motion]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-exec-500 px-3 py-2 font-medium text-ink-950 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <SiteHeader />
      <div
        aria-hidden
        className={`fixed top-0 left-0 z-50 h-0.5 w-full origin-left bg-exec-400 transition-[scale,opacity] duration-500 ${navigation.state === 'loading' ? 'scale-x-[0.66] opacity-100' : 'scale-x-100 opacity-0'}`}
      />
      <main id="main" ref={mainRef} tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  );
}
