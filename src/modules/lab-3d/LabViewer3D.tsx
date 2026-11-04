import { Canvas } from '@react-three/fiber';
import {
  Crosshair,
  Focus,
  Map as MapIcon,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Scan,
  Shrink,
} from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import {
  CONTEXT_LOST_ANNOUNCEMENT,
  explodeAnnouncement,
} from '@/modules/anatomy-3d/accessibility/announcements';
import {
  CameraRig,
  type CameraApi,
  type CameraHome,
} from '@/modules/anatomy-3d/controls/CameraRig';
import { Notice3D } from '@/modules/anatomy-3d/fallback/Fallback3D';
import { hasWebGL, initialQuality, type Quality } from '@/modules/anatomy-3d/fallback/webgl';
import { handleViewerKey } from '@/modules/anatomy-3d/interactions/viewerKeys';
import {
  MaterialLibrary,
  readPalette,
  type Palette,
  type PartLook,
} from '@/modules/anatomy-3d/models/materials';
import { Stage } from '@/modules/anatomy-3d/scene/Stage';
import { frameNodes, type LabNode, type LabScene, type Vec3 } from './data/labScene';
import { SceneLabelLayer, SceneLabelProjector, type SceneLabel } from './SceneLabels';
import { SceneLinks } from './SceneLinks';
import { SceneNodes, type NodePositions } from './SceneNodes';

export interface LabViewer3DProps {
  /** Accessible name of the model, e.g. "3D model of the class loaders". */
  label: string;
  /** How to use it with a pointer, keys and the HTML alternatives (read by screen readers). */
  help: string;
  build: (options: { explode: number; isolate: string | null }) => LabScene;
  selected: string | null;
  ownerName: (owner: string) => string;
  onSelect: (owner: string | null) => void;
  /** Adds states such as "active" to a node's look. */
  lookOf?: (node: LabNode, base: PartLook) => PartLook;
  labels: (scene: LabScene, selected: string | null, hovered: string | null) => SceneLabel[];
  travel?: { key: string; ids: string[] } | null;
  onHop?: (index: number) => void;
  home: CameraHome;
  reducedMotion: boolean;
  onUse2D: () => void;
  /** Name of the 2D alternative, e.g. "the 2D structure". */
  twoD: string;
  toolbar?: ReactNode;
  /** HTML shown over the top-left corner of the model (a legend, the selection's contents). */
  overlay?: ReactNode;
  /** Announcements from the page (tour steps, request hops). */
  announcement?: string;
}

/**
 * The shared shell of the laboratory 3D models: canvas, lights, camera,
 * keyboard, camera buttons, explode and isolate, announcements, and the
 * fallbacks when WebGL is missing or the graphics context is lost. Built on
 * the 3D anatomy's own camera rig, stage and materials, so every 3D view of
 * the atlas behaves and looks the same.
 */
export default function LabViewer3D(props: LabViewer3DProps) {
  const [supported] = useState(hasWebGL);
  if (!supported)
    return (
      <Notice3D
        title="This browser cannot show the 3D model"
        onUse2D={props.onUse2D}
        use2DLabel={`Use ${props.twoD}`}
      >
        The 3D model needs WebGL, which is turned off or not available here.{' '}
        {props.twoD.charAt(0).toUpperCase() + props.twoD.slice(1)} shows the same parts.
      </Notice3D>
    );
  return <Viewer {...props} />;
}

function Viewer({
  label,
  help,
  build,
  selected,
  ownerName,
  onSelect,
  lookOf,
  labels: labelsFor,
  travel = null,
  onHop,
  home,
  reducedMotion,
  onUse2D,
  twoD,
  toolbar,
  overlay,
  announcement: external,
}: LabViewer3DProps) {
  const helpId = useId();
  const [palette, setPalette] = useState<Palette | null>(null);
  const hostRef = useCallback((element: HTMLDivElement | null) => {
    if (element) setPalette((current) => current ?? readPalette(element));
  }, []);
  const [quality, setQuality] = useState<Quality>(initialQuality);
  const [generation, setGeneration] = useState(0);
  const [readyGeneration, setReadyGeneration] = useState(-1);
  const [lost, setLost] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [explode, setExplode] = useState(0);
  const [isolate, setIsolate] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // Announcements from the page take their turn in the same live region.
  const [seenExternal, setSeenExternal] = useState(external);
  if (external !== seenExternal) {
    setSeenExternal(external);
    if (external) setAnnouncement(external);
  }

  // Isolation belongs to one selection.
  const [seenSelection, setSeenSelection] = useState(selected);
  if (selected !== seenSelection) {
    setSeenSelection(selected);
    setIsolate(false);
    setAnnouncement(selected ? `${ownerName(selected)} selected.` : 'Nothing selected.');
  }

  const isolated = isolate && selected ? selected : null;
  const scene = useMemo(() => build({ explode, isolate: isolated }), [build, explode, isolated]);
  const scene0 = useMemo(() => build({ explode: 0, isolate: isolated }), [build, isolated]);
  const scene1 = useMemo(() => build({ explode: 1, isolate: isolated }), [build, isolated]);
  const baseAt = useMemo(() => {
    const from = new Map(scene0.nodes.map((n) => [n.id, n.base]));
    const to = new Map(scene1.nodes.map((n) => [n.id, n.base]));
    return (id: string, t: number): Vec3 => {
      const a = from.get(id) ?? [0, 0, 0];
      const b = to.get(id) ?? a;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    };
  }, [scene0, scene1]);

  // A hovered part that is no longer drawn cannot stay hovered.
  if (hovered && !scene.nodes.some((n) => n.owner === hovered)) setHovered(null);

  const positionsRef = useRef<NodePositions>(new Map());
  const movingRef = useRef(false);
  const cameraRef = useRef<CameraApi | null>(null);
  const pendingFrame = useRef<{ center: Vec3; radius: number } | null>(null);
  const labelElements = useRef(new Map<string, HTMLElement>());
  const pointerDown = useRef<{ x: number; y: number } | null>(null);

  const materials = useMemo(
    () => (palette ? new MaterialLibrary(palette, quality === 'reduced') : null),
    [palette, quality],
  );
  useEffect(() => () => materials?.dispose(), [materials]);

  const look = useCallback(
    (node: LabNode): PartLook => {
      const base: PartLook =
        node.owner && node.owner === selected
          ? 'selected'
          : node.owner && node.owner === hovered
            ? 'hovered'
            : 'default';
      return lookOf ? lookOf(node, base) : base;
    },
    [selected, hovered, lookOf],
  );

  const labels = useMemo(
    () => labelsFor(scene, selected, hovered),
    [labelsFor, scene, selected, hovered],
  );

  const frame = useCallback(
    (owner: string | null) => {
      const nodes = owner
        ? scene.nodes.filter((n) => n.owner === owner && n.role === 'part')
        : scene.nodes;
      const { center, radius } = frameNodes(nodes.length ? nodes : scene.nodes);
      if (cameraRef.current) cameraRef.current.frame(center, radius);
      else pendingFrame.current = { center, radius };
    },
    [scene],
  );

  // The camera frames the selection when it changes; nothing else moves it.
  useEffect(() => {
    if (selected) frame(selected);
    // Only when the selection changes, not when the layout does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const setExplodeTo = (value: number) => {
    setExplode(value);
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
          aria-label={label}
          aria-describedby={helpId}
          data-state={readyGeneration === generation ? 'ready' : 'starting'}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="absolute inset-0 outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--color-exec-400)]"
          onKeyDown={(event) => {
            const handled = handleViewerKey(event, cameraRef.current, {
              frameSelection: () => (selected ? frame(selected) : cameraRef.current?.reset()),
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
            <SceneNodes
              nodes={scene.nodes}
              baseAt={baseAt}
              explode={explode}
              positionsRef={positionsRef}
              movingRef={movingRef}
              materials={materials}
              lookOf={look}
              reducedMotion={reducedMotion}
              onHover={setHovered}
              onPick={(owner) => onSelect(owner === selected ? null : owner)}
            />
            <SceneLinks
              links={scene.links}
              palette={palette}
              materials={materials}
              movingRef={movingRef}
              travel={travel}
              reducedMotion={reducedMotion}
              onHop={onHop}
            />
            <SceneLabelProjector
              labels={labels}
              elements={labelElements}
              positionsRef={positionsRef}
            />
            <CameraRig
              apiRef={cameraRef}
              pendingRef={pendingFrame}
              reducedMotion={reducedMotion}
              home={home}
            />
          </Canvas>
        </div>
        <SceneLabelLayer labels={labels} elements={labelElements} />
        {overlay && (
          <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-[min(20rem,calc(100%-4.5rem))]">
            {overlay}
          </div>
        )}

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
          {selected && (
            <CameraButton label="Center the selection" onClick={() => frame(selected)}>
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
              use2DLabel={`Use ${twoD}`}
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
          <span>Spread the levels</span>
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
        {selected && (
          <ToolButton
            pressed={isolate}
            onClick={() => {
              setIsolate(!isolate);
              setAnnouncement(
                !isolate
                  ? `Showing only ${ownerName(selected)} and the parts it is connected to.`
                  : 'Showing everything again.',
              );
            }}
            icon={<Focus size={14} aria-hidden />}
          >
            Isolate {ownerName(selected)}
          </ToolButton>
        )}
        {toolbar}
        <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <ToolButton onClick={onUse2D} icon={<MapIcon size={14} aria-hidden />}>
            Use {twoD}
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
        {help}
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

export function ToolButton({
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
