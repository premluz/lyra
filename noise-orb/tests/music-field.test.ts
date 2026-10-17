import { expect, test } from 'vitest';
import { MUSIC_VISUAL } from '../src/composer/visual-config';
import { COMPOSE } from '../src/composer/config';
import { Score } from '../src/composer/model';
import { ScorePlayback } from '../src/composer/playback';
import { MusicField, profileHeight, pulseEnvelope } from '../src/composer/music-field';
import { SILENCE, spectrumFrame } from '../src/audio/meter';

const AUDIO = { level: 0.04, bass: 0.5, mid: 0.6, treble: 0.2 };
for (const variant of ['starter', 'dense-glass-air']) {
  test(`${variant} wave geometry follows its actual phrase, offset and stable lane identity`, () => {
    const score = new Score();
    if (variant === 'dense-glass-air') { score.select('air'); score.setInstrument('glass'); score.setDensity(17); score.setKnob('lift', 1); }
    const field = new MusicField(score), id = score.state.selected, index = score.state.lanes.findIndex((lane) => lane.id === id);
    field.rebuild(); field.update(0, 1, AUDIO);
    const profile = Array.from(field.profiles.slice(index * MUSIC_VISUAL.samples, (index + 1) * MUSIC_VISUAL.samples));
    expect(profile).toEqual(Array.from({ length: MUSIC_VISUAL.samples }, (_, sample) => Math.round(profileHeight(score.selected, sample / MUSIC_VISUAL.samples) * MUSIC_VISUAL.textureMax)));
    const angle = field.lanes[index].w;
    score.shiftLane(id, 7); field.invalidate(); expect(field.rebuild()).toBe(true);
    expect(Array.from(field.profiles.slice(index * MUSIC_VISUAL.samples, (index + 1) * MUSIC_VISUAL.samples))).not.toEqual(profile);
    score.state.lanes.reverse(); field.invalidate(); field.rebuild(); field.update(0, 1, AUDIO);
    expect(field.lanes[score.state.lanes.findIndex((lane) => lane.id === id)].w).toBe(angle);
    score.lane(id).enabled = false; field.invalidate(); field.rebuild();
    const moved = score.state.lanes.findIndex((lane) => lane.id === id);
    expect(field.profiles.slice(moved * MUSIC_VISUAL.samples, (moved + 1) * MUSIC_VISUAL.samples).every((value) => value === 0)).toBe(true);
  });
}
test('note pulses use the emitted pitch, wait for audio time, decay and stop in silence', () => {
  const score = new Score(), field = new MusicField(score), note = new ScorePlayback(score).note('melody', 0);
  field.note({ ...note, time: 4, index: 13, midi: 81, user: true });
  field.update(3.99, 1, AUDIO); expect(field.pulses[0].x).toBe(0);
  field.update(4.05, 1, AUDIO); expect(field.pulses[0].x).toBeGreaterThan(0); expect(field.pulses[0].y).toBe(13 / COMPOSE.pitchMax);
  const attack = field.pulses[0].x;
  field.update(4.9, 1, AUDIO); expect(field.pulses[0].x).toBeLessThan(attack);
  field.update(5, 10, SILENCE); expect(field.pulses[0].x).toBeLessThan(0.000001);
  field.reset(); expect(field.spectrum.toArray()).toEqual([0, 0, 0, 0]);
  expect(pulseEnvelope({ start: 4, attack: 0.2, duration: 2 }, 4.2)).toBeCloseTo(1);
  expect(pulseEnvelope({ start: 4, attack: 0.2, duration: 2 }, 6)).toBe(0);
});
test('output analysis distinguishes bass and high-register audio and rejects digital silence', () => {
  const wave = new Float32Array(256).fill(0.03), low = new Float32Array(128).fill(-Infinity), high = low.slice();
  low[1] = -24; high[20] = -24;
  const bass = spectrumFrame(wave, low, 44100), treble = spectrumFrame(wave, high, 44100);
  expect(bass.bass).toBeGreaterThan(bass.treble); expect(treble.treble).toBeGreaterThan(treble.bass);
  expect(bass.level).toBeCloseTo(0.03); expect(spectrumFrame(new Float32Array(256), high, 44100)).toEqual(SILENCE);
});
