import { expect, test } from 'vitest';
import { MUSIC } from '../src/config';
import { SCALE, TICK } from '../src/score';
import { COMPOSE } from '../src/composer/config';
import { Score, createComposition } from '../src/composer/model';
import { parseComposition, loadComposition } from '../src/composer/storage';
import { ScorePlayback } from '../src/composer/playback';

test('the starter melody has the original six pitches at the original spacing', () => {
  const playback = new ScorePlayback(new Score());
  const notes = Array.from({ length: COMPOSE.steps }, (_, tick) => playback.schedule(0.025 + tick * TICK, tick)).flat();
  expect(notes.map((note) => note.index)).toEqual(MUSIC.arpeggio);
  expect(notes.every((note) => note.lane === 'melody')).toBe(true);
  expect(notes[0].velocity).toBeCloseTo(0.33); expect(notes[0].velocity).toBeGreaterThan(MUSIC.ambientVelocity);
  expect(notes[0].shape.decay).toBeCloseTo(MUSIC.decay);
  expect(playback.position(0.025 + COMPOSE.steps * TICK)).toBeCloseTo(0);
  playback.reset(); expect(playback.position(0)).toBe(-1);
});

test('edits and knobs stay in the selected lane and map to audible voice parameters', () => {
  const score = new Score(), melody = structuredClone(score.lane('melody'));
  score.select('air'); score.setNote(3, 8); score.setKnob('lift', 1); score.setInstrument('glass');
  score.setKnob('length', 0); score.setKnob('tone', 1); score.setKnob('level', 0.9);
  const note = new ScorePlayback(score).note('air', 3);
  expect(note.index).toBe(13); expect(SCALE).toContain(SCALE[note.index]);
  expect(note.shape.instrument).toBe('glass');
  expect(note.shape.decay).toBe(COMPOSE.decayMin); expect(note.shape.cutoff).toBe(COMPOSE.cutoffLow + COMPOSE.cutoffRange);
  expect(note.velocity).toBeCloseTo(0.9 * COMPOSE.baseVelocity); expect(score.lane('melody')).toEqual(melody);
  score.toggleLane(); expect(new ScorePlayback(score).schedule(0, 3)).toEqual([]);
});

for (const variant of ['starter', 'reordered-polyphonic']) {
  test(`saved ${variant} score round-trips by lane ID`, () => {
    const state = createComposition();
    if (variant === 'reordered-polyphonic') {
      state.selected = 'undertow'; state.lanes.reverse();
      const score = new Score(state); score.setNote(23, 15); score.setKnob('tone', 0);
      score.select('air'); score.setNote(0, 2); score.setKnob('length', 1); score.setInstrument('reed');
    }
    expect(parseComposition(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const storage = { getItem: (key: string) => key === COMPOSE.storageKey ? JSON.stringify(state) : null };
    expect(loadComposition(storage)).toEqual(state);
  });
}

for (const reverse of [false, true]) {
  test(`legacy ${reverse ? 'reordered' : 'starter'} music migrates without changing its sound`, () => {
    const state = createComposition();
    if (reverse) { state.lanes.reverse(); state.selected = 'air'; new Score(state).setNote(23, 12); }
    const legacy = { ...state, lanes: state.lanes.map(({ instrument, ...lane }) => { expect(instrument).toBe('pluck'); return lane; }) };
    expect(parseComposition(legacy)).toEqual(state);
    const malformed = { ...state, lanes: state.lanes.map((lane) => ({ ...lane, instrument: 'unrecognised' })) };
    const raw = JSON.stringify(malformed), storage = { getItem: () => raw };
    expect(() => loadComposition(storage)).toThrow('instrument'); expect(storage.getItem()).toBe(raw);
  });
}

test('invalid values and duplicate lanes fail instead of overwriting saved music', () => {
  const score = new Score();
  expect(() => score.setNote(-1, 4)).toThrow('step'); expect(() => score.setNote(0, NaN)).toThrow('finite');
  expect(() => score.setKnob('level', Infinity)).toThrow('level');
  expect(() => score.shiftLane('melody', 0.5)).toThrow('whole');
  const duplicate = createComposition(); duplicate.lanes[1] = structuredClone(duplicate.lanes[0]);
  expect(() => parseComposition(duplicate)).toThrow('once');
  const invalid = createComposition(); invalid.lanes[0].notes[0] = 90;
  expect(() => parseComposition(invalid)).toThrow('note');
});

for (const variant of ['starter', 'irregular-air']) {
  test(`shifts the ${variant} lane in both directions with lossless wrapping`, () => {
    const score = new Score();
    if (variant === 'irregular-air') { score.select('air'); score.setNote(0, 11); score.setNote(7, 0); score.setNote(23, 2); }
    const before = structuredClone(score.state), id = score.state.selected;
    const onsets = () => score.selected.notes.flatMap((pitch, step) => pitch === null ? [] : [[step, pitch]]);
    score.shiftLane(id, COMPOSE.steps + 2);
    expect(onsets()).toEqual(variant === 'starter' ? [[2, 0], [6, 4], [10, 7], [14, 9], [18, 4], [22, 2]] : [[1, 2], [2, 11], [9, 0]]);
    expect(score.state.lanes.filter((lane) => lane.id !== id)).toEqual(before.lanes.filter((lane) => lane.id !== id));
    score.shiftLane(id, -2); expect(score.state).toEqual(before);
    score.shiftLane(id, -COMPOSE.steps - 2);
    expect(onsets()).toEqual(variant === 'starter' ? [[2, 4], [6, 7], [10, 9], [14, 4], [18, 2], [22, 0]] : [[5, 0], [21, 2], [22, 11]]);
    score.shiftLane(id, 2); expect(score.state).toEqual(before);
    score.shiftLane(id, 2);
    expect(new ScorePlayback(score).schedule(2 * TICK, 2).find((note) => note.lane === id)?.index).toBe(variant === 'starter' ? 0 : 11);
  });
}
