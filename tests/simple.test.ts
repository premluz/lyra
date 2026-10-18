import { expect, test } from 'vitest';
import { newDrawing, drawLayer, loadDrawing, nextLayer } from '../src/simple/score';
import { sampleStroke, strokePhrase } from '../src/simple/stroke';
import { DRAW_LAYERS, SIMPLE } from '../src/simple/config';
import { parseComposition } from '../src/composer/storage';
import { Score } from '../src/composer/model';
import { ScorePlayback } from '../src/composer/playback';
import { COMPOSE } from '../src/composer/config';
import { SCALE, TICK } from '../src/score';

const STROKES = [
  [{ x: 0.1, y: 0.85 }, { x: 0.3, y: 0.65 }, { x: 0.55, y: 0.25 }, { x: 0.9, y: 0.15 }],
  [{ x: 0.85, y: 0.2 }, { x: 0.15, y: 0.8 }, { x: 0.7, y: 0.25 }, { x: 0.2, y: 0.65 }, { x: 0.85, y: 0.2 }],
] as const;

for (const [index, stroke] of STROKES.entries()) {
  test(`drawing ${index} becomes three playable, independent layers and keeps its pitch contour`, () => {
    let state = newDrawing(() => index ? 0.8 : 0.1);
    expect(state.lanes.every((lane) => lane.notes.every((pitch) => pitch === null))).toBe(true);
    expect(nextLayer(state)).toBe(0);
    for (const [step, layer] of DRAW_LAYERS.entries()) {
      const before = structuredClone(state); state = drawLayer(state, layer, stroke, 23);
      expect(before.lanes.find((lane) => lane.id === layer.id)?.notes.every((pitch) => pitch === null)).toBe(true);
      expect(state.lanes.filter((lane) => lane.id !== layer.id)).toEqual(before.lanes.filter((lane) => lane.id !== layer.id));
      const lane = state.lanes.find((lane) => lane.id === layer.id);
      if (!lane) throw new Error('A drawn layer is missing.');
      expect(lane.motif).toEqual(strokePhrase(stroke, layer)); expect(lane.phase).toBe(23);
      expect(layer.counts).toContain(lane.notes.filter((pitch) => pitch !== null).length);
      expect(parseComposition(state)).toEqual(state); expect(nextLayer(state)).toBe(step === DRAW_LAYERS.length - 1 ? -1 : step + 1);
    }
    const source = new ScorePlayback(new Score(state)), plans = Array.from({ length: COMPOSE.steps }, (_, tick) => source.schedule(tick * TICK, tick)).flat();
    expect(new Set(plans.map((note) => note.lane)).size).toBe(3);
    for (const plan of plans) { expect(SCALE[plan.index]).toBeDefined(); expect(plan.velocity).toBeGreaterThan(0); expect(plan.shape.hold).toBe(0); }
    const serialized = JSON.stringify(state), reads: string[] = [];
    expect(loadDrawing({ getItem: (key) => { reads.push(key); return serialized; } })).toEqual(state); expect(reads).toEqual([SIMPLE.storageKey]);
  });
}
test('equal shapes sampled at different drawing speeds produce the same phrase', () => {
  const short = [{ x: 0.1, y: 0.8 }, { x: 0.9, y: 0.2 }];
  const dense = Array.from({ length: 100 }, (_, index) => ({ x: 0.1 + index / 99 * 0.8, y: 0.8 - index / 99 * 0.6 }));
  expect(sampleStroke(dense, 8)).toEqual(expect.arrayContaining(sampleStroke(short, 8).map((point) => expect.objectContaining({ x: expect.closeTo(point.x, 8), y: expect.closeTo(point.y, 8) }))));
  expect(strokePhrase(dense, DRAW_LAYERS[1])).toEqual(strokePhrase(short, DRAW_LAYERS[1]));
});
test('a higher drawing raises the audible contour, and different strokes keep different identities', () => {
  const layer = DRAW_LAYERS[1], high = strokePhrase([{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }], layer);
  const low = strokePhrase([{ x: 0.1, y: 0.9 }, { x: 0.9, y: 0.9 }], layer);
  expect(high.reduce((sum, pitch) => sum + pitch, 0) / high.length).toBeGreaterThan(low.reduce((sum, pitch) => sum + pitch, 0) / low.length);
  expect(strokePhrase(STROKES[0], layer)).not.toEqual(strokePhrase(STROKES[1], layer));
});
test('invalid or tiny strokes leave the composition intact and saved errors stay explicit', () => {
  const state = newDrawing(() => 0), before = structuredClone(state);
  for (const points of [[], [{ x: 0, y: 0 }], [{ x: 0, y: 0 }, { x: NaN, y: 1 }]]) expect(() => drawLayer(state, DRAW_LAYERS[0], points)).toThrow();
  expect(state).toEqual(before); expect(loadDrawing({ getItem: () => null })).toBeNull();
  expect(() => loadDrawing({ getItem: () => '{invalid' })).toThrow();
  expect(() => loadDrawing({ getItem: () => JSON.stringify({ ...state, selected: state.lanes[1].id, lanes: state.lanes.slice(1) }) })).toThrow('three musical layers');
  expect(() => newDrawing(() => 1)).toThrow('random values');
});
