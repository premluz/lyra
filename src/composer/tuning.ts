import { MUSIC } from '../config';
import { frequency } from '../score';

export const TUNING = { anchorMidi: 72, anchorHz: 528, ambientRoot: 48, referenceA: 440 } as const;
export type Tuning = 'standard' | '528';
export const isTuning = (value: unknown): value is Tuning => value === 'standard' || value === '528';
export function midiFor(index: number, tuning: Tuning) {
  return (tuning === '528' ? TUNING.ambientRoot : MUSIC.root) + Math.floor(index / MUSIC.intervals.length) * 12 + MUSIC.intervals[index % MUSIC.intervals.length];
}
export function referenceHz(tuning: Tuning) {
  return tuning === '528' ? TUNING.anchorHz / frequency(TUNING.anchorMidi) * TUNING.referenceA : TUNING.referenceA;
}
export function tunedFrequency(index: number, tuning: Tuning) { return frequency(midiFor(index, tuning)) * referenceHz(tuning) / TUNING.referenceA; }
