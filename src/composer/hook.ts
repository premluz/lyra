import { MUSIC } from '../config';
import { COMPOSE } from './config';
import { RANDOMISE } from './randomise-config';
import type { Range, VoiceProfile } from './randomise-config';
import type { FormId } from './composition-config';
import { HOOK } from './hook-config';

export function isHook(notes: readonly (number | null)[]) {
  const pitches = notes.filter((pitch) => pitch !== null), last = pitches.length - 1;
  if (notes[0] !== COMPOSE.pitchMin || pitches[last] > HOOK.cadenceMax || new Set(pitches).size < HOOK.distinctMin) return false;
  return pitches.every((pitch, index) => Math.abs(pitch - pitches[(index + 1) % pitches.length]) <= MUSIC.maxLeap &&
    !Array.from({ length: HOOK.repeatLimit }, (_, offset) => pitches[(index + offset + 1) % pitches.length]).every((next) => next === pitch));
}
function embellishments(notes: readonly (number | null)[], profile: VoiceProfile) {
  return Array.from({ length: COMPOSE.steps }, (_, step) => step).flatMap((step) => {
    if (notes[step] !== null) return [];
    const preceding = notes.slice(0, step).filter((pitch) => pitch !== null).at(-1);
    if (preceding === undefined) throw new Error('Hook has no opening note.');
    return HOOK.passing.flatMap((move) => {
      const pitch = preceding + move;
      const candidate = notes.map((note, index) => index === step ? pitch : note);
      return pitch >= profile.pitch[0] && pitch <= profile.pitch[1] && isHook(candidate) ? [candidate] : [];
    });
  });
}
function spacing(notes: readonly (number | null)[]) {
  const onsets = notes.flatMap((pitch, step) => pitch === null ? [] : [step]);
  const gaps = onsets.map((step, index) => (onsets[(index + 1) % onsets.length] - step + COMPOSE.steps) % COMPOSE.steps);
  return { longest: Math.max(...gaps), unevenness: gaps.reduce((sum, gap) => sum + gap * gap, 0) };
}
function hookPattern(motif: readonly number[], rhythm: readonly number[]): (number | null)[] {
  return Array.from({ length: COMPOSE.steps }, (_, step) => {
    const index = rhythm.indexOf(step);
    return index < 0 ? null : motif[index];
  });
}
export function hookNotes(profile: VoiceProfile, draw: (range: Range) => number, form: FormId, previous: readonly (number | null)[] = []) {
  const motifs = [...RANDOMISE.hooks, ...HOOK.cells.flatMap((cell) => HOOK.endings.map((end) => [...cell, ...cell.slice(0, HOOK.cellSize - 1), end]))];
  const pool = motifs.flatMap((motif) => HOOK.rhythms.map((rhythm) => hookPattern(motif, rhythm)))
    .filter((notes) => isHook(notes) && notes.every((pitch) => pitch === null || pitch >= profile.pitch[0] && pitch <= profile.pitch[1]));
  const choices = pool.filter((notes) => !notes.every((pitch, step) => pitch === previous[step]));
  if (!choices.length) throw new Error(`No valid melodic hooks for ${form}.`);
  let result = choices[draw([0, choices.length - 1])];
  const extras = draw(profile.count) - result.filter((pitch) => pitch !== null).length;
  for (let i = 0; i < extras; i++) {
    const options = embellishments(result, profile).filter((notes) => i < extras - 1 || !notes.every((pitch, step) => pitch === previous[step]));
    if (!options.length) throw new Error('Hook has no valid passing-note placement.');
    const gaps = options.map(spacing), shortest = Math.min(...gaps.map((gap) => gap.longest));
    const smoothest = Math.min(...gaps.filter((gap) => gap.longest === shortest).map((gap) => gap.unevenness));
    const flowing = options.filter((_, index) => gaps[index].longest === shortest && gaps[index].unevenness === smoothest);
    result = flowing[draw([0, flowing.length - 1])];
  }
  return result;
}
