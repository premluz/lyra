import { expect, test, type Page } from '@playwright/test';
import { savedDrawing, drawStroke } from './magenta-helpers';

async function touchLine(page: Page) {
  const box = await page.locator('#drawing-area').boundingBox(); if (!box) throw new Error('Missing touch drawing area');
  const touch = await page.context().newCDPSession(page);
  const points = [{ x: box.x + box.width * 0.15, y: box.y + box.height * 0.7 },
    { x: box.x + box.width * 0.45, y: box.y + box.height * 0.4 }, { x: box.x + box.width * 0.8, y: box.y + box.height * 0.6 }];
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points[0]] });
  for (const point of points.slice(1)) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await touch.detach();
}

test.describe('touch drawing', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('touch authors independent layers and New tune clears only the drawing document', async ({ page }) => {
    await page.goto('/draw-music.html'); await touchLine(page);
    await page.getByRole('button', { name: 'Cancel generation', exact: true }).tap();
    const first = await savedDrawing(page), melody = first.composition.lanes.find(lane => lane.id === 'melody');
    await page.getByRole('button', { name: 'Bass', exact: true }).tap(); await touchLine(page);
    await page.getByRole('button', { name: 'Cancel generation', exact: true }).tap();
    const second = await savedDrawing(page); expect(second.authored).toEqual(['melody', 'undertow']);
    expect(second.composition.lanes.find(lane => lane.id === 'melody')).toEqual(melody);
    await page.getByRole('button', { name: 'Mute sound', exact: true }).tap();
    await page.getByRole('button', { name: 'New tune ＋', exact: true }).tap();
    expect((await savedDrawing(page)).composition.lanes.every(lane => lane.notes.every(note => note === null))).toBe(true);
    await expect(page.locator('#instrument')).toHaveAttribute('data-muted', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
});

test('keyboard drawing can be cancelled and Exit disables drawing until Return', async ({ page }) => {
  await page.goto('/draw-music.html'); const area = page.locator('#drawing-area'); await area.focus();
  await area.press('ArrowRight'); await area.press('ArrowUp'); await area.press('ArrowRight'); await area.press('Enter');
  await page.getByRole('button', { name: 'Cancel generation', exact: true }).click();
  const original = await savedDrawing(page); await area.focus(); await area.press('ArrowUp'); await area.press('Escape');
  expect(await savedDrawing(page)).toEqual(original);
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(area).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('button', { name: 'New tune ＋', exact: true })).toBeDisabled();
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  await page.getByRole('button', { name: 'Return to the orb ↗', exact: true }).click();
  await expect(area).toHaveAttribute('aria-disabled', 'false');
  expect(await savedDrawing(page)).toEqual(original);
});

test('editing density while MusicVAE works keeps the latest authored edits', async ({ page }) => {
  await page.goto('/draw-music.html'); await drawStroke(page);
  await expect(page.locator('#instrument')).toHaveAttribute('data-generating', 'true');
  await page.getByRole('slider', { name: 'Melody Density', exact: true }).fill('36');
  await expect(page.locator('#instrument')).toHaveAttribute('data-generating', 'false', { timeout: 30000 });
  await expect(page.locator('#draw-hint')).toHaveText('Your latest edits were kept. Choose Shape my phrase to try again.');
  const selected = (await savedDrawing(page)).composition.lanes.find(lane => lane.id === 'melody');
  expect(selected?.notes.filter(note => note !== null)).toHaveLength(36);
});
