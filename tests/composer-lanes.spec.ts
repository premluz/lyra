import { expect, test } from '@playwright/test';
import { Score } from '../src/composer/model';
import { COMPOSE } from '../src/composer/config';
import { saved, enableAmbient } from './composer-helpers';

test('authors more than three independent lanes, assigns roles and sounds, and saves all of them', async ({ page }) => {
  await page.goto('/shape.html'); const original = await saved(page);
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Add sound', exact: true }).click();
  await expect(page.locator('.lane-tab')).toHaveCount(7); await expect(page.locator('.wave-line')).toHaveCount(7);
  await enableAmbient(page);
  await page.getByRole('combobox', { name: 'Sound 7 role', exact: true }).selectOption('drone');
  await page.getByRole('combobox', { name: 'Sound 7 instrument', exact: true }).selectOption('choir');
  await page.getByLabel('Attack · s', { exact: true }).fill('4'); await page.getByLabel('Attack · s', { exact: true }).press('Tab');
  await page.getByLabel('Breathing · s', { exact: true }).fill('60'); await page.getByLabel('Breathing · s', { exact: true }).press('Tab');
  await page.getByRole('combobox', { name: 'Sound 7 held pitch', exact: true }).selectOption('10');
  const beforeReload = await saved(page);
  expect(beforeReload.lanes.slice(0, 3)).toEqual(original.lanes);
  expect(beforeReload.lanes.at(-1)).toMatchObject({ name: 'Sound 7', role: 'drone', instrument: 'choir', attack: 4, breath: 60, pitch: 10 });
  await page.reload(); await enableAmbient(page); expect(await saved(page)).toEqual(beforeReload);
  await expect(page.getByRole('combobox', { name: 'Sound 7 role', exact: true })).toHaveValue('drone');
  await page.getByRole('button', { name: 'Add sound', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add 528 drone layers', exact: true })).toBeDisabled();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Add sound', exact: true }).click();
  await expect(page.getByRole('button', { name: '12 sounds', exact: true })).toBeDisabled(); await expect(page.locator('.wave-line')).toHaveCount(12);
});

test('the reference arrangement adds evolving layers without transient notes and Undo restores the entire score', async ({ page }) => {
  await page.goto('/shape.html'); await enableAmbient(page); const before = await saved(page);
  const observing = page.evaluate(() => new Promise<number>((resolve) => {
    let notes = 0; const mesh = document.getElementById('mesh'); if (!mesh) throw new Error('Mesh is missing.');
    const hear = () => { notes++; }; mesh.addEventListener('orb:note', hear);
    setTimeout(() => { mesh.removeEventListener('orb:note', hear); resolve(notes); }, 1200);
  }));
  await page.getByRole('button', { name: 'Add 528 drone layers', exact: true }).click();
  await expect(page.locator('.lane-tab')).toHaveCount(8);
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
  await expect(page.locator('#loop-label')).toHaveText('CONTINUOUS · C / 528 HZ');
  await expect(page.getByRole('combobox', { name: 'Tuning', exact: true })).toHaveValue('528');
  await expect(page.getByLabel('Reverb · s', { exact: true })).toHaveValue('12');
  await expect(page.getByLabel('Reverb mix · %', { exact: true })).toHaveValue('70');
  expect(await observing).toBe(0);
  const state = await saved(page); expect(state.lanes.slice(0, 3).every((lane) => !lane.enabled)).toBe(true);
  await page.getByRole('button', { name: 'Undo 528 arrangement', exact: true }).click(); expect(await saved(page)).toEqual(before);
  await expect(page.locator('.wave-line')).toHaveCount(3); await expect(page.getByRole('combobox', { name: 'Tuning', exact: true })).toHaveValue('standard');
});

test('the dry binaural layer exposes its carrier and difference; mute and exit work during a long fade', async ({ page }) => {
  await page.goto('/shape.html'); await enableAmbient(page); await page.getByRole('button', { name: 'Add 528 drone layers', exact: true }).click();
  await page.getByRole('button', { name: 'Select 6 Hz stereo pair', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '6 Hz stereo pair instrument', exact: true })).toBeDisabled();
  await page.getByLabel('Left tone · Hz', { exact: true }).fill('260'); await page.getByLabel('Left tone · Hz', { exact: true }).press('Tab');
  await page.getByLabel('Difference · Hz', { exact: true }).fill('9'); await page.getByLabel('Difference · Hz', { exact: true }).press('Tab');
  await expect(page.locator('#note-readout')).toHaveText('6 Hz stereo pair · 260 Hz L / 269 Hz R · headphones · 10.0s release');
  await page.getByLabel('Fade out · s', { exact: true }).fill('60'); await page.getByLabel('Fade out · s', { exact: true }).press('Tab');
  await page.getByRole('button', { name: 'Fade out & leave', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-muted', 'true');
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
});

test.describe('expanded phone composer', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('twelve layers, long names and tuning controls stay inside the phone viewport', async ({ page }) => {
    const score = new Score();
    for (let i = 0; i < 4; i++) score.addLane();
    score.rename('A very long atmospheric layer name here');
    await page.addInitScript(({ key, state }) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(state)); }, { key: COMPOSE.storageKey, state: score.state });
    await page.goto('/shape.html');
    await enableAmbient(page);
    await page.getByRole('button', { name: 'Add 528 drone layers', exact: true }).tap();
    await expect(page.locator('.wave-line')).toHaveCount(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.getByRole('button', { name: 'Select Parallel fifth', exact: true }).tap();
    await expect(page.getByLabel('Breathing · s', { exact: true })).toHaveValue('57');
    const state = await saved(page); await page.reload(); expect(await saved(page)).toEqual(state);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
});
