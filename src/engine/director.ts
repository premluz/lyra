import { gsap } from 'gsap';
import type { DirectorSample, Project, Vec3 } from './types';

export function clamp(value: number, min = 0, max = 1) { return Math.max(min, Math.min(max, value)); }
export function lerp(from: number, to: number, mix: number) { return from + (to - from) * mix; }
export function vectorMix(from: Vec3, to: Vec3, mix: number): Vec3 {
  return [lerp(from[0], to[0], mix), lerp(from[1], to[1], mix), lerp(from[2], to[2], mix)];
}

// Stateless sampling makes reverse scroll and random seeks identical to forward playback.
export function sampleDirector(project: Project, progress: number): DirectorSample {
  const frames = project.keyframes;
  if (frames.length === 0) throw new Error('Director requires at least one keyframe.');
  const at = clamp(progress);
  const index = frames.findIndex((frame) => frame.at > at);
  if (index === 0) return { from: frames[0], to: frames[0], mix: 0 };
  if (index < 0) return { from: frames[frames.length - 1], to: frames[frames.length - 1], mix: 0 };
  const from = frames[index - 1], to = frames[index];
  const span = to.at - from.at;
  const fraction = span > 0 ? clamp((at - from.at) / span) : 0;
  return { from, to, mix: gsap.parseEase(to.ease)(fraction) };
}
