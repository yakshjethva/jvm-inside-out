import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { GridHelper, PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Palette } from '../models/materials';

/**
 * Lighting, a neutral reflection environment (full detail only) and the
 * ground grid. Everything created here is released on unmount.
 */
export function Stage({ palette, reduced }: { palette: Palette; reduced: boolean }) {
  const get = useThree((state) => state.get);

  useEffect(() => {
    const { gl, scene, invalidate } = get();
    scene.background = palette.background;
    if (reduced) {
      scene.environment = null;
      invalidate();
      return;
    }
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = generator.fromScene(room, 0.04);
    scene.environment = target.texture;
    invalidate();
    return () => {
      scene.environment = null;
      target.dispose();
      generator.dispose();
      // Releases the room's geometries and materials.
      room.dispose();
    };
  }, [get, palette, reduced]);

  const grid = useMemo(() => {
    const helper = new GridHelper(28, 28, palette.gridStrong, palette.grid);
    helper.position.y = -0.005;
    return helper;
  }, [palette]);
  useEffect(
    () => () => {
      grid.geometry.dispose();
      (Array.isArray(grid.material) ? grid.material : [grid.material]).forEach((m) => m.dispose());
    },
    [grid],
  );

  return (
    <>
      <ambientLight intensity={reduced ? 0.7 : 0.3} />
      <hemisphereLight args={[0xdfe8ff, 0x0a0d14, reduced ? 0.55 : 0.35]} />
      <directionalLight position={[6, 12, 9]} intensity={reduced ? 1.15 : 1.5} />
      <directionalLight position={[-8, 6, -6]} intensity={0.3} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.012}>
        <planeGeometry args={[28, 28]} />
        <meshBasicMaterial color={palette.ground} />
      </mesh>
      <primitive object={grid} />
    </>
  );
}
