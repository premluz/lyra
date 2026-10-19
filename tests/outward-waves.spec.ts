import { expect, test } from '@playwright/test';
import { openDevSettings } from './composer-helpers';
import { WAVE_WRAP } from '../src/composer/wave-wrap-geometry';
import { COMPOSE } from '../src/composer/config';

for (const width of [1440, 390]) {
  test(`outward effects stop updating, persist, and resume independently at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.clock.install();
    await page.addInitScript(key => localStorage.setItem(key, 'true'), WAVE_WRAP.key);
    await page.goto('/shape.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    await openDevSettings(page);
    const toggle = page.getByRole('switch', { name: 'Outward waves & petals', exact: true });
    const effects = page.locator('.wave-ripples'), echo = effects.locator('.ripple-haze').first();
    const tune = await page.evaluate(key => localStorage.getItem(key), COMPOSE.storageKey);
    await expect(toggle).toBeChecked();
    const moving = await echo.getAttribute('transform'); await page.clock.runFor(250);
    expect(await echo.getAttribute('transform')).not.toBe(moving);
    await toggle.uncheck();
    expect(await effects.evaluateAll(nodes => nodes.every(node => getComputedStyle(node).display === 'none'))).toBe(true);
    const stopped = await effects.evaluateAll(nodes => nodes.map(node => node.outerHTML));
    const petal = page.locator('.wave-ribbon .wave-petals ellipse').first(), alive = await petal.getAttribute('transform');
    await page.clock.runFor(500);
    expect(await effects.evaluateAll(nodes => nodes.map(node => node.outerHTML))).toEqual(stopped);
    expect(await petal.getAttribute('transform')).not.toBe(alive);
    expect(await page.evaluate(key => localStorage.getItem(key), COMPOSE.storageKey)).toBe(tune);
    await page.reload(); await openDevSettings(page); await expect(toggle).not.toBeChecked();
    await page.getByRole('button', { name: '+ Add sound', exact: true }).click();
    await expect(effects).toHaveCount(4);
    expect(await effects.evaluateAll(nodes => nodes.every(node => getComputedStyle(node).display === 'none'))).toBe(true);
    await toggle.check();
    const resumed = await echo.getAttribute('transform'); await page.clock.runFor(250);
    expect(await echo.getAttribute('transform')).not.toBe(resumed);
    expect(await effects.evaluateAll(nodes => nodes.every(node => getComputedStyle(node).display !== 'none'))).toBe(true);
    await expect(page.locator('#wrapped-waves')).toBeVisible(); await expect(page.locator('.wrapped-note-handle').first()).toBeVisible();
    await expect(page.locator('#status')).toBeEmpty();
  });
}
