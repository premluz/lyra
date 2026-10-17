import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { compositionFixture } from './composition-fixtures';
import { COMPOSE } from '../src/composer/config';
import { MUSIC_VISUAL } from '../src/composer/visual-config';
import { INTERACTION } from '../src/interaction/config';
import { saved } from './composer-helpers';
import { SURFACE } from '../src/visual/surface';

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`exports the complete ${variant} setup and orb settings without unlocking audio`, async ({ page }, info) => {
    const score = compositionFixture(variant); score.setRate(1.5); score.setForm('bloom'); score.setInstrument('glass');
    score.setKnob('tone', 0.83); score.shiftLane(score.selected.id, 7); score.state.lanes[1].enabled = false;
    const shape = variant === 'trio' ? 'orb' : 'waves';
    await page.addInitScript(({ key, state, treatmentKey, aliveKey, shapeKey, shape }) => {
      localStorage.setItem(key, JSON.stringify(state)); localStorage.setItem(treatmentKey, 'halftone'); localStorage.setItem(aliveKey, '0.63');
      localStorage.setItem(shapeKey, shape);
    }, { key: COMPOSE.storageKey, state: score.state, treatmentKey: MUSIC_VISUAL.treatmentKey, aliveKey: INTERACTION.aliveKey, shapeKey: SURFACE.key, shape });
    await page.goto('/shape.html'); const before = await saved(page);
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
    const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export setup', exact: true }).click();
    const download = await pending, path = info.outputPath('setup.json'); await download.saveAs(path);
    const data: unknown = JSON.parse(await readFile(path, 'utf8'));
    expect(download.suggestedFilename()).toMatch(/^noise-orb-setup-\d{4}-\d{2}-\d{2}T[\d.\-]+Z\.json$/);
    expect(data).toEqual(expect.objectContaining({ format: 'noise-orb-setup', version: 1, composition: before,
      visuals: { treatment: 'halftone', alive: 0.63, shape }, playback: expect.objectContaining({ bpm: 84, stepsPerPattern: 24 }),
      summary: before.lanes.map((lane) => expect.objectContaining({ id: lane.id, role: lane.role, instrument: lane.instrument })) }));
    expect(await saved(page)).toEqual(before); await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
    await expect(page.locator('#status')).toBeEmpty();
  });
}
test('exports the latest generated favourite while preserving mute and Undo', async ({ page }, info) => {
  await page.goto('/shape.html'); await page.getByRole('button', { name: 'Randomise', exact: true }).click();
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click(); const before = await saved(page);
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export setup', exact: true }).click();
  const download = await pending, path = info.outputPath('favourite.json'); await download.saveAs(path);
  const data: unknown = JSON.parse(await readFile(path, 'utf8'));
  expect(data).toEqual(expect.objectContaining({ composition: before })); expect(await saved(page)).toEqual(before);
  await expect(page.locator('#instrument')).toHaveAttribute('data-muted', 'true');
  await expect(page.getByRole('button', { name: 'Undo randomise', exact: true })).toBeVisible();
});
test.describe('phone setup export', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('touch downloads a setup without starting sound or overflowing the phone', async ({ page }) => {
    await page.goto('/shape.html'); const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export setup', exact: true }).tap();
    expect((await pending).suggestedFilename()).toMatch(/\.json$/);
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await expect(page.locator('#status')).toBeEmpty();
  });
});
