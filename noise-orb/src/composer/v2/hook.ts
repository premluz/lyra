import { COMPOSE } from '../config';
import { isHook } from '../hook';
import { integer } from '../randomise';
import { V2 } from './config';
import type { Arrangement } from './config';

export function choose<T>(values: readonly T[], random: () => number): T {
  if (!values.length) throw new Error('Advanced V2 has no valid musical choices.');
  return values[integer([0, values.length - 1], random)];
}
function embellishments(notes: readonly (number | null)[]) {
  return notes.flatMap((note, step) => {
    if (note !== null) return [];
    const near = notes.some((pitch, onset) => pitch !== null && Math.min(Math.abs(onset - step), COMPOSE.steps - Math.abs(onset - step)) < V2.minGap);
    if (near) return [];
    return V2.passing.flatMap(pitch => {
      const candidate = notes.map((note, index) => index === step ? pitch : note);
      return isHook(candidate) ? [candidate] : [];
    });
  });
}
function pattern(motif: readonly number[], rhythm: readonly number[]): (number | null)[] {
  return Array.from({ length: COMPOSE.steps }, (_, step) => {
    const index = rhythm.indexOf(step); return index < 0 ? null : motif[index];
  });
}
function capacity(notes: readonly (number | null)[]) {
  const onsets = notes.flatMap((pitch, step) => pitch === null ? [] : [step]);
  return onsets.reduce((sum, onset, index) => sum + Math.floor(((onsets[(index + 1) % onsets.length] - onset + COMPOSE.steps) % COMPOSE.steps) / V2.minGap), 0);
}
export function v2Hook(previous: readonly (number | null)[], arrangement: Arrangement, random: () => number) {
  const count = integer(arrangement.count, random);
  const patterns = V2.motifs.flatMap(motif => V2.rhythms.map(rhythm => pattern(motif, rhythm)))
    .filter(notes => isHook(notes) && capacity(notes) >= count && !notes.every((note, step) => note === previous[step]));
  let notes = choose(patterns, random);
  while (notes.filter(note => note !== null).length < count) {
    const choices = embellishments(notes).filter(candidate => capacity(candidate) >= count && !candidate.every((note, step) => note === previous[step]));
    notes = choose(choices, random);
  }
  return notes;
}
