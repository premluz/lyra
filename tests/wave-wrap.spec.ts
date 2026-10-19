import { expect, test } from '@playwright/test';
import { openDevSettings } from './composer-helpers';
import { WAVE_WRAP } from '../src/composer/wave-wrap-geometry';
import { V2 } from '../src/composer/v2/config';

for (const width of [1440, 390]) {
  test(`wrapped orb composition has a stable circular baseline at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
    await page.addInitScript(key => localStorage.setItem(key, 'true'), WAVE_WRAP.key);
    await page.goto('/advanced-v2.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('.wave-surface')).toHaveCount(1);
    await page.clock.pauseAt(new Date('2026-01-01T12:01:00Z'));
    await expect(page.locator('#mesh')).toHaveScreenshot(`wrapped-orb-${width}.png`, { timeout: 15000 });
  });
  test(`note handles stay circular through resizing and wrapped mode preserves the tune at ${width}px`, async ({ page }) => {
    await page.addInitScript(key => { if (localStorage.getItem(key) === null) localStorage.setItem(key, 'false'); }, WAVE_WRAP.key);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.goto('/advanced-v2.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    const dot = page.locator('.note-dot[data-selected="true"][data-filled="true"]').first();
    await expect.poll(async () => { const box = await dot.boundingBox(); return box ? Math.abs(box.width - box.height) : Infinity; }).toBeLessThan(0.1);
    const before = await page.evaluate(key => localStorage.getItem(key), V2.storageKey);
    await page.setViewportSize({ width: width - 30, height: 900 });
    await expect.poll(async () => { const box = await dot.boundingBox(); return box ? Math.abs(box.width - box.height) : Infinity; }).toBeLessThan(0.1);
    await openDevSettings(page); const toggle = page.getByRole('switch', { name: 'Wrap waves around orb', exact: true });
    await toggle.check(); await expect(page.locator('#wrapped-waves')).toBeVisible();
    await expect(page.locator('#wave-surface')).toBeHidden();
    const wrappedDot = page.locator('.wrapped-note-handle[data-selected="true"]').first();
    await expect.poll(async () => { const box = await wrappedDot.boundingBox(); return box ? Math.abs(box.width - box.height) : Infinity; }).toBeLessThan(0.1);
    expect(await page.locator('#mesh canvas').evaluate(canvas => getComputedStyle(canvas).maskImage)).toBe('none');
    expect(await page.locator('#mesh').evaluate(mesh => getComputedStyle(mesh, '::before').backgroundImage)).toContain('radial-gradient');
    expect(await page.locator('#wrapped-waves .wave-base-gradient').count()).toBe(3);
    expect(await page.evaluate(key => localStorage.getItem(key), V2.storageKey)).toBe(before);
    await page.reload(); await expect(page.locator('#wrapped-waves')).toBeVisible();
    await openDevSettings(page); await expect(toggle).toBeChecked(); await toggle.uncheck();
    await expect(page.locator('#wrapped-waves')).toBeHidden();
    expect(await page.evaluate(key => localStorage.getItem(key), WAVE_WRAP.key)).toBe('false');
    await expect(page.locator('#status')).toBeEmpty();
  });
}

test('wrapped ribbons animate from scheduled note events on the audio clock', async ({ page }) => {
  await page.goto('/advanced-v2.html'); await openDevSettings(page);
  await page.getByRole('switch', { name: 'Wrap waves around orb', exact: true }).check();
  const path = page.locator('#wrapped-waves .wrapped-wave-line').first();
  await path.evaluate(node => {
    const before = node.getAttribute('d');
    const observer = new MutationObserver(() => {
      if (node.getAttribute('d') === before) return;
      node.setAttribute('data-pulse-observed', 'true'); observer.disconnect();
    });
    observer.observe(node, { attributes: true, attributeFilter: ['d'] });
  });
  await page.getByRole('button', { name: 'Start sound', exact: true }).click();
  await page.locator('#mesh').scrollIntoViewIfNeeded();
  await expect(path).toHaveAttribute('data-pulse-observed', 'true');
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
});

test('petal lights follow the ribbon, animate without audio, and freeze for reduced motion', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(key => localStorage.setItem(key, 'true'), WAVE_WRAP.key);
  await page.goto('/advanced-v2.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
  const light = page.locator('.wave-petals ellipse').first();
  await expect(page.locator('.wave-petals ellipse')).toHaveCount(21);
  const before = await light.getAttribute('transform'); await page.clock.runFor(1000);
  expect(await light.getAttribute('transform')).not.toBe(before);
  expect(await light.evaluate(node => getComputedStyle(node).pointerEvents)).toBe('none');
  await expect(page.locator('.wave-petals').first()).toHaveAttribute('clip-path', /^url\(#wave-petals-/);
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.runFor(100);
  const still = await light.getAttribute('transform'); await page.clock.runFor(1000);
  expect(await light.getAttribute('transform')).toBe(still);
  await expect(page.locator('#status')).toBeEmpty();
});
