import { describe, expect, test } from 'vitest';
import { MUSIC } from '../src/config';
import { NotePolicy, SCALE, TICK, frequency, pitchAt } from '../src/score';

describe('musical guardrails', () => {
  test('D3–D6 is pentatonic and the eighth-note clock is 84 BPM', () => {
    expect(SCALE[0]).toBe(50); expect(SCALE.at(-1)).toBe(86);
    for (const midi of SCALE) expect(MUSIC.intervals).toContain((midi - MUSIC.root) % 12);
    expect(TICK).toBeCloseTo(0.357142857); expect(frequency(69)).toBe(440);
  });

  for (const requests of [Array.from({ length: 200 }, (_, i) => i % 2 ? 15 : 0), Array.from({ length: 200 }, (_, i) => Math.floor(i / 9) % SCALE.length)]) {
    test(`folds leaps and prevents three repeated notes for ${requests.slice(0, 4)}`, () => {
      const policy = new NotePolicy(), notes = requests.map((index) => policy.choose(index));
      notes.forEach((index, i) => {
        expect(index).toBeGreaterThanOrEqual(0); expect(index).toBeLessThan(SCALE.length);
        if (i) expect(Math.abs(index - notes[i - 1])).toBeLessThanOrEqual(MUSIC.maxLeap);
        if (i > 1) expect(index === notes[i - 1] && index === notes[i - 2]).toBe(false);
      });
    });
  }

  test('tap depth changes octave while preserving the horizontal pitch class', () => {
    const near = pitchAt({ x: 0, z: 3, nx: 0.4, depth: 0 }, true);
    const far = pitchAt({ x: 0, z: -3, nx: 0.4, depth: 1 }, true);
    expect(far - near).toBe(10); expect(SCALE[far] - SCALE[near]).toBe(24);
  });
});
