import { COMPONENTS, type ComponentId } from '@/content/jvm';

/*
 * What the 3D viewer says in its polite live region. Only changes a learner
 * made or needs to know about are announced; frames and hovers never are.
 */

export const selectionAnnouncement = (id: ComponentId | null) =>
  id ? `${COMPONENTS[id].name} selected.` : 'Nothing selected.';

export const isolationAnnouncement = (id: ComponentId, isolating: boolean) =>
  isolating
    ? `Showing only ${COMPONENTS[id].name}, what contains it and its parts.`
    : 'Showing every part again.';

export const explodeAnnouncement = (amount: number) =>
  amount === 0 ? 'Reassembled.' : `Exploded ${Math.round(amount * 100)} percent.`;

export const CONTEXT_LOST_ANNOUNCEMENT = 'The 3D view stopped: the graphics context was lost.';
