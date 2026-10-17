import { VIEW } from '../config';
import { MUSIC_VISUAL } from '../composer/visual-config';
import type { InstrumentId } from '../audio/instruments';

export const AURA = {
  storageKey: 'noise-orb:aura:v1', previewSeed: 12097, seedMax: 4294967295,
  extraVoiceChance: 0.42, gatherAt: 0.7, openAt: 2.4, bloomAt: 5.4,
  hoverEase: 0.28, releaseEase: 1.8, speedRelease: 0.35, keyboardStep: 0.05,
  touchLane: 'aura-touch', chordEvery: 4, bloomEvery: 2, releaseNotes: [0, 2, 4],
  gestureInstruments: ['felt', 'marimba', 'pluck', 'glass'] satisfies InstrumentId[],
  gestureVelocity: 0.28, gestureDecay: 1.7, gestureCutoff: 1400, gestureCutoffRange: 3600,
  voiceLimit: 24, spectrumGain: 0.2, cutoffMovement: 0.9, cutoffCharge: 1.2,
  decayCharge: 0.65, pitchBloom: 2, layerFocus: 0.3, chargeSeconds: 3.4,
  pulses: 8, pulseLife: 2.8, morphEase: 2.2, cursorRadius: 22,
  titles: ['First light', 'Open water', 'Silver hour', 'Soft focus', 'After rain', 'Low tide', 'Still air', 'A little wonder'],
} as const;
export const AURA_PALETTES = [
  { low: VIEW.mint, mid: MUSIC_VISUAL.low, high: MUSIC_VISUAL.afterglow },
  { low: VIEW.warm, mid: MUSIC_VISUAL.mid, high: MUSIC_VISUAL.afterglow },
  { low: MUSIC_VISUAL.low, mid: VIEW.mint, high: MUSIC_VISUAL.afterglow },
] as const;
export const AURA_SHADER = {
  TAU: Math.PI * 2, RADIUS: 3.25, FOLD: 0.48, ROTATION: 0.035, DRIFT: 0.12,
  LATITUDE_FOLD: 4.4, ANGLE_FOLD: 0.6, LATITUDE_WAVE: 2.7, TORUS_HEIGHT: 0.82, TORUS_TWIST: 0.36,
  SHELL_HEIGHT: 2.55, RIBBON_HEIGHT: 1.8, RIBBON_WIDTH: 0.65, MUSIC_DEPTH: 0.45,
  POINTER_WIDTH: 5.2, POINTER_PULL: 0.12, CHARGE_PULL: 0.4, SWIRL: 0.48,
  BLOOM_SIZE: 0.65, PETALS: 5.0, PULSE_DEPTH: 0.34, PULSE_SPEED: 6.0,
  PULSE_WAVES: 7.0, PULSE_DECAY: 0.85, HEAT: 0.4, PULSE_HEAT: 0.22,
  SPEED_SWIRL: 0.35, HOVER_HEAT: 0.08, SPEED_HEAT: 0.1, PARALLAX: 0.14,
} as const;
export type AuraPhase = 'idle' | 'gather' | 'open' | 'bloom';
