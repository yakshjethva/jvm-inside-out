import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type MutableRefObject } from 'react';
import { MathUtils, Spherical, Vector3, type PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Vec3 } from '../data/layout3d';

/** Camera actions for the HTML buttons and keyboard shortcuts. */
export interface CameraApi {
  rotate: (azimuth: number, polar: number) => void;
  zoom: (factor: number) => void;
  reset: () => void;
  frame: (center: Vec3, radius: number) => void;
}

const HOME_TARGET = new Vector3(0, 0.2, 0.4);
const HOME = new Spherical(25, 0.95, -0.55);
const MIN_DISTANCE = 3;
const MAX_DISTANCE = 42;
const MIN_POLAR = 0.12;
const MAX_POLAR = 1.45;

interface Tween {
  fromTarget: Vector3;
  toTarget: Vector3;
  fromPosition: Vector3;
  toPosition: Vector3;
  start: number;
  duration: number;
}

/**
 * Orbit, zoom and pan with the pointer or touch (three's OrbitControls),
 * smooth camera moves to framed parts, and the same moves for buttons and
 * keys. With reduced motion every move is immediate and there is no inertia.
 */
export function CameraRig({
  apiRef,
  pendingRef,
  reducedMotion,
}: {
  apiRef: MutableRefObject<CameraApi | null>;
  /** A framing requested before the camera existed; applied once it does. */
  pendingRef: MutableRefObject<{ center: Vec3; radius: number } | null>;
  reducedMotion: boolean;
}) {
  const get = useThree((state) => state.get);
  const controlsRef = useRef<OrbitControls | null>(null);
  const tween = useRef<Tween | null>(null);

  // The controls are an external system: created, wired and disposed here.
  useEffect(() => {
    const { camera, gl, invalidate } = get();
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.minDistance = MIN_DISTANCE;
    orbit.maxDistance = MAX_DISTANCE;
    orbit.minPolarAngle = MIN_POLAR;
    orbit.maxPolarAngle = MAX_POLAR;
    orbit.screenSpacePanning = true;
    orbit.target.copy(HOME_TARGET);
    camera.position.copy(HOME_TARGET).add(new Vector3().setFromSpherical(HOME));
    orbit.update();
    const onChange = () => invalidate();
    // A drag or zoom by the learner takes over from any automatic camera move.
    const onStart = () => {
      tween.current = null;
    };
    orbit.addEventListener('change', onChange);
    orbit.addEventListener('start', onStart);
    controlsRef.current = orbit;
    invalidate();
    return () => {
      orbit.removeEventListener('change', onChange);
      orbit.removeEventListener('start', onStart);
      orbit.dispose();
      controlsRef.current = null;
    };
  }, [get]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.enableDamping = !reducedMotion;
    controls.dampingFactor = 0.12;
    // Reduced motion switched on mid-move: finish the move at once.
    const move = tween.current;
    if (reducedMotion && move) {
      tween.current = null;
      controls.target.copy(move.toTarget);
      get().camera.position.copy(move.toPosition);
      controls.update();
      get().invalidate();
    }
  }, [reducedMotion, get]);

  useEffect(() => {
    const { camera: base, invalidate } = get();
    const camera = base as PerspectiveCamera;
    const controls = () => controlsRef.current!;
    const moveTo = (toTarget: Vector3, toPosition: Vector3) => {
      if (!controlsRef.current) return;
      if (reducedMotion) {
        controls().target.copy(toTarget);
        camera.position.copy(toPosition);
        controls().update();
        invalidate();
        return;
      }
      tween.current = {
        fromTarget: controls().target.clone(),
        toTarget,
        fromPosition: camera.position.clone(),
        toPosition,
        start: performance.now(),
        duration: 650,
      };
      invalidate();
    };
    const offset = () => camera.position.clone().sub(controls().target);

    const api: CameraApi = {
      rotate(azimuth, polar) {
        const spherical = new Spherical().setFromVector3(offset());
        spherical.theta += azimuth;
        spherical.phi = MathUtils.clamp(spherical.phi + polar, MIN_POLAR, MAX_POLAR);
        const target = controls().target.clone();
        moveTo(target, target.clone().add(new Vector3().setFromSpherical(spherical)));
      },
      zoom(factor) {
        const current = offset();
        const distance = MathUtils.clamp(current.length() * factor, MIN_DISTANCE, MAX_DISTANCE);
        const target = controls().target.clone();
        moveTo(target, target.clone().add(current.setLength(distance)));
      },
      reset() {
        moveTo(HOME_TARGET.clone(), HOME_TARGET.clone().add(new Vector3().setFromSpherical(HOME)));
      },
      frame(center, radius) {
        const target = new Vector3(...center);
        const fov = MathUtils.degToRad(camera.fov);
        const horizontal = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect);
        const fit = radius / Math.sin(Math.min(fov, horizontal) / 2);
        const distance = MathUtils.clamp(fit * 1.05, MIN_DISTANCE, MAX_DISTANCE);
        // Keep the current direction, but look from high enough to see the tops of the parts.
        const spherical = new Spherical().setFromVector3(offset());
        spherical.phi = MathUtils.clamp(spherical.phi, 0.45, 1.1);
        spherical.radius = distance;
        moveTo(target, target.clone().add(new Vector3().setFromSpherical(spherical)));
      },
    };
    apiRef.current = api;
    const pending = pendingRef.current;
    if (pending) {
      pendingRef.current = null;
      api.frame(pending.center, pending.radius);
    }
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, pendingRef, get, reducedMotion]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const move = tween.current;
    if (move) {
      const t = Math.min(1, (performance.now() - move.start) / move.duration);
      const eased = 1 - Math.pow(1 - t, 3);
      controls.target.lerpVectors(move.fromTarget, move.toTarget, eased);
      get().camera.position.lerpVectors(move.fromPosition, move.toPosition, eased);
      controls.update();
      if (t >= 1) tween.current = null;
      get().invalidate();
      return;
    }
    // Inertia after a drag: keep rendering while the controls are still moving.
    if (controls.enableDamping && controls.update()) get().invalidate();
  });

  return null;
}
