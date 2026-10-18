import { MUSIC } from '../config';

export const COMPOSE = {
  steps: MUSIC.arpeggio.length * MUSIC.idleEvery, maxDensity: 36, storageKey: 'noise-orb:score:v1',
  width: 1000, height: 136, baseline: 94, pitchHeight: 4, plotPadding: 14,
  peak: 16, samples: 240, widthMin: 0.3, widthRange: 0.9, waveAmplitude: 0.12,
  pitchMin: 0, pitchMax: 15, liftSteps: 5, baseVelocity: 0.55,
  cutoffLow: 700, cutoffRange: 5000, decayMin: 0.35, decayRange: 1.45,
  knobTravel: 120, knobAngle: 270, knobResolution: 100, dragThreshold: 4, waveHitWidth: 20, noteHitRadius: 9,
  pulseLife: 0.22, svgNamespace: 'http://www.w3.org/2000/svg',
  maxLanes: 12, voiceOverlap: 4, balanceLanes: 3, referenceLayers: 5, nameLength: 40, idLength: 80,
  driftViewSeconds: 60, driftPaintFps: 12,
  minLanes: 1, phaseSpacing: 5, maxGate: MUSIC.arpeggio.length * MUSIC.idleEvery,
} as const;
export const LANE_DEFINITIONS = [
  { id: 'melody', label: 'Melody', description: 'The familiar little tune', offset: -6, base: 4, level: 0.6, tone: 0.5 },
  { id: 'undertow', label: 'Undertow', description: 'A warmer voice underneath', offset: 4, base: 2, level: 0.45, tone: 0.25 },
  { id: 'air', label: 'Air', description: 'A few bright notes above', offset: 12, base: 9, level: 0.35, tone: 0.8 },
] as const;
export const ROLES = [...LANE_DEFINITIONS,
  { id: 'drone', label: 'Drone', description: 'A continuous evolving pad', offset: 0, base: 5, level: 0.45, tone: 0.35 },
  { id: 'binaural', label: 'Binaural', description: 'Dry, separate sine tones for headphones', offset: 8, base: 0, level: 0.22, tone: 0.5 },
] as const;
export type LaneRole = typeof ROLES[number]['id'];
export type LaneId = string;
export function isRole(value: unknown): value is LaneRole { return ROLES.some((role) => role.id === value); }
export const KNOBS = [
  { key: 'level', label: 'Level', hint: 'How softly this voice plays' },
  { key: 'tone', label: 'Tone', hint: 'Warm and rounded to bright and airy' },
  { key: 'length', label: 'Length', hint: 'A small pluck to a lingering bloom' },
  { key: 'lift', label: 'Lift', hint: 'Move this voice through the pentatonic scale' },
] as const;
export type KnobKey = typeof KNOBS[number]['key'];
