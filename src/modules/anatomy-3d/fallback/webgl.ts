/** Whether this browser can create a WebGL context (checked once, on demand). */
let support: boolean | null = null;

export function hasWebGL(): boolean {
  if (support !== null) return support;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    support = context !== null;
    // Release the probe context straight away; browsers limit live contexts.
    (context as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    support = false;
  }
  return support;
}

export type Quality = 'full' | 'reduced';

/**
 * The starting detail level: reduced on devices that report few cores, little
 * memory or a data-saving preference. The learner can change it in the viewer.
 */
export function initialQuality(): Quality {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return 'reduced';
  if ((nav.deviceMemory ?? 8) <= 4) return 'reduced';
  if ((nav.hardwareConcurrency ?? 8) <= 4) return 'reduced';
  return 'full';
}
