import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { descendantCount, getComponentDoc } from '@/content/jvm';
import { ATLAS_AREAS, type JvmRegion } from '@/content/jvm/regions';
import { cn } from '@/lib/cn';

/*
 * The home page's drawing of the machine: the seven areas of the atlas as an
 * exploded isometric stack, from build time at the top to the platform at the
 * bottom. Labels are HTML links over the drawing, so they stay readable at any
 * width and work with a keyboard. The spacing is a teaching layout, not a
 * memory map, and the caption says so.
 */

const VIEW = 600;
const SLAB = { w: 236, d: 150, h: 12, gap: 60 };
const ORIGIN = { x: 176, y: 486 };
const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;

type Point = [number, number];
const project = (x: number, y: number, z: number): Point => [
  ORIGIN.x + (x - z) * COS,
  ORIGIN.y + (x + z) * SIN - y,
];
const points = (list: Point[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** The provenance line styles: solid specification, dashed HotSpot, dotted platform. */
const DASH: Record<string, string | undefined> = {
  spec: undefined,
  hotspot: '5 3',
  platform: '1.5 3',
};

interface Slab {
  area: JvmRegion;
  top: Point[];
  right: Point[];
  front: Point[];
  anchor: Point;
  dash: string | undefined;
}

const SLABS: Slab[] = ATLAS_AREAS.map((area, index) => {
  const bottom = (ATLAS_AREAS.length - 1 - index) * SLAB.gap;
  const top = bottom + SLAB.h;
  const [x0, x1, z0, z1] = [-SLAB.w / 2, SLAB.w / 2, -SLAB.d / 2, SLAB.d / 2];
  return {
    area,
    top: [project(x0, top, z0), project(x1, top, z0), project(x1, top, z1), project(x0, top, z1)],
    right: [
      project(x1, top, z0),
      project(x1, bottom, z0),
      project(x1, bottom, z1),
      project(x1, top, z1),
    ],
    front: [
      project(x0, top, z1),
      project(x1, top, z1),
      project(x1, bottom, z1),
      project(x0, bottom, z1),
    ],
    anchor: project(x1, bottom + SLAB.h / 2, z0),
    dash: DASH[getComponentDoc(area.id).provenance],
  };
});

const LABEL_X = SLABS[0]!.anchor[0] + 36;

/** Face colours mix the area's colour family into the graphite surface. */
const face = (family: JvmRegion['family'], amount: number, base: string) =>
  `color-mix(in oklab, var(--color-${family}-500) ${amount}%, var(--color-${base}))`;

export function HeroMachine({ className }: { className?: string }) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <figure className={cn('@container', className)}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="block h-auto w-full"
          aria-hidden
          focusable="false"
        >
          {/* Bottom first, so each slab overlaps the one below it. */}
          {[...SLABS].reverse().map((slab) => {
            const { family } = slab.area;
            const lit = active === slab.area.id;
            return (
              <g
                key={slab.area.id}
                className="transition-opacity duration-200"
                opacity={active && !lit ? 0.42 : 1}
              >
                <polygon points={points(slab.front)} fill={face(family, 18, 'ink-850')} />
                <polygon points={points(slab.right)} fill={face(family, 12, 'ink-900')} />
                <polygon
                  points={points(slab.top)}
                  fill={face(family, lit ? 46 : 30, 'ink-800')}
                  stroke={`var(--color-${family}-400)`}
                  strokeWidth={lit ? 2 : 1.25}
                  strokeDasharray={slab.dash}
                  strokeLinejoin="round"
                />
                <line
                  x1={slab.anchor[0] + 6}
                  y1={slab.anchor[1]}
                  x2={slab.anchor[0] + 28}
                  y2={slab.anchor[1]}
                  stroke={`var(--color-${family}-400)`}
                  strokeOpacity={lit ? 1 : 0.6}
                  strokeDasharray={slab.dash}
                />
              </g>
            );
          })}
        </svg>
        {/* Beside the drawing from 19rem; on very narrow screens, a list below it. */}
        <ol
          aria-label="The areas of the atlas, from source code to processor"
          className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 @[19rem]:mt-0 @[19rem]:block"
        >
          {SLABS.map((slab, index) => (
            <li
              key={slab.area.id}
              className="@[19rem]:absolute @[19rem]:top-[var(--label-top)] @[19rem]:left-[var(--label-left)] @[19rem]:max-w-[var(--label-max)] @[19rem]:-translate-y-1/2"
              style={
                {
                  '--label-left': `${(LABEL_X / VIEW) * 100}%`,
                  '--label-top': `${(slab.anchor[1] / VIEW) * 100}%`,
                  '--label-max': `${((VIEW - LABEL_X) / VIEW) * 100}%`,
                } as CSSProperties
              }
            >
              <Link
                to={`/anatomy?c=${slab.area.id}`}
                onMouseEnter={() => setActive(slab.area.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(slab.area.id)}
                onBlur={() => setActive(null)}
                className="group block rounded-sm leading-tight"
              >
                <span className="sr-only">{index + 1}. </span>
                <span className="block text-[12.5px] font-medium text-fg group-hover:text-exec-200 @[26rem]:text-[14.5px]">
                  {slab.area.title}
                </span>
                <span className="hidden text-[12px] text-fg-subtle @[26rem]:block">
                  {descendantCount(slab.area.id)}
                  {descendantCount(slab.area.id) === 1 ? ' part inside' : ' parts inside'}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="mt-3 max-w-[30rem] text-[13px] leading-relaxed text-fg-subtle">
        From the source code at the top to the processor at the bottom. Dotted edges mark build-time
        tools and the platform, which are not part of the JVM. The layers are drawn apart to show
        them: this is not a map of memory.
      </figcaption>
    </figure>
  );
}
