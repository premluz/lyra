import { expect, test } from 'vitest';
import { encodePhrase, decodePhrase, choosePhrase } from '../src/magenta/sequence';
import { createV2Composition } from '../src/composer/v2/generator';
import { parseComposition } from '../src/composer/storage';
import { Score } from '../src/composer/model';
import { ScorePlayback } from '../src/composer/playback';
import { COMPOSE } from '../src/composer/config';
import { TICK } from '../src/score';
import { transcribe } from '../src/draw-music/stroke';
import { DrawDocument, blankDocument, parseDocument } from '../src/draw-music/document';
import { interpret } from '../src/draw-music/polish';
import { compositionFixture } from './composition-fixtures';
import { arrangePhrase } from '../src/magenta/arrange';
import { isContinuous, createLane } from '../src/composer/lanes';
import { RANDOMISE } from '../src/composer/randomise-config';
import { RATES } from '../src/composer/pace';

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`dense ${variant} phrases remain usable at every lane rate`, () => {
    const score = compositionFixture(variant);
    for (const density of [24, 36]) for (const rate of RATES) {
      score.setDensity(density); score.selected.rate = rate.value;
      const encoded = encodePhrase(score.selected), notes = encoded.notes ?? [];
      expect(new Set(notes.map(note => note.quantizedStartStep)).size).toBe(notes.length);
      notes.forEach((note, index) => {
        expect(note.quantizedEndStep).toBeGreaterThan(note.quantizedStartStep ?? 0);
        expect(note.quantizedEndStep).toBeLessThanOrEqual(notes[index + 1]?.quantizedStartStep ?? 32);
      });
      const phrase = choosePhrase([encoded], score.selected);
      expect(phrase.notes.filter(note => note !== null).length).toBeGreaterThan(16);
      for (const random of [() => 0, () => 0.5, () => 0.99]) {
        expect(() => parseComposition({ ...score.state, ...arrangePhrase(score.state, score.selected, phrase, random) })).not.toThrow();
      }
    }
  });
  test(`an empty MusicVAE candidate does not discard a usable ${variant} variation`, () => {
    const lead = compositionFixture(variant).state.lanes.find(lane => lane.role === 'melody');
    if (!lead) throw new Error('Candidate fixture needs a melody');
    const good = encodePhrase(lead), expected = decodePhrase(good);
    expect(choosePhrase([{ notes: [] }, good, {}], lead)).toEqual(expected);
    expect(choosePhrase([good, { notes: [] }], lead)).toEqual(expected);
    expect(() => choosePhrase([{ notes: [] }, {}], lead)).toThrow('no usable phrases');
  });
  test(`MusicVAE changes instruments on every generation for ${variant} without changing held layers`, () => {
    let state = compositionFixture(variant).state;
    state.lanes.push(createLane('held-pad', 'drone'), createLane('held-beat', 'binaural'));
    const held = structuredClone(state.lanes.filter(isContinuous));
    for (const random of [() => 0, () => 0.5, () => 0.99]) {
      const lead = state.lanes.find(lane => lane.role === 'melody');
      if (!lead) throw new Error('Instrument fixture needs a melody');
      const phrase = { notes: [...lead.notes], gates: lead.notes.map(() => 0) };
      const result = arrangePhrase(state, lead, phrase, random);
      for (const lane of result.lanes.filter(lane => !isContinuous(lane))) {
        expect(lane.instrument).not.toBe(state.lanes.find(source => source.id === lane.id)?.instrument);
        expect(lane.role === 'undertow' ? RANDOMISE.bassInstruments : RANDOMISE.melodicInstruments).toContain(lane.instrument);
      }
      expect(result.lanes.filter(isContinuous)).toEqual(held);
      expect(result.lanes.find(lane => lane.id === lead.id)?.notes).toEqual(phrase.notes);
      state = { ...state, ...result };
    }
  });
  test(`MusicVAE preserves the full ${variant} phrase, including its last quarter and held notes`, () => {
    const lane = compositionFixture(variant).state.lanes[0];
    lane.notes.fill(null); lane.notes[0] = 0; lane.notes[8] = 4; lane.notes[23] = 2;
    lane.gates = lane.notes.map((_, step) => step === 8 ? 3 : 0);
    const encoded = encodePhrase(lane), phrase = decodePhrase(encoded);
    expect(encoded.totalQuantizedSteps).toBe(32); expect(phrase.notes[23]).toBe(2);
    expect(phrase.notes.filter(note => note !== null)).toHaveLength(3); expect(phrase.gates[8]).toBeGreaterThan(1);
    expect(choosePhrase([encoded], lane)).toEqual(phrase);
  });
}
test('durations survive setup parsing, playback, wave shifts, Undo and density edits', () => {
  const state = createV2Composition(), lane = state.lanes[0]; lane.gates = lane.notes.map((_, step) => step === 0 ? 4 : 0);
  const score = new Score(parseComposition(state)), source = new ScorePlayback(score);
  expect(source.note(lane.id, 0).shape.hold).toBe(4 * TICK);
  score.setForm('bloom'); expect(source.schedule(0, 0)[0].shape.hold).toBe(4 * TICK);
  score.shiftLane(lane.id, 2); expect(score.selected.gates?.[2]).toBe(4);
  const before = structuredClone(score.state); score.applyGeneration({ lanes: createV2Composition().lanes, form: 'loop' }); score.undoRandomise();
  expect(score.state).toEqual(before); score.setDensity(36); expect(score.selected.gates).toBeUndefined();
  expect(parseComposition(score.state)).toEqual(score.state);
  expect(() => parseComposition({ ...state, lanes: [{ ...lane, gates: [1] }] })).toThrow('durations');
});
test('a stationary press becomes one held note, while separate strokes add phrases and preserve rests', () => {
  const lane = blankDocument().composition.lanes.find(lane => lane.role === 'melody');
  if (!lane) throw new Error('Drawing fixture needs a melody');
  const held = transcribe(lane, [{ x: 0.2, y: 0.5, time: 0 }, { x: 0.2, y: 0.5, time: 1.1 }]);
  expect(held.notes.filter(note => note !== null)).toHaveLength(1); expect(Math.max(...held.gates ?? [])).toBeGreaterThan(2);
  const added = transcribe(held, [{ x: 0.7, y: 0.2, time: 0 }, { x: 0.9, y: 0.6, time: 0.8 }]);
  expect(added.notes[5]).toBe(held.notes[5]); expect(added.notes[11]).toBeNull();
  expect(added.notes.filter(note => note !== null)).toHaveLength(3);
});
test('drawing documents save independently and Undo restores both score and authorship', () => {
  const items = new Map<string, string>(), storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); } };
  const document = new DrawDocument(storage, () => {}), original = structuredClone(document.data);
  document.capture([{ x: 0.1, y: 0.4, time: 0 }, { x: 0.8, y: 0.7, time: 1 }]);
  expect(document.data.authored).toEqual(['melody']); expect(new DrawDocument(storage, () => {}).data).toEqual(document.data);
  document.undo(); expect(document.data).toEqual(original);
  expect(() => parseDocument({ ...original, authored: ['unknown'] })).toThrow('authored');
});
test('zero interpretation preserves the drawing and larger interpretation preserves its endpoint anchors', () => {
  const lane = createV2Composition().lanes[0], alternative = { notes: lane.notes.map(note => note === null ? 3 : 8), gates: lane.notes.map(() => 0) };
  expect(interpret(lane, alternative, 0).notes).toEqual(lane.notes);
  const interpreted = interpret(lane, alternative, 1), last = lane.notes.reduce<number>((last, note, step) => note === null ? last : step, 0);
  expect(interpreted.notes[0]).toBe(lane.notes[0]); expect(interpreted.notes[last]).toBe(lane.notes[last]);
  expect(interpreted.notes).not.toEqual(lane.notes);
});
test('invalid model output is reported rather than replacing a tune with an unrelated generator', () => {
  expect(() => decodePhrase({ notes: [{ pitch: 60, quantizedStartStep: 40, quantizedEndStep: 41 }] })).toThrow('invalid');
  expect(() => decodePhrase({ notes: [] })).toThrow('empty');
  expect(choosePhrase([{ notes: [{ pitch: 60, quantizedStartStep: 0, quantizedEndStep: 1 }] }], createV2Composition().lanes[0]).notes.filter(note => note !== null)).toHaveLength(1);
  expect(COMPOSE.steps).toBe(24);
});
test('candidate ranking compares the sounding contour even when onsets do not align', () => {
  const lane = createV2Composition().lanes[0], good = encodePhrase(lane);
  const shifted = { ...good, notes: (good.notes ?? []).map(note => ({ ...note, pitch: (note.pitch ?? 0) + 12,
    quantizedStartStep: (note.quantizedStartStep ?? 0) + 1, quantizedEndStep: (note.quantizedEndStep ?? 0) + 1 })) };
  expect(choosePhrase([shifted, good], lane)).toEqual(decodePhrase(good));
});
