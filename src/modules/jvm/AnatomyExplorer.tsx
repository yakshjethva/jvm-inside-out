import {
  Box,
  Boxes,
  Compass,
  Crosshair,
  List,
  Map as MapIcon,
  Microscope,
  Minimize2,
  Play,
  Scan,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnatomyCanvas, type CanvasHandle } from '@/components/anatomy/AnatomyCanvas';
import { ComponentSearch } from '@/components/anatomy/ComponentSearch';
import { ComponentTree, type TreeItem } from '@/components/anatomy/ComponentTree';
import { Legend } from '@/components/anatomy/Legend';
import { DiagramDefs } from '@/components/diagrams/DiagramDefs';
import { ComponentInspector } from '@/components/inspector/ComponentInspector';
import { Popover } from '@/components/learning/Popover';
import { IconButton } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  ancestry,
  childrenOf,
  COMPONENTS,
  getComponentDoc,
  ROOT_COMPONENTS,
  type ComponentId,
} from '@/content/jvm';
import { JVM_REGIONS, REGION_IDS } from '@/content/jvm/regions';
import { relationshipsOf } from '@/content/jvm/relationships';
import { SCENARIOS } from '@/content/jvm/scenarios';
import {
  preferenceActions,
  progressActions,
  usePreferences,
  useProgress,
} from '@/hooks/useLearningState';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { inflate, unionRect, type Rect } from '@/lib/geometry';
import { cn } from '@/lib/cn';
import type { Provenance } from '@/types/content';
import { AnatomyPlate, type ExecutionOverlay } from './AnatomyPlate';
import { ExecutionPanel } from './ExecutionPanel';
import { InternalView } from './internals/InternalView';
import { chooseCameraFocus, type CameraFocus } from './camera';
import { ExplorerTour, TOUR_ID } from './ExplorerTour';
import { buildScene, PART_NUMBER } from './scene';
import { useAnatomyState, type ExplorerMode, type ExplorerViewer } from './useAnatomyState';
import { Loading3D, Notice3D, Viewer3DBoundary } from '@/modules/anatomy-3d/fallback/Fallback3D';

// The lesson's interactive models load only when a learner opens one in the inspector.
const Exhibit = lazy(() =>
  import('@/modules/lesson/exhibits').then((m) => ({ default: m.Exhibit })),
);

// Three.js and the 3D model load only when a learner chooses the 3D viewer.
const Anatomy3D = lazy(() => import('@/modules/anatomy-3d/viewer/Anatomy3D'));

/** On narrow screens only the selected view shows its name; the others keep theirs for screen readers. */
const modeLabel = (icon: React.ReactNode, text: string) => (
  <>
    {icon}
    <span className="hidden group-aria-checked:inline min-[460px]:inline">{text}</span>
    <span className="sr-only group-aria-checked:hidden min-[460px]:hidden">{text}</span>
  </>
);

/** Friendly names first; the technical names stay in the descriptions. */
const MODE_SEGMENTS: { value: ExplorerMode; label: React.ReactNode; description: string }[] = [
  {
    value: 'anatomy',
    label: modeLabel(<Boxes size={14} aria-hidden />, 'Overview'),
    description: 'Anatomy view: how the parts fit together',
  },
  {
    value: 'exploded',
    label: modeLabel(<Scan size={14} aria-hidden />, 'Show the parts'),
    description: 'Exploded view: every part pulled apart and numbered',
  },
  {
    value: 'internal',
    label: modeLabel(<Microscope size={14} aria-hidden />, 'Look inside'),
    description: 'Internal view: a dissection of the selected part',
  },
  {
    value: 'execution',
    label: modeLabel(<Play size={14} aria-hidden />, 'Watch it run'),
    description: 'Execution view: follow real code through the JVM, step by step',
  },
];

const VIEWER_SEGMENTS: { value: ExplorerViewer; label: React.ReactNode; description: string }[] = [
  {
    value: '2d',
    label: modeLabel(<MapIcon size={14} aria-hidden />, '2D map'),
    description: 'The anatomy plate: every part drawn flat, with its connections',
  },
  {
    value: '3d',
    label: modeLabel(<Box size={14} aria-hidden />, '3D model'),
    description: 'The same parts as a 3D model you can turn, explode and isolate',
  },
  {
    value: 'list',
    label: modeLabel(<List size={14} aria-hidden />, 'List'),
    description: 'Every part as a plain list, for reading or a screen reader',
  },
];

/** Plain-language labels for the collapsed regions of the overview map. */
const OVERVIEW_LABELS: Partial<Record<ComponentId, { title: string; blurb: string }>> = {
  ...Object.fromEntries(JVM_REGIONS.map((r) => [r.id, { title: r.title, blurb: r.blurb }])),
  'build-time': { title: 'Before it runs', blurb: 'javac compiles source code into class files.' },
};
const OVERVIEW_COLLAPSED: ComponentId[] = [...REGION_IDS, 'build-time'];

function buildTree(id: ComponentId): TreeItem {
  const doc = COMPONENTS[id];
  return {
    id,
    name: doc.name,
    provenance: doc.provenance,
    children: childrenOf(id).map((child) => buildTree(child.id)),
  };
}

interface LayerState {
  hotspot: boolean;
  platform: boolean;
  edges: boolean;
  parts: boolean;
}

export function AnatomyExplorer() {
  const state = useAnatomyState();
  const { selectedId, mode, scenario, step } = state;
  const { preferences, setLevel } = usePreferences();
  const progress = useProgress();
  const reducedMotion = useReducedMotion();
  const wide = useMediaQuery('(min-width: 1280px)', true);

  const canvasRef = useRef<CanvasHandle>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  const [hoveredId, setHoveredId] = useState<ComponentId | null>(null);
  const [hoverRect, setHoverRect] = useState<(Rect & { areaWidth: number }) | null>(null);
  const [collapsed, setCollapsed] = useState<Set<ComponentId>>(() => new Set());
  const [layers, setLayers] = useState<LayerState>({
    hotspot: true,
    platform: true,
    edges: true,
    parts: true,
  });
  const [treeOpen, setTreeOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [layersAnchor, setLayersAnchor] = useState<HTMLButtonElement | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [follow, setFollow] = useState(true);
  const [focus, setFocus] = useState<CameraFocus | null>(null);
  // First visit without a deep link: offer the guided tour once.
  const [tourStep, setTourStep] = useState<number | null>(() =>
    !(TOUR_ID in preferences.dismissed) &&
    !selectedId &&
    mode === 'anatomy' &&
    state.viewer === '2d'
      ? 0
      : null,
  );
  // After hydration the stored preferences replace the defaults: a learner who
  // already dismissed the tour must not see it again.
  const tourDismissed = TOUR_ID in preferences.dismissed;
  const [seenDismissed, setSeenDismissed] = useState(tourDismissed);
  if (tourDismissed !== seenDismissed) {
    setSeenDismissed(tourDismissed);
    if (tourDismissed) setTourStep(null);
  }
  const closeTour = () => {
    setTourStep(null);
    preferenceActions.dismiss(TOUR_ID);
  };
  // The tour points at the 2D map, which "Look inside", the 3D model and the
  // list replace, so it opens on the map.
  const openTour = () => {
    if (mode === 'internal' || state.viewer !== '2d') state.showMap();
    setTourStep(0);
    // Set before the first paint for learners who had dismissed the tour (scripts/prerender.mjs).
    document.documentElement.removeAttribute('data-tour-dismissed');
  };

  // The overview shows the six main parts; the region holding the selection is opened.
  const view = state.view ?? preferences.mapView;
  const overview = mode === 'anatomy' && view === 'overview';
  const openRegion = selectedId
    ? (OVERVIEW_COLLAPSED.find((id) => ancestry(selectedId).some((doc) => doc.id === id)) ?? null)
    : null;
  const effectiveCollapsed = useMemo(
    () => (overview ? new Set(OVERVIEW_COLLAPSED.filter((id) => id !== openRegion)) : collapsed),
    [overview, openRegion, collapsed],
  );
  const setView = (next: 'overview' | 'full') => {
    state.setView(next);
    preferenceActions.setMapView(next);
    if (next === 'overview') window.setTimeout(() => canvasRef.current?.fit(true), 0);
  };

  const hiddenProvenance = useMemo(() => {
    const hidden = new Set<Provenance>();
    if (!layers.hotspot) hidden.add('hotspot');
    if (!layers.platform) hidden.add('platform');
    return hidden;
  }, [layers.hotspot, layers.platform]);

  const diagramMode = mode === 'exploded' ? 'exploded' : 'anatomy';
  const scene = useMemo(
    () => buildScene({ mode: diagramMode, collapsed: effectiveCollapsed, hiddenProvenance }),
    [diagramMode, effectiveCollapsed, hiddenProvenance],
  );

  const currentStep = scenario.steps[step]!;
  const execution: ExecutionOverlay | null = useMemo(() => {
    if (mode !== 'execution') return null;
    return {
      key: `${scenario.id}:${currentStep.id}`,
      active: new Set(currentStep.active),
      states: currentStep.states ?? {},
      flows: currentStep.flows ?? [],
      frame: currentStep.frame ?? null,
    };
  }, [mode, scenario.id, currentStep]);

  const tree = useMemo(() => ROOT_COMPONENTS.map(buildTree), []);

  // Record exploration progress for the selected component.
  useEffect(() => {
    if (!selectedId) return;
    const doc = getComponentDoc(selectedId);
    progressActions.markExplored(
      { key: `anatomy:${selectedId}`, title: doc.name, href: `/anatomy?c=${selectedId}` },
      selectedId,
    );
  }, [selectedId]);

  useEffect(() => {
    if (mode === 'execution') progressActions.recordScenarioStep(scenario.id, step + 1);
  }, [mode, scenario.id, step]);

  // Camera: in execution mode it follows the active components of the current step.
  const executionFocus = useMemo(() => {
    if (mode !== 'execution' || !follow) return null;
    const target = unionRect(currentStep.active.map((id) => scene.rects[id]).filter(Boolean));
    return target
      ? { rect: inflate(target, 70), key: `${scenario.id}:${currentStep.id}`, maxZoom: 1.25 }
      : null;
  }, [mode, follow, currentStep, scenario.id, scene.rects]);
  const followKey = executionFocus?.key ?? null;
  const cameraFocus = chooseCameraFocus(executionFocus, focus);

  // Camera: bring a newly selected component into a readable view when it is too small or off-screen.
  const ensureVisible = useCallback(
    (id: ComponentId, force = false) => {
      const handle = canvasRef.current;
      const area = canvasAreaRef.current;
      const rect = scene.rects[id];
      if (!handle || !area || !rect) return;
      const screen = handle.toScreen(rect);
      const { width, height } = area.getBoundingClientRect();
      const offscreen =
        screen.x + screen.w < 0 || screen.y + screen.h < 0 || screen.x > width || screen.y > height;
      const tiny = handle.getTransform().k < 0.55 || screen.w < 70 || screen.h < 26;
      if (force || offscreen || tiny)
        setFocus({
          rect: inflate(rect, Math.max(40, rect.w * 0.35)),
          key: `${id}:${Date.now()}`,
          maxZoom: 1.5,
          followKey,
        });
    },
    [scene.rects, followKey],
  );

  // A component selected through the URL is brought into view once the canvas has measured itself.
  const initialSelection = useRef(selectedId);
  useEffect(() => {
    const id = initialSelection.current;
    // In execution mode the scenario step frames the camera first.
    if (!id || mode === 'internal' || mode === 'execution') return;
    const timer = window.setTimeout(() => ensureVisible(id), 250);
    return () => window.clearTimeout(timer);
    // Only for the selection present on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = useCallback(
    (id: ComponentId | null) => {
      state.select(id);
      setHoveredId(null);
    },
    [state],
  );

  const navigate = useCallback(
    (id: string) => {
      const componentId = id as ComponentId;
      select(componentId);
      if (mode === 'execution') state.setMode('anatomy');
      window.setTimeout(() => ensureVisible(componentId), 0);
    },
    [select, mode, state, ensureVisible],
  );

  const onCanvasSelect = (id: ComponentId | null) => {
    select(id);
    if (id) ensureVisible(id);
    if (id && !wide) {
      window.setTimeout(
        () =>
          inspectorRef.current?.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            block: 'start',
          }),
        50,
      );
    }
  };

  /** Selection from the 3D model or the list: the same URL state, without the 2D camera. */
  const on3DSelect = (id: ComponentId | null) => {
    select(id);
    if (id && !wide) {
      window.setTimeout(
        () =>
          inspectorRef.current?.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            block: 'start',
          }),
        50,
      );
    }
  };

  const onHover = (id: ComponentId | null) => {
    setHoveredId(id);
    if (id && canvasRef.current) {
      setHoverRect({
        ...canvasRef.current.toScreen(scene.rects[id]),
        areaWidth: canvasAreaRef.current?.clientWidth ?? 800,
      });
    } else setHoverRect(null);
  };

  const toggleCollapse = (id: ComponentId) =>
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedDoc = selectedId ? getComponentDoc(selectedId) : null;
  const relations = selectedId ? relationshipsOf(selectedId) : null;
  const bookmarkKey = selectedId ? `anatomy:${selectedId}` : '';
  const hoveredDoc = hoveredId ? getComponentDoc(hoveredId) : null;
  const subsystemIds: ComponentId[] = [
    'class-loader-subsystem',
    'runtime-data-areas',
    'execution-engine',
    'garbage-collector',
    'native-interface',
  ];

  const sidePanel =
    mode === 'execution' ? (
      <ExecutionPanel
        scenario={scenario}
        step={step}
        level={preferences.level}
        onLevelChange={setLevel}
        onScenario={state.setScenario}
        onStep={state.setStep}
        onNavigate={navigate}
        furthest={(progress.scenarios[scenario.id] ?? 1) - 1}
        follow={follow}
        onFollow={(value) => {
          setFollow(value);
          // Turning follow off keeps the camera where it is.
          setFocus(null);
        }}
      />
    ) : selectedDoc && selectedId && relations ? (
      <>
        <ComponentInspector
          doc={selectedDoc}
          headingId={headingId}
          ancestry={ancestry(selectedId).map((d) => ({ id: d.id, name: d.name }))}
          parts={childrenOf(selectedId).map((d) => ({
            id: d.id,
            name: d.name,
            summary: d.summary,
          }))}
          outgoing={relations.outgoing.map((rel) => ({
            rel,
            other: { id: rel.to, name: getComponentDoc(rel.to).name },
          }))}
          incoming={relations.incoming.map((rel) => ({
            rel,
            other: { id: rel.from, name: getComponentDoc(rel.from).name },
          }))}
          level={preferences.level}
          onLevelChange={setLevel}
          onNavigate={navigate}
          bookmarked={progress.bookmarks.some((b) => b.key === bookmarkKey)}
          onToggleBookmark={() =>
            progressActions.toggleBookmark({
              key: bookmarkKey,
              title: selectedDoc.name,
              href: `/anatomy?c=${selectedId}`,
            })
          }
          understood={selectedId in progress.understood}
          onToggleUnderstood={() => progressActions.toggleUnderstood(selectedId)}
          onDissect={mode === 'internal' ? undefined : () => state.setMode('internal')}
          onClose={() => select(null)}
          walkthrough={walkthroughFor(selectedId, state.watch)}
          renderDemo={(demo) => (
            <Suspense fallback={<p className="text-[13.5px] text-fg-subtle">Loading the model…</p>}>
              <Exhibit id={demo} />
            </Suspense>
          )}
        />
        {childrenOf(selectedId).length > 0 && mode !== 'internal' && !overview && (
          <div className="border-t border-ink-700 px-5 py-3">
            <button
              type="button"
              onClick={() => toggleCollapse(selectedId)}
              className="rounded border border-ink-600 px-2.5 py-1 text-[12.5px] text-fg-muted hover:text-fg"
            >
              {collapsed.has(selectedId)
                ? 'Expand parts in the diagram'
                : 'Collapse parts in the diagram'}
            </button>
          </div>
        )}
      </>
    ) : (
      <WelcomePanel
        mode={mode}
        overview={overview}
        onSelect={navigate}
        onFullMap={() => setView('full')}
        onTour={openTour}
      />
    );

  return (
    <section
      aria-label="JVM anatomy explorer"
      className="flex flex-col xl:h-[calc(100dvh-104px)] xl:min-h-[600px]"
    >
      {/* Toolbar: the mode, finding a component, the tour; everything else is in Advanced options. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-700 bg-ink-950 px-3 py-2 sm:px-4">
        <SegmentedControl
          label="View"
          value={mode}
          onChange={state.setMode}
          segments={MODE_SEGMENTS}
        />
        {/* "Look inside" is a 2D dissection whatever the viewer, so the choice is hidden there. */}
        {mode !== 'internal' && (
          <SegmentedControl
            label="Viewer"
            value={state.viewer}
            onChange={state.setViewer}
            segments={VIEWER_SEGMENTS}
          />
        )}
        {mode === 'execution' && (
          <label className="flex items-center gap-2 text-[12.5px] text-fg-subtle">
            <span className="sr-only sm:not-sr-only">Walkthrough</span>
            <select
              value={scenario.id}
              onChange={(event) => state.setScenario(event.target.value)}
              className="h-9 max-w-[260px] rounded-md border border-ink-600 bg-ink-850 px-2 text-[13px] text-fg"
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title.replace(/`/g, '')}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:ml-auto sm:w-auto">
          <ComponentSearch onSelect={(id) => navigate(id)} />
          <ToolbarButton
            pressed={tourStep !== null}
            onClick={() => (tourStep === null ? openTour() : closeTour())}
            icon={<Compass size={15} aria-hidden />}
          >
            Guided tour
          </ToolbarButton>
          <ToolbarButton
            buttonRef={setLayersAnchor}
            pressed={layersOpen}
            onClick={() => setLayersOpen((v) => !v)}
            icon={<SlidersHorizontal size={15} aria-hidden />}
            haspopup
          >
            Advanced options
          </ToolbarButton>
        </div>
        <Popover
          anchor={layersAnchor}
          open={layersOpen}
          onClose={() => setLayersOpen(false)}
          labelledBy="advanced-title"
          width={320}
        >
          <div className="space-y-4 p-4 text-[13.5px]">
            <h2 id="advanced-title" className="font-serif text-lg text-fg">
              Advanced options
            </h2>
            {mode === 'anatomy' && (
              <div>
                <p className="mb-1.5 text-fg-muted">Map</p>
                <SegmentedControl
                  label="Map"
                  size="sm"
                  value={view}
                  onChange={setView}
                  segments={[
                    { value: 'overview', label: 'Six main parts' },
                    { value: 'full', label: `Full map (${Object.keys(COMPONENTS).length})` },
                  ]}
                />
              </div>
            )}
            <div className="space-y-2.5">
              <p className="text-fg-muted">Show or hide parts</p>
              {(
                [
                  [
                    'hotspot',
                    'HotSpot implementation details',
                    'Hide them to see only what the JVM Specification defines.',
                  ],
                  [
                    'platform',
                    'Build time, process and platform',
                    'Tools, launcher, native libraries, operating system and CPU.',
                  ],
                  ['edges', 'Connections', 'Lines between related parts.'],
                  ['parts', 'Part numbers', 'Numbered callouts in the "Show the parts" view.'],
                ] as const
              ).map(([key, label, hint]) => (
                <label key={key} className="flex cursor-pointer gap-2.5">
                  <input
                    type="checkbox"
                    checked={layers[key]}
                    onChange={(event) =>
                      setLayers((previous) => ({ ...previous, [key]: event.target.checked }))
                    }
                    className="mt-1 h-4 w-4 accent-[var(--color-exec-500)]"
                  />
                  <span>
                    <span className="block text-fg">{label}</span>
                    <span className="block text-[12.5px] text-fg-subtle">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-ink-600 pt-3">
              <button
                type="button"
                aria-pressed={legendOpen}
                onClick={() => setLegendOpen((v) => !v)}
                className="rounded border border-ink-500 px-2 py-1 text-[12.5px] text-fg-muted hover:text-fg"
              >
                {legendOpen ? 'Hide the diagram key' : 'Show the diagram key'}
              </button>
              <button
                type="button"
                aria-pressed={treeOpen}
                onClick={() => setTreeOpen((v) => !v)}
                className="rounded border border-ink-500 px-2 py-1 text-[12.5px] text-fg-muted hover:text-fg"
              >
                {treeOpen ? 'Hide the component list' : 'Browse all components'}
              </button>
              {!overview && mode !== 'internal' && (
                <>
                  <button
                    type="button"
                    onClick={() => setCollapsed(new Set(subsystemIds))}
                    className="rounded border border-ink-500 px-2 py-1 text-[12.5px] text-fg-muted hover:text-fg"
                  >
                    Collapse subsystems
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollapsed(new Set())}
                    className="rounded border border-ink-500 px-2 py-1 text-[12.5px] text-fg-muted hover:text-fg"
                  >
                    Expand all
                  </button>
                </>
              )}
            </div>
            <p className="border-t border-ink-600 pt-3 text-[12.5px] text-fg-subtle">
              Keyboard: Tab into the diagram, arrow keys move between parts, Enter selects, Escape
              goes to the containing part. With the diagram itself focused, arrows pan and + / − / 0
              zoom.
            </p>
          </div>
        </Popover>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col xl:flex-row">
        {treeOpen && state.viewer !== 'list' && (
          <aside
            aria-label="Component list"
            className="absolute inset-y-0 left-0 z-20 flex w-[min(280px,85vw)] flex-col border-r border-ink-700 bg-ink-950 xl:static xl:z-auto"
          >
            <PartsBrowser
              tree={tree}
              selectedId={selectedId}
              explored={progress.explored}
              filter={filter}
              onFilter={setFilter}
              onSelect={(id) => {
                navigate(id);
                if (!wide) setTreeOpen(false);
              }}
            />
          </aside>
        )}

        {mode === 'anatomy' && state.viewer !== 'list' && (
          <div className="border-b border-ink-700 px-3 py-2 sm:hidden">
            <MapToggle
              overview={overview}
              onToggle={() => setView(overview ? 'full' : 'overview')}
            />
          </div>
        )}
        <div
          ref={canvasAreaRef}
          className={cn(
            'surface-instrument relative min-w-0 bg-ink-950 xl:h-auto xl:flex-1',
            overview ? 'h-[46vh] min-h-[300px]' : 'h-[62vh] min-h-[380px]',
          )}
        >
          {mode === 'internal' ? (
            selectedId ? (
              <InternalView id={selectedId} onSelect={(id) => navigate(id)} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <div className="max-w-md">
                  <Microscope className="mx-auto text-rt-300" aria-hidden />
                  <p className="mt-3 font-serif text-xl text-fg">Choose a component to dissect</p>
                  <p className="mt-2 text-[14px] text-fg-muted">
                    Internal view opens one component at a time. Pick one from the list, or start
                    with one of these:
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {(
                      [
                        'heap',
                        'stack-frame',
                        'code-cache',
                        'class-loader-subsystem',
                        'jit-compiler',
                      ] as ComponentId[]
                    ).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => navigate(id)}
                        className="rounded border border-ink-500 px-2.5 py-1 text-[13px] text-fg-muted hover:border-rt-500/60 hover:text-rt-200"
                      >
                        {getComponentDoc(id).name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : state.viewer === '3d' ? (
            <Viewer3DBoundary
              fallback={() => (
                <Notice3D
                  title="The 3D model could not start"
                  onUse2D={() => state.setViewer('2d')}
                  action={
                    // A browser keeps a failed module download failed for the life of the
                    // page, so trying again reloads it; the URL keeps the 3D viewer chosen.
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="inline-flex h-9 items-center rounded-md border border-ink-500 px-3 text-[13.5px] text-fg hover:border-exec-400"
                    >
                      Try again
                    </button>
                  }
                >
                  It may not have downloaded (for example while offline before it was ever opened),
                  or this device could not create a 3D view.
                </Notice3D>
              )}
            >
              <Suspense fallback={<Loading3D />}>
                <Anatomy3D
                  selectedId={selectedId}
                  mode={mode}
                  overview={overview}
                  execution={execution}
                  follow={follow}
                  showEdges={layers.edges}
                  hiddenProvenance={hiddenProvenance}
                  reducedMotion={reducedMotion}
                  onSelect={on3DSelect}
                  onReassemble={() => state.setMode('anatomy')}
                  onShowList={() => setTreeOpen(true)}
                  onUse2D={() => state.setViewer('2d')}
                />
              </Suspense>
            </Viewer3DBoundary>
          ) : state.viewer === 'list' ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-ink-700 px-4 py-3">
                <p className="font-serif text-lg text-fg">Every part, as a list</p>
                <p className="mt-0.5 text-[13.5px] text-fg-muted">
                  The same {Object.keys(COMPONENTS).length} parts as the map and the 3D model,
                  nested the way they contain each other. Select one to read about it; arrow keys
                  move through the list.
                </p>
              </div>
              <PartsBrowser
                tree={tree}
                selectedId={selectedId}
                explored={progress.explored}
                filter={filter}
                onFilter={setFilter}
                onSelect={(id) => on3DSelect(id as ComponentId)}
              />
            </div>
          ) : (
            <AnatomyCanvas
              ref={canvasRef}
              bounds={scene.bounds}
              focus={cameraFocus}
              label={
                mode === 'exploded'
                  ? 'Exploded view of the Java Virtual Machine'
                  : 'Anatomy of the Java Virtual Machine'
              }
              defs={<DiagramDefs />}
              extraControls={
                selectedId ? (
                  <IconButton
                    label="Center selected part"
                    onClick={() => ensureVisible(selectedId, true)}
                  >
                    <Crosshair size={16} aria-hidden />
                  </IconButton>
                ) : null
              }
              onBackgroundClick={() => select(null)}
              onTransform={() => {
                if (hoverRect) setHoverRect(null);
              }}
              className="bg-ink-950"
            >
              {(lod) => (
                <AnatomyPlate
                  scene={scene}
                  mode={diagramMode}
                  lod={lod}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  execution={execution}
                  animate={!reducedMotion}
                  showEdges={layers.edges}
                  showPartNumbers={mode === 'exploded' && layers.parts}
                  regions={overview ? OVERVIEW_LABELS : undefined}
                  onSelect={onCanvasSelect}
                  onHover={onHover}
                  onActivate={(id) => ensureVisible(id, true)}
                  onFocusNode={(id) => ensureVisible(id)}
                />
              )}
            </AnatomyCanvas>
          )}

          {mode === 'anatomy' && state.viewer !== 'list' && (
            <div className="absolute top-3 left-3 z-10 hidden sm:block">
              <MapToggle
                overview={overview}
                onToggle={() => setView(overview ? 'full' : 'overview')}
              />
            </div>
          )}

          {/* The tour card floats over the map from 640 px; CSS picks the placement, so the
              prerendered page already has the right one and nothing moves on load. */}
          {tourStep !== null && mode !== 'internal' && state.viewer === '2d' && (
            <div className="hidden sm:block">
              <ExplorerTour step={tourStep} onStep={setTourStep} onClose={closeTour} />
            </div>
          )}

          {hoveredDoc && hoverRect && mode !== 'internal' && state.viewer === '2d' && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-10 w-[260px] rounded-md border border-ink-500 bg-ink-900 p-2.5 text-[12.5px] shadow-overlay"
              style={{
                left: Math.max(
                  8,
                  Math.min(hoverRect.x + hoverRect.w / 2 - 130, hoverRect.areaWidth - 268),
                ),
                top: hoverRect.y > 120 ? hoverRect.y - 8 : hoverRect.y + hoverRect.h + 8,
                transform: hoverRect.y > 120 ? 'translateY(-100%)' : undefined,
              }}
            >
              <p className="font-medium text-fg">{hoveredDoc.name}</p>
              <p className="mt-0.5 text-fg-muted">{hoveredDoc.summary}</p>
              <p className="mt-1 text-[11px] text-fg-subtle">
                Click to inspect · double-click to zoom
              </p>
            </div>
          )}

          {legendOpen && mode !== 'internal' && state.viewer !== 'list' && (
            <div className="absolute top-3 left-3 z-10 hidden md:block">
              <Legend onClose={() => setLegendOpen(false)} showStates={mode === 'execution'} />
            </div>
          )}

          {selectedId && mode !== 'internal' && state.viewer === '2d' && (
            <SelectionCrumb id={selectedId} onNavigate={navigate} />
          )}
        </div>

        {/* On small screens the tour sits under the map instead of covering it. */}
        {tourStep !== null && mode !== 'internal' && state.viewer === '2d' && (
          <div className="sm:hidden">
            <ExplorerTour
              step={tourStep}
              onStep={setTourStep}
              onClose={closeTour}
              placement="inline"
            />
          </div>
        )}

        <aside
          ref={inspectorRef}
          aria-label={mode === 'execution' ? 'Execution narrative' : 'Component inspector'}
          className={cn(
            'scroll-mt-16 border-t border-ink-700 bg-ink-950 transition-shadow xl:w-[440px] xl:shrink-0 xl:overflow-y-auto xl:border-t-0 xl:border-l',
            tourStep === 3 && 'shadow-[inset_0_0_0_2px_var(--color-exec-400)]',
          )}
        >
          {sidePanel}
        </aside>
      </div>
    </section>
  );
}

/** A filter and the nested list of every part: the side list and the list viewer. */
function PartsBrowser({
  tree,
  selectedId,
  explored,
  filter,
  onFilter,
  onSelect,
}: {
  tree: TreeItem[];
  selectedId: ComponentId | null;
  explored: Record<string, number>;
  filter: string;
  onFilter: (value: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <div className="border-b border-ink-700 p-2">
        <div className="flex items-center gap-2 rounded-md border border-ink-600 bg-ink-850 px-2">
          <Search size={14} aria-hidden className="text-fg-subtle" />
          <input
            type="search"
            aria-label="Filter components"
            name="component-filter"
            autoComplete="off"
            value={filter}
            onChange={(event) => onFilter(event.target.value)}
            placeholder="Filter components…"
            className="h-8 w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-subtle"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5">
        <ComponentTree
          roots={tree}
          selectedId={selectedId}
          explored={explored}
          filter={filter}
          onSelect={onSelect}
        />
      </div>
      <p className="border-t border-ink-700 px-3 py-2 text-[11.5px] text-fg-subtle">
        {Object.keys(explored).length} of {Object.keys(COMPONENTS).length} components explored
      </p>
    </>
  );
}

/** Switches between the six main parts and the full map. */
function MapToggle({ overview, onToggle }: { overview: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-ink-500 bg-ink-900 px-3.5 text-[13.5px] text-fg shadow-lg transition-colors hover:border-exec-400"
    >
      {overview ? (
        <>
          <MapIcon size={15} aria-hidden className="text-exec-300" />
          Show the full JVM map
          <span className="text-fg-subtle tabular">{Object.keys(COMPONENTS).length} parts</span>
        </>
      ) : (
        <>
          <Minimize2 size={15} aria-hidden className="text-exec-300" />
          Show the six main parts
        </>
      )}
    </button>
  );
}

/** The first walkthrough step in which a component takes part. */
function walkthroughFor(
  id: ComponentId,
  watch: (scenarioId: string, step: number) => void,
): { stepTitle: string; onWatch: () => void } | undefined {
  // Prefer the most focused step: the fewest parts taking part besides this one.
  let best: { scenarioId: string; index: number; title: string; size: number } | undefined;
  for (const scenario of SCENARIOS)
    scenario.steps.forEach((step, index) => {
      if (step.active.includes(id) && (!best || step.active.length < best.size))
        best = { scenarioId: scenario.id, index, title: step.title, size: step.active.length };
    });
  if (!best) return undefined;
  const { scenarioId, index, title } = best;
  return {
    stepTitle: title.replace(/`/g, ''),
    onWatch: () => watch(scenarioId, index),
  };
}

function ToolbarButton({
  children,
  icon,
  pressed,
  onClick,
  buttonRef,
  haspopup,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  pressed?: boolean;
  onClick: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  haspopup?: boolean;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-pressed={haspopup ? undefined : pressed}
      aria-expanded={haspopup ? pressed : undefined}
      aria-haspopup={haspopup ? 'dialog' : undefined}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors',
        pressed
          ? 'border-exec-500/50 bg-exec-900/50 text-exec-200'
          : 'border-ink-600 bg-ink-850 text-fg-muted hover:text-fg',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
      <span className="sr-only sm:hidden">{children}</span>
    </button>
  );
}

function SelectionCrumb({ id, onNavigate }: { id: ComponentId; onNavigate: (id: string) => void }) {
  const chain = ancestry(id);
  return (
    <nav
      aria-label="Selected component path"
      className="absolute top-3 right-3 z-10 hidden max-w-[50%] rounded-md border border-ink-600 bg-ink-900 px-2.5 py-1.5 text-[12px] lg:block"
    >
      <ol className="flex flex-wrap items-center gap-1 text-fg-subtle">
        {chain.map((doc, index) => (
          <li key={doc.id} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden>›</span>}
            {index === chain.length - 1 ? (
              <span className="text-fg">{doc.name}</span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(doc.id)}
                className="hover:text-exec-200"
              >
                {doc.name}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function WelcomePanel({
  mode,
  overview,
  onSelect,
  onFullMap,
  onTour,
}: {
  mode: ExplorerMode;
  overview: boolean;
  onSelect: (id: string) => void;
  onFullMap: () => void;
  onTour: () => void;
}) {
  if (overview) {
    return (
      <div className="px-5 py-6">
        <h2 className="font-serif text-[26px] leading-tight text-fg">The six main parts</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
          This is the Java Virtual Machine, the software machine that runs Java programs. Select a
          part to see what is inside it and how it works.
        </p>
        <ul className="mt-4 space-y-1.5">
          {JVM_REGIONS.map((region) => (
            <li key={region.id}>
              <button
                type="button"
                onClick={() => onSelect(region.id)}
                className="w-full rounded-lg border border-ink-600 bg-ink-850 px-3.5 py-2.5 text-left transition-colors hover:border-exec-400"
              >
                <span className="block text-[15px] font-medium text-fg">{region.title}</span>
                <span className="block text-[13.5px] text-fg-muted">{region.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onFullMap}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink-500 px-3 text-[13.5px] text-fg hover:border-ink-400"
          >
            Show the full JVM map
          </button>
          <button
            type="button"
            onClick={onTour}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink-500 px-3 text-[13.5px] text-fg hover:border-ink-400"
          >
            Take the guided tour
          </button>
        </div>
        <p className="mt-5 text-[14px] text-fg-muted">
          New to Java?{' '}
          <Link
            to="/start"
            className="text-exec-300 underline underline-offset-2 hover:text-exec-200"
          >
            Start with the first lesson
          </Link>
          : it explains each of these parts with one small program.
        </p>
      </div>
    );
  }

  const starts: ComponentId[] = [
    'class-loader-subsystem',
    'heap',
    'jvm-stack',
    'interpreter',
    'jit-compiler',
    'garbage-collector',
    'jni',
  ];
  return (
    <div className="px-5 py-6">
      <h2 className="font-serif text-[26px] leading-tight text-fg">
        {mode === 'exploded' ? 'Every part, pulled apart' : 'Every box is a real part of the JVM'}
      </h2>
      <div className="prose-ij mt-3 text-[14.5px]">
        <p>
          Select any part to open its explanation. Connected parts stay lit; everything else fades.
        </p>
        <p>
          {mode === 'exploded'
            ? 'In this view the subsystems are pulled apart and every part is numbered, as on an engineering drawing.'
            : 'Solid outlines are defined by the JVM Specification. Dashed outlines tagged HS are HotSpot (JDK 25) implementation details. Dotted outlines are outside the JVM.'}
        </p>
      </div>
      {mode === 'exploded' && <PartsList onSelect={onSelect} />}
      <p className="mt-6 text-[13.5px] font-medium text-fg-muted">Good places to start</p>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {starts.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelect(id)}
              className="w-full rounded-md border border-ink-600 bg-ink-850 px-3 py-2 text-left text-[13px] text-fg-muted hover:border-rt-500/60 hover:text-fg"
            >
              {getComponentDoc(id).name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Parts list for the exploded view, as on an engineering drawing. */
function PartsList({ onSelect }: { onSelect: (id: string) => void }) {
  const groups: { title: string; root: ComponentId }[] = [
    { title: 'Build time', root: 'build-time' },
    { title: 'Java process', root: 'java-process' },
    { title: 'Platform', root: 'platform' },
  ];
  const flatten = (id: ComponentId): ComponentId[] => [
    id,
    ...childrenOf(id).flatMap((child) => flatten(child.id)),
  ];
  return (
    <div className="mt-6">
      <p className="text-[13.5px] font-medium text-fg-muted">Parts list</p>
      {groups.map((group) => (
        <div key={group.root} className="mt-3">
          <p className="text-[12px] text-fg-subtle">{group.title}</p>
          <ol className="mt-1 grid grid-cols-1 gap-x-3 text-[13px] sm:grid-cols-2">
            {flatten(group.root).map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSelect(id)}
                  className="flex w-full items-baseline gap-2 rounded px-1 py-0.5 text-left text-fg-muted hover:bg-ink-800 hover:text-fg"
                >
                  <span className="w-6 shrink-0 text-right font-mono text-[11px] text-fg-subtle">
                    {PART_NUMBER.get(id)}
                  </span>
                  <span className="truncate">{getComponentDoc(id).name}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
