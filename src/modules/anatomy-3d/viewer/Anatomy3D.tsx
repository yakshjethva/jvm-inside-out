import { Canvas } from '@react-three/fiber';
import {
  Crosshair,
  Focus,
  ListTree,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Scan,
  Shrink,
} from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { COMPONENTS, getComponentDoc, isAncestor, type ComponentId } from '@/content/jvm';
import { ATLAS_AREAS } from '@/content/jvm/regions';
import { relationshipsOf } from '@/content/jvm/relationships';
import { cn } from '@/lib/cn';
import type { ExecutionOverlay } from '@/modules/jvm/AnatomyPlate';
import type { Provenance, RelationshipKind } from '@/types/content';
import {
  CONTEXT_LOST_ANNOUNCEMENT,
  explodeAnnouncement,
  isolationAnnouncement,
  selectionAnnouncement,
} from '../accessibility/announcements';
import { Flows, type Flow3D } from '../components/Flows';
import { LabelLayer, LabelProjector, type Label3D } from '../components/Labels';
import { CameraRig, type CameraApi } from '../controls/CameraRig';
import {
  areaOf,
  frameBoxes,
  layoutBoxes,
  visibleIds,
  type Box3,
  type Vec3,
} from '../data/layout3d';
import { Notice3D } from '../fallback/Fallback3D';
import { hasWebGL, initialQuality, type Quality } from '../fallback/webgl';
import { handleViewerKey } from '../interactions/viewerKeys';
import { MaterialLibrary, readPalette, type Palette, type PartLook } from '../models/materials';
import { Parts } from '../models/Parts';
import { Stage } from '../scene/Stage';

export interface Anatomy3DProps {
  selectedId: ComponentId | null;
  mode: 'anatomy' | 'exploded' | 'execution';
  /** The seven-area overview: areas drawn closed except the one holding the selection. */
  overview: boolean;
  execution: ExecutionOverlay | null;
  /** In a walkthrough, the camera follows the parts of the current step. */
  follow: boolean;
  showEdges: boolean;
  hiddenProvenance: ReadonlySet<Provenance>;
  reducedMotion: boolean;
  onSelect: (id: ComponentId | null) => void;
  /** Leaves the exploded mode when the model is put back together. */
  onReassemble: () => void;
  onShowList: () => void;
  onUse2D: () => void;
}

const AREA_TITLES = new Map(ATLAS_AREAS.map((area) => [area.id, area.title]));

const hiddenByLayer = (id: ComponentId, hidden: ReadonlySet<Provenance>) => {
  let current: ComponentId | undefined = id;
  while (current) {
    if (hidden.has(COMPONENTS[current].provenance)) return true;
    current = COMPONENTS[current].parent;
  }
  return false;
};

export default function Anatomy3D(props: Anatomy3DProps) {
  // Checked once on the client: this module only ever loads in the browser.
  const [supported] = useState(hasWebGL);
  if (!supported)
    return (
      <Notice3D title="This browser cannot show the 3D model" onUse2D={props.onUse2D}>
        The 3D anatomy needs WebGL, which is turned off or not available here. The 2D map shows the
        same parts and connections.
      </Notice3D>
    );
  return <Viewer {...props} />;
}

function Viewer({
  selectedId,
  mode,
  overview,
  execution,
  follow,
  showEdges,
  hiddenProvenance,
  reducedMotion,
  onSelect,
  onReassemble,
  onShowList,
  onUse2D,
}: Anatomy3DProps) {
  const helpId = useId();
  const [palette, setPalette] = useState<Palette | null>(null);
  const hostRef = useCallback((element: HTMLDivElement | null) => {
    if (element) setPalette((current) => current ?? readPalette(element));
  }, []);
  const [quality, setQuality] = useState<Quality>(initialQuality);
  const [generation, setGeneration] = useState(0);
  /** The renderer of this generation exists and its listeners are attached. */
  const [readyGeneration, setReadyGeneration] = useState(-1);
  const [lost, setLost] = useState(false);
  const [hovered, setHovered] = useState<ComponentId | null>(null);
  const [isolate, setIsolate] = useState(false);
  const [compared, setCompared] = useState<ComponentId[]>([]);
  const [announcement, setAnnouncement] = useState('');

  // The explode amount follows the mode ("Show the parts" is fully exploded)
  // until the learner moves the slider.
  const [explode, setExplode] = useState(mode === 'exploded' ? 1 : 0);
  const [seenMode, setSeenMode] = useState(mode);
  if (mode !== seenMode) {
    setSeenMode(mode);
    if (mode === 'exploded') setExplode(1);
    else if (seenMode === 'exploded') setExplode(0);
  }
  // Isolation belongs to one selection.
  const [seenSelection, setSeenSelection] = useState(selectedId);
  if (selectedId !== seenSelection) {
    setSeenSelection(selectedId);
    setIsolate(false);
    setAnnouncement(selectionAnnouncement(selectedId));
  }

  const boxesRef = useRef<Record<ComponentId, Box3>>(layoutBoxes(explode));
  const movingRef = useRef(false);
  const cameraRef = useRef<CameraApi | null>(null);
  const pendingFrame = useRef<{ center: Vec3; radius: number } | null>(null);
  const labelElements = useRef(new Map<ComponentId, HTMLElement>());
  const pointerDown = useRef<{ x: number; y: number } | null>(null);

  const materials = useMemo(
    () => (palette ? new MaterialLibrary(palette, quality === 'reduced') : null),
    [palette, quality],
  );
  useEffect(() => () => materials?.dispose(), [materials]);

  const visible = useMemo(() => {
    const ids = visibleIds({ overview, selectedId, isolate: isolate && Boolean(selectedId) });
    for (const id of ids) if (hiddenByLayer(id, hiddenProvenance)) ids.delete(id);
    return ids;
  }, [overview, selectedId, isolate, hiddenProvenance]);

  const closed = useMemo(() => {
    const result = new Set<ComponentId>();
    for (const area of ATLAS_AREAS) {
      if (!visible.has(area.id)) continue;
      const inside = [...visible].some((id) => id !== area.id && areaOf(id) === area.id);
      if (!inside) result.add(area.id);
    }
    return result;
  }, [visible]);

  // A part that is no longer drawn cannot stay hovered.
  if (hovered && !visible.has(hovered)) setHovered(null);

  const lookOf = useCallback(
    (id: ComponentId): PartLook => {
      if (execution) {
        const state = execution.states[id] ?? (execution.active.has(id) ? 'active' : undefined);
        if (state) return state;
        for (const active of execution.active) if (isAncestor(id, active)) return 'default';
        return 'dimmed';
      }
      if (id === selectedId || compared.includes(id)) return 'selected';
      if (id === hovered) return 'hovered';
      return 'default';
    },
    [execution, selectedId, compared, hovered],
  );

  const labels = useMemo<Label3D[]>(() => {
    const list: Label3D[] = [];
    for (const area of ATLAS_AREAS)
      if (visible.has(area.id))
        list.push({
          id: area.id,
          text: area.title,
          kind: 'area',
          emphasis: area.id === selectedId,
        });
    const parts = new Set<ComponentId>();
    if (execution) for (const id of execution.active) parts.add(id);
    if (selectedId) parts.add(selectedId);
    for (const id of compared) parts.add(id);
    if (hovered) parts.add(hovered);
    for (const id of parts)
      if (visible.has(id) && !AREA_TITLES.has(id))
        list.push({ id, text: COMPONENTS[id].name, kind: 'part', emphasis: id === selectedId });
    return list;
  }, [visible, selectedId, compared, hovered, execution]);

  const target = useMemo(() => layoutBoxes(explode), [explode]);

  const flows = useMemo<Flow3D[]>(() => {
    if (!palette) return [];
    const colorFor = (kind: RelationshipKind | undefined) => {
      switch (kind) {
        case 'data':
        case 'delegation':
          return { color: palette.family.rt.edge, colorKey: 'rt' };
        case 'lifecycle':
          return { color: palette.state.ok, colorKey: 'ok' };
        case 'exception':
          return { color: palette.state.warn, colorKey: 'warn' };
        case 'native':
          return { color: palette.family.plat.edge, colorKey: 'plat' };
        default:
          return { color: palette.family.exec.edge, colorKey: 'exec' };
      }
    };
    if (execution)
      return execution.flows
        .filter((flow) => visible.has(flow.from) && visible.has(flow.to))
        .map((flow, index) => ({
          key: `${execution.key}:${index}`,
          from: flow.from,
          to: flow.to,
          ...colorFor(flow.kind),
        }));
    if (!selectedId || !showEdges) return [];
    const { outgoing, incoming } = relationshipsOf(selectedId);
    return [...outgoing, ...incoming]
      .filter((rel) => visible.has(rel.from) && visible.has(rel.to))
      .map((rel) => ({ key: rel.id, from: rel.from, to: rel.to, ...colorFor(rel.kind) }));
  }, [palette, execution, selectedId, showEdges, visible]);

  const frame = useCallback((ids: ComponentId[]) => {
    const boxes = ids.map((id) => boxesRef.current[id]).filter(Boolean);
    const { center, radius } = frameBoxes(boxes);
    if (cameraRef.current) cameraRef.current.frame(center, radius);
    else pendingFrame.current = { center, radius };
  }, []);

  // The camera frames the selection, or a walkthrough step's parts while following;
  // a part hidden by a layer is not framed (there would be nothing to see).
  const focusIds = useMemo(() => {
    const ids = execution ? (follow ? [...execution.active] : []) : selectedId ? [selectedId] : [];
    return ids.filter((id) => visible.has(id));
  }, [execution, follow, selectedId, visible]);
  const focusKey =
    (execution ? `${execution.key}:${follow}` : (selectedId ?? '')) + `:${focusIds.length}`;
  useEffect(() => {
    if (focusIds.length > 0) frame(focusIds);
    // Only when the subject changes, not on every list identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, frame]);

  const pick = (id: ComponentId, additive: boolean) => {
    if (additive) {
      setCompared((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
      return;
    }
    onSelect(id);
  };

  const setExplodeTo = (value: number) => {
    setExplode(value);
    if (value === 0 && mode === 'exploded') onReassemble();
  };

  if (!palette || !materials) return <div ref={hostRef} className="h-full w-full" aria-hidden />;

  return (
    <div ref={hostRef} className="flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-1">
        {/* A keyboard-operable widget: its keys are described by aria-describedby. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          role="group"
          aria-roledescription="3D model"
          aria-label="3D model of the Java Virtual Machine"
          aria-describedby={helpId}
          data-state={readyGeneration === generation ? 'ready' : 'starting'}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="absolute inset-0 outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--color-exec-400)]"
          onKeyDown={(event) => {
            const handled = handleViewerKey(event, cameraRef.current, {
              frameSelection: () => (selectedId ? frame([selectedId]) : cameraRef.current?.reset()),
              clearSelection: () => onSelect(null),
            });
            if (handled) event.preventDefault();
          }}
          onPointerDown={(event) => {
            pointerDown.current = { x: event.clientX, y: event.clientY };
          }}
        >
          <Canvas
            key={generation}
            frameloop="demand"
            dpr={quality === 'full' ? [1, 2] : 1}
            flat
            gl={{
              antialias: quality === 'full',
              powerPreference: quality === 'full' ? 'high-performance' : 'low-power',
            }}
            camera={{ fov: 32, near: 0.1, far: 120 }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener('webglcontextlost', (event) => {
                event.preventDefault();
                setLost(true);
                setAnnouncement(CONTEXT_LOST_ANNOUNCEMENT);
              });
              gl.domElement.addEventListener('webglcontextrestored', () => setLost(false));
              setReadyGeneration(generation);
            }}
            onPointerMissed={(event) => {
              const start = pointerDown.current;
              const still =
                !start || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 5;
              if (still && event.type === 'click') onSelect(null);
            }}
          >
            <Stage palette={palette} reduced={quality === 'reduced'} />
            <Parts
              boxesRef={boxesRef}
              movingRef={movingRef}
              explode={explode}
              visible={visible}
              closed={closed}
              lookOf={lookOf}
              materials={materials}
              reducedMotion={reducedMotion}
              onHover={setHovered}
              onPick={pick}
            />
            <Flows
              flows={flows}
              layout={target}
              materials={materials}
              movingRef={movingRef}
              travelKey={execution?.key ?? null}
              reducedMotion={reducedMotion}
            />
            <LabelProjector
              labels={labels}
              elements={labelElements}
              boxesRef={boxesRef}
              closed={closed}
            />
            <CameraRig apiRef={cameraRef} pendingRef={pendingFrame} reducedMotion={reducedMotion} />
          </Canvas>
        </div>
        <LabelLayer labels={labels} elements={labelElements} />

        <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1.5">
          <CameraButton
            label="Rotate left"
            onClick={() => cameraRef.current?.rotate(-Math.PI / 8, 0)}
          >
            <RotateCcw size={16} aria-hidden />
          </CameraButton>
          <CameraButton
            label="Rotate right"
            onClick={() => cameraRef.current?.rotate(Math.PI / 8, 0)}
          >
            <RotateCw size={16} aria-hidden />
          </CameraButton>
          <CameraButton label="Zoom in" onClick={() => cameraRef.current?.zoom(0.8)}>
            <Plus size={16} aria-hidden />
          </CameraButton>
          <CameraButton label="Zoom out" onClick={() => cameraRef.current?.zoom(1.25)}>
            <Minus size={16} aria-hidden />
          </CameraButton>
          {selectedId && (
            <CameraButton label="Center selected part" onClick={() => frame([selectedId])}>
              <Crosshair size={16} aria-hidden />
            </CameraButton>
          )}
          <CameraButton label="Reset the view" onClick={() => cameraRef.current?.reset()}>
            <Scan size={16} aria-hidden />
          </CameraButton>
        </div>

        {lost && (
          <div className="absolute inset-0 z-20 bg-ink-950">
            <Notice3D
              title="The 3D view stopped"
              onUse2D={onUse2D}
              action={
                <button
                  type="button"
                  onClick={() => {
                    setLost(false);
                    setGeneration((n) => n + 1);
                  }}
                  className="inline-flex h-9 items-center rounded-md border border-exec-500 bg-exec-500 px-3 text-[13.5px] text-ink-950 hover:bg-exec-400"
                >
                  Restart the 3D view
                </button>
              }
            >
              The browser took back the graphics resources, which can happen when a device is low on
              memory or a graphics driver resets.
            </Notice3D>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink-700 px-3 py-2 text-[13px]">
        <label className="flex items-center gap-2 text-fg-muted">
          <span>Explode</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(explode * 100)}
            onChange={(event) => setExplodeTo(Number(event.target.value) / 100)}
            onPointerUp={() => setAnnouncement(explodeAnnouncement(explode))}
            onKeyUp={() => setAnnouncement(explodeAnnouncement(explode))}
            aria-valuetext={`${Math.round(explode * 100)} percent apart`}
            className="h-6 w-28 accent-[var(--color-exec-500)] sm:w-36"
          />
        </label>
        <ToolButton
          disabled={explode === 0}
          onClick={() => {
            setExplodeTo(0);
            setAnnouncement(explodeAnnouncement(0));
          }}
          icon={<Shrink size={14} aria-hidden />}
        >
          Reassemble
        </ToolButton>
        {selectedId && (
          <ToolButton
            pressed={isolate}
            onClick={() => {
              setIsolate(!isolate);
              setAnnouncement(isolationAnnouncement(selectedId, !isolate));
            }}
            icon={<Focus size={14} aria-hidden />}
          >
            Isolate {getComponentDoc(selectedId).name}
          </ToolButton>
        )}
        {selectedId && (
          <ToolButton
            pressed={compared.includes(selectedId)}
            onClick={() => pick(selectedId, true)}
          >
            {compared.includes(selectedId) ? 'Remove from comparison' : 'Add to comparison'}
          </ToolButton>
        )}
        {compared.length > 0 && (
          <span className="flex flex-wrap items-center gap-1.5 text-fg-subtle">
            Comparing {compared.map((id) => COMPONENTS[id].name).join(', ')}
            <button
              type="button"
              onClick={() => setCompared([])}
              className="rounded px-1.5 py-0.5 text-exec-300 underline underline-offset-2 hover:text-exec-200"
            >
              Clear
            </button>
          </span>
        )}
        <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <ToolButton onClick={onShowList} icon={<ListTree size={14} aria-hidden />}>
            List of parts
          </ToolButton>
          <ToolButton
            pressed={quality === 'reduced'}
            onClick={() => setQuality((q) => (q === 'full' ? 'reduced' : 'full'))}
          >
            Reduce detail
          </ToolButton>
        </span>
      </div>

      <p id={helpId} className="sr-only">
        Drag to orbit, scroll or pinch to zoom, and drag with the right button or two fingers to
        pan. With the model focused, arrow keys orbit, plus and minus zoom, 0 resets the view, F
        frames the selection and Escape clears it. The list of parts selects any part without a
        pointer.
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function CameraButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink-600 bg-ink-850 text-fg-muted transition-colors hover:border-ink-500 hover:text-fg"
    >
      {children}
    </button>
  );
}

function ToolButton({
  pressed,
  disabled,
  onClick,
  icon,
  children,
}: {
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors disabled:opacity-45',
        pressed
          ? 'border-exec-500/70 bg-exec-900 text-exec-200'
          : 'border-ink-600 bg-ink-850 text-fg-muted hover:border-ink-500 hover:text-fg',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
