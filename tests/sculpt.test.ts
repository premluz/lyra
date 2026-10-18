import { expect, test } from 'vitest';
import { Score } from '../src/composer/model';
import { SculptController } from '../src/sculpt/controller';
import { SculptPlayback } from '../src/sculpt/playback';
import { sculptLane, sculptPhase } from '../src/sculpt/model';
import { parseSculpt } from '../src/sculpt/storage';
import { SCULPT, REST_FOCUS } from '../src/sculpt/config';
import { VIEW } from '../src/config';
import { TICK } from '../src/score';
import { sculptFixture } from './sculpt-fixtures';

const ANCHOR = { x: 0, y: 0, z: VIEW.interactionRadius };
const DELTA = { x: 0.8, y: 1.2, z: 0 };
for (const dense of [false, true]) {
  test(`local contour shaping preserves rests, pitch bounds and other layers (${dense ? 36 : 24} steps)`, () => {
    const setup = sculptFixture(dense), score = new Score(setup.composition), before = structuredClone(score.state);
    const controller = new SculptController(score, setup.handles, () => {});
    expect(controller.begin({ point: { ...ANCHOR, nx: 0.5, depth: 0 }, position: ANCHOR, handle: null, hit: true, focus: REST_FOCUS })).toBe(true);
    controller.drag(DELTA); controller.finish();
    const lane = score.selected, original = before.lanes.find((lane) => lane.id === score.state.selected);
    if (!original) throw new Error('Sculpt fixture has no selected lane.');
    expect(lane.notes).not.toEqual(original.notes);
    expect(lane.notes.map((pitch) => pitch === null)).toEqual(original.notes.map((pitch) => pitch === null));
    expect(lane.notes.every((pitch) => pitch === null || Number.isInteger(pitch) && pitch >= 0 && pitch <= 15)).toBe(true);
    expect(score.state.lanes.filter((lane) => lane.id !== score.state.selected)).toEqual(before.lanes.filter((lane) => lane.id !== score.state.selected));
    expect(lane.notes.filter((pitch, index) => pitch !== original.notes[index]).length).toBeLessThan(lane.notes.length);
    expect(lane.length).toBeGreaterThan(original.length); expect(lane.tone).toBeGreaterThan(original.tone);
    expect(parseSculpt({ composition: score.state, handles: setup.handles })).toEqual({ composition: score.state, handles: setup.handles });
  });
  test(`proximity colours authored notes without adding music or mutating the score (${dense})`, () => {
    const score = new Score(sculptFixture(dense).composition), playback = new SculptPlayback(score), original = structuredClone(score.state);
    const rest = playback.note(score.selected.id, 0), other = playback.note('undertow', 0);
    playback.aim({ proximity: 1, height: 0.5, depth: 0.5 }); playback.advance(10);
    expect(playback.note(score.selected.id, 0).shape.cutoff).toBeGreaterThan(rest.shape.cutoff);
    expect(playback.note(score.selected.id, 0).velocity).toBeGreaterThan(rest.velocity);
    expect(playback.note('undertow', 0)).toEqual(other); expect(score.state).toEqual(original);
    playback.aim(REST_FOCUS); playback.advance(10); expect(playback.note(score.selected.id, 0).shape.cutoff).toBeCloseTo(rest.shape.cutoff);
    expect(playback.continuous()).toMatchObject({ legacyBed: false, lanes: [] });
    score.state.lanes.forEach((lane) => lane.notes.fill(null));
    expect(Array.from({ length: 24 }, (_, tick) => playback.schedule(tick * TICK, tick)).flat()).toEqual([]);
  });
}
test('Undo shape preserves later instrument, speed and edits to another layer; cancel leaves no deformation', () => {
  const setup = sculptFixture(), score = new Score(setup.composition), original = structuredClone(score.selected);
  const controller = new SculptController(score, setup.handles, () => {});
  const hit = { point: { ...ANCHOR, nx: 0.5, depth: 0 }, position: ANCHOR, handle: null, hit: true, focus: REST_FOCUS };
  controller.begin(hit); controller.drag(DELTA); controller.cancel();
  expect(score.selected).toEqual(original); expect(setup.handles).toEqual([]); expect(controller.canUndo).toBe(false);
  controller.begin(hit); controller.drag(DELTA); controller.finish(); score.setInstrument('glass'); score.setRate(2);
  score.select('air'); score.setNote(0, 15); const air = structuredClone(score.selected);
  controller.undo(); expect(score.selected).toEqual(air);
  expect(score.lane('melody')).toMatchObject({ notes: original.notes, instrument: 'glass', rate: 2 });
  expect(setup.handles).toEqual([]); expect(controller.canUndo).toBe(false);
});
test('sculpture persistence rejects malformed or unbounded handles rather than silently discarding them', () => {
  const setup = sculptFixture();
  expect(parseSculpt(setup)).toEqual(setup);
  for (const offset of [{ x: NaN, y: 0, z: 0 }, { x: SCULPT.maxPull * 2, y: 0, z: 0 }]) {
    expect(() => parseSculpt({ ...setup, handles: [{ lane: 'melody', anchor: ANCHOR, offset }] })).toThrow();
  }
  expect(() => parseSculpt({ ...setup, handles: [{ lane: 'missing', anchor: ANCHOR, offset: DELTA }] })).toThrow();
  expect(() => parseSculpt({ ...setup, handles: [{ lane: 'melody', anchor: { x: 0, y: 0, z: 0 }, offset: DELTA }] })).toThrow();
});
test('returning to the grab origin makes no edit, while an existing grip remains bounded and editable', () => {
  const setup = sculptFixture(), score = new Score(setup.composition), original = structuredClone(score.state);
  const controller = new SculptController(score, setup.handles, () => {});
  const hit = { point: { ...ANCHOR, nx: 0.5, depth: 0 }, position: ANCHOR, handle: null, hit: true, focus: REST_FOCUS };
  controller.begin(hit); controller.drag(DELTA); controller.drag({ x: 0, y: 0, z: 0 }); controller.finish();
  expect(score.state).toEqual(original); expect(setup.handles).toEqual([]); expect(controller.canUndo).toBe(false);
  controller.begin(hit); controller.drag(DELTA); controller.finish(); const first = structuredClone(score.state);
  controller.begin({ ...hit, handle: 0 }); controller.drag({ x: 20, y: 10, z: 5 }); controller.finish();
  expect(setup.handles).toHaveLength(1); expect(score.state).not.toEqual(first);
  expect(() => parseSculpt({ composition: score.state, handles: setup.handles })).not.toThrow();
  controller.undo(); expect(score.state).toEqual(first);
});
test('the same geometric phase maps different lane identities, and upward and downward pulls invert the melody contour', () => {
  const score = new Score(sculptFixture(true).composition), lane = score.selected;
  expect(sculptPhase(ANCHOR, 'melody')).not.toBe(sculptPhase(ANCHOR, 'air'));
  const up = sculptLane(lane, ANCHOR, DELTA), down = sculptLane(lane, ANCHOR, { ...DELTA, y: -DELTA.y });
  expect(up.notes.reduce<number>((sum, pitch) => sum + (pitch ?? 0), 0)).toBeGreaterThan(down.notes.reduce<number>((sum, pitch) => sum + (pitch ?? 0), 0));
});
