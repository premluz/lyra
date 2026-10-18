import { euclid, rotate } from '@tonaljs/rhythm-pattern';
import { COMPOSE } from './config';
import type { Lane } from './lanes';
import type { Range, VoiceProfile } from './randomise-config';
import { ARRANGE } from './accompaniment-config';
import { laneTicks, NORMAL_RATE } from './pace';
import type { LaneRate } from './pace';

export function chooseRate(lane: Lane, used: Set<LaneRate>, draw: (range: Range) => number): LaneRate {
  const palette: readonly LaneRate[] = ARRANGE.rates[lane.role];
  const fresh = palette.filter((rate) => !used.has(rate) && rate !== lane.rate);
  const unused = palette.filter((rate) => !used.has(rate));
  const choices = fresh.length ? fresh : unused.length ? unused : palette;
  const rate = choices[draw([0, choices.length - 1])]; used.add(rate); return rate;
}
function register(pitch: number, profile: VoiceProfile) {
  while (pitch < profile.pitch[0]) pitch += ARRANGE.octaveSteps;
  while (pitch > profile.pitch[1]) pitch -= ARRANGE.octaveSteps;
  return pitch;
}
function collision(notes: readonly (number | null)[], rate: LaneRate, lead: readonly (number | null)[]) {
  let hits = 0;
  for (let tick = 0; tick < ARRANGE.cycleSteps; tick++) {
    if (lead[tick % COMPOSE.steps] === null) continue;
    hits += laneTicks(tick, rate).filter(({ step, offset }) => offset === 0 && notes[step] !== null).length;
  }
  return hits;
}
export function supportingNotes(lane: Lane, lead: readonly (number | null)[], profile: VoiceProfile, rate: LaneRate, draw: (range: Range) => number) {
  const motif = lead.filter((pitch) => pitch !== null), count = draw(profile.count), rhythm = euclid(COMPOSE.steps, count);
  if (!motif.length) throw new Error('Accompaniment requires a melodic hook.');
  const candidates = Array.from({ length: COMPOSE.steps }, (_, offset) => {
    let note = 0;
    return rotate(rhythm, offset).map((hit) => {
      if (!hit) return null;
      const index = note++;
      const pitch = lane.role === 'undertow' ? ARRANGE.bassMotif[index % ARRANGE.bassMotif.length] : motif[index * ARRANGE.echoStride % motif.length];
      return register(pitch, profile);
    });
  }).filter((notes) => !notes.every((pitch, step) => pitch === lane.notes[step]));
  const scores = candidates.map((notes) => collision(notes, rate, lead)), best = Math.min(...scores);
  const choices = candidates.filter((_, index) => scores[index] === best);
  if (!choices.length) throw new Error(`No complementary rhythm for ${lane.name} at ${rate / NORMAL_RATE}×.`);
  return choices[draw([0, choices.length - 1])];
}
