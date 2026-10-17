import { expect, test } from '@playwright/test';
import { newDrawing, drawLayer } from '../src/simple/score';
import { DRAW_LAYERS, SIMPLE } from '../src/simple/config';
import { drawLine, DRAWING, savedDrawing } from './simple-helpers';

for (const width of [1440, 390]) {
  test(`simple controls edit only their wave, stay usable at zero density and save at ${width}px`, async ({ page }) => {
    const state = DRAW_LAYERS.reduce((state, layer) => drawLayer(state, layer, DRAWING), newDrawing(() => 0.2));
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.addInitScript(({ key, state }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(state));
    }, { key: SIMPLE.storageKey, state });
    await page.goto('/draw.html'); await page.getByRole('button', { name: 'Redraw Foundation', exact: true }).click();
    const fits = await page.locator('#instrument').evaluate((root) => root.scrollHeight <= root.clientHeight + 1); expect(fits).toBe(true);
    const speed = page.getByRole('slider', { name: 'Foundation Speed', exact: true });
    await expect(speed).toHaveValue('1'); await speed.press('ArrowRight'); await expect(speed).toHaveValue('2');
    await expect(speed).toHaveAttribute('aria-valuetext', '1½×, 126 BPM');
    const density = page.getByRole('slider', { name: 'Foundation Density', exact: true });
    await density.press('End'); await expect(density).toHaveValue('36'); await density.press('Home');
    await expect(density).toBeEnabled(); await density.press('End');
    await page.getByRole('slider', { name: 'Foundation Tone', exact: true }).press('End');
    await page.getByRole('combobox', { name: 'Composition', exact: true }).selectOption('broken');
    const edited = await savedDrawing(page), foundation = edited.lanes.find((lane) => lane.id === 'undertow');
    expect(foundation).toMatchObject({ rate: 1.5, form: 'broken', tone: 1 }); expect(foundation?.notes.filter((pitch) => pitch !== null)).toHaveLength(36);
    expect(edited.lanes.filter((lane) => lane.id !== 'undertow')).toEqual(state.lanes.filter((lane) => lane.id !== 'undertow'));
    await page.getByRole('button', { name: 'Redraw Tune', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Composition', exact: true })).toHaveValue('flowing');
    await page.getByRole('combobox', { name: 'Composition', exact: true }).selectOption('bloom');
    await page.getByRole('button', { name: 'Redraw Foundation', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Composition', exact: true })).toHaveValue('broken');
    await drawLine(page, true); expect((await savedDrawing(page)).lanes.find((lane) => lane.id === 'undertow')).toMatchObject({ rate: 1.5, form: 'broken', tone: 1 });
    const favourite = await savedDrawing(page); await page.reload(); expect(await savedDrawing(page)).toEqual(favourite);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0); await expect(page.locator('#status')).toBeEmpty();
  });
}
