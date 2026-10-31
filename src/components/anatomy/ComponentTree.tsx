import { ChevronRight } from 'lucide-react';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import type { Provenance } from '@/types/content';

export interface TreeItem {
  id: string;
  name: string;
  provenance: Provenance;
  children: TreeItem[];
}

interface FlatItem {
  item: TreeItem;
  level: number;
  parentId?: string;
  setSize: number;
  posInSet: number;
}

/**
 * Accessible tree (WAI-ARIA tree pattern) mirroring the diagram's hierarchy:
 * the keyboard and screen-reader route to every component.
 */
export function ComponentTree({
  roots,
  selectedId,
  onSelect,
  explored,
  filter,
}: {
  roots: TreeItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  explored: Record<string, number>;
  filter: string;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(['build-time', 'platform', 'collectors']),
  );
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLLIElement>());
  const query = filter.trim().toLowerCase();

  const flat = useMemo(() => {
    const out: FlatItem[] = [];
    const matches = (item: TreeItem): boolean =>
      item.name.toLowerCase().includes(query) || item.children.some(matches);
    const walk = (items: TreeItem[], level: number, parentId?: string) => {
      const visible = query ? items.filter(matches) : items;
      visible.forEach((item, index) => {
        out.push({ item, level, parentId, setSize: visible.length, posInSet: index + 1 });
        const open = query ? true : !collapsed.has(item.id);
        if (item.children.length && open) walk(item.children, level + 1, item.id);
      });
    };
    walk(roots, 1);
    return out;
  }, [roots, collapsed, query]);

  const parents = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (items: TreeItem[], parentId?: string) => {
      for (const item of items) {
        if (parentId) map.set(item.id, parentId);
        walk(item.children, item.id);
      }
    };
    walk(roots);
    return map;
  }, [roots]);
  const visible = useMemo(() => new Set(flat.map((f) => f.item.id)), [flat]);

  // One item always stays in the tab order: the focused item, else the selection or, when it
  // is hidden in a collapsed branch, its nearest visible ancestor, else the first item.
  let selectionAnchor = selectedId;
  while (selectionAnchor && !visible.has(selectionAnchor))
    selectionAnchor = parents.get(selectionAnchor) ?? null;
  const activeId =
    focusedId && visible.has(focusedId) ? focusedId : (selectionAnchor ?? flat[0]?.item.id);

  const focus = (id: string | undefined) => {
    if (!id) return;
    setFocusedId(id);
    refs.current.get(id)?.focus();
  };

  const toggle = (id: string, open?: boolean) =>
    setCollapsed((previous) => {
      const next = new Set(previous);
      const isOpen = !next.has(id);
      if (open ?? !isOpen) next.delete(id);
      else next.add(id);
      return next;
    });

  const onKeyDown = (event: KeyboardEvent, entry: FlatItem, index: number) => {
    const { item } = entry;
    const hasChildren = item.children.length > 0;
    const open = hasChildren && (query ? true : !collapsed.has(item.id));
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focus(flat[index + 1]?.item.id);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focus(flat[index - 1]?.item.id);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (hasChildren && !open) toggle(item.id, true);
        else if (hasChildren) focus(flat[index + 1]?.item.id);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (hasChildren && open) toggle(item.id, false);
        else focus(entry.parentId);
        break;
      case 'Home':
        event.preventDefault();
        focus(flat[0]?.item.id);
        break;
      case 'End':
        event.preventDefault();
        focus(flat[flat.length - 1]?.item.id);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect(item.id);
        break;
    }
  };

  if (flat.length === 0) {
    return <p className="px-3 py-4 text-[13px] text-fg-subtle">No component matches “{filter}”.</p>;
  }

  return (
    <ul role="tree" aria-label="JVM components" className="py-1 text-[13px]">
      {flat.map((entry, index) => {
        const { item, level } = entry;
        const hasChildren = item.children.length > 0;
        const open = hasChildren && (query ? true : !collapsed.has(item.id));
        const selected = item.id === selectedId;
        return (
          <li
            key={item.id}
            ref={(el) => {
              if (el) refs.current.set(item.id, el);
              else refs.current.delete(item.id);
            }}
            role="treeitem"
            aria-level={level}
            aria-setsize={entry.setSize}
            aria-posinset={entry.posInSet}
            aria-selected={selected}
            aria-expanded={hasChildren ? open : undefined}
            tabIndex={item.id === activeId ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, entry, index)}
            onFocus={() => setFocusedId(item.id)}
            onClick={() => onSelect(item.id)}
            className={cn(
              'group flex cursor-pointer items-center gap-1 rounded-[4px] py-[3px] pr-2 outline-none focus-visible:ring-2 focus-visible:ring-exec-400/70',
              selected ? 'bg-exec-900/70 text-fg' : 'text-fg-muted hover:bg-ink-750 hover:text-fg',
            )}
            style={{ paddingLeft: 4 + (level - 1) * 13 }}
          >
            {hasChildren ? (
              <span
                aria-hidden
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(item.id);
                }}
                className="inline-flex h-4 w-4 items-center justify-center rounded text-fg-subtle hover:text-fg"
              >
                <ChevronRight
                  size={12}
                  className={cn('transition-transform', open && 'rotate-90')}
                />
              </span>
            ) : (
              <span aria-hidden className="inline-block w-4" />
            )}
            <span
              aria-hidden
              className={cn(
                'mr-0.5 inline-block h-2 w-2 shrink-0 rounded-[2px] border',
                item.provenance === 'hotspot' && 'border-dashed border-exec-400',
                item.provenance === 'spec' && 'border-rt-400',
                item.provenance === 'platform' && 'border-dotted border-plat-400',
              )}
            />
            <span className="truncate">{item.name}</span>
            {explored[item.id] !== undefined && (
              <span className="ml-auto text-[11px] text-ok-400" title="Explored">
                ✓<span className="sr-only"> explored</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
