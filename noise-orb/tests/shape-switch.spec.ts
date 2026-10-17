import { expect, test } from '@playwright/test';
import { openDevSettings } from './composer-helpers';
import { SURFACE } from '../src/visual/surface';
import { COMPOSE } from '../src/composer/config';
import { compositionFixture } from './composition-fixtures';
import { newDrawing, drawLayer } from '../src/simple/score';
import { DRAW_LAYERS, SIMPLE } from '../src/simple/config';
import { DRAWING } from './simple-helpers';

for (const path of ['/shape.html', '/draw.html']) for (const width of [1440, 390]) {
  test(`${path} switches shape without restarting audio or changing the score at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    const simple = path === '/draw.html', key = simple ? SIMPLE.storageKey : COMPOSE.storageKey;
    const state = simple ? DRAW_LAYERS.reduce((state, layer) => drawLayer(state, layer, DRAWING), newDrawing(() => 0.1)) : compositionFixture(width === 390 ? 'custom-polyphony' : 'trio').state;
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.addInitScript(() => {
      let contexts = 0; const Base = window.AudioContext;
      window.AudioContext = class extends Base { constructor(options?: AudioContextOptions) { super(options); document.documentElement.dataset.audioContexts = String(++contexts); } };
    });
    await page.addInitScript(({ key, state }) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(state)); }, { key, state });
    await page.goto(path); if (!simple) await openDevSettings(page); const shape = page.getByRole('combobox', { name: '3D shape', exact: true });
    await expect(shape).toHaveValue('orb'); await shape.selectOption('waves');
    await expect(page.locator('#mesh')).toHaveAttribute('data-shape', 'waves');
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
    expect(await page.evaluate((key) => localStorage.getItem(key), SURFACE.key)).toBe('waves');
    await page.reload(); if (!simple) await openDevSettings(page); await expect(shape).toHaveValue('waves');
    await page.getByRole('button', { name: 'Start sound', exact: true }).click();
    await shape.selectOption('orb'); await shape.selectOption('waves');
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running'); await expect(page.locator('#mesh canvas')).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('data-audio-contexts', '1');
    expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(JSON.stringify(state));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await expect(page.locator('#status')).toBeEmpty(); expect(errors).toEqual([]);
  });
}
