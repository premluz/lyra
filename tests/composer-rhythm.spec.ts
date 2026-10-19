import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { saved, enableAmbient, openDevSettings } from './composer-helpers';
import { TICK } from '../src/score';

async function slider(page: Page, name: string, value: number) {
  const input = page.getByRole('slider', { name, exact: true });
  await input.press('Home');
  for (let i = 0; i < value; i++) await input.press('ArrowRight');
}

test('melodic tools are the default and Ambient tools can be shown, hidden and resumed', async ({ page }) => {
  await page.goto('/shape.html'); await openDevSettings(page);
  const mode = page.getByRole('switch', { name: 'Ambient tools', exact: true });
  await expect(mode).not.toBeChecked(); await expect(page.locator('#ambient-panel')).toBeHidden();
  await expect(page.getByRole('combobox', { name: 'Melody instrument', exact: true }).locator('option')).toHaveCount(14);
  await expect(page.locator('#lane-role option[value="binaural"]')).toHaveAttribute('hidden', '');
  await expect(page.getByRole('slider', { name: 'Melody density', exact: true })).toHaveValue('6');
  await enableAmbient(page); await expect(page.getByRole('button', { name: 'Add 528 drone layers', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add 528 drone layers', exact: true }).click();
  const ambient = (await saved(page)).lanes.filter((lane) => lane.role === 'drone' || lane.role === 'binaural');
  await mode.setChecked(false); await expect(page.locator('#ambient-panel')).toBeHidden();
  await expect(page.locator('.lane-tab:visible')).toHaveCount(3); await expect(page.locator('.wave-line[visibility="visible"]')).toHaveCount(3);
  await expect(page.locator('#loop-label')).toHaveText('84 BPM · 3 BARS · D MAJOR');
  await expect(page.getByRole('slider', { name: 'Melody density', exact: true })).toBeVisible();
  const plan = await page.evaluate(async () => {
    const storagePath = '/src/composer/storage.ts', modelPath = '/src/composer/model.ts', playbackPath = '/src/composer/playback.ts';
    const { loadComposition }: typeof import('../src/composer/storage') = await import(storagePath);
    const { Score }: typeof import('../src/composer/model') = await import(modelPath);
    const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
    const playback = new ScorePlayback(new Score(loadComposition(localStorage)));
    return { held: playback.continuous().lanes, notes: playback.schedule(0, 0), tuning: playback.tuning() };
  });
  expect(plan.held).toEqual([]); expect(plan.notes.some((note) => note.lane === 'melody')).toBe(true); expect(plan.tuning).toBe(1);
  await page.reload(); await openDevSettings(page); await expect(mode).not.toBeChecked(); await expect(page.locator('#ambient-panel')).toBeHidden();
  expect((await saved(page)).lanes.filter((lane) => lane.role === 'drone' || lane.role === 'binaural')).toEqual(ambient);
  await enableAmbient(page); await expect(page.getByRole('button', { name: 'Add 528 drone layers', exact: true })).toBeVisible();
});

test('each wave gets its own note density and offset, which drive the playback schedule and survive reload', async ({ page }) => {
  await page.goto('/shape.html'); await slider(page, 'Melody density', 12);
  await page.getByRole('button', { name: 'Select Air', exact: true }).click(); await slider(page, 'Air density', 3); await slider(page, 'Air offset', 3);
  await expect(page.locator('#density-value')).toHaveText('3 / 36 notes'); await expect(page.locator('#offset-value')).toHaveText('3 eighths');
  const plans = await page.evaluate(async (tick) => {
    const storagePath = '/src/composer/storage.ts', modelPath = '/src/composer/model.ts', playbackPath = '/src/composer/playback.ts';
    const { loadComposition }: typeof import('../src/composer/storage') = await import(storagePath);
    const { Score }: typeof import('../src/composer/model') = await import(modelPath);
    const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
    const playback = new ScorePlayback(new Score(loadComposition(localStorage)));
    return Array.from({ length: 24 }, (_, step) => playback.schedule(step * tick, step)).flat();
  }, TICK);
  expect(plans.filter((note) => note.lane === 'melody')).toHaveLength(12);
  expect(plans.filter((note) => note.lane === 'air').map((note) => note.step)).toEqual([3, 11, 19]);
  expect(plans.filter((note) => note.lane === 'melody').every((note) => note.step % 2 === 0)).toBe(true);
  const before = await saved(page); await page.reload(); expect(await saved(page)).toEqual(before);
  await expect(page.getByRole('slider', { name: 'Air density', exact: true })).toHaveValue('3');
  await expect(page.getByRole('slider', { name: 'Air offset', exact: true })).toHaveValue('3');
});

test('Remove wave removes its line and notes; Undo restores it without losing edits to another wave', async ({ page }) => {
  await page.goto('/shape.html'); await page.getByRole('button', { name: 'Select Air', exact: true }).click(); await slider(page, 'Air density', 4);
  const original = (await saved(page)).lanes.find((lane) => lane.id === 'air');
  await page.getByRole('button', { name: 'Remove track', exact: true }).click();
  await expect(page.locator('.wave-line')).toHaveCount(2); await expect(page.getByRole('button', { name: 'Select Air', exact: true })).toHaveCount(0);
  expect((await saved(page)).lanes.some((lane) => lane.id === 'air')).toBe(false);
  await page.locator('.step-hit').first().press('ArrowUp'); const edited = (await saved(page)).lanes.find((lane) => lane.id === 'undertow');
  await page.getByRole('button', { name: 'Undo remove wave', exact: true }).click();
  const after = await saved(page); expect(after.lanes.find((lane) => lane.id === 'air')).toEqual(original);
  expect(after.lanes.find((lane) => lane.id === 'undertow')).toEqual(edited); await expect(page.locator('.wave-line')).toHaveCount(3);
  await page.getByRole('button', { name: 'Select Melody', exact: true }).click();
  await page.getByRole('button', { name: 'Remove track', exact: true }).click();
  await page.getByRole('button', { name: 'Undo remove wave', exact: true }).click();
  expect(await page.locator('.lane-tab').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))).toEqual(['Select Melody', 'Select Undertow', 'Select Air']);
  await page.getByRole('button', { name: 'Remove track', exact: true }).click(); await page.getByRole('button', { name: 'Remove track', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove track', exact: true })).toBeDisabled();
  await expect(page.locator('.wave-line')).toHaveCount(1);
});

test.describe('phone rhythm controls', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('touch changes density, removes a wave and restores it without overflowing', async ({ page }) => {
    await page.goto('/shape.html'); await page.getByRole('button', { name: 'Select Air', exact: true }).tap();
    const density = page.getByRole('slider', { name: 'Air density', exact: true }); await density.tap();
    const count = Number(await density.inputValue()); expect(count).toBeGreaterThan(0);
    const before = await saved(page); expect(before.lanes.find((lane) => lane.id === 'air')?.notes.filter((note) => note !== null)).toHaveLength(count);
    await page.getByRole('button', { name: 'Remove track', exact: true }).tap(); await expect(page.locator('.wave-line')).toHaveCount(2);
    await page.getByRole('button', { name: 'Undo remove wave', exact: true }).tap(); expect(await saved(page)).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
});
