import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import {
  BufferGeometry,
  ConeGeometry,
  Line,
  LineDashedMaterial,
  QuadraticBezierCurve3,
  Quaternion,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Group,
  type Mesh,
} from 'three';
import type { MaterialLibrary, Palette } from '@/modules/anatomy-3d/models/materials';
import { linkControl, type LabLink, type LinkTone } from './data/labScene';

interface Built {
  link: LabLink;
  curve: QuadraticBezierCurve3;
  tube: TubeGeometry | null;
  dashed: Line | null;
  head: Vector3;
  turn: Quaternion;
}

const UP = new Vector3(0, 1, 0);
const RADIUS: Record<LinkTone, number> = {
  parent: 0.022,
  reference: 0.028,
  flow: 0.04,
  ok: 0.04,
  miss: 0,
};

/**
 * Links between nodes: thin parent links, references, and the hops of a
 * request (blue request, green answer, orange dashed "nothing found"). When
 * `travel` changes, a token runs along the listed links one after another,
 * so the direction of the request can be seen; with reduced motion there is
 * no token and the links alone carry the meaning.
 */
export function SceneLinks({
  links,
  palette,
  materials,
  movingRef,
  travel,
  reducedMotion,
  onHop,
}: {
  links: LabLink[];
  palette: Palette;
  materials: MaterialLibrary;
  movingRef: MutableRefObject<boolean>;
  /** Links the token visits in order; a new key starts a new journey. */
  travel: { key: string; ids: string[] } | null;
  reducedMotion: boolean;
  /** Called when the token reaches each link (index), and with -1 when it is done. */
  onHop?: (index: number) => void;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const group = useRef<Group>(null);
  const token = useRef<Mesh>(null);
  const started = useRef(0);
  const announced = useRef(-2);

  const colors = useMemo(
    () => ({
      parent: palette.family.rt.edge,
      reference: palette.family.rt.bright,
      flow: palette.state.active,
      ok: palette.state.ok,
      miss: palette.state.warn,
    }),
    [palette],
  );

  const cone = useMemo(() => new ConeGeometry(0.075, 0.2, 14), []);
  const sphere = useMemo(() => new SphereGeometry(0.11, 18, 14), []);
  const dashMaterial = useMemo(
    () => new LineDashedMaterial({ color: colors.miss, dashSize: 0.12, gapSize: 0.08 }),
    [colors],
  );
  useEffect(
    () => () => {
      cone.dispose();
      sphere.dispose();
      dashMaterial.dispose();
    },
    [cone, sphere, dashMaterial],
  );

  const built = useMemo<Built[]>(
    () =>
      links.map((link) => {
        const curve = new QuadraticBezierCurve3(
          new Vector3(...link.from),
          new Vector3(...linkControl(link)),
          new Vector3(...link.to),
        );
        const direction = curve.getTangent(1).normalize();
        const head = curve.getPoint(1).addScaledVector(direction, -0.09);
        const turn = new Quaternion().setFromUnitVectors(UP, direction);
        if (link.tone === 'miss') {
          const geometry = new BufferGeometry().setFromPoints(curve.getPoints(40));
          const dashed = new Line(geometry, dashMaterial);
          dashed.computeLineDistances();
          return { link, curve, tube: null, dashed, head, turn };
        }
        return {
          link,
          curve,
          tube: new TubeGeometry(curve, 40, RADIUS[link.tone], 6, false),
          dashed: null,
          head,
          turn,
        };
      }),
    [links, dashMaterial],
  );
  useEffect(
    () => () =>
      built.forEach((item) => {
        item.tube?.dispose();
        item.dashed?.geometry.dispose();
      }),
    [built],
  );

  useEffect(() => {
    started.current = performance.now();
    announced.current = -2;
    invalidate();
  }, [travel?.key, invalidate]);

  const HOP_MS = 900;
  useFrame(() => {
    if (group.current) group.current.visible = !movingRef.current;
    const mesh = token.current;
    if (!mesh) return;
    const route = travel
      ? travel.ids.map((id) => built.find((b) => b.link.id === id)).filter(Boolean)
      : [];
    if (!travel || route.length === 0 || reducedMotion) {
      mesh.visible = false;
      return;
    }
    const elapsed = (performance.now() - started.current) / HOP_MS;
    const index = Math.floor(elapsed);
    if (index >= route.length) {
      mesh.visible = false;
      if (announced.current !== -1) {
        announced.current = -1;
        onHop?.(-1);
      }
      return;
    }
    if (announced.current !== index) {
      announced.current = index;
      onHop?.(index);
    }
    const t = elapsed - index;
    mesh.visible = true;
    mesh.position.copy(route[index]!.curve.getPoint(1 - Math.pow(1 - t, 2)));
    invalidate();
  });

  return (
    <group ref={group}>
      {built.map((item) => {
        const material = materials.flat(colors[item.link.tone], `link:${item.link.tone}`);
        return (
          <group key={item.link.id}>
            {item.tube && <mesh geometry={item.tube} material={material} />}
            {item.dashed && <primitive object={item.dashed} />}
            <mesh geometry={cone} material={material} position={item.head} quaternion={item.turn} />
          </group>
        );
      })}
      <mesh
        ref={token}
        geometry={sphere}
        material={materials.flat(palette.selection, 'token')}
        visible={false}
      />
    </group>
  );
}
