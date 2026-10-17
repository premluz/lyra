import type { Project, SceneState } from './types';

export const BASE_SCENE: SceneState = {
  shape: 'lab', motion: 'lab', renderStyle: 'glow', position: [0, 0, 0],
  rotation: [12, -20, 0], scale: 1, cameraZ: 13, size: 1.5, opacity: 0.85,
  color: '#77e4c8', waveColor: '#a495ff',
  uniforms: { uIdleDriftAmount: 0.35, uPointerAmount: 0.5, uFreeFloatRatio: 0.02 },
};

export function createProject(): Project {
  return {
    version: 1, name: 'Untitled experience', particleCount: 16000, duration: 12, seed: 42, loop: true,
    keyframes: [
      { id: 'arrival', label: 'Arrival', at: 0, ease: 'sine.inOut', state: structuredClone(BASE_SCENE) },
      { id: 'unfold', label: 'Unfold', at: 0.5, ease: 'power2.inOut', state: {
        ...structuredClone(BASE_SCENE), shape: 'ribbon', motion: 'helix', rotation: [12, 32, -16], scale: 0.52,
        color: '#a495ff', uniforms: { ...BASE_SCENE.uniforms, uHelixWaveAmp: 0.18 },
      } },
      { id: 'resolve', label: 'Resolve', at: 1, ease: 'sine.inOut', state: {
        ...structuredClone(BASE_SCENE), shape: 'torus', motion: 'none', rotation: [32, 0, 0], scale: 0.85,
        color: '#f2c886', uniforms: { ...BASE_SCENE.uniforms, uFreeFloatRatio: 0.12 },
      } },
    ],
  };
}
