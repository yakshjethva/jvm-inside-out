import { useEffect, useLayoutEffect } from 'react';
import type { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { prefetchPages } from './routes';

type Router = ReturnType<typeof createBrowserRouter>;

export function App({ router }: { router: Router }) {
  // Prerendered HTML for a different URL stays hidden until React has painted
  // the right page (see scripts/prerender.mjs); this reveals it.
  // The app has taken over the page: tests wait for this before interacting.
  useLayoutEffect(() => {
    document.documentElement.removeAttribute('data-client-render');
    document.documentElement.setAttribute('data-hydrated', '');
  }, []);

  // Other pages are prefetched only after this one has fully loaded.
  useEffect(() => {
    let timer = 0;
    const start = () => {
      timer = window.setTimeout(prefetchPages, 1000);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      window.clearTimeout(timer);
    };
  }, []);

  return <RouterProvider router={router} />;
}
