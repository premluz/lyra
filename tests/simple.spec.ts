import { expect, test } from '@playwright/test';
import { COMPOSE } from '../src/composer/config';
import { createComposition } from '../src/composer/model';
import { drawLine, DRAWING, savedDrawing } from './simple-helpers';

test('three scribbles build a tune progressively; only authored music plays and the advanced setup stays intact', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  const advanced = createComposition();
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: COMPOSE.storageKey, state: advanced });
  await page.goto('/draw.html'); await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  await expect(page.getByRole('heading', { name: 'Three lines. One little tune.', exact: true })).toBeVisible();
  await page.evaluate(() => {
    const mesh = document.getElementById('mesh'); if (!mesh) throw new Error('Music orb is missing.');
    const lanes = new Set<string>();
    mesh.addEventListener('orb:note', (event) => {
      const value: unknown = event instanceof CustomEvent ? event.detail : null;
      if (typeof value === 'object' && value !== null && 'lane' in value && typeof value.lane === 'string') lanes.add(value.lane);
      else mesh.dataset.unexpectedNote = 'true';
      mesh.dataset.playedLanes = [...lanes].join(',');
    });
  });
  await page.getByRole('button', { name: 'New tune', exact: false }).click();
  await expect(page.locator('#draw-title')).toHaveText('Scribble a foundation.');
  await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 450)));
  await expect(page.locator('#mesh')).not.toHaveAttribute('data-played-lanes');
  await drawLine(page); await expect(page.locator('#draw-title')).toHaveText('Now, scribble a tune.');
  expect((await savedDrawing(page)).lanes.filter((lane) => lane.notes.some((pitch) => pitch !== null)).map((lane) => lane.role)).toEqual(['undertow']);
  await drawLine(page, true); await expect(page.locator('#draw-title')).toHaveText('Add a little sparkle.');
  await drawLine(page); await expect(page.locator('#draw-title')).toHaveText('You shaped the music.');
  const favourite = await savedDrawing(page); expect(favourite.lanes.every((lane) => lane.notes.some((pitch) => pitch !== null))).toBe(true);
  await expect.poll(async () => (await page.locator('#mesh').getAttribute('data-played-lanes'))?.split(',').sort()).toEqual(['air', 'melody', 'undertow']);
  await expect(page.locator('#mesh')).not.toHaveAttribute('data-unexpected-note');
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click(); await page.reload();
  expect(await savedDrawing(page)).toEqual(favourite); await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  await expect(page.locator('#instrument')).toHaveAttribute('data-muted', 'true');
  await page.getByRole('button', { name: 'Redraw Foundation', exact: true }).click(); await drawLine(page, true);
  const edited = await savedDrawing(page); expect(edited.lanes.filter((lane) => lane.role !== 'undertow')).toEqual(favourite.lanes.filter((lane) => lane.role !== 'undertow'));
  expect(await page.evaluate((key) => localStorage.getItem(key), COMPOSE.storageKey)).toBe(JSON.stringify(advanced)); expect(errors).toEqual([]);
});

test('keyboard draws a layer; short taps and cancelled gestures leave the current instruction unchanged', async ({ page }) => {
  await page.goto('/draw.html'); await page.getByRole('button', { name: 'New tune', exact: false }).click();
  const drawing = page.locator('#drawing-area'); await drawing.click({ position: { x: 80, y: 100 } });
  await expect(page.locator('#draw-title')).toHaveText('Scribble a foundation.');
  await expect(page.locator('#draw-hint')).toHaveText('Give your line a little more room. A small squiggle is enough.');
  await drawing.press('ArrowRight'); await drawing.press('ArrowUp'); await drawing.press('Escape');
  expect((await savedDrawing(page)).lanes.every((lane) => lane.notes.every((pitch) => pitch === null))).toBe(true);
  await drawing.press('ArrowRight'); await drawing.press('ArrowUp'); await drawing.press('ArrowRight'); await drawing.press('Enter');
  await expect(page.locator('#draw-title')).toHaveText('Now, scribble a tune.');
  await page.getByRole('button', { name: 'Exit', exact: false }).click(); await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  await expect(page.getByRole('button', { name: 'New tune', exact: false })).toBeDisabled();
  await page.getByRole('button', { name: 'Return to the orb', exact: false }).click();
  await expect(page.getByRole('button', { name: 'New tune', exact: false })).toBeEnabled();
});

test.describe('touch drawing', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('the upper area accepts a full touch stroke; New tune clears only the simple score', async ({ page }) => {
    await page.goto('/draw.html'); await page.getByRole('button', { name: 'New tune', exact: false }).tap();
    const rect = await page.locator('#drawing-area').boundingBox(); if (!rect) throw new Error('Touch drawing area is missing.');
    const touch = await page.context().newCDPSession(page);
    const points = DRAWING.map((point) => ({ x: rect.x + point.x * rect.width, y: rect.y + point.y * rect.height }));
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points[0]] });
    for (const point of points.slice(1)) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('#draw-title')).toHaveText('Now, scribble a tune.');
    expect((await savedDrawing(page)).lanes[0].notes.some((pitch) => pitch !== null)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    const exit = await page.getByRole('button', { name: 'Exit', exact: false }).boundingBox();
    if (!exit) throw new Error('Phone exit control is missing.'); expect(exit.x + exit.width).toBeLessThanOrEqual(390);
    await page.getByRole('button', { name: 'New tune', exact: false }).tap();
    expect((await savedDrawing(page)).lanes.every((lane) => lane.notes.every((pitch) => pitch === null))).toBe(true);
    await expect(page.locator('#draw-title')).toHaveText('Scribble a foundation.'); await touch.detach();
    await page.getByRole('link', { name: 'Advanced studio', exact: false }).tap();
    await page.getByRole('link', { name: 'Simple view ↗', exact: true }).tap();
    await expect(page.locator('#drawing-area')).toBeVisible();
  });
});
