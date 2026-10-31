import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { PRIMARY_NAV, PROJECT_NAV, SITE } from '@/data/site';
import { cn } from '@/lib/cn';
import { LogoMark, Wordmark } from './Logo';
import { SettingsMenu } from './SettingsMenu';

export function SiteHeader() {
  const location = useLocation();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const here = location.pathname + location.hash;
  const [openOn, setOpenOn] = useState<string | null>(null);
  const menuOpen = openOn === here;
  const menuButton = useRef<HTMLButtonElement>(null);

  // Escape closes the menu and returns focus to its button.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenOn(null);
      menuButton.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950">
      <div className="mx-auto flex h-14 max-w-[1680px] items-center gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-md text-fg"
          aria-label={`${SITE.name}, home`}
        >
          <LogoMark />
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-0.5 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 text-[14px] transition-colors',
                  isActive ? 'bg-ink-750 text-fg' : 'text-fg-muted hover:bg-ink-800 hover:text-fg',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SettingsMenu />
          <a
            href={SITE.repository}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden h-9 items-center rounded-md px-2.5 text-[13px] text-fg-muted hover:bg-ink-750 hover:text-fg xl:inline-flex"
          >
            Source<span className="sr-only"> code on GitHub (opens in a new tab)</span>
          </a>
          <button
            ref={menuButton}
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-ink-750 hover:text-fg lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setOpenOn(menuOpen ? null : here)}
          >
            {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="max-h-[calc(100dvh-56px)] overflow-y-auto overscroll-contain border-t border-ink-700 bg-ink-950 px-4 pb-4 lg:hidden"
        >
          <ul className="divide-y divide-ink-700">
            <li>
              <MobileLink to="/" label="Home" end />
            </li>
            {PRIMARY_NAV.map((item) => (
              <li key={item.to}>
                <MobileLink to={item.to} label={item.label} description={item.description} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] text-fg-subtle">The project</p>
          <ul className="divide-y divide-ink-700">
            {PROJECT_NAV.map((item) => (
              <li key={item.to}>
                <MobileLink to={item.to} label={item.label} end />
              </li>
            ))}
            <li>
              <a
                href={SITE.repository}
                target="_blank"
                rel="noreferrer noopener"
                className="block py-3 text-[15px] text-fg-muted hover:text-fg"
              >
                Source code on GitHub<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function MobileLink({
  to,
  label,
  description,
  end,
}: {
  to: string;
  label: string;
  description?: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn('block py-3 hover:text-fg', isActive && !to.includes('#') ? 'text-fg' : 'text-fg-muted')
      }
    >
      <span className="block text-[15px]">{label}</span>
      {description && <span className="block text-[12.5px] text-fg-subtle">{description}</span>}
    </NavLink>
  );
}
