import { expect, test } from '@playwright/test';
import { openDevSettings } from './composer-helpers';

test('an empty authored score has no pad, automatic tune or pointer notes', async ({ page }) => {
  await page.goto('/shape.html'); await page.getByRole('button', { name: 'Exit', exact: true }).click();
  const result = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts', modelPath = '/src/composer/model.ts', playbackPath = '/src/composer/playback.ts';
    const { SoundEngine }: typeof import('../src/audio/engine') = await import(enginePath);
    const { Score }: typeof import('../src/composer/model') = await import(modelPath);
    const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
    const score = new Score(); score.state.lanes.forEach((lane) => lane.notes.fill(null));
    const notes: import('../src/score').NoteEvent[] = [], playback = new ScorePlayback(score);
    const sound = new SoundEngine((note) => notes.push(note), (error) => { throw error; }, playback);
    await sound.unlock(); let peak = 0;
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        const point = { nx: 0.5, depth: 0.5, x: 0, z: 0 };
        sound.request(point, 1, true); sound.request(point, 1); sound.drag(point, 1, 1);
        peak = Math.max(peak, sound.level, sound.analysis.level);
        if (sound.time > 1.6) { clearInterval(timer); resolve(); }
      }, 25);
    });
    await sound.close(); return { peak, notes, authored: playback.authoredOnly, bed: playback.continuous().legacyBed };
  });
  expect(result).toEqual({ peak: 0, notes: [], authored: true, bed: false });
});

test('authored notes, wave edits and render treatment all change the rendered orb at audio time', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/shape.html'); await page.getByRole('button', { name: 'Exit', exact: true }).click();
  const result = await page.evaluate(async () => {
    const path = '/tests/music-render-probe.ts';
    const { musicRenderProbe }: typeof import('./music-render-probe') = await import(path);
    return musicRenderProbe();
  });
  expect(result.future).toBe(0); expect(result.tail).toBeLessThan(10);
  for (const value of [result.onset, result.changedScore, result.secondVoice, result.treatment]) expect(value).toBeGreaterThan(1000);
  expect(errors).toEqual([]);
  await expect(page.locator('#mesh canvas')).toHaveScreenshot('music-orb.png');
});

test('render treatment persists and both modes compile in the composer', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/shape.html');
  await openDevSettings(page);
  await page.getByLabel('Render treatment', { exact: true }).selectOption('halftone');
  await page.reload(); await openDevSettings(page); await expect(page.getByLabel('Render treatment', { exact: true })).toHaveValue('halftone');
  await page.getByRole('button', { name: 'Start sound', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
  await expect(page.locator('#status')).toBeEmpty(); expect(errors).toEqual([]);
});
