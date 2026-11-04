import type { Family } from '@/modules/jvm/scene';
import type { Provenance } from '@/types/content';

/*
 * The shared vocabulary of the laboratory 3D scenes: plain data, no Three.js.
 * Each laboratory turns its own state (loaders, memory areas) into nodes and
 * links with a pure function; one renderer draws them. Positions are a
 * teaching layout, never memory addresses or physical locations.
 */

export type Vec3 = [number, number, number];

export type NodeShape = 'prism' | 'box';

export interface LabNode {
  id: string;
  shape: NodeShape;
  /** Sides of a prism: 6 hexagonal, 8 octagonal, 32 round. */
  sides?: number;
  /** Centre of the base. */
  base: Vec3;
  /** Width (x), height (y), depth (z). A prism's width is its diameter. */
  size: Vec3;
  family: Family;
  provenance: Provenance;
  /** The selectable thing this node stands for (a part's own id, or its owner's). */
  owner: string;
  /** Large parts are labelled always; items only when their owner is selected. */
  role: 'part' | 'source' | 'item';
  label?: string;
}

export type LinkTone = 'parent' | 'flow' | 'ok' | 'miss' | 'reference';

export interface LabLink {
  id: string;
  from: Vec3;
  to: Vec3;
  tone: LinkTone;
  /** How high the arc rises above the higher end (0: a straight line). */
  lift: number;
}

export interface LabScene {
  nodes: LabNode[];
  links: LabLink[];
}

export const topOf = (node: LabNode): Vec3 => [
  node.base[0],
  node.base[1] + node.size[1],
  node.base[2],
];

/** Centre and radius of a sphere around the given nodes, for framing the camera. */
export function frameNodes(nodes: LabNode[]): { center: Vec3; radius: number } {
  if (nodes.length === 0) return { center: [0, 1, 0], radius: 6 };
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const node of nodes) {
    const lo: Vec3 = [
      node.base[0] - node.size[0] / 2,
      node.base[1],
      node.base[2] - node.size[2] / 2,
    ];
    const hi: Vec3 = [
      node.base[0] + node.size[0] / 2,
      node.base[1] + node.size[1],
      node.base[2] + node.size[2] / 2,
    ];
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis]!, lo[axis]!);
      max[axis] = Math.max(max[axis]!, hi[axis]!);
    }
  }
  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const radius = Math.max(0.8, Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2);
  return { center, radius };
}

/** The control point of a link's curve: halfway, raised by `lift`. */
export function linkControl(link: LabLink): Vec3 {
  return [
    (link.from[0] + link.to[0]) / 2,
    Math.max(link.from[1], link.to[1]) + link.lift,
    (link.from[2] + link.to[2]) / 2,
  ];
}

/** Whether a point lies inside a node's footprint (x and z), with a margin. */
export function insideFootprint(node: LabNode, point: Vec3, margin = 0): boolean {
  return (
    Math.abs(point[0] - node.base[0]) <= node.size[0] / 2 - margin &&
    Math.abs(point[2] - node.base[2]) <= node.size[2] / 2 - margin
  );
}
