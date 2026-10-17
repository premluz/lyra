import { expect, test } from '@playwright/test';
import { MUSIC } from '../src/config';
import { SCALE, TICK } from '../src/score';

test('ten seconds of random input stays quantized, pentatonic and bounded', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Start sound', exact: true }).click();
  const notes = await page.evaluate(async () => {
    const path = '/src/audio/engine.ts';
    const { SoundEngine }: typeof import('../src/audio/engine') = await import(path);
    const notes: import('../src/score').NoteEvent[] = [];
    const sound = new SoundEngine((event) => notes.push(event), (error) => { throw error; });
    let seed = 749;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    sound.request({ x: 0, z: 0, nx: 0.5, depth: 0.5 }, 0.7, true);
    await sound.unlock();
    const start = sound.time;
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        const nx = random(), depth = random(), point = { nx, depth, x: (nx * 2 - 1) * 3, z: (1 - depth * 2) * 3 };
        if (random() > 0.5) sound.drag(point, random(), random());
        else { sound.release(); sound.request(point, random(), random() > 0.5); }
        if (sound.time - start >= 10) { clearInterval(timer); resolve(); }
      }, 17);
    });
    await sound.close(); return notes;
  });
  expect(notes.length).toBeGreaterThanOrEqual(27); expect(notes[0].time).toBeLessThan(TICK);
  notes.forEach((note, i) => {
    expect(SCALE).toContain(note.midi); expect(note.user).toBe(true);
    if (i) {
      expect(note.time - notes[i - 1].time).toBeCloseTo(TICK, 6);
      expect(Math.abs(note.index - notes[i - 1].index)).toBeLessThanOrEqual(MUSIC.maxLeap);
    }
    if (i > 1) expect(note.index === notes[i - 1].index && note.index === notes[i - 2].index).toBe(false);
    expect(notes.filter((other) => other.time <= note.time && other.time + MUSIC.decay > note.time).length).toBeLessThanOrEqual(MUSIC.maxVoices);
  });
});
