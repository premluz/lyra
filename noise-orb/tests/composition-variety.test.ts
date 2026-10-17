import { expect, test } from 'vitest';
import { compositionFixture } from './composition-fixtures';
import { COMPOSITION, FORMS } from '../src/composer/composition-config';
import { COMPOSE } from '../src/composer/config';
import { ScorePlayback } from '../src/composer/playback';
import { TICK } from '../src/score';
import { parseComposition } from '../src/composer/storage';
import { voiceEnvelope } from '../src/audio/envelope';
import { MusicField } from '../src/composer/music-field';

for (const variant of ['trio', 'custom-polyphony'] as const) {
  for (const form of FORMS.filter((form) => form.id !== 'loop')) {
    test(`${form.label} develops four phrases using the ${variant} theme without rewriting it`, () => {
      const score = compositionFixture(variant); score.setForm(form.id);
      const before = structuredClone(score.state), source = new ScorePlayback(score), phrases: string[] = [];
      for (let phrase = 0; phrase < COMPOSITION.phrases; phrase++) {
        const notes = Array.from({ length: COMPOSE.steps }, (_, step) => source.schedule((phrase * COMPOSE.steps + step) * TICK, phrase * COMPOSE.steps + step)).flat();
        phrases.push(JSON.stringify(notes)); expect(notes.length).toBeGreaterThan(0);
        for (const note of notes) {
          expect(note.index).toBeGreaterThanOrEqual(0); expect(note.index).toBeLessThanOrEqual(COMPOSE.pitchMax); expect(Number.isInteger(note.index)).toBe(true);
          expect(score.lane(note.lane).notes[note.step]).not.toBeNull();
          expect(voiceEnvelope(note.shape).duration).toBeGreaterThan(0); expect(note.velocity).toBeGreaterThan(0);
        }
      }
      expect(new Set(phrases).size).toBeGreaterThanOrEqual(3); expect(score.state).toEqual(before);
      expect(parseComposition(JSON.parse(JSON.stringify(before)))).toEqual(before);
    });
  }
  test(`older ${variant} saves retain literal playback and invalid composition data stays intact`, () => {
    const score = compositionFixture(variant), { form, ...legacy } = score.state; expect(form).toBe('loop');
    expect(parseComposition(legacy)).toEqual(score.state);
    const invalid = { ...score.state, form: 'not-a-style' }, before = JSON.stringify(invalid);
    expect(() => parseComposition(invalid)).toThrow('composition style'); expect(JSON.stringify(invalid)).toBe(before);
  });
}
test('the same theme keeps single-note hooks, varied tails, offbeat timing and sparse replies', () => {
  const score = compositionFixture(), playback = new ScorePlayback(score);
  score.setForm('flowing'); const flow = playback.schedule(0, 0); expect(flow.filter((note) => note.lane === 'undertow')).toHaveLength(1);
  expect(flow.every((note) => note.shape.hold === 0 && note.shape.attack === undefined)).toBe(true);
  score.setForm('broken'); const broken = playback.schedule(3 * TICK, 3)[0];
  expect(broken.delay).toBeCloseTo(0.28 * TICK); expect(broken.shape.hold).toBe(0);
  score.setForm('conversation'); expect(playback.schedule(2 * TICK, 2)).toEqual([]);
  expect(playback.schedule((COMPOSE.steps + 2) * TICK, COMPOSE.steps + 2).some((note) => note.lane === 'air')).toBe(true);
  expect(playback.schedule((COMPOSE.steps + 3) * TICK, COMPOSE.steps + 3).some((note) => note.lane === 'melody')).toBe(true);
  score.setForm('loop'); expect(playback.schedule(2 * TICK, 2).map((note) => note.lane)).toEqual(['air']);
});
test('orb pulses follow a ringing note through its natural decay', () => {
  const score = compositionFixture(); score.setForm('flowing');
  const note = new ScorePlayback(score).schedule(2 * TICK, 2).find((note) => note.lane === 'air');
  if (!note) throw new Error('Ringing accent is missing.');
  const envelope = voiceEnvelope(note.shape), field = new MusicField(score), audio = { level: 0.05, bass: 0.5, mid: 0.4, treble: 0.1 };
  field.note({ ...note, time: 1, midi: 50, user: true, envelope });
  expect(envelope.hold).toBe(0);
  field.update(0.9, 1, audio); expect(field.pulses[2].x).toBe(0);
  field.update(1 + envelope.attack + envelope.release / 4, 1, audio); expect(field.pulses[2].x).toBeGreaterThan(0.01);
  field.update(1 + envelope.duration + 0.1, 1, audio); expect(field.pulses[2].x).toBe(0);
});

test('phrase display follows audible time and resets without changing the saved theme', () => {
  const score = compositionFixture(); score.setForm('flowing'); const source = new ScorePlayback(score), origin = 0.025;
  source.schedule(origin, 0); expect(source.phrase(origin - 0.001)).toBe(0);
  for (let phrase = 0; phrase < COMPOSITION.phrases; phrase++) expect(source.phrase(origin + phrase * COMPOSE.steps * TICK + 0.001)).toBe(phrase);
  expect(source.phrase(origin + COMPOSITION.phrases * COMPOSE.steps * TICK + 0.001)).toBe(0);
  source.reset(); expect(source.phrase(100)).toBe(0); expect(source.position(100)).toBe(-1);
});
