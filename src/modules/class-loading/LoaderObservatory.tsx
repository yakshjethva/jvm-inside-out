import { Box, Map as MapIcon } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LOADER_WORLD } from '@/content/labs/classLoading';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Loading3D, Notice3D, Viewer3DBoundary } from '@/modules/anatomy-3d/fallback/Fallback3D';
import { ExhibitFrame } from '@/modules/lesson/ExhibitFrame';
import { initialRuntime } from '@/simulators/classLoading';
import { LoaderInspector } from './LoaderInspector';
import { LoaderStructure } from './LoaderStructure';
import { loaderName } from './narration';
import { useClassLoadingState } from './useClassLoadingState';

// Three.js and the 3D observatory load only when a learner chooses the 3D model.
const LoaderObservatory3D = lazy(() => import('@/modules/lab-3d/LoaderObservatory3D'));

/** The JVM before any request: one object, so the 3D scene is not rebuilt on every render. */
const FRESH_RUNTIME = initialRuntime(LOADER_WORLD);

/**
 * The observatory: the loaders of one JVM as a 2D structure (default) or a 3D
 * model, sharing one selection and the runtime state the delegation
 * laboratory built. Selecting a loader opens its details.
 */
export function LoaderObservatory() {
  const state = useClassLoadingState();
  const reducedMotion = useReducedMotion();
  const runtime = state.results.at(-1)?.runtime ?? FRESH_RUNTIME;
  const toggle = (id: typeof state.loader) => state.select(state.loader === id ? null : id);

  return (
    <div className="space-y-5">
      <ExhibitFrame
        title="Loader observatory: one JVM’s class loaders"
        controls={
          <SegmentedControl
            label="Viewer"
            size="sm"
            value={state.viewer}
            onChange={state.setViewer}
            segments={[
              {
                value: '2d',
                label: (
                  <>
                    <MapIcon size={14} aria-hidden /> Structure
                  </>
                ),
              },
              {
                value: '3d',
                label: (
                  <>
                    <Box size={14} aria-hidden /> 3D model
                  </>
                ),
              },
            ]}
          />
        }
        caption={
          state.loader ? (
            <span className="text-fg-muted">
              Selected: {loaderName(state.loader)}. Its details are below the{' '}
              {state.viewer === '3d' ? 'model' : 'structure'}.
            </span>
          ) : (
            <span className="text-fg-muted">
              Five class loaders, each with its parent link, the sources it reads and the classes it
              holds. Select one to see what it is responsible for.
            </span>
          )
        }
        note="A teaching selection, not every loader of a real JVM. Positions show delegation, not memory; the classes shown are the ones this lab’s requests have loaded so far."
      >
        {state.viewer === '3d' ? (
          <div className="h-[min(72vh,620px)] min-h-[420px] overflow-hidden rounded-lg border border-ink-700">
            <Viewer3DBoundary
              fallback={() => (
                <Notice3D
                  title="The 3D model could not start"
                  onUse2D={() => state.setViewer('2d')}
                  use2DLabel="Use the 2D structure"
                >
                  It may not have downloaded (for example while offline before it was ever opened),
                  or this device could not create a 3D view. The structure shows the same loaders.
                </Notice3D>
              )}
            >
              <Suspense fallback={<Loading3D />}>
                <LoaderObservatory3D
                  runtime={runtime}
                  lastRequest={state.results.at(-1) ?? null}
                  selected={state.loader}
                  onSelect={(id) => state.select(id)}
                  reducedMotion={reducedMotion}
                  onUse2D={() => state.setViewer('2d')}
                />
              </Suspense>
            </Viewer3DBoundary>
          </div>
        ) : (
          <LoaderStructure runtime={runtime} selected={state.loader} onSelect={toggle} />
        )}
      </ExhibitFrame>
      {state.loader && (
        <LoaderInspector
          id={state.loader}
          runtime={runtime}
          onClose={() => state.select(null)}
          onSelect={(id) => state.select(id)}
        />
      )}
    </div>
  );
}
