import { MUSIC } from '../../config';
import type { InstrumentId } from '../../audio/instruments';
import { HOOK } from '../hook-config';
import { RANDOMISE } from '../randomise-config';
import type { Range } from '../randomise-config';
import type { LaneRate } from '../pace';

export interface Arrangement {
  count: Range; bassCount: Range; answerCount: Range; leads: readonly InstrumentId[];
}
export const V2 = {
  storageKey: 'noise-orb:advanced-v2:v1',
  motifs: [...RANDOMISE.hooks, [0, 3, 7, 9, 3, 2], [0, 2, 7, 4, 3, 0], [0, 4, 7, 8, 4, 2]],
  rhythms: HOOK.rhythms, passing: [0, 2, 3, 4, 5, 7, 8, 9],
  arrangements: [
    { count: [6, 8], bassCount: [2, 3], answerCount: [3, 4], leads: ['pluck', 'pluck', 'felt'] },
    { count: [10, 12], bassCount: [4, 5], answerCount: [4, 6], leads: ['pluck', 'felt', 'marimba'] },
    { count: [8, 10], bassCount: [3, 4], answerCount: [3, 5], leads: ['pluck', 'pluck', 'marimba'] },
  ] satisfies readonly Arrangement[],
  consonances: [0, 3, 4, 5, 7, 8, 9], semitones: 12,
  cycleLoops: 2, minGap: 2,
  bassRegister: [0, 4], answerRegister: [7, 12],
  bassRates: [0.5, 1], answerRates: [0.5, 1, 2],
  bassInstruments: RANDOMISE.bassInstruments, answerInstruments: ['glass', 'felt', 'pluck', 'marimba'],
  leadLevel: [0.64, 0.76], bassLevel: [0.23, 0.32], answerLevel: [0.2, 0.32],
  leadTone: [0.3, 0.53], bassTone: [0.17, 0.33], answerTone: [0.48, 0.72],
  leadDecay: [MUSIC.decay * 0.85, MUSIC.decay * 1.15], bassDecay: [0.42, 0.65], answerDecay: [1.25, 1.7],
  neutralLift: 0.5, controlResolution: RANDOMISE.resolution,
} as const satisfies { bassRates: readonly LaneRate[]; answerRates: readonly LaneRate[]; answerInstruments: readonly InstrumentId[] } & Record<string, unknown>;
