import type { INoteSequence } from '@magenta/music/esm/protobuf';
import { MUSIC, clamp } from '../config';
import { SCALE, NotePolicy } from '../score';
import { COMPOSE } from '../composer/config';
import type { Lane } from '../composer/lanes';
import { MAGENTA } from './config';
import { soundingPitch } from '../composer/v2/harmony';

export interface Phrase { notes: (number | null)[]; gates: number[] }
export function encodePhrase(lane: Lane): INoteSequence {
  const scale = MAGENTA.modelSteps / lane.notes.length;
  const onsets = new Map<number, { pitch: number; quantizedStartStep: number; quantizedEndStep: number }>();
  lane.notes.forEach((pitch, step) => {
    if (pitch === null) return;
    const start = Math.min(MAGENTA.modelSteps - 1, Math.round(step * scale));
    onsets.set(start, { pitch: SCALE[pitch], quantizedStartStep: start,
      quantizedEndStep: Math.min(MAGENTA.modelSteps, Math.max(start + 1, Math.round((step + (lane.gates?.[step] ?? 0) + 1) * scale))) });
  });
  const notes = [...onsets.values()];
  // The melody model needs one voice even when a dense editor loop shares model steps.
  notes.forEach((note, index) => { note.quantizedEndStep = Math.min(note.quantizedEndStep, notes[index + 1]?.quantizedStartStep ?? MAGENTA.modelSteps); });
  return { quantizationInfo: { stepsPerQuarter: MAGENTA.stepsPerQuarter }, totalQuantizedSteps: MAGENTA.modelSteps,
    tempos: [{ qpm: MUSIC.bpm }], notes };
}
function nearest(pitch: number) {
  return SCALE.reduce((best, midi, index) => Math.abs(midi - pitch) < Math.abs(SCALE[best] - pitch) ? index : best, 0);
}
export function decodePhrase(sequence: INoteSequence): Phrase {
  const notes: (number | null)[] = Array.from({ length: COMPOSE.steps }, () => null), gates = notes.map(() => 0), policy = new NotePolicy();
  const source = [...sequence.notes ?? []].sort((a, b) => (a.quantizedStartStep ?? 0) - (b.quantizedStartStep ?? 0));
  for (const note of source) {
    const start = note.quantizedStartStep, end = note.quantizedEndStep, pitch = note.pitch;
    if (typeof start !== 'number' || typeof end !== 'number' || typeof pitch !== 'number' || ![start, end, pitch].every(Number.isFinite) || start < 0 || end <= start || end > MAGENTA.modelSteps) throw new Error('MusicVAE returned an invalid timed note.');
    const step = Math.min(COMPOSE.steps - 1, Math.round(start * COMPOSE.steps / MAGENTA.modelSteps));
    notes[step] = policy.choose(nearest(pitch)); gates[step] = clamp((end - start) * COMPOSE.steps / MAGENTA.modelSteps - 1, 0, COMPOSE.maxGate);
  }
  if (!notes.some(pitch => pitch !== null)) throw new Error('MusicVAE returned an empty phrase. Try another variation.');
  return { notes, gates };
}
export function phraseDistance(phrase: Phrase, source: Lane) {
  const count = phrase.notes.filter(pitch => pitch !== null).length;
  let distance = 0, anchors = 0;
  source.notes.forEach((pitch, step) => {
    if (pitch === null) return;
    const index = Math.min(COMPOSE.steps - 1, Math.round(step * COMPOSE.steps / source.notes.length));
    distance += Math.abs(soundingPitch(phrase.notes, index) - pitch) / COMPOSE.pitchMax; anchors++;
  });
  return distance / Math.max(1, anchors) * MAGENTA.contourWeight + Math.abs(count - anchors) / COMPOSE.steps * MAGENTA.densityWeight;
}
export function choosePhrase(sequences: INoteSequence[], source: Lane): Phrase {
  const phrases = sequences.filter(sequence => (sequence.notes?.length ?? 0) > 0).map(decodePhrase);
  if (!phrases.length) throw new Error('MusicVAE produced no usable phrases. Your tune is unchanged; try again.');
  return phrases.reduce((best, phrase) => phraseDistance(phrase, source) < phraseDistance(best, source) ? phrase : best);
}
