export const SHAPES = ['sphere', 'lab', 'helix', 'ribbon', 'ribbon-dispersed', 'ribbon-dispersed-pulse', 'terrain', 'grid', 'dots', 'triple-sphere', 'torus', 'dispersed', 'hero-helix', 'collapse', 'volatility', 'mobile', 'note', 'diamond', 'globe', 'game', 'chart', 'email', 'camera', 'footer'] as const;
export const MOTIONS = ['none', 'lab', 'terrain', 'ribbon-dispersed-pulse', 'volatility', 'helix', 'grid'] as const;
export const EASES = ['none', 'power2.inOut', 'sine.inOut', 'expo.inOut'] as const;
export type ShapeKey = typeof SHAPES[number];
export type MotionKey = typeof MOTIONS[number];
export type EaseKey = typeof EASES[number];
export type Vec3 = [number, number, number];
export type RenderStyle = 'glow' | 'halftone';
export interface SceneState {
  shape: ShapeKey;
  motion: MotionKey;
  renderStyle: RenderStyle;
  position: Vec3;
  rotation: Vec3;
  scale: number;
  cameraZ: number;
  size: number;
  opacity: number;
  color: string;
  waveColor: string;
  uniforms: Record<string, number>;
}
export interface Keyframe { id: string; label: string; at: number; ease: EaseKey; state: SceneState }
export interface Project {
  version: 1;
  name: string;
  particleCount: number;
  duration: number;
  seed: number;
  loop: boolean;
  keyframes: Keyframe[];
}
export interface ShapeData {
  positions: Float32Array;
  sizes?: Float32Array;
  phis?: Float32Array;
  ribbonProgress?: Float32Array;
}
export interface DirectorSample { from: Keyframe; to: Keyframe; mix: number }
