import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import type { LabStation } from '@/types/lab';

/**
 * The entrance of a laboratory: the instrument surface with the lab's central
 * question, and the stations as a numbered sequence of observational scales,
 * each a link (the station is part of the URL, so it can be shared).
 */
export function LabHero({
  kicker,
  title,
  intro,
  stations,
  current,
  hrefFor,
  completed,
  aside,
}: {
  kicker: string;
  title: string;
  intro: ReactNode;
  stations: LabStation[];
  current: string;
  hrefFor: (stationId: string) => string;
  completed: Record<string, number>;
  /** The level control and other page-wide controls. */
  aside?: ReactNode;
}) {
  return (
    <header className="surface-instrument blueprint border-b border-ink-700">
      <div className="mx-auto w-full max-w-[1320px] px-4 pt-10 pb-8 sm:px-6 lg:pt-14">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="max-w-[46rem]">
            <p className="text-[14px] text-exec-300">{kicker}</p>
            <h1 className="mt-2 font-serif text-[34px] leading-[1.1] text-balance text-fg sm:text-[46px]">
              {title}
            </h1>
            <div className="mt-4 text-[16.5px] leading-relaxed text-fg-muted">{intro}</div>
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>

        <nav aria-label="Stations of this laboratory" className="mt-8">
          <ol className={cn('grid gap-2 md:grid-cols-3', stations.length > 3 && 'xl:grid-cols-5')}>
            {stations.map((station, index) => {
              const active = station.id === current;
              const done = station.id in completed;
              return (
                <li key={station.id} className="min-w-0">
                  <Link
                    to={hrefFor(station.id)}
                    aria-current={active ? 'page' : undefined}
                    preventScrollReset
                    className={cn(
                      'group flex h-full gap-3 rounded-lg border px-3.5 py-3 transition-colors',
                      active
                        ? 'border-exec-400 bg-exec-900/50'
                        : 'border-ink-600 bg-ink-900/70 hover:border-ink-400',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[12.5px]',
                        done
                          ? 'border-ok-500/60 text-ok-300'
                          : active
                            ? 'border-exec-400 text-exec-200'
                            : 'border-ink-500 text-fg-muted',
                      )}
                    >
                      {done ? <Check size={14} aria-label="Visited" /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[15.5px] font-medium text-fg">{station.title}</span>
                        <span className="text-[12px] text-fg-subtle">Scale: {station.scale}</span>
                      </span>
                      <span className="mt-0.5 block text-[13.5px] leading-snug text-fg-muted">
                        {station.summary}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </header>
  );
}
