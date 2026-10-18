import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { COMPOSE } from '../src/composer/config';
import { createComposition } from '../src/composer/model';
import { saved } from './composer-helpers';

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

async function waveStart(page: Page) {
  return page.locator('.wave-grip').evaluate((path, steps) => {
    if (!(path instanceof SVGPathElement) || !path.ownerSVGElement) throw new Error('Wave grip is missing.');
    const matrix = path.getScreenCTM(); if (!matrix) throw new Error('Wave transform is unavailable.');
    for (let i = 1; i < steps; i++) {
      const point = path.getPointAtLength(path.getTotalLength() * i / steps).matrixTransform(matrix);
      if (document.elementFromPoint(point.x, point.y) === path) return { x: point.x, y: point.y, stepWidth: path.ownerSVGElement.getBoundingClientRect().width / steps };
    }
    throw new Error('No exposed wave segment is available to grab.');
  }, COMPOSE.steps);
}

test('Randomise replaces all lanes, saves a distinct tune, and Undo restores the previous setup', async ({ page }) => {
  await page.goto('/shape.html');
  const before = await saved(page); await page.getByRole('button', { name: 'Randomise', exact: true }).click();
  const first = await saved(page);
  for (const lane of first.lanes) {
    expect(lane.notes).not.toEqual(before.lanes.find((item) => item.id === lane.id)?.notes);
    expect(lane.instrument).not.toBe(before.lanes.find((item) => item.id === lane.id)?.instrument);
    expect(lane.enabled).toBe(true); expect(lane.notes.some((note) => note !== null)).toBe(true);
  }
  expect(new Set(first.lanes.map((lane) => lane.instrument)).size).toBe(3);
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
  await expect(page.locator('.loop-label')).toHaveText('84 BPM · 12 BARS · D MAJOR');
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
  await page.getByRole('button', { name: 'Randomise', exact: true }).click();
  const second = await saved(page); expect(second.lanes.map((lane) => lane.notes)).not.toEqual(first.lanes.map((lane) => lane.notes));
  await expect(page.locator('#instrument')).toHaveAttribute('data-muted', 'true');
  await page.getByRole('button', { name: 'Undo randomise', exact: true }).click(); expect(await saved(page)).toEqual(first);
  await page.reload(); expect(await saved(page)).toEqual(first);
  await expect(page.getByRole('button', { name: 'Undo randomise', exact: true })).toBeHidden();
});

test('dragging the wave shifts every note, keyboard nudges it, and reload preserves it', async ({ page }) => {
  await page.goto('/shape.html');
  const before = await saved(page), start = await waveStart(page);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(start.x + start.stepWidth * 3, start.y, { steps: 8 }); await page.mouse.up();
  const shifted = await saved(page);
  expect(shifted.lanes[0].notes.flatMap((pitch, step) => pitch === null ? [] : [[step, pitch]])).toEqual([[3, 0], [7, 4], [11, 7], [15, 9], [19, 4], [23, 2]]);
  expect(shifted.lanes.slice(1)).toEqual(before.lanes.slice(1));
  await page.locator('.step-hit').nth(0).press('Alt+ArrowLeft');
  expect((await saved(page)).lanes[0].notes[2]).toBe(0);
  const nudged = await saved(page); await page.reload(); expect(await saved(page)).toEqual(nudged);
});

test('a horizontal grab on a dot shifts a dense lane without deleting or repitching notes', async ({ page }) => {
  const state = createComposition(); state.selected = 'air';
  const air = state.lanes.find((lane) => lane.id === 'air'); if (!air) throw new Error('Air fixture is missing.');
  air.notes = Array.from({ length: COMPOSE.steps }, (_, step) => step % 2 ? 3 : 9);
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: COMPOSE.storageKey, state });
  await page.goto('/shape.html');
  const dot = await page.locator('.note-dot.lane-air').first().boundingBox(), surface = await page.locator('.wave-surface').boundingBox();
  if (!dot || !surface) throw new Error('Dense lane geometry is missing.');
  const x = dot.x + dot.width / 2, y = dot.y + dot.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + surface.width / COMPOSE.steps, y, { steps: 5 }); await page.mouse.up();
  const after = await saved(page);
  expect(after.lanes.find((lane) => lane.id === 'air')?.notes).toEqual(Array.from({ length: COMPOSE.steps }, (_, step) => step % 2 ? 9 : 3));
  expect(after.lanes.filter((lane) => lane.id !== 'air')).toEqual(state.lanes.filter((lane) => lane.id !== 'air'));
});

test('authors notes, reshapes one voice, persists edits, and leaves the original available', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/shape.html');
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  await page.getByRole('button', { name: 'Select Air', exact: true }).click();
  const step = page.locator('.step-hit').nth(2);
  await step.click(); await expect(step).toHaveAttribute('aria-pressed', 'true');
  const pitch = (await saved(page)).lanes.find((lane) => lane.id === 'air')?.notes[2];
  await step.press('ArrowUp');
  expect((await saved(page)).lanes.find((lane) => lane.id === 'air')?.notes[2]).toBe((pitch ?? 0) + 1);
  const tone = page.getByRole('slider', { name: 'Air Tone', exact: true });
  await tone.press('End'); await expect(tone).toHaveValue('100');
  await page.getByRole('button', { name: 'Pause Air', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enable Air', exact: true })).toBeVisible();
  const state = await saved(page);
  await page.reload(); await expect(page.getByRole('slider', { name: 'Air Tone', exact: true })).toHaveValue('100');
  expect(await saved(page)).toEqual(state);
  await page.getByRole('button', { name: 'Select Melody', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Melody Level', exact: true })).toHaveValue('60');
  await page.getByRole('link', { name: '↖ The original orb', exact: true }).click();
  await expect(page.locator('#composer')).toHaveCount(0);
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  expect(errors).toEqual([]);
});

test('each lane has an independent instrument which previews and persists', async ({ page }) => {
  await page.goto('/shape.html');
  const instrument = page.getByRole('combobox', { name: 'Melody instrument', exact: true });
  await expect(instrument).toHaveValue('pluck');
  await expect(instrument.locator('option')).toHaveText(['Soft pluck', 'Felt keys', 'Marimba', 'Glass bell', 'Warm reed', 'Bowed strings', 'Round bass', 'Rubber bass', 'Picked bass', 'Muted bass', 'Cloud pad', 'Harmonic choir', 'Ocean tide', 'Pure sine']);
  await instrument.selectOption('glass');
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
  await page.getByRole('button', { name: 'Select Undertow', exact: true }).click();
  await page.getByRole('combobox', { name: 'Undertow instrument', exact: true }).selectOption('reed');
  await page.getByRole('button', { name: 'Select Air', exact: true }).click();
  await page.getByRole('combobox', { name: 'Air instrument', exact: true }).selectOption('strings');
  const state = await saved(page); expect(state.lanes.map((lane) => lane.instrument)).toEqual(['glass', 'reed', 'strings']);
  await page.reload(); expect(await saved(page)).toEqual(state);
  await expect(page.getByRole('combobox', { name: 'Air instrument', exact: true })).toHaveValue('strings');
  await page.getByRole('button', { name: 'Randomise', exact: true }).click();
  await page.getByRole('button', { name: 'Undo randomise', exact: true }).click();
  expect(await saved(page)).toEqual(state);
  await expect(page.getByRole('combobox', { name: 'Air instrument', exact: true })).toHaveValue('strings');
});

test('pointer dragging changes note pitch and a real knob value', async ({ page }) => {
  await page.goto('/shape.html');
  await page.getByRole('button', { name: 'Select Undertow', exact: true }).click();
  const step = page.locator('.step-hit').nth(5); await step.click();
  const before = (await saved(page)).lanes.find((lane) => lane.id === 'undertow')?.notes[5];
  const box = await step.boundingBox(); if (!box) throw new Error('Note hit area is missing.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 14, { steps: 5 }); await page.mouse.up();
  expect((await saved(page)).lanes.find((lane) => lane.id === 'undertow')?.notes[5]).toBeGreaterThan(before ?? 0);
  const knob = page.getByRole('slider', { name: 'Undertow Level', exact: true }); await knob.scrollIntoViewIfNeeded();
  const dial = await knob.boundingBox();
  if (!dial) throw new Error('Knob hit area is missing.');
  await page.mouse.move(dial.x + dial.width / 2, dial.y + dial.height / 2); await page.mouse.down();
  await page.mouse.move(dial.x + dial.width / 2, dial.y + dial.height / 2 - 24, { steps: 5 }); await page.mouse.up();
  expect(Number(await knob.inputValue())).toBeGreaterThan(45);
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
});

test.describe('phone randomise', () => {
  test.use(PHONE);
  test('Randomise and Undo work by touch without horizontal overflow', async ({ page }) => {
    await page.goto('/shape.html'); const before = await saved(page);
    await page.getByRole('button', { name: 'Randomise', exact: true }).tap();
    const after = await saved(page); expect(after).not.toEqual(before);
    expect(after.lanes.every((lane) => lane.enabled && lane.notes.some((note) => note !== null))).toBe(true);
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.getByRole('button', { name: 'Undo randomise', exact: true }).tap(); expect(await saved(page)).toEqual(before);
  });
});

test.describe('phone composer', () => {
  test.use(PHONE);
  test('touch builds a separate lane with no overflow; exit still stops the piece', async ({ page }) => {
    await page.goto('/shape.html');
    await page.getByRole('button', { name: 'Select Air', exact: true }).tap();
    await page.getByRole('combobox', { name: 'Air instrument', exact: true }).selectOption('marimba');
    expect((await saved(page)).lanes.find((lane) => lane.id === 'air')?.instrument).toBe('marimba');
    const step = page.locator('.step-hit').nth(23); await step.tap();
    await expect(step).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBe(0);
    await page.getByRole('button', { name: 'Exit', exact: false }).tap();
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  });
  test('touch shifts an irregular lane across the loop and cancellation restores its position', async ({ page }) => {
    await page.goto('/shape.html'); await page.getByRole('button', { name: 'Select Air', exact: true }).tap();
    await page.locator('.step-hit').nth(2).tap(); await page.locator('.step-hit').nth(23).tap();
    const before = await saved(page), start = await waveStart(page), touch = await page.context().newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x, y: start.y }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + start.stepWidth * 2, y: start.y }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const shifted = await saved(page), air = shifted.lanes.find((lane) => lane.id === 'air');
    const original = before.lanes.find((lane) => lane.id === 'air');
    expect(air?.notes[1]).toBe(original?.notes[23]); expect(air?.notes[4]).toBe(original?.notes[2]);
    expect(air?.notes.filter((note) => note !== null)).toHaveLength(2);
    expect(shifted.lanes.filter((lane) => lane.id !== 'air')).toEqual(before.lanes.filter((lane) => lane.id !== 'air'));
    const next = await waveStart(page);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: next.x, y: next.y }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: next.x + next.stepWidth, y: next.y }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    expect(await saved(page)).toEqual(shifted); await touch.detach();
  });
});
