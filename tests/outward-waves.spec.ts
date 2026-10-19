import { expect, test } from '@playwright/test';
import { openDevSettings } from './composer-helpers';
import { WAVE_WRAP } from '../src/composer/wave-wrap-geometry';
import { COMPOSE } from '../src/composer/config';
import { rippleFrames } from './ripple-browser';

for (const width of [1440, 390]) {
  test(`GPU echoes stop, persist and resume independently at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.addInitScript(key => localStorage.setItem(key, 'true'), WAVE_WRAP.key);
    await page.goto('/shape.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    await openDevSettings(page);
    const toggle = page.getByRole('switch', { name: 'Outward waves & petals', exact: true });
    const tune = await page.evaluate(key => localStorage.getItem(key), COMPOSE.storageKey);
    await expect(toggle).toBeChecked();
    expect((await rippleFrames(page)).instances).toContain(3);
    await expect(page.locator('#mesh canvas')).toHaveCount(1);
    await expect(page.locator('.ripple-haze, .ripple-lighting, .ripple-rim')).toHaveCount(0);
    await toggle.uncheck();
    expect((await rippleFrames(page)).instances).toEqual([]);
    const petal = page.locator('.wave-ribbon .wave-petals ellipse').first(), alive = await petal.getAttribute('transform');
    await expect.poll(() => petal.getAttribute('transform')).not.toBe(alive);
    expect(await page.evaluate(key => localStorage.getItem(key), COMPOSE.storageKey)).toBe(tune);
    await page.reload(); await openDevSettings(page); await expect(toggle).not.toBeChecked();
    await page.getByRole('button', { name: 'Add sound track', exact: true }).click();
    expect((await rippleFrames(page)).instances).toEqual([]);
    await toggle.check();
    expect((await rippleFrames(page)).instances).toContain(3);
    await page.locator('#wave-density').evaluate(node => {
      if (!(node instanceof HTMLInputElement)) throw new Error('Density control is missing.');
      node.value = '36'; node.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect((await rippleFrames(page)).instances).toContain(6);
    await expect(page.locator('.wrapped-note-handle').first()).toBeVisible();
    await page.getByRole('switch', { name: 'Wrap waves around orb', exact: true }).uncheck();
    expect((await rippleFrames(page)).instances).toEqual([]);
    await expect(page.locator('#status')).toBeEmpty();
  });
}
