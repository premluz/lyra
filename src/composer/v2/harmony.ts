import { euclid, rotate } from '@tonaljs/rhythm-pattern';
import { NotePolicy, SCALE } from '../../score';
import { COMPOSE } from '../config';
import type { Lane } from '../lanes';
import { laneTicks } from '../pace';
import type { LaneRate } from '../pace';
import { V2 } from './config';
import { choose } from './hook';

export function soundingPitch(notes: readonly (number | null)[], tick: number) {
  const position = Math.floor(tick) % notes.length;
  for (let back = 0; back < notes.length; back++) {
    const pitch = notes[(position - back + notes.length) % notes.length];
    if (pitch !== null) return pitch;
  }
  throw new Error('Advanced V2 harmony needs an audible lead.');
}
export function consonant(left: number, right: number) {
  const interval = Math.abs(SCALE[left] - SCALE[right]) % V2.semitones;
  return V2.consonances.some(value => value === interval);
}
function stable(pitches: number[]) {
  const policy = new NotePolicy();
  return Array.from({ length: V2.cycleLoops + 1 }, () => pitches).flat().every(pitch => policy.choose(pitch) === pitch);
}
function referencePitches(step: number, rate: LaneRate, lead: readonly (number | null)[]) {
  const pitches: number[] = [];
  for (let tick = 0; tick < COMPOSE.steps * V2.cycleLoops; tick++) {
    for (const onset of laneTicks(tick, rate)) if (onset.step === step) pitches.push(soundingPitch(lead, tick + onset.offset));
  }
  return pitches;
}
function responseRhythm(count: number, rate: LaneRate, lead: readonly (number | null)[], random: () => number) {
  const candidates = Array.from({ length: COMPOSE.steps }, (_, offset) => rotate(euclid(COMPOSE.steps, count), offset));
  const overlaps = candidates.map(pattern => {
    let hits = 0;
    for (let tick = 0; tick < COMPOSE.steps * V2.cycleLoops; tick++) {
      hits += laneTicks(tick, rate).filter(onset => onset.offset === 0 && pattern[onset.step] && lead[tick % COMPOSE.steps] !== null).length;
    }
    return hits;
  });
  const minimum = Math.min(...overlaps);
  return choose(candidates.filter((_, index) => overlaps[index] === minimum), random);
}
export function v2Response(lane: Lane, lead: readonly (number | null)[], rate: LaneRate, count: number, random: () => number) {
  const range = lane.role === 'undertow' ? V2.bassRegister : V2.answerRegister;
  const pitches = Array.from({ length: range[1] - range[0] + 1 }, (_, index) => index + range[0]);
  const rhythm = responseRhythm(count, rate, lead, random);
  const played: number[] = [];
  return rhythm.map((hit, step) => {
    if (!hit) return null;
    const references = referencePitches(step, rate, lead);
    const choices = pitches.filter(pitch => consonant(pitch, COMPOSE.pitchMin) && references.every(reference => consonant(pitch, reference)));
    const safe = choices.filter(pitch => {
      if (played.length === count - 1) return stable([...played, pitch]);
      return played.length < 2 || played.at(-1) !== pitch || played.at(-2) !== pitch;
    });
    // Dense leads can exhaust the consonant register; a rest keeps the harmony intact.
    if (!safe.length) return null;
    const pitch = choose(safe, random); played.push(pitch); return pitch;
  });
}
