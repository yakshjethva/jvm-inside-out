import { X } from 'lucide-react';
import { useState } from 'react';
import { AnatomyCanvas } from '@/components/anatomy/AnatomyCanvas';
import { DiagramDefs } from '@/components/diagrams/DiagramDefs';
import { AccuracyNote } from '@/components/learning/AccuracyNote';
import { RichText } from '@/components/learning/RichText';
import { getComponentDoc, type ComponentId } from '@/content/jvm';
import { FOCUS_BOUNDS, FocusDissection } from './FocusDissection';
import { dissectionFor } from './registry';

/**
 * Internal mode: a dissection of the selected component. Hand-drawn plates
 * exist for the major components; every other component gets a generated
 * focus view of its parts and connections.
 */
export function InternalView({
  id,
  onSelect,
}: {
  id: ComponentId;
  onSelect: (id: ComponentId) => void;
}) {
  const dissection = dissectionFor(id);
  const [activePart, setActivePart] = useState<string | null>(null);
  const [partFor, setPartFor] = useState(id);
  if (partFor !== id) {
    setPartFor(id);
    setActivePart(null);
  }
  const doc = getComponentDoc(id);
  const part = dissection?.parts.find((p) => p.id === activePart);

  const choosePart = (partId: string) => {
    setActivePart((current) => (current === partId ? null : partId));
    const target = dissection?.parts.find((p) => p.id === partId)?.componentId;
    if (target && target !== id) onSelect(target);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-1">
        <AnatomyCanvas
          key={id}
          bounds={dissection?.bounds ?? FOCUS_BOUNDS}
          label={`Internal view of ${doc.name}`}
          defs={<DiagramDefs />}
          onBackgroundClick={() => setActivePart(null)}
          className="blueprint"
        >
          {() =>
            dissection ? (
              <dissection.Plate activePart={activePart} onPart={choosePart} />
            ) : (
              <FocusDissection id={id} onSelect={onSelect} />
            )
          }
        </AnatomyCanvas>

        <div className="pointer-events-none absolute top-3 right-3 w-[min(380px,calc(100%-1.5rem))] space-y-2">
          <div className="pointer-events-auto rounded-md border border-ink-600 bg-ink-900 px-3 py-2">
            <p className="kicker">{dissection ? 'Dissection' : 'Focus view'}</p>
            <p className="font-serif text-[17px] leading-snug text-fg">
              {dissection?.title ?? doc.name}
            </p>
            {dissection && <p className="text-[12.5px] text-fg-subtle">{dissection.subtitle}</p>}
          </div>
          {part && (
            <div
              className="pointer-events-auto rounded-md border border-rt-500/50 bg-ink-900 p-3 shadow-overlay"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-fg">{part.label}</p>
                <button
                  type="button"
                  onClick={() => setActivePart(null)}
                  aria-label="Close part details"
                  className="rounded p-0.5 text-fg-subtle hover:text-fg"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
              <RichText className="prose-ij mt-1 text-[13px]" text={part.description} />
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-ink-700 bg-ink-950 p-2.5">
        <AccuracyNote
          compact
          text={
            dissection?.accuracyNote ??
            'Generated from the atlas data: the component, its parts (or internal structure), and its drawn connections. Positions are schematic. Hand-drawn dissections exist for the major components, such as the heap, a stack frame and the code cache.'
          }
          className="border-0 bg-transparent p-0"
        />
      </div>
    </div>
  );
}
