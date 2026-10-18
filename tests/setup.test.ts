import { expect, test } from 'vitest';
import { createSetup } from '../src/composer/setup';
import { compositionFixture } from './composition-fixtures';
import { parseComposition } from '../src/composer/storage';
import { TICK } from '../src/score';
import { COMPOSE } from '../src/composer/config';
import { referenceHz } from '../src/composer/tuning';

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`setup export preserves every ${variant} lane and parameter without changing the score`, () => {
    const score = compositionFixture(variant); score.setForm('bloom'); score.setRate(1.5); score.setKnob('tone', 0.83);
    score.shiftLane(score.selected.id, 7); score.state.lanes[1].enabled = false;
    const before = structuredClone(score.state), visuals = { treatment: 'halftone', alive: 0.63 } as const;
    const setup = createSetup(score.state, visuals, new Date('2026-10-15T20:00:00Z'));
    expect(setup).toMatchObject({ format: 'noise-orb-setup', version: 1, createdAt: '2026-10-15T20:00:00.000Z', visuals });
    expect(parseComposition(setup.composition)).toEqual(before); expect(score.state).toEqual(before);
    expect(setup.summary.map((lane) => lane.id)).toEqual(before.lanes.map((lane) => lane.id));
    setup.summary.forEach((summary, index) => {
      const lane = before.lanes[index], count = lane.notes.filter((note) => note !== null).length;
      expect(summary.noteCount).toBe(count); expect(summary.pulseBpm).toBe(84 * lane.rate);
      expect(summary.patternSeconds).toBeCloseTo(COMPOSE.steps * TICK / lane.rate); expect(summary.notesPerSecond).toBeCloseTo(count / (COMPOSE.steps * TICK / lane.rate));
      expect(summary.audible).toBe(lane.enabled);
    });
    score.selected.notes.fill(null); score.setKnob('tone', 0.1); expect(setup.composition).toEqual(before);
  });
}
test('ambient export preserves exact tuning, dry pairs and reverb while distinguishing held layers', () => {
  const score = compositionFixture(); score.addReference();
  const setup = createSetup(score.state, { treatment: 'glow', alive: 0.25 });
  expect(parseComposition(setup.composition)).toEqual(score.state);
  expect(setup.playback).toMatchObject({ tuning: '528', referenceAHz: referenceHz('528'), rootMidi: 48, reverb: { seconds: score.state.spaceSeconds, wet: score.state.wet } });
  const held = setup.summary.filter((lane) => lane.role === 'drone' || lane.role === 'binaural');
  expect(held).toHaveLength(5); expect(held.every((lane) => lane.audible && lane.patternSeconds === null && lane.notesPerSecond === null && lane.pulseBpm === null)).toBe(true);
  score.setAmbientTools(false); const disabled = createSetup(score.state, { treatment: 'glow', alive: 0.25 });
  expect(disabled.playback.tuning).toBe('standard'); expect(disabled.summary.filter((lane) => lane.role === 'drone' || lane.role === 'binaural').every((lane) => !lane.audible)).toBe(true);
});
test('invalid export data fails without changing the original score', () => {
  const score = compositionFixture(), before = structuredClone(score.state);
  expect(() => createSetup(score.state, { treatment: 'glow', alive: NaN })).toThrow('orb settings');
  expect(() => createSetup(score.state, { treatment: 'glow', alive: 2 })).toThrow('orb settings');
  expect(() => createSetup(score.state, { treatment: 'glow', alive: 0.25 }, new Date('invalid'))).toThrow();
  expect(() => createSetup({ ...score.state, selected: 'missing' }, { treatment: 'glow', alive: 0.25 })).toThrow('selected lane');
  expect(score.state).toEqual(before);
});
