import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createBrowserRouter, matchRoutes, type HydrationState } from 'react-router';
import { App } from './app/App';
import { routes } from './app/routes';
import { registerServiceWorker } from './app/serviceWorker';
import './styles/index.css';

declare global {
  interface Window {
    __staticRouterHydrationData?: HydrationState;
  }
}

/**
 * Loads the lazy route modules for the current URL before the first render, so
 * neither hydration nor a fresh render passes through the loading fallback.
 */
async function loadInitialRoutes() {
  const matches = matchRoutes(routes, window.location, import.meta.env.BASE_URL) ?? [];
  await Promise.all(
    matches.map(async ({ route }) => {
      if (typeof route.lazy !== 'function') return;
      try {
        const loaded = await route.lazy();
        Object.assign(route, { ...loaded, lazy: undefined });
      } catch {
        // Offline, or a deploy replaced the chunk: leave route.lazy in place so
        // the router retries it and can show its error page.
      }
    }),
  );
}

async function start() {
  const container = document.getElementById('root')!;
  // scripts/prerender.mjs marks pages whose HTML was rendered for a different
  // URL (a query string, or the 404 page): those render fresh instead.
  const hydrate =
    container.firstElementChild !== null &&
    !document.documentElement.hasAttribute('data-client-render');
  await loadInitialRoutes();
  const router = createBrowserRouter(routes, {
    basename: import.meta.env.BASE_URL,
    hydrationData: hydrate ? window.__staticRouterHydrationData : undefined,
  });
  const app = (
    <StrictMode>
      <App router={router} />
    </StrictMode>
  );
  if (hydrate) hydrateRoot(container, app);
  else createRoot(container).render(app);
}

void start();
registerServiceWorker();
