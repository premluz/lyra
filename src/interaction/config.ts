import { clamp } from '../config';
import type { TouchPoint } from '../score';

export const INTERACTION = {
  aliveKey: 'noise-orb:alive', aliveDefault: 0.25, idleDepth: 0.28, idleSpeed: 0.35,
  waveNoiseFrequency: 0.35, waveNoiseSpeed: 0.12, waveNoiseDepth: 2.5,
  hoverDepth: 0.55, holdDepth: 0.95, speedDepth: 0.25, tapDepth: 0.55,
  width: 1.25, ease: 0.1, release: 0.65, tapDecay: 0.45, heat: 0.9,
  noteMin: 0.12, noteRange: 0.7, toneMin: 700, toneRange: 4200, humMax: 0.8,
  localFrequency: 2.8, localSpeed: 0.65, whitePower: 2,
} as const;

export function proximity(point: TouchPoint) { return clamp(point.proximity ?? 0); }
export function hoverVoice(point: TouchPoint, velocity: number) {
  const strength = proximity(point);
  return { strength, velocity: strength * (INTERACTION.noteMin + clamp(velocity) * INTERACTION.noteRange),
    cutoff: INTERACTION.toneMin + strength * INTERACTION.toneRange };
}
