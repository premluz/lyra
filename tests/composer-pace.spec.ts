import { expect, test } from '@playwright/test';
import { saved } from './composer-helpers';
import { TICK } from '../src/score';
import { COMPOSE } from '../src/composer/config';

test('lane rate changes only the selected sound, persists and is included in Randomise Undo', async ({ page }) => {
  await page.goto('/shape.html'); await page.getByRole('button', { name: 'Select Air', exact: true }).click();
  const before = await saved(page), rate = page.getByRole('slider', { name: 'Air rate', exact: true });
  await rate.press('End'); await expect(page.locator('#rate-value')).toHaveText('2× · 168 BPM');
  const changed = await saved(page); expect(changed.lanes.find((lane) => lane.id === 'air')?.rate).toBe(2);
  expect(changed.lanes.filter((lane) => lane.id !== 'air')).toEqual(before.lanes.filter((lane) => lane.id !== 'air'));
  await page.reload(); await expect(rate).toHaveValue('3');
  await page.getByRole('button', { name: 'Randomise', exact: true }).click();
  expect(new Set((await saved(page)).lanes.map((lane) => lane.rate)).size).toBe(3);
  await page.getByRole('button', { name: 'Undo randomise', exact: true }).click(); expect(await saved(page)).toEqual(changed);
  await page.getByRole('button', { name: 'Remove wave', exact: true }).click();
  await page.getByRole('button', { name: 'Undo remove wave', exact: true }).click(); expect(await saved(page)).toEqual(changed);
  await expect(page.locator('#status')).toBeEmpty();
});
test('three-over-two notes reach the audio engine at their exact local tempo', async ({ page }) => {
  await page.goto('/shape.html'); await page.getByRole('button', { name: 'Exit', exact: true }).click();
  const heard = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts', modelPath = '/src/composer/model.ts', playbackPath = '/src/composer/playback.ts';
    const { SoundEngine }: typeof import('../src/audio/engine') = await import(enginePath);
    const { Score }: typeof import('../src/composer/model') = await import(modelPath);
    const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
    const score = new Score(); score.setRate(1.5); score.selected.notes = score.selected.notes.map((_, step) => step % 3 + 2);
    const heard: import('../src/score').NoteEvent[] = [], source = new ScorePlayback(score);
    const sound = new SoundEngine((event) => heard.push(event), (error) => { throw error; }, source);
    await sound.unlock();
    await new Promise<void>((resolve) => { const timer = setInterval(() => { if (sound.time > 1.7) { clearInterval(timer); resolve(); } }, 25); });
    await sound.close(); return heard;
  });
  expect(heard.length).toBeGreaterThanOrEqual(7);
  heard.forEach((note, index) => { expect(note.step).toBe(index); expect(note.time - heard[0].time).toBeCloseTo(index * TICK / 1.5, 6); });
  expect(heard[0].time).toBeLessThan(TICK);
});
for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`denser generated ${variant} hooks are louder and render finite audio below clipping`, async ({ page }) => {
    await page.goto('/shape.html'); await page.getByRole('button', { name: 'Exit', exact: true }).click();
    const result = await page.evaluate(async ({ variant, baselineScale }) => {
      const path = '/tests/composition-audio-probe.ts'; const { arrangementMixProbe }: typeof import('./composition-audio-probe') = await import(path);
      const generation = { seed: variant === 'trio' ? 4711 : 95127, variant };
      const louder = await arrangementMixProbe('flowing', generation), baseline = await arrangementMixProbe('flowing', generation, baselineScale);
      return { ...louder, baselineEnergy: baseline.energy };
    }, { variant, baselineScale: 0.4 / COMPOSE.baseVelocity });
    expect(result.finite).toBe(true); expect(result.energy).toBeGreaterThan(0.1); expect(result.peak).toBeLessThan(0.81);
    expect(result.energy).toBeGreaterThan(result.baselineEnergy * 1.3);
  });
}
test.describe('phone lane rates', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('rate stays compact and works with touch and the existing density control', async ({ page }) => {
    await page.goto('/shape.html'); const rate = page.getByRole('slider', { name: 'Melody rate', exact: true });
    await rate.scrollIntoViewIfNeeded(); const bounds = await rate.boundingBox();
    if (!bounds) throw new Error('Phone rate control has no layout bounds.');
    await rate.tap({ position: { x: bounds.width - 2, y: bounds.height / 2 } }); await expect(rate).toHaveValue('3');
    const state = await saved(page); expect(state.lanes[0].rate).toBe(2);
    await expect(page.getByRole('slider', { name: 'Melody density', exact: true })).toHaveValue('6');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.reload(); await expect(rate).toHaveValue('3');
  });
});

test('double-speed queued notes each flash their own dot at audible time', async ({ page }) => {
  await page.goto('/shape.html');
  const pulses = await page.evaluate(async () => {
    const modelPath = '/src/composer/model.ts', surfacePath = '/src/composer/surface.ts', clockPath = '/src/score.ts';
    const { Score }: typeof import('../src/composer/model') = await import(modelPath);
    const { WaveSurface }: typeof import('../src/composer/surface') = await import(surfacePath);
    const { TICK }: typeof import('../src/score') = await import(clockPath);
    const score = new Score(); score.setRate(2); score.setDensity(24);
    const surface = new WaveSurface(score, () => {}, () => {});
    surface.note('melody', 1, 0); surface.note('melody', 1 + TICK / 2, 1);
    return [0.95, 1.05, 1.05 + TICK / 2, 1 + TICK * 2].map((time) => {
      surface.paint(time, 0);
      return [...surface.element.querySelectorAll('.note-dot.lane-melody')].flatMap((dot, step) => dot.getAttribute('data-playing') === 'true' ? [step] : []);
    });
  });
  expect(pulses).toEqual([[], [0], [1], []]);
});
