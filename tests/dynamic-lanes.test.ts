import { expect, test } from 'vitest';
import { Score, createComposition } from '../src/composer/model';
import { COMPOSE } from '../src/composer/config';
import { ScorePlayback } from '../src/composer/playback';
import { parseComposition } from '../src/composer/storage';
import { tunedFrequency, referenceHz } from '../src/composer/tuning';
import { random, setSeed } from '../src/particle-core/random';

test('adds independently named lanes to the resource limit without changing previous notes', () => {
  const score = new Score(), original = structuredClone(score.state.lanes);
  while (score.state.lanes.length < COMPOSE.maxLanes) {
    const lane = score.addLane(); score.setRole('air'); score.setInstrument('glass'); score.setNote(0, 7);
    expect(score.state.selected).toBe(lane.id); expect(lane.role).toBe('air');
  }
  expect(score.state.lanes.slice(0, original.length)).toEqual(original);
  expect(new Set(score.state.lanes.map((lane) => lane.id)).size).toBe(COMPOSE.maxLanes);
  const before = structuredClone(score.state); expect(() => score.addLane()).toThrow('up to 12'); expect(score.state).toEqual(before);
  expect(parseComposition(JSON.parse(JSON.stringify(score.state)))).toEqual(before);
});

for (const variant of ['starter-ids', 'arbitrary-reordered-ids']) {
  test(`roles are independent of ${variant} during editing, playback and randomisation`, () => {
    const state = createComposition();
    if (variant === 'arbitrary-reordered-ids') {
      state.lanes.reverse(); state.lanes.forEach((lane, i) => { lane.id = `independent-${i}`; lane.name = `Voice ${i}`; }); state.selected = state.lanes[0].id;
    }
    const score = new Score(state); score.setRole('undertow'); score.setInstrument('reed'); score.setNote(0, 1);
    const id = score.state.selected;
    expect(new ScorePlayback(score).note(id, 0).shape.instrument).toBe('reed');
    setSeed(2026); score.randomise(random);
    expect(score.lane(id).role).toBe('undertow');
    const notes = score.lane(id).notes.filter((note) => note !== null);
    expect(notes.length).toBeGreaterThanOrEqual(3); expect(notes.length).toBeLessThanOrEqual(5);
    expect(parseComposition(score.state)).toEqual(score.state);
  });
}

for (const reverse of [false, true]) {
  test(`migrates a genuine pre-layers score${reverse ? ' in reverse order' : ''}`, () => {
    const state = createComposition(); if (reverse) state.lanes.reverse();
    const lanes = state.lanes.map(({ id, enabled, notes, level, tone, length, lift }) => ({ id, enabled, notes, level, tone, length, lift }));
    const legacy = { version: 1, selected: state.selected, lanes };
    expect(parseComposition(legacy)).toEqual(state);
  });
}

test('the reference adds held layers without losing music, restores fully, and never duplicates its layers', () => {
  const score = new Score(); score.setSpace(5, 0.35); const before = structuredClone(score.state);
  score.addReference(); const playback = new ScorePlayback(score), frame = playback.continuous();
  expect(score.state.lanes).toHaveLength(8); expect(score.state.tuning).toBe('528'); expect(frame.legacyBed).toBe(false);
  expect(frame.lanes.filter((lane) => lane.kind === 'drone')).toHaveLength(4);
  expect(frame.lanes.find((lane) => lane.kind === 'binaural')).toMatchObject({ carrier: 200, beat: 6 });
  expect(frame.lanes.find((lane) => lane.id === 'reference-root')?.frequency).toBeCloseTo(528, 10);
  expect(Array.from({ length: COMPOSE.steps }, (_, tick) => playback.schedule(tick, tick)).flat()).toEqual([]);
  before.lanes.forEach((lane) => { expect(score.lane(lane.id).notes).toEqual(lane.notes); expect(score.lane(lane.id).enabled).toBe(false); });
  score.undoRandomise(); expect(score.state).toEqual(before);
  score.addReference(); score.addReference(); expect(score.state.lanes).toHaveLength(8);
  expect(parseComposition(score.state)).toEqual(score.state);
});

test('tuning uses the exact 528 Hz anchor, and standard tuning stays at A 440', () => {
  expect(tunedFrequency(10, '528')).toBeCloseTo(528, 10); expect(tunedFrequency(5, '528')).toBeCloseTo(264, 10);
  expect(tunedFrequency(0, '528')).toBeCloseTo(132, 10); expect(referenceHz('standard')).toBe(440);
  expect(referenceHz('528')).not.toBe(444);
});

test('randomising twelve mixed layers preserves their roles and reference tuning without restarting paused melodies', () => {
  const score = new Score(); score.addReference();
  while (score.state.lanes.length < COMPOSE.maxLanes) { score.addLane('drone'); score.setSustain('pitch', 3); }
  score.state.lanes.reverse(); const before = structuredClone(score.state); setSeed(98765); score.randomise(random);
  expect(score.state.lanes.map(({ id, role }) => [id, role])).toEqual(before.lanes.map(({ id, role }) => [id, role]));
  expect(score.state.tuning).toBe('528'); expect(new ScorePlayback(score).schedule(0, 0)).toEqual([]);
  score.state.lanes.filter((lane) => lane.role === 'drone').forEach((lane) => {
    expect(lane.instrument).not.toBe(before.lanes.find((previous) => previous.id === lane.id)?.instrument);
    expect(lane.notes.every((note) => note === null)).toBe(true);
  });
  score.undoRandomise(); expect(score.state).toEqual(before);
});

test('invalid roles, layer parameters, selected IDs and unavailable arrangement capacity fail explicitly', () => {
  const state = createComposition();
  expect(() => parseComposition({ ...state, selected: 'missing' })).toThrow('selected');
  expect(() => parseComposition({ ...state, lanes: [{ ...state.lanes[0], role: 'unknown' }] })).toThrow('role');
  expect(() => parseComposition({ ...state, lanes: [{ ...state.lanes[0], attack: 0 }] })).toThrow('attack');
  const score = new Score(); while (score.state.lanes.length < COMPOSE.maxLanes) score.addLane();
  const before = structuredClone(score.state); expect(score.canAddReference).toBe(false);
  expect(() => score.addReference()).toThrow('five free'); expect(score.state).toEqual(before);
});
