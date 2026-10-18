import { expect, test } from '@playwright/test';
import { MUSIC } from '../src/config';

test('late taps take the upcoming beat and replace queued ambient notes', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Start sound', exact: true }).click();
  const result = await page.evaluate(async () => {
    const path = '/src/audio/engine.ts';
    const { SoundEngine }: typeof import('../src/audio/engine') = await import(path);
    const events: import('../src/score').NoteEvent[] = [];
    const sound = new SoundEngine((event) => events.push(event), (error) => { throw error; });
    await sound.unlock();
    const ambient = events[0];
    sound.request({ x: 2, z: -2, nx: 0.8, depth: 0.8 }, 0.7, true);
    const replacement = events.at(-1);
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => { if (sound.time >= 0.33) { clearInterval(timer); resolve(); } }, 5);
    });
    const requestedAt = sound.time;
    sound.request({ x: -2, z: 2, nx: 0.2, depth: 0.2 }, 0.7, true);
    const late = events.at(-1);
    await sound.close();
    return { ambient, replacement, late, requestedAt };
  });
  expect(result.ambient.user).toBe(false);
  expect(result.replacement?.user).toBe(true);
  expect(result.replacement?.time).toBe(result.ambient.time);
  expect(result.late?.user).toBe(true);
  expect(result.late?.time).toBeGreaterThan(result.requestedAt);
  expect((result.late?.time ?? 0) - result.requestedAt).toBeLessThan(MUSIC.lookahead);
});
