import { ArrowRight, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AnatomyCanvas } from '@/components/anatomy/AnatomyCanvas';
import { DiagramDefs } from '@/components/diagrams/DiagramDefs';
import { InlineRichText } from '@/components/learning/RichText';
import { Badge } from '@/components/ui/Badge';
import { getComponentDoc, type ComponentId } from '@/content/jvm';
import { relationshipsOf } from '@/content/jvm/relationships';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { AnatomyPlate } from './AnatomyPlate';
import { buildScene } from './scene';

const EMPTY = new Set<never>();

/**
 * The real anatomy plate, embedded on the home page. Page scrolling is kept:
 * the wheel only zooms with Ctrl/⌘. Selecting a part shows a summary card that
 * links into the full explorer.
 */
export function AnatomyPreview() {
  const scene = useMemo(
    () => buildScene({ mode: 'anatomy', collapsed: EMPTY, hiddenProvenance: EMPTY }),
    [],
  );
  const [selectedId, setSelectedId] = useState<ComponentId | null>(null);
  const [hoveredId, setHoveredId] = useState<ComponentId | null>(null);
  const reducedMotion = useReducedMotion();
  const doc = selectedId ? getComponentDoc(selectedId) : null;
  const connections = selectedId ? relationshipsOf(selectedId) : null;

  return (
    <div className="relative h-full w-full">
      <AnatomyCanvas
        bounds={scene.bounds}
        wheel="ctrl-zoom"
        label="Interactive preview of the JVM anatomy"
        description="Select any component to see what it is. Drag to pan; use the buttons, or Control or Command with the scroll wheel, to zoom."
        defs={<DiagramDefs />}
        onBackgroundClick={() => setSelectedId(null)}
      >
        {(lod) => (
          <AnatomyPlate
            scene={scene}
            mode="anatomy"
            lod={lod}
            selectedId={selectedId}
            hoveredId={hoveredId}
            execution={null}
            animate={!reducedMotion}
            showEdges
            showPartNumbers={false}
            onSelect={setSelectedId}
            onHover={setHoveredId}
            onActivate={setSelectedId}
            onFocusNode={() => {}}
          />
        )}
      </AnatomyCanvas>

      {doc && selectedId && (
        <div
          className="absolute top-3 left-3 w-[min(340px,calc(100%-1.5rem))] rounded-lg border border-ink-500 bg-ink-900 p-4 shadow-overlay"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-[20px] leading-tight text-fg">{doc.name}</h3>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close"
              className="rounded p-0.5 text-fg-subtle hover:text-fg"
            >
              <X size={15} aria-hidden />
            </button>
          </div>
          <div className="mt-1.5">
            <Badge
              tone={
                doc.provenance === 'hotspot'
                  ? 'exec'
                  : doc.provenance === 'platform'
                    ? 'plat'
                    : 'rt'
              }
              dashed={doc.provenance === 'hotspot'}
            >
              {doc.provenance === 'hotspot'
                ? 'HotSpot · JDK 25'
                : doc.provenance === 'platform'
                  ? 'Outside the JVM'
                  : 'JVM specification'}
            </Badge>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
            <InlineRichText text={doc.summary} />
          </p>
          {connections && connections.outgoing.length + connections.incoming.length > 0 && (
            <p className="mt-2 text-[12.5px] text-fg-subtle">
              {connections.outgoing.length + connections.incoming.length} connections to other
              components
            </p>
          )}
          <Link
            to={`/anatomy?c=${selectedId}`}
            className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-exec-300 hover:text-exec-200"
          >
            Open in the explorer <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
