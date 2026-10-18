import { expect, test } from 'vitest';
import { compositionFixture } from './composition-fixtures';
import { COMPOSE } from '../src/composer/config';
import { ScorePlayback } from '../src/composer/playback';
import { parseComposition } from '../src/composer/storage';
import { RATES } from '../src/composer/pace';
import { TICK } from '../src/score';
import { createSetup } from '../src/composer/setup';

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`${variant} supports 25–36 notes in the original loop at every lane rate`, () => {
    const score = compositionFixture(variant), before = structuredClone(score.state), id = score.selected.id;
    for (const count of [25, 29, COMPOSE.maxDensity]) {
      score.setDensity(count); expect(score.selected.notes.filter((pitch) => pitch !== null)).toHaveLength(count);
      expect(score.selected.notes).toHaveLength(COMPOSE.maxDensity);
      expect(parseComposition(score.state)).toEqual(score.state);
    }
    for (const { value: rate } of RATES) {
      score.setRate(rate); const source = new ScorePlayback(score), origin = 0.025;
      const notes = Array.from({ length: COMPOSE.steps * 4 }, (_, tick) => source.schedule(origin + tick * TICK, tick)
        .filter((note) => note.lane === id).map((note) => ({ ...note, time: origin + tick * TICK + (note.delay ?? 0) }))).flat();
      expect(notes).toHaveLength(COMPOSE.maxDensity * 4 * rate);
      notes.forEach((note, index) => {
        expect(note.time).toBeCloseTo(origin + index * TICK * COMPOSE.steps / COMPOSE.maxDensity / rate, 9);
        expect(note.step).toBe(index % COMPOSE.maxDensity); expect(source.position(note.time, id)).toBeCloseTo(note.step, 8);
      });
    }
    expect(score.state.lanes.filter((lane) => lane.id !== id)).toEqual(before.lanes.filter((lane) => lane.id !== id));
    const setup = createSetup(score.state, { alive: 0.25, treatment: 'glow' });
    expect(setup.summary.find((lane) => lane.id === id)).toMatchObject({ noteCount: 36, stepsPerPattern: 36, patternSeconds: COMPOSE.steps * TICK / score.selected.rate });
  });
  test(`${variant} retains dense contours through offsets, silence, edits and Randomise Undo`, () => {
    const score = compositionFixture(variant); score.setDensity(COMPOSE.maxDensity);
    const original = structuredClone(score.selected), before = structuredClone(score.state);
    score.shiftLane(original.id, 35); score.shiftLane(original.id, -35); expect(score.state).toEqual(before);
    score.setDensity(0); score.setDensity(COMPOSE.maxDensity); expect(score.selected).toEqual(original);
    score.setNote(35, 13); expect(score.selected.notes[35]).toBe(13);
    const edited = structuredClone(score.state); score.randomise(() => 0); score.undoRandomise(); expect(score.state).toEqual(edited);
    expect(parseComposition(score.state)).toEqual(edited);
  });
}
