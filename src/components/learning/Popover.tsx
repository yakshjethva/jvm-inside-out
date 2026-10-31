import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const MARGIN = 12;

interface Position {
  top: number;
  left: number;
  placement: 'below' | 'above';
}

function computePosition(anchor: DOMRect, panel: { width: number; height: number }): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceBelow = vh - anchor.bottom;
  const placement =
    spaceBelow >= panel.height + MARGIN || spaceBelow >= anchor.top ? 'below' : 'above';
  const top =
    placement === 'below'
      ? Math.min(anchor.bottom + 8, vh - panel.height - MARGIN)
      : Math.max(MARGIN, anchor.top - panel.height - 8);
  const left = Math.min(Math.max(MARGIN, anchor.left), Math.max(MARGIN, vw - panel.width - MARGIN));
  return { top: Math.max(MARGIN, top), left, placement };
}

/**
 * A non-modal dialog anchored to a trigger element. Escape, an outside click
 * or the close control dismiss it; focus moves in on open and back to the
 * trigger on close.
 */
export function Popover({
  anchor,
  open,
  onClose,
  labelledBy,
  children,
  width = 380,
}: {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  width?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const reposition = useCallback(() => {
    if (!anchor || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    setPosition(computePosition(anchor.getBoundingClientRect(), rect));
  }, [anchor]);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition, children]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        anchor?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel?.contains(target) || anchor?.contains(target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, onClose, anchor, reposition]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      style={{
        position: 'fixed',
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        width: `min(${width}px, calc(100vw - ${MARGIN * 2}px))`,
        // Never past the bottom of the screen: a tall panel scrolls inside itself.
        maxHeight: `calc(100dvh - ${(position?.top ?? MARGIN) + MARGIN}px)`,
      }}
      className="z-50 overflow-y-auto overscroll-contain rounded-lg border border-ink-500 bg-ink-850 shadow-overlay outline-none"
    >
      {children}
    </div>,
    document.body,
  );
}
