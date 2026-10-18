import { COMPOSE } from './config';
import { COMPOSITION } from './composition-config';

export const MUSIC_VISUAL = {
  samples: 128, textureMax: 255, eventLimit: COMPOSE.maxLanes * COMPOSITION.voiceOverlap, energyGain: 32, attackEase: 0.045, releaseEase: 0.22,
  profileDepth: 0.24, pulseDepth: 1.15, noiseDepth: 0.22, bassDepth: 0.55, twistDepth: 0.16,
  ridgeMin: 2, ridgeRange: 7, ringSpeed: 4, bandWidth: 0.7, hashSeed: 2166136261, hashPrime: 16777619, hashMax: 4294967295,
  maxMorph: 1.6, restLight: 0.3, activeLight: 0.65, brightness: 1.4,
  low: '#6845dc', mid: '#ef439c', high: '#ff9a32', afterglow: '#ffe6bc',
  treatmentKey: 'noise-orb:music-render', treatments: ['glow', 'halftone'],
} as const;
export const MUSIC_SHADER = {
  RIDGE_MIX: 0.65, NOISE_FREQUENCY: 6, BASS_FREQUENCY: 3, PITCH_MIX: 0.7, LATITUDE_COLOUR: 0.15,
  SPECTRUM_COLOUR: 0.2, CREST_MIX: 0.5, VIEW_SCALE: 10, SIZE_MIN: 0.6, SIZE_MAX: 1.8,
  GLOW_INNER: 0.12, INK_EDGE: 0.42, HOT_MIX: 0.85, AFTERGLOW_POWER: 4, AFTERGLOW_MIX: 0.25,
} as const;
export type MusicTreatment = typeof MUSIC_VISUAL.treatments[number];
export function isMusicTreatment(value: unknown): value is MusicTreatment {
  return MUSIC_VISUAL.treatments.some((treatment) => treatment === value);
}
