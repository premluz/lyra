import { MUSIC, clamp } from '../config';
import { COMPOSE } from './config';
import type { Lane } from './lanes';
import { roleDefinition } from './lanes';

export const wrapStep = (step: number, steps = COMPOSE.steps) => ((step % steps) + steps) % steps;
export function orderedPitches(lane: Lane) {
  return Array.from({ length: lane.notes.length }, (_, index) => lane.notes[wrapStep(lane.phase + index, lane.notes.length)]).filter((pitch) => pitch !== null);
}
export function motifFor(lane: Lane) {
  if (lane.motif.length) return lane.motif;
  const ordered = orderedPitches(lane);
  return ordered.length ? ordered : MUSIC.arpeggio.map((pitch) => clamp(pitch + roleDefinition(lane.role).base, COMPOSE.pitchMin, COMPOSE.pitchMax));
}
export function redistribute(lane: Lane, count: number) {
  if (!Number.isInteger(count) || count < 0 || count > COMPOSE.maxDensity) throw new Error(`Density must be a whole number between zero and ${COMPOSE.maxDensity}.`);
  const pitches = motifFor(lane);
  const steps = count > COMPOSE.steps ? COMPOSE.maxDensity : lane.notes.length;
  const phase = Math.round(lane.phase * steps / lane.notes.length);
  const result: (number | null)[] = Array.from({ length: steps }, () => null);
  for (let index = 0; index < count; index++) {
    const step = wrapStep(phase + Math.floor(index * steps / count), steps);
    result[step] = pitches[Math.floor(index * pitches.length / count)];
  }
  return result;
}
