import type { LaneRole } from './config';
import { MUSIC } from '../config';
import { BASS_INSTRUMENTS, GONG_INSTRUMENTS } from '../audio/instruments';

export type Range = readonly [number, number];
export interface VoiceProfile { count: Range; pitch: Range; level: Range; tone: Range; length: Range; lift: Range }
export const RANDOMISE = {
  resolution: 100,
  melodicInstruments: ['pluck', 'felt', 'marimba', 'glass'],
  wavyInstruments: ['reed', 'strings', ...GONG_INSTRUMENTS.map(({ id }) => id)], wavyChance: 15,
  bassInstruments: BASS_INSTRUMENTS.map(({ id }) => id),
  wavyLength: [0.3, 0.45], wavyLevel: [0.16, 0.25], wavyCount: [2, 4],
  hooks: [MUSIC.arpeggio, [0, 4, 7, 9, 7, 4], [0, 2, 4, 7, 4, 2], [0, 4, 7, 4, 9, 7], [0, 4, 2, 7, 4, 2], [0, 2, 7, 9, 4, 2]],
  profiles: {
    melody: { count: [12, 16], pitch: [0, 10], level: [0.62, 0.82], tone: [0.28, 0.7], length: [0.16, 0.6], lift: [0.48, 0.52] },
    undertow: { count: [3, 5], pitch: [0, 5], level: [0.3, 0.5], tone: [0.15, 0.48], length: [0.12, 0.35], lift: [0.4, 0.6] },
    air: { count: [8, 12], pitch: [7, 13], level: [0.28, 0.44], tone: [0.5, 0.9], length: [0.3, 0.9], lift: [0.4, 0.6] },
    drone: { count: [0, 0], pitch: [0, 10], level: [0.2, 0.5], tone: [0.15, 0.55], length: [0.65, 1], lift: [0.5, 0.5] },
    binaural: { count: [0, 0], pitch: [0, 0], level: [0.12, 0.28], tone: [0.5, 0.5], length: [0.65, 1], lift: [0.5, 0.5] },
  } satisfies Record<LaneRole, VoiceProfile>,
} as const;
