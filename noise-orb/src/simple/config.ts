import type { InstrumentId } from '../audio/instruments';
import { BASS_INSTRUMENTS } from '../audio/instruments';

export const SIMPLE = {
  storageKey: 'noise-orb:draw:v1', strokeWidth: 1000, strokeHeight: 600,
  minStroke: 0.04, pointSpacing: 0.003, densitySpan: 0.8, maxPoints: 2048,
  keyboardStep: 0.08, keyboardOrigin: { x: 0.15, y: 0.6 },
  alive: 0.16, decimals: 2, cadenceMax: 4,
} as const;
export const DRAW_LAYERS = [
  { id: 'undertow', name: 'Foundation', instruction: 'Scribble a foundation.', hint: 'A warm, low pulse. Let your line rise and fall.',
    instruments: BASS_INSTRUMENTS.map(({ id }) => id), counts: [6, 8, 10], low: 0, high: 4, level: 0.62, tone: 0.35, length: 0.25 },
  { id: 'melody', name: 'Tune', instruction: 'Now, scribble a tune.', hint: 'Your main melody. Higher strokes become higher notes.',
    instruments: ['pluck', 'felt', 'marimba'] satisfies InstrumentId[], counts: [12, 16, 18], low: 0, high: 9, level: 0.78, tone: 0.55, length: 0.48 },
  { id: 'air', name: 'Sparkle', instruction: 'Add a little sparkle.', hint: 'A few ringing notes above the tune. Make a smaller gesture.',
    instruments: ['glass', 'marimba', 'pluck'] satisfies InstrumentId[], counts: [4, 6, 8], low: 7, high: 13, level: 0.42, tone: 0.75, length: 0.8 },
] as const;
export type DrawLayer = typeof DRAW_LAYERS[number];
