import type { CameraApi } from '../controls/CameraRig';

const STEP = Math.PI / 12;

/**
 * Keyboard shortcuts while the 3D model has focus: arrows orbit, + and − zoom,
 * 0 or Home resets the view, F frames the selection, Escape clears it.
 * Keys with Ctrl, Cmd or Alt are left to the browser (zoom, Find, …).
 * Returns true when the key was handled.
 */
export function handleViewerKey(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>,
  camera: CameraApi | null,
  actions: { frameSelection: () => void; clearSelection: () => void },
): boolean {
  if (!camera || event.ctrlKey || event.metaKey || event.altKey) return false;
  switch (event.key) {
    case 'ArrowLeft':
      camera.rotate(-STEP, 0);
      return true;
    case 'ArrowRight':
      camera.rotate(STEP, 0);
      return true;
    case 'ArrowUp':
      camera.rotate(0, -STEP / 2);
      return true;
    case 'ArrowDown':
      camera.rotate(0, STEP / 2);
      return true;
    case '+':
    case '=':
      camera.zoom(0.8);
      return true;
    case '-':
    case '_':
      camera.zoom(1.25);
      return true;
    case '0':
    case 'Home':
      camera.reset();
      return true;
    case 'f':
    case 'F':
      actions.frameSelection();
      return true;
    case 'Escape':
      actions.clearSelection();
      return true;
    default:
      return false;
  }
}
