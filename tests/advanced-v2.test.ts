import { expect, test } from 'vitest';
import { random, setSeed } from '../src/particle-core/random';
import { MUSIC } from '../src/config';
import { SCALE, TICK, NotePolicy } from '../src/score';
import { COMPOSE } from '../src/composer/config';
import { Score } from '../src/composer/model';
import type { Composition } from '../src/composer/model';
import { ScorePlayback } from '../src/composer/playback';
import { parseComposition } from '../src/composer/storage';
import { createSetup } from '../src/composer/setup';
import { isContinuous } from '../src/composer/lanes';
import { isHook } from '../src/composer/hook';
import { createV2Composition, randomiseV2 } from '../src/composer/v2/generator';
import { compositionFixture } from './composition-fixtures';

function assertMusical(state: Composition) {
  expect(parseComposition(state)).toEqual(state);
  const score = new Score(state), source = new ScorePlayback(score);
  const lead = state.lanes.find(lane => lane.role === 'melody') ?? state.lanes.find(lane => !isContinuous(lane));
  if (!lead) throw new Error('The musical fixture needs a lead');
  expect(isHook(lead.notes)).toBe(true); expect(lead.rate).toBe(1);
  const count = lead.notes.filter(note => note !== null).length;
  expect(count).toBeGreaterThanOrEqual(6); expect(count).toBeLessThanOrEqual(12);
  const policies = new Map(state.lanes.map(lane => [lane.id, new NotePolicy()]));
  const notes = Array.from({ length: COMPOSE.steps * 4 }, (_, tick) => source.schedule(tick * TICK, tick)
    .map(note => ({ ...note, time: tick * TICK + (note.delay ?? 0) }))).flat();
  const melody = notes.filter(note => note.lane === lead.id);
  for (const note of notes) {
    expect(policies.get(note.lane)?.choose(note.index)).toBe(note.index);
    expect(note.shape.instrument).not.toMatch(/reed|strings|cloud|choir|tide|sine/);
    if (note.lane === lead.id) continue;
    const reference = melody.filter(onset => onset.time <= note.time).at(-1);
    if (!reference) throw new Error('Accompaniment started without its melodic reference');
    const interval = Math.abs(SCALE[note.index] - SCALE[reference.index]) % 12;
    expect([0, 3, 4, 5, 7, 8, 9]).toContain(interval);
    expect(note.velocity).toBeLessThan(source.note(lead.id, 0).velocity);
  }
  return notes;
}

test('V2 opens with the exact hover motif authored as editable notes and harmonized supporting waves', () => {
  const state = createV2Composition(), notes = assertMusical(state);
  expect(state.lanes[0].notes.filter(note => note !== null)).toEqual([...MUSIC.arpeggio]);
  expect(state.lanes[0].instrument).toBe('pluck');
  expect(new Set(notes.map(note => note.lane)).size).toBe(3);
  const bass = notes.find(note => state.lanes.find(lane => lane.id === note.lane)?.role === 'undertow');
  const air = notes.find(note => state.lanes.find(lane => lane.id === note.lane)?.role === 'air');
  if (!bass || !air) throw new Error('Starter arrangement needs bass and ringing answers');
  expect(bass.shape.decay).toBeLessThan(air.shape.decay);
  expect(createSetup(state, { alive: 0.25, treatment: 'glow' }).composition).toEqual(state);
});

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`V2 keeps ${variant} hooks consonant across lane rates, varied arrangements and loop boundaries`, () => {
    const state = compositionFixture(variant).state, score = new Score(state, undefined, randomiseV2);
    const identity = state.lanes.map(lane => ({ id: lane.id, name: lane.name, role: lane.role })), selected = state.selected;
    const tunes = new Set<string>(), instruments = new Set<string>(), rates = new Set<number>(), densities = new Set<number>();
    setSeed(variant === 'trio' ? 63311 : 84192);
    for (let sample = 0; sample < 64; sample++) {
      const before = structuredClone(state); score.randomise(random); assertMusical(state);
      expect(state.selected).toBe(selected);
      expect(state.lanes.map(lane => ({ id: lane.id, name: lane.name, role: lane.role }))).toEqual(identity);
      const lead = state.lanes.find(lane => lane.role === 'melody');
      if (!lead) throw new Error('Fixture needs a melody');
      tunes.add(JSON.stringify(lead.notes)); densities.add(lead.notes.filter(note => note !== null).length);
      state.lanes.forEach(lane => { instruments.add(lane.instrument); rates.add(lane.rate); });
      expect(state).not.toEqual(before);
      if (sample === 0) { score.undoRandomise(); expect(state).toEqual(before); }
    }
    expect(tunes.size).toBeGreaterThan(40); expect([...rates].sort()).toEqual([0.5, 1, 2]);
    expect(densities.size).toBeGreaterThanOrEqual(5); expect(instruments.size).toBeGreaterThanOrEqual(7);
  });
}

test('a renamed, reordered twelve-wave arrangement retains its identities and cannot overwhelm the lead', () => {
  const score = compositionFixture('custom-polyphony');
  while (score.state.lanes.length < COMPOSE.maxLanes) score.addLane('air');
  score.state.lanes.forEach(lane => { lane.name = 'Shared label'; lane.lift = 1; });
  const state = structuredClone(score.state), generator = new Score(state, undefined, randomiseV2);
  setSeed(27319); generator.randomise(random); assertMusical(state);
  expect(state.lanes.map(lane => lane.id)).toEqual(score.state.lanes.map(lane => lane.id));
  generator.undoRandomise(); expect(state).toEqual(score.state);
});

test('continuous layers remain intact and a single Air wave can carry the V2 tune', () => {
  const score = compositionFixture(); score.addReference();
  const before = structuredClone(score.state.lanes.filter(isContinuous));
  const generated = randomiseV2(score.state, () => 0);
  expect(generated.lanes.filter(isContinuous)).toEqual(before);
  const air = score.state.lanes.find(lane => lane.role === 'air');
  if (!air) throw new Error('Fixture needs an Air wave');
  const state = { ...score.state, selected: air.id, lanes: [air], ambientTools: false };
  const solo = new Score(state, undefined, randomiseV2); solo.randomise(() => 0.999); assertMusical(state);
});

test('constant entropy changes the motif and invalid entropy leaves the entire V2 score untouched', () => {
  const score = new Score(createV2Composition(), undefined, randomiseV2);
  for (const value of [0, 0.999]) for (let repeat = 0; repeat < 4; repeat++) {
    const previous = structuredClone(score.state.lanes[0].notes); score.randomise(() => value);
    assertMusical(score.state); expect(score.state.lanes[0].notes).not.toEqual(previous);
  }
  const before = structuredClone(score.state);
  for (const value of [1, -0.1, NaN]) {
    expect(() => score.randomise(() => value)).toThrow('random values'); expect(score.state).toEqual(before);
  }
});
