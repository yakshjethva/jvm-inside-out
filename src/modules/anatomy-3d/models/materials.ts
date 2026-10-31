import {
  Color,
  LineBasicMaterial,
  LineDashedMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  type Material,
} from 'three';
import type { Family } from '@/modules/jvm/scene';
import type { NodeState, Provenance } from '@/types/content';

/*
 * Colours come from the design tokens of the dark instrument surface, read
 * from the element that hosts the canvas, so the model and the HTML around it
 * always agree. Materials are shared by every part with the same look and are
 * disposed when the viewer unmounts.
 */

export type PartLook = 'default' | 'hovered' | 'selected' | 'dimmed' | NodeState;

export interface Palette {
  background: Color;
  ground: Color;
  grid: Color;
  gridStrong: Color;
  family: Record<Family, { base: Color; edge: Color; bright: Color }>;
  state: Record<NodeState, Color>;
  selection: Color;
  dim: Color;
}

const FAMILIES: Family[] = ['exec', 'rt', 'plat', 'warn'];

export function readPalette(host: Element): Palette {
  const style = getComputedStyle(host);
  const token = (name: string, fallback: string) =>
    new Color(style.getPropertyValue(`--color-${name}`).trim() || fallback);
  const ink700 = token('ink-700', '#1c2637');
  const familyColor = (family: Family) => {
    const tone = token(`${family}-500`, '#4f9bf5');
    return {
      // Graphite tinted by the family colour: restrained surfaces, coloured edges.
      base: ink700.clone().lerp(tone, 0.3),
      edge: token(`${family}-400`, '#78b6ff'),
      bright: token(family === 'plat' ? 'plat-400' : `${family}-300`, '#a9d2ff'),
    };
  };
  return {
    background: token('ink-950', '#05070c'),
    ground: token('ink-900', '#090d15'),
    grid: token('ink-700', '#1c2637'),
    gridStrong: token('ink-600', '#283447'),
    family: Object.fromEntries(FAMILIES.map((f) => [f, familyColor(f)])) as Palette['family'],
    state: {
      active: token('exec-400', '#78b6ff'),
      ok: token('ok-400', '#63dc9a'),
      warn: token('warn-400', '#ffae5c'),
    },
    selection: token('exec-200', '#cfe6ff'),
    dim: token('ink-750', '#161f2e'),
  };
}

export class MaterialLibrary {
  private cache = new Map<string, Material>();

  constructor(
    private palette: Palette,
    private reduced: boolean,
  ) {}

  /** Surface material for a part. */
  surface(family: Family, look: PartLook, leaf: boolean): Material {
    const key = `surface:${family}:${look}:${leaf}`;
    let material = this.cache.get(key);
    if (!material) {
      const { base, bright } = this.palette.family[family];
      const color =
        look === 'dimmed'
          ? this.palette.dim.clone()
          : base
              .clone()
              .lerp(bright, leaf ? 0.14 : 0)
              .multiplyScalar(leaf ? 1 : 0.7);
      const emissive =
        look === 'selected'
          ? this.palette.selection.clone().multiplyScalar(0.28)
          : look === 'hovered'
            ? bright.clone().multiplyScalar(0.16)
            : look === 'active' || look === 'ok' || look === 'warn'
              ? this.palette.state[look].clone().multiplyScalar(0.42)
              : new Color(0x000000);
      material = this.reduced
        ? new MeshLambertMaterial({ color, emissive })
        : new MeshStandardMaterial({
            color,
            emissive,
            metalness: 0.35,
            roughness: 0.52,
            envMapIntensity: 0.55,
          });
      this.cache.set(key, material);
    }
    return material;
  }

  /** Outline: solid for specification, dashed for HotSpot, dotted for platform. */
  edge(family: Family, provenance: Provenance, look: PartLook): Material {
    const key = `edge:${family}:${provenance}:${look}`;
    let material = this.cache.get(key);
    if (!material) {
      const color =
        look === 'selected'
          ? this.palette.selection
          : look === 'active' || look === 'ok' || look === 'warn'
            ? this.palette.state[look]
            : look === 'dimmed'
              ? this.palette.gridStrong
              : look === 'hovered'
                ? this.palette.family[family].bright
                : this.palette.family[family].edge;
      material =
        provenance === 'spec'
          ? new LineBasicMaterial({ color })
          : new LineDashedMaterial({
              color,
              dashSize: provenance === 'hotspot' ? 0.09 : 0.025,
              gapSize: provenance === 'hotspot' ? 0.06 : 0.05,
            });
      this.cache.set(key, material);
    }
    return material;
  }

  /** Lines and tokens for flows between parts. */
  line(color: Color, key: string): LineBasicMaterial {
    const cacheKey = `line:${key}`;
    let material = this.cache.get(cacheKey) as LineBasicMaterial | undefined;
    if (!material) {
      material = new LineBasicMaterial({ color });
      this.cache.set(cacheKey, material);
    }
    return material;
  }

  flat(color: Color, key: string): Material {
    const cacheKey = `flat:${key}`;
    let material = this.cache.get(cacheKey);
    if (!material) {
      material = new MeshLambertMaterial({ color, emissive: color.clone().multiplyScalar(0.5) });
      this.cache.set(cacheKey, material);
    }
    return material;
  }

  dispose() {
    for (const material of this.cache.values()) material.dispose();
    this.cache.clear();
  }
}
