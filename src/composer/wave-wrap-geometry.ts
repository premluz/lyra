import { COMPOSE } from './config';
import type { Lane } from './lanes';
import { waveY } from './waves';

export const WAVE_WRAP = {
  key: 'noise-orb:wrap-waves', size: 400, center: 200, radius: 136, depth: 0.5,
  innerFade: 36, innerDepth: 0.15, orbScale: 0.68, smoothSamples: 5, smoothWidth: 0.8,
  handleRadius: 3, editRadius: 154, editWidth: 76, turn: Math.PI * 2,
  fps: 24, pulseLife: 0.65, pulseWidth: 0.035, pulseDepth: 8,
} as const;
export interface WrappedPulse { phase: number; strength: number }

export function wrappedPoint(phase: number, radius: number) {
  const angle = phase * Math.PI * 2 - Math.PI / 2;
  return { x: WAVE_WRAP.center + Math.cos(angle) * radius, y: WAVE_WRAP.center + Math.sin(angle) * radius };
}
function height(lane: Lane, phase: number, time: number) {
  let total = 0;
  for (let i = 0; i < WAVE_WRAP.smoothSamples; i++) {
    const offset = (i / (WAVE_WRAP.smoothSamples - 1) - 0.5) * WAVE_WRAP.smoothWidth;
    const position = ((phase * lane.notes.length - 0.5 + offset) % lane.notes.length + lane.notes.length) % lane.notes.length;
    total += Math.max(0, COMPOSE.baseline - waveY(lane, position, time));
  }
  return total / WAVE_WRAP.smoothSamples;
}
export function wrappedRadius(lane: Lane, phase: number, time: number, pulses: readonly WrappedPulse[]) {
  const pulse = pulses.reduce((sum, note) => {
    const delta = Math.abs(phase - note.phase), distance = Math.min(delta, 1 - delta);
    return sum + note.strength * Math.exp(-((distance / WAVE_WRAP.pulseWidth) ** 2));
  }, 0);
  return WAVE_WRAP.radius + height(lane, phase, time) * WAVE_WRAP.depth + pulse * WAVE_WRAP.pulseDepth;
}
function coordinate(phase: number, radius: number) {
  const point = wrappedPoint(phase, radius); return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
}
export function wrappedPaths(lane: Lane, time: number, pulses: readonly WrappedPulse[]) {
  const points = Array.from({ length: COMPOSE.samples + 1 }, (_, sample) => {
    const phase = sample / COMPOSE.samples;
    return coordinate(phase, wrappedRadius(lane, phase, time, pulses));
  });
  const edge = points.map((position, index) => `${index ? 'L' : 'M'}${position}`).join(' ') + ' Z';
  const inner = Array.from({ length: COMPOSE.samples + 1 }, (_, sample) => {
    const phase = 1 - sample / COMPOSE.samples;
    return `${sample ? 'L' : 'M'}${coordinate(phase, WAVE_WRAP.radius - WAVE_WRAP.innerFade + height(lane, phase, time) * WAVE_WRAP.innerDepth)}`;
  }).join(' ') + ' Z';
  return { edge, area: `${edge} ${inner}` };
}
