import type { InstrumentId } from './instruments';

export const SUSTAIN = {
  attack: { min: 4, max: 10, initial: 6 }, release: { min: 4, range: 6 },
  breath: { min: 30, max: 60, initial: 45 }, movement: 0.45,
  carrier: { min: 100, max: 400, initial: 200 }, beat: { min: 1, max: 12, initial: 6 },
  gain: 0.055, binauralGain: 0.04, filterDepth: 0.5, amplitudeDepth: 0.45,
  filterRate: 1.37, ease: 0.5, fadeOut: { min: 60, max: 120, initial: 90 },
  space: { min: 3, max: 15, initial: 12, wet: 0.7 },
} as const;
export interface SustainedLane {
  id: string; kind: 'drone' | 'binaural'; instrument: InstrumentId;
  frequency: number; level: number; cutoff: number; attack: number; release: number;
  breath: number; movement: number; carrier: number; beat: number;
}
export interface SustainedFrame {
  lanes: readonly SustainedLane[];
  legacyBed: boolean;
  spaceSeconds: number;
  wet: number;
}
