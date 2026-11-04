import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import {
  BoxGeometry,
  CylinderGeometry,
  EdgesGeometry,
  type BufferGeometry,
  type Group,
  type LineSegments,
} from 'three';
import type { MaterialLibrary, PartLook } from '@/modules/anatomy-3d/models/materials';
import type { LabNode, Vec3 } from './data/labScene';

/** Positions of the nodes as drawn this frame (read by labels and links). */
export type NodePositions = Map<string, { base: Vec3; size: Vec3 }>;

const shapeKey = (node: LabNode) => (node.shape === 'prism' ? `prism:${node.sides ?? 32}` : 'box');

/**
 * The laboratory scene's nodes: prisms and boxes with an outline in their
 * provenance line style (solid specification, dashed HotSpot, dotted
 * platform). Explosion is animated by moving the groups on rendered frames,
 * between the layout at 0 and at 1, never through React state.
 */
export function SceneNodes({
  nodes,
  baseAt,
  explode,
  positionsRef,
  movingRef,
  materials,
  lookOf,
  reducedMotion,
  onHover,
  onPick,
}: {
  nodes: LabNode[];
  /** A node's base at explode amount t (the layouts are linear in t). */
  baseAt: (id: string, t: number) => Vec3;
  explode: number;
  positionsRef: MutableRefObject<NodePositions>;
  movingRef: MutableRefObject<boolean>;
  materials: MaterialLibrary;
  lookOf: (node: LabNode) => PartLook;
  reducedMotion: boolean;
  onHover: (owner: string | null) => void;
  onPick: (owner: string) => void;
}) {
  const get = useThree((state) => state.get);
  const groups = useRef(new Map<string, Group>());
  const shown = useRef(explode);

  // One geometry per shape, shared by every node of that shape.
  const shapeKeys = [...new Set(nodes.map(shapeKey))].sort().join(' ');
  const shapes = useMemo(() => {
    const map = new Map<string, BufferGeometry>();
    for (const key of shapeKeys.split(' ').filter(Boolean))
      map.set(
        key,
        key === 'box'
          ? new BoxGeometry(1, 1, 1)
          : new CylinderGeometry(0.5, 0.5, 1, Number(key.slice('prism:'.length))),
      );
    return map;
  }, [shapeKeys]);
  useEffect(() => () => shapes.forEach((geometry) => geometry.dispose()), [shapes]);

  // Outlines at real size, so dashes and dots keep their length.
  const outlines = useMemo(() => {
    const map = new Map<string, EdgesGeometry>();
    for (const node of nodes) {
      const shape =
        node.shape === 'prism'
          ? new CylinderGeometry(node.size[0] / 2, node.size[0] / 2, node.size[1], node.sides ?? 32)
          : new BoxGeometry(...node.size);
      map.set(node.id, new EdgesGeometry(shape, 20));
      shape.dispose();
    }
    return map;
  }, [nodes]);
  useEffect(() => () => outlines.forEach((geometry) => geometry.dispose()), [outlines]);

  /** Moves every group to the layout at explode amount t, outside React. */
  const placeAll = (t: number) => {
    const positions: NodePositions = new Map();
    for (const node of nodes) {
      const base = baseAt(node.id, t);
      groups.current.get(node.id)?.position.set(...base);
      positions.set(node.id, { base, size: node.size });
    }
    positionsRef.current = positions;
  };

  // React draws the nodes where the explode animation is heading; until it
  // arrives, every rendered frame moves them to where it is now.
  useEffect(() => {
    placeAll(shown.current);
    get().invalidate();
  });

  useEffect(() => {
    get().gl.domElement.style.cursor = '';
  }, [nodes, get]);

  useFrame((_, delta) => {
    const target = explode;
    if (Math.abs(shown.current - target) < 0.001) {
      if (shown.current !== target || movingRef.current) {
        shown.current = target;
        movingRef.current = false;
        placeAll(target);
        get().invalidate();
      }
      return;
    }
    shown.current = reducedMotion
      ? target
      : shown.current + (target - shown.current) * Math.min(1, delta * 7);
    movingRef.current = true;
    placeAll(shown.current);
    get().invalidate();
  });

  const setCursor = (pointer: boolean) => {
    get().gl.domElement.style.cursor = pointer ? 'pointer' : '';
  };

  return (
    <group>
      {nodes.map((node) => {
        const look = lookOf(node);
        const pickable = node.owner !== '';
        return (
          <group
            key={node.id}
            ref={(group) => {
              if (group) groups.current.set(node.id, group);
              else groups.current.delete(node.id);
            }}
            position={baseAt(node.id, explode)}
          >
            <mesh
              name={node.id}
              geometry={shapes.get(shapeKey(node))}
              // Selection lights the outline; a fully lit surface would hide the part's own colour.
              material={materials.surface(
                node.family,
                look === 'selected' ? 'hovered' : look,
                node.role !== 'part',
              )}
              position={[0, node.size[1] / 2, 0]}
              scale={node.size}
              onPointerOver={
                pickable
                  ? (event: ThreeEvent<PointerEvent>) => {
                      event.stopPropagation();
                      setCursor(true);
                      onHover(node.owner);
                    }
                  : undefined
              }
              onPointerOut={
                pickable
                  ? () => {
                      setCursor(false);
                      onHover(null);
                    }
                  : undefined
              }
              onClick={
                pickable
                  ? (event: ThreeEvent<MouseEvent>) => {
                      event.stopPropagation();
                      onPick(node.owner);
                    }
                  : undefined
              }
            />
            <lineSegments
              geometry={outlines.get(node.id)}
              material={materials.edge(node.family, node.provenance, look)}
              position={[0, node.size[1] / 2, 0]}
              ref={(lines: LineSegments | null) => {
                lines?.computeLineDistances();
              }}
            />
          </group>
        );
      })}
    </group>
  );
}
