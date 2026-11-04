import { Compass, Play, Square } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  LOADER_IDS,
  LOADER_PROFILES,
  LOADER_WORLD,
  type LoaderId,
} from '@/content/labs/classLoading';
import type { PartLook } from '@/modules/anatomy-3d/models/materials';
import type { CameraHome } from '@/modules/anatomy-3d/controls/CameraRig';
import { narrate, outcomeNarration, shortLoader } from '@/modules/class-loading/narration';
import {
  initialRuntime,
  runRequest,
  type LoaderRuntime,
  type RequestResult,
} from '@/simulators/classLoading';
import type { LabNode, LabScene } from './data/labScene';
import { loaderScene, type LoaderHop } from './data/loaderScene';
import LabViewer3D, { ToolButton } from './LabViewer3D';
import type { SceneLabel } from './SceneLabels';

const HOME: CameraHome = { target: [0.6, 1.4, -0.5], distance: 14.5, polar: 1.0, azimuth: -0.5 };

const DEMO: RequestResult = runRequest(LOADER_WORLD, initialRuntime(LOADER_WORLD), {
  kind: 'class',
  loader: 'app',
  name: 'java.sql.Connection',
});

const hopsOf = (result: RequestResult): LoaderHop[] =>
  result.steps
    .filter(
      (s) => s.other && (s.kind === 'delegate' || s.kind === 'return' || s.kind === 'not-found'),
    )
    .map((s) => ({
      id: s.id,
      from: s.loader as LoaderId,
      to: s.other as LoaderId,
      tone: s.kind === 'delegate' ? 'flow' : s.kind === 'return' ? 'ok' : 'miss',
    }));

/**
 * The loader observatory in 3D (lazy chunk): the delegation hierarchy as a
 * tower on the bootstrap loader, the sources beside it and the classes each
 * loader holds standing on it. A request can be sent travelling through it,
 * and a guided tour visits each loader in turn. Selection is shared with the
 * 2D structure and the URL.
 */
export default function LoaderObservatory3D({
  runtime,
  lastRequest,
  selected,
  onSelect,
  reducedMotion,
  onUse2D,
}: {
  runtime: LoaderRuntime;
  lastRequest: RequestResult | null;
  selected: LoaderId | null;
  onSelect: (id: LoaderId | null) => void;
  reducedMotion: boolean;
  onUse2D: () => void;
}) {
  const request = lastRequest ?? DEMO;
  const [playKey, setPlayKey] = useState(0);
  const [showing, setShowing] = useState(false);
  const [activeHop, setActiveHop] = useState(-1);
  const [announcement, setAnnouncement] = useState('');
  const [tour, setTour] = useState<number | null>(null);
  const hops = useMemo(() => (showing ? hopsOf(request) : []), [showing, request]);

  const build = useCallback(
    ({ explode, isolate }: { explode: number; isolate: string | null }): LabScene =>
      loaderScene({ runtime, explode, isolate: isolate as LoaderId | null, hops }),
    [runtime, hops],
  );

  // Parts and sources are labelled; the classes a loader holds are listed in the overlay instead.
  const labels = useCallback(
    (scene: LabScene, current: string | null): SceneLabel[] =>
      scene.nodes
        .filter((n) => n.role !== 'item')
        .map((n) => ({
          node: n.id,
          text: n.label ?? n.id,
          kind: n.role,
          emphasis: n.owner === current && n.role === 'part',
        })),
    [],
  );
  const held = selected
    ? [
        ...runtime.classes
          .filter((c) => c.definingLoader === selected)
          .map((c) => ({ id: c.id, defined: true })),
        ...Object.values(runtime.initiated[selected] ?? {})
          .filter(
            (id) => !runtime.classes.some((c) => c.id === id && c.definingLoader === selected),
          )
          .map((id) => ({ id, defined: false })),
      ]
    : [];

  const hop = activeHop >= 0 ? hops[activeHop] : undefined;
  const lookOf = useCallback(
    (node: LabNode, base: PartLook): PartLook => {
      if (hop && node.role === 'part' && (node.owner === hop.from || node.owner === hop.to))
        return 'active';
      return base;
    },
    [hop],
  );

  const play = () => {
    setShowing(true);
    setPlayKey((k) => k + 1);
    setActiveHop(-1);
    const path = hopsOf(request);
    const first = request.steps[0];
    if (reducedMotion)
      setAnnouncement(
        `${first ? narrate(first, LOADER_WORLD, request).text : ''} The request goes ${path
          .map((h) => `from ${shortLoader(h.from)} to ${shortLoader(h.to)}`)
          .join(', then ')}. ${outcomeNarration(request.outcome).text}`.replaceAll('`', ''),
      );
  };

  const onHop = useCallback(
    (index: number) => {
      setActiveHop(index);
      if (index === -1) {
        setAnnouncement(outcomeNarration(request.outcome).text.replaceAll('`', ''));
        return;
      }
      const step = request.steps.find((s) => s.id === hops[index]?.id);
      if (step) setAnnouncement(narrate(step, LOADER_WORLD, request).text.replaceAll('`', ''));
    },
    [request, hops],
  );

  const goTour = (index: number | null) => {
    setTour(index);
    if (index === null) {
      setAnnouncement('Tour ended.');
      return;
    }
    const id = LOADER_IDS[index]!;
    onSelect(id);
    setAnnouncement(
      `Stop ${index + 1} of ${LOADER_IDS.length}: ${LOADER_PROFILES[id].title}. ${LOADER_PROFILES[id].role.simple.split('. ')[0]?.replaceAll('`', '')}.`,
    );
  };

  const subject =
    request.request.kind === 'class'
      ? `${shortLoader(request.request.loader)} → ${request.request.name}`
      : 'Greeter calls Bus.send(Message)';

  return (
    <LabViewer3D
      label="3D model of the class loaders"
      help="Drag to orbit, scroll or pinch to zoom, and drag with the right button or two fingers to pan. With the model focused, arrow keys orbit, plus and minus zoom, 0 resets the view, F frames the selected loader and Escape clears the selection. The 2D structure shows the same loaders, sources and classes as text."
      build={build}
      selected={selected}
      ownerName={(owner) => LOADER_PROFILES[owner as LoaderId]?.title ?? owner}
      onSelect={(owner) => onSelect((owner as LoaderId | null) ?? null)}
      lookOf={lookOf}
      labels={labels}
      travel={showing ? { key: String(playKey), ids: hops.map((h) => h.id) } : null}
      onHop={onHop}
      home={HOME}
      reducedMotion={reducedMotion}
      onUse2D={onUse2D}
      twoD="the 2D structure"
      announcement={announcement}
      overlay={
        selected ? (
          <div className="rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-[12.5px]">
            <p className="font-medium text-fg">{LOADER_PROFILES[selected].plateTitle}</p>
            {held.length === 0 ? (
              <p className="text-fg-muted">Holds no classes yet.</p>
            ) : (
              <ul className="mt-1 space-y-0.5 font-mono text-[11.5px]" translate="no">
                {held.map((c) => (
                  <li key={c.id} className={c.defined ? 'text-rt-200' : 'text-fg-muted'}>
                    {c.defined ? '■' : '▭'}{' '}
                    {c.id.slice(c.id.lastIndexOf('.', c.id.indexOf('@')) + 1)}
                    <span className="font-sans text-fg-subtle">
                      {' '}
                      {c.defined ? 'defined (cube)' : 'initiated (tile)'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-[12.5px] text-fg-muted">
            Terraces from the bootstrap loader in front to the plugin loaders at the back. Select a
            loader.
          </p>
        )
      }
      toolbar={
        <>
          <ToolButton onClick={play} icon={<Play size={14} aria-hidden />}>
            {showing ? 'Replay' : 'Watch'} the request{' '}
            <span className="font-mono text-[12px]">{subject}</span>
          </ToolButton>
          {showing && (
            <ToolButton
              onClick={() => {
                setShowing(false);
                setActiveHop(-1);
              }}
              icon={<Square size={13} aria-hidden />}
            >
              Hide it
            </ToolButton>
          )}
          {tour === null ? (
            <ToolButton onClick={() => goTour(0)} icon={<Compass size={14} aria-hidden />}>
              Guided tour
            </ToolButton>
          ) : (
            <span
              role="group"
              aria-label="Guided tour"
              className="flex flex-wrap items-center gap-1.5"
            >
              <span className="text-fg-muted tabular">
                Stop {tour + 1} of {LOADER_IDS.length}
              </span>
              <ToolButton disabled={tour === 0} onClick={() => goTour(tour - 1)}>
                Previous
              </ToolButton>
              <ToolButton onClick={() => goTour(tour + 1 < LOADER_IDS.length ? tour + 1 : null)}>
                {tour + 1 < LOADER_IDS.length ? 'Next' : 'Finish'}
              </ToolButton>
              <ToolButton onClick={() => goTour(null)}>End tour</ToolButton>
            </span>
          )}
        </>
      }
    />
  );
}
