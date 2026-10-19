import { expect, test } from 'vitest';
import { random, setSeed } from '../src/particle-core/random';
import { compositionFixture } from './composition-fixtures';
import { RANDOMISE } from '../src/composer/randomise-config';
import { COMPOSITION, FORMS } from '../src/composer/composition-config';
import { COMPOSE } from '../src/composer/config';
import { ScorePlayback } from '../src/composer/playback';
import { voiceEnvelope } from '../src/audio/envelope';
import { pitchFor } from '../src/composer/model';
import { NotePolicy, TICK } from '../src/score';
import { supportingNotes } from '../src/composer/accompaniment';
import { hookNotes } from '../src/composer/hook';
import { GONG_INSTRUMENTS } from '../src/audio/instruments';

test('generated gongs stay in the sparse accent palette', () => {
  for (const { id } of GONG_INSTRUMENTS) expect(RANDOMISE.wavyInstruments).toContain(id);
});

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`generated ${variant} tunes keep a plucked lead and at most one quiet wavy accent`, () => {
    const score = compositionFixture(variant); setSeed(variant === 'trio' ? 528 : 7654321);
    const instruments = new Set<string>(), patterns = new Set<string>();
    for (let sample = 0; sample < 40; sample++) {
      score.randomise(random); const wavy = score.state.lanes.filter((lane) => RANDOMISE.wavyInstruments.some((id) => id === lane.instrument));
      expect(wavy.length).toBeLessThanOrEqual(1);
      for (const lane of score.state.lanes) {
        instruments.add(lane.instrument);
        if (lane.role === 'undertow') expect(RANDOMISE.bassInstruments).toContain(lane.instrument);
        if (lane.role === 'melody') {
          expect(RANDOMISE.melodicInstruments.some((id) => id === lane.instrument)).toBe(true);
          expect(lane.notes[0]).toBe(0); expect(pitchFor(lane, 0)).toBe(0);
        }
      }
      for (const lane of wavy) {
        expect(lane.role).toBe('air'); expect(lane.level).toBeLessThanOrEqual(RANDOMISE.wavyLevel[1]);
        expect(lane.notes.filter((note) => note !== null).length).toBeLessThanOrEqual(RANDOMISE.wavyCount[1]);
      }
      patterns.add(JSON.stringify(score.state.lanes.map((lane) => lane.notes)));
    }
    expect(patterns.size).toBe(40);
    for (const instrument of RANDOMISE.melodicInstruments) expect(instruments.has(instrument)).toBe(true);
    for (const instrument of RANDOMISE.bassInstruments) expect(instruments.has(instrument)).toBe(true);
  });
  test(`all composition styles keep ${variant} voices as decaying notes rather than held chords`, () => {
    const score = compositionFixture(variant), playback = new ScorePlayback(score);
    for (const form of FORMS) {
      score.setForm(form.id);
      for (let tick = 0; tick < COMPOSE.steps * COMPOSITION.phrases; tick++) {
        const notes = playback.schedule(tick, tick);
        expect(new Set(notes.map((note) => note.lane)).size).toBe(notes.length);
        for (const note of notes) {
          expect(voiceEnvelope(note.shape).hold).toBe(0); expect(note.shape.attack).toBeUndefined();
        }
      }
    }
  });
}
test('ringing accents and phrase endings have longer natural tails than the bass and main pulse', () => {
  const score = compositionFixture(); score.setForm('bloom'); const playback = new ScorePlayback(score);
  const opening = playback.schedule(0, 0), lead = opening.find((note) => note.lane === 'melody'), bass = opening.find((note) => note.lane === 'undertow');
  const ending = playback.schedule(22, 22).find((note) => note.lane === 'melody'), air = playback.schedule(2, 2).find((note) => note.lane === 'air');
  if (!lead || !bass || !ending || !air) throw new Error('Melodic articulation fixture is incomplete.');
  expect(voiceEnvelope(ending.shape).duration).toBeGreaterThan(voiceEnvelope(lead.shape).duration);
  expect(voiceEnvelope(air.shape).duration).toBeGreaterThan(voiceEnvelope(bass.shape).duration);
});

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`${variant} generations retain an audible hook, cadence and breathing space with varied lane clocks`, () => {
    const score = compositionFixture(variant); setSeed(variant === 'trio' ? 63411 : 912887);
    const lead = score.state.lanes.find((lane) => lane.role === 'melody');
    if (!lead) throw new Error('Fixture has no melodic lead.');
    const tunes = new Set<string>(), rhythms = new Set<string>(), tempos = new Set<number>();
    for (let sample = 0; sample < 100; sample++) {
      score.randomise(random); const melody = score.lane(lead.id), pitches = melody.notes.filter((pitch) => pitch !== null);
      expect(melody.rate).toBe(1); expect(melody.notes[0]).toBe(0); expect(pitches.at(-1)).toBeLessThanOrEqual(4);
      expect(new Set(pitches).size).toBeGreaterThanOrEqual(3); expect(pitches.length).toBeGreaterThanOrEqual(12); expect(pitches.length).toBeLessThanOrEqual(16);
      const onsets = melody.notes.flatMap((pitch, step) => pitch === null ? [] : [step]);
      expect(Math.max(...onsets.map((step, index) => (onsets[(index + 1) % onsets.length] - step + COMPOSE.steps) % COMPOSE.steps))).toBeLessThanOrEqual(3);
      for (const lane of score.state.lanes.filter((lane) => lane.role === 'air' && !RANDOMISE.wavyInstruments.some((id) => id === lane.instrument))) {
        expect(lane.notes.filter((pitch) => pitch !== null).length).toBeGreaterThanOrEqual(8);
      }
      expect(new Set(score.state.lanes.map((lane) => lane.rate)).size).toBeGreaterThanOrEqual(3);
      const policy = new NotePolicy(), source = new ScorePlayback(score);
      for (let tick = 0; tick <= COMPOSE.steps * COMPOSITION.phrases; tick++) {
        for (const note of source.schedule(tick * TICK, tick).filter((note) => note.lane === lead.id)) expect(policy.choose(note.index)).toBe(note.index);
      }
      tunes.add(JSON.stringify(pitches)); rhythms.add(JSON.stringify(melody.notes.map((pitch) => pitch !== null)));
      score.state.lanes.forEach((lane) => tempos.add(lane.rate));
    }
    expect(tunes.size).toBeGreaterThan(30); expect(rhythms.size).toBeGreaterThan(15); expect([...tempos].sort()).toEqual([0.5, 1, 1.5, 2]);
  });
}
test('supporting voices make space for the hook rather than all striking together', () => {
  const score = compositionFixture(), melody = score.lane('melody'), bass = score.lane('undertow');
  for (const hook of [melody.notes, hookNotes(RANDOMISE.profiles.melody, (range) => range[0], 'loop', melody.notes)]) {
    const notes = supportingNotes(bass, hook, RANDOMISE.profiles.undertow, 1, (range) => range[0]);
    const overlaps = (pattern: readonly (number | null)[]) => pattern.filter((pitch, step) => pitch !== null && hook[step] !== null).length;
    const alternatives = Array.from({ length: COMPOSE.steps }, (_, offset) => overlaps(notes.map((_, step) => notes[(step + offset) % COMPOSE.steps])));
    expect(notes.filter((pitch) => pitch !== null)).toEqual([0, 3, 0]);
    expect(overlaps(notes)).toBe(Math.min(...alternatives)); expect(overlaps(notes)).toBeLessThan(3);
  }
});
test('constant entropy still changes an embellished hook without weakening the cadence', () => {
  let previous: (number | null)[] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    const notes = hookNotes(RANDOMISE.profiles.melody, (range) => range[1], 'flowing', previous);
    expect(notes).not.toEqual(previous); expect(notes[0]).toBe(0);
    previous = notes;
  }
});
