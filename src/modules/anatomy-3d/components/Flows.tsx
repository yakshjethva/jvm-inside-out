import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import {
  ConeGeometry,
  QuadraticBezierCurve3,
  Quaternion,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Color,
  type Group,
  type Mesh,
} from 'three';
import type { ComponentId } from '@/content/jvm';
import { flowArc, type Box3 } from '../data/layout3d';
import type { MaterialLibrary } from '../models/materials';

export interface Flow3D {
  key: string;
  from: ComponentId;
  to: ComponentId;
  color: Color;
  colorKey: string;
}

interface Built {
  flow: Flow3D;
  curve: QuadraticBezierCurve3;
  tube: TubeGeometry;
  /** Where the arrowhead sits, and which way it points. */
  head: Vector3;
  turn: Quaternion;
}

const UP = new Vector3(0, 1, 0);

/**
 * Arcs between parts: a selected part's relationships, or the flows of the
 * current walkthrough step. When the step changes, a small token travels each
 * flow once (not with reduced motion), so the movement says what moved where.
 */
export function Flows({
  flows,
  layout,
  materials,
  movingRef,
  travelKey,
  reducedMotion,
}: {
  flows: Flow3D[];
  /** Positions at the explode amount being shown (flows hide while it changes). */
  layout: Record<ComponentId, Box3>;
  materials: MaterialLibrary;
  movingRef: MutableRefObject<boolean>;
  /** Changes when a new walkthrough step starts; null for relationships. */
  travelKey: string | null;
  reducedMotion: boolean;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const group = useRef<Group>(null);
  const tokens = useRef<(Mesh | null)[]>([]);
  const started = useRef(0);

  const cone = useMemo(() => new ConeGeometry(0.07, 0.2, 14), []);
  const sphere = useMemo(() => new SphereGeometry(0.075, 16, 12), []);
  useEffect(
    () => () => {
      cone.dispose();
      sphere.dispose();
    },
    [cone, sphere],
  );

  const built = useMemo<Built[]>(
    () =>
      flows
        .filter((flow) => layout[flow.from] && layout[flow.to] && flow.from !== flow.to)
        .map((flow) => {
          const { start, control, end } = flowArc(layout[flow.from], layout[flow.to]);
          const curve = new QuadraticBezierCurve3(
            new Vector3(...start),
            new Vector3(...control),
            new Vector3(...end),
          );
          const direction = curve.getTangent(1).normalize();
          const head = curve.getPoint(1).addScaledVector(direction, -0.08);
          // Cones point up (+y); turn each one to point along its flow.
          const turn = new Quaternion().setFromUnitVectors(UP, direction);
          return { flow, curve, tube: new TubeGeometry(curve, 48, 0.018, 6, false), head, turn };
        }),
    [flows, layout],
  );
  useEffect(() => () => built.forEach((item) => item.tube.dispose()), [built]);

  // Each new walkthrough step sends its tokens once.
  useEffect(() => {
    started.current = performance.now();
    invalidate();
  }, [travelKey, invalidate]);

  useFrame(() => {
    if (group.current) group.current.visible = !movingRef.current;
    if (travelKey === null || reducedMotion) {
      for (const token of tokens.current) if (token) token.visible = false;
      return;
    }
    const t = (performance.now() - started.current) / 1100;
    built.forEach((item, index) => {
      const token = tokens.current[index];
      if (!token) return;
      token.visible = t < 1;
      if (t < 1) token.position.copy(item.curve.getPoint(1 - Math.pow(1 - t, 2)));
    });
    if (t < 1) invalidate();
  });

  return (
    <group ref={group}>
      {built.map((item, index) => {
        const material = materials.flat(item.flow.color, item.flow.colorKey);
        return (
          <group key={item.flow.key}>
            <mesh geometry={item.tube} material={material} />
            <mesh geometry={cone} material={material} position={item.head} quaternion={item.turn} />
            <mesh
              ref={(mesh) => {
                tokens.current[index] = mesh;
              }}
              geometry={sphere}
              material={material}
              visible={false}
            />
          </group>
        );
      })}
    </group>
  );
}
