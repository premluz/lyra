import { expect, test } from 'vitest';
import { compositionFixture } from './composition-fixtures';
import { Score } from '../src/composer/model';
import { ScorePlayback } from '../src/composer/playback';
import { parseComposition } from '../src/composer/storage';
import { laneForm } from '../src/composer/composition';
import { createSetup } from '../src/composer/setup';
import { COMPOSE } from '../src/composer/config';
import { TICK } from '../src/score';
import { DRAW_LAYERS } from '../src/simple/config';
import { newDrawing, drawLayer, nextLayer } from '../src/simple/score';

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`${variant} styles change one wave’s articulation, swing and replies without touching other waves`, () => {
    const score = compositionFixture(variant); score.setForm('loop');
    score.state.lanes.forEach((lane) => { lane.notes.fill(null); lane.notes[3] = 4; });
    const melody = score.state.lanes.find((lane) => lane.role === 'melody'), air = score.state.lanes.find((lane) => lane.role === 'air');
    if (!melody || !air) throw new Error('Mixed composition fixture is incomplete.');
    const source = new ScorePlayback(score), before = source.schedule(3 * TICK, 3);
    score.select(melody.id); score.setLaneForm('broken'); const mixed = source.schedule(3 * TICK, 3);
    expect(mixed.filter((note) => note.lane !== melody.id)).toEqual(before.filter((note) => note.lane !== melody.id));
    expect(mixed.find((note) => note.lane === melody.id)?.delay).toBeCloseTo(0.28 * TICK);
    score.select(air.id); score.setLaneForm('bloom'); const ringing = source.schedule(3 * TICK, 3);
    expect(ringing.find((note) => note.lane === air.id)?.delay).toBeCloseTo(0.04 * TICK);
    expect(ringing.find((note) => note.lane === air.id)?.shape.decay).toBeGreaterThan(before.find((note) => note.lane === air.id)?.shape.decay ?? Infinity);
    score.setLaneForm('conversation'); const call = source.schedule(3 * TICK, 3), reply = source.schedule((COMPOSE.steps + 3) * TICK, COMPOSE.steps + 3);
    expect(call.some((note) => note.lane === air.id)).toBe(false); expect(reply.some((note) => note.lane === air.id)).toBe(true);
    expect(score.state.form).toBe('loop'); expect(laneForm(melody, score.state.form)).toBe('broken');
    score.select(melody.id); expect(source.phrase(COMPOSE.steps * TICK)).toBe(1);
    score.setLaneForm('loop'); expect(source.phrase(COMPOSE.steps * TICK)).toBe(0);
  });
  test(`${variant} keeps legacy playback and exports, restores and validates independent composition styles`, () => {
    const score = compositionFixture(variant); score.setForm('bloom');
    const legacy = { ...score.state, lanes: score.state.lanes.map(({ form, ...lane }) => { expect(form).toBeNull(); return lane; }) };
    const loaded = parseComposition(legacy); expect(loaded).toEqual(score.state);
    expect(new ScorePlayback(new Score(loaded)).schedule(3 * TICK, 3)).toEqual(new ScorePlayback(score).schedule(3 * TICK, 3));
    score.setLaneForm('broken'); const before = structuredClone(score.state);
    const exported = createSetup(score.state, { treatment: 'glow', alive: 0.25 });
    expect(exported.summary.find((lane) => lane.id === score.selected.id)?.form).toBe('broken'); expect(exported.composition).toEqual(before);
    score.randomise(() => 0); expect(score.state.lanes.every((lane) => lane.form === null)).toBe(true);
    score.undoRandomise(); expect(score.state).toEqual(before);
    const selected = structuredClone(score.selected); score.removeLane(selected.id); score.undoRandomise(); expect(score.lane(selected.id)).toEqual(selected);
    const invalid = { ...before, lanes: before.lanes.map((lane, index) => index ? lane : { ...lane, form: 'invalid' }) }, raw = JSON.stringify(invalid);
    expect(() => parseComposition(invalid)).toThrow('wave composition style'); expect(JSON.stringify(invalid)).toBe(raw);
    score.addLane('drone'); expect(() => score.setLaneForm('broken')).toThrow('note waves');
  });
}
test('redrawing a simple layer preserves its speed, sound knobs and independent composition', () => {
  let state = newDrawing(() => 0.1);
  for (const layer of DRAW_LAYERS) state = drawLayer(state, layer, [{ x: 0.1, y: 0.7 }, { x: 0.9, y: 0.2 }]);
  const score = new Score(state); score.select('melody'); score.setLaneForm('bloom'); score.setRate(1.5); score.setKnob('tone', 0.82); score.setDensity(36);
  const other = structuredClone(score.state.lanes.filter((lane) => lane.id !== 'melody'));
  const redrawn = drawLayer(score.state, DRAW_LAYERS[1], [{ x: 0.1, y: 0.2 }, { x: 0.9, y: 0.8 }], 35);
  expect(redrawn.lanes.find((lane) => lane.id === 'melody')).toMatchObject({ form: 'bloom', rate: 1.5, tone: 0.82, phase: 35 });
  expect(redrawn.lanes.filter((lane) => lane.id !== 'melody')).toEqual(other);
  score.setDensity(0); expect(nextLayer(score.state)).toBe(-1); score.setDensity(36); expect(nextLayer(score.state)).toBe(-1);
});
