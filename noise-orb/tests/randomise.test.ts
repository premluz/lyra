import { expect, test } from 'vitest';
import { random, setSeed } from '../../src/engine/random';
import { COMPOSE, KNOBS } from '../src/composer/config';
import { Score, createComposition } from '../src/composer/model';
import type { Composition } from '../src/composer/model';
import { RANDOMISE } from '../src/composer/randomise-config';
import { parseComposition } from '../src/composer/storage';
import { ScorePlayback } from '../src/composer/playback';
import { SCALE, TICK } from '../src/score';

function expectVariation(after: Composition, before: Composition) {
  expect(parseComposition(after)).toEqual(after); expect(after.selected).toBe(before.selected);
  expect(after.form).not.toBe(before.form); expect(after.form).not.toBe('loop');
  expect(new Set(after.lanes.map((lane) => lane.instrument)).size).toBe(after.lanes.length);
  for (const lane of after.lanes) {
    const previous = before.lanes.find((item) => item.id === lane.id), base = RANDOMISE.profiles[lane.role];
    const profile = RANDOMISE.wavyInstruments.some((id) => id === lane.instrument) ? { ...base, count: RANDOMISE.wavyCount, level: RANDOMISE.wavyLevel, length: RANDOMISE.wavyLength } : base;
    if (!previous) throw new Error('Comparison score has a missing lane.');
    expect(lane.enabled).toBe(true); expect(lane.notes).not.toEqual(previous.notes);
    expect(lane.instrument).not.toBe(previous.instrument);
    const pitches = lane.notes.filter((pitch) => pitch !== null);
    expect(pitches.length).toBeGreaterThanOrEqual(profile.count[0]); expect(pitches.length).toBeLessThanOrEqual(profile.count[1]);
    for (const pitch of pitches) { expect(pitch).toBeGreaterThanOrEqual(profile.pitch[0]); expect(pitch).toBeLessThanOrEqual(profile.pitch[1]); }
    for (const { key } of KNOBS) {
      expect(lane[key]).not.toBe(previous[key]);
      expect(lane[key]).toBeGreaterThanOrEqual(profile[key][0]); expect(lane[key]).toBeLessThanOrEqual(profile[key][1]);
    }
  }
}

for (const variant of ['starter', 'dense-reordered']) {
  test(`randomises the entire ${variant} setup atomically and restores it with undo`, () => {
    const state = createComposition();
    if (variant === 'dense-reordered') {
      state.selected = 'undertow'; state.lanes.reverse();
      state.lanes.forEach((lane, i) => { lane.enabled = false; lane.notes = Array.from({ length: COMPOSE.steps }, (_, step) => (step + i) % SCALE.length); lane.level = 0; lane.lift = 1; });
    }
    let changes = 0;
    const score = new Score(state, () => changes++), before = structuredClone(state);
    setSeed(variant === 'starter' ? 123 : 987654321); score.randomise(random);
    expectVariation(score.state, before); expect(changes).toBe(1); expect(score.canUndoRandomise).toBe(true);
    const source = new ScorePlayback(score), plans = Array.from({ length: COMPOSE.steps }, (_, tick) => source.schedule(tick * TICK, tick)).flat();
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((note) => score.lane(note.lane).notes[note.step] !== null)).toBe(true);
    for (const note of plans) { expect(Number.isInteger(note.index)).toBe(true); expect(note.index).toBeGreaterThanOrEqual(0); expect(note.index).toBeLessThan(SCALE.length); }
    score.undoRandomise(); expect(score.state).toEqual(before); expect(changes).toBe(2); expect(score.canUndoRandomise).toBe(false);
  });
}

test('repeated randomisations produce distinct tunes, not just different knob values', () => {
  const score = new Score(), tunes = new Set<string>(); setSeed(2026);
  for (let i = 0; i < 40; i++) {
    const before = structuredClone(score.state); score.randomise(random); expectVariation(score.state, before);
    tunes.add(JSON.stringify(score.state.lanes.map((lane) => lane.notes)));
  }
  expect(tunes.size).toBe(40);
});

test('identical entropy still changes each lane; invalid entropy preserves the setup', () => {
  const score = new Score();
  for (let i = 0; i < 3; i++) { const before = structuredClone(score.state); score.randomise(() => 0); expectVariation(score.state, before); }
  const before = structuredClone(score.state);
  expect(() => score.randomise(() => 1)).toThrow('random values'); expect(score.state).toEqual(before);
});
