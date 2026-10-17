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

test('soft echoes travel while idle, remain decorative, and respect reduced motion', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(key => localStorage.setItem(key, 'true'), WAVE_WRAP.key);
  await page.goto('/advanced-v2.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
  const echo = page.locator('.wave-ripples .ripple-haze').first();
  await expect(page.locator('.wave-ripples .ripple-haze')).toHaveCount(9);
  await expect(page.locator('.wave-ripples .ripple-rim')).toHaveCount(9);
  const lighting = page.locator('.ripple-lighting').first();
  await expect(page.locator('.ripple-lighting')).toHaveCount(9);
  const reference = await lighting.getAttribute('href');
  expect(reference).toMatch(/^#wave-petal-lighting-/);
  await expect(page.locator(reference ?? '')).toHaveClass('wave-petals');
  const before = await echo.getAttribute('transform');
  await page.clock.runFor(1000);
  expect(await echo.getAttribute('transform')).not.toBe(before);
  expect(await lighting.getAttribute('transform')).toBe(await echo.getAttribute('transform'));
  expect(Number(await lighting.getAttribute('opacity'))).toBeGreaterThan(0);
  expect(await echo.evaluate(node => getComputedStyle(node).pointerEvents)).toBe('none');
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.runFor(100);
  const still = await echo.getAttribute('transform'); await page.clock.runFor(1000);
  expect(await echo.getAttribute('transform')).toBe(still);
  await expect(page.locator('#status')).toBeEmpty();
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

for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
  test(`ripples reach and fade toward the ${viewport.width}px viewport edge`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install();
    await page.addInitScript(key => localStorage.setItem(key, 'true'), WAVE_WRAP.key);
    await page.goto('/advanced-v2.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    const samples = await page.locator('.wave-ripples .ripple-haze').first().evaluate(node => {
      const scene = node.closest('svg');
      if (!scene) throw new Error('Ripple lost its scene.');
      const bounds = scene.getBoundingClientRect();
      return { bounds: { width: bounds.width, height: bounds.height }, scale: node.getAttribute('transform') };
    });
    const aspect = Math.max(samples.bounds.width / samples.bounds.height, samples.bounds.height / samples.bounds.width);
    await page.clock.runFor(5000);
    const echoes = await page.locator('.wave-ripples').first().locator('.ripple-haze').evaluateAll(nodes => nodes.map(node => {
      const value = node.getAttribute('transform')?.match(/scale\(([^)]+)\)/)?.[1];
      if (!value) throw new Error('Ripple has no scale.');
      return { scale: Number(value), opacity: Number(node.getAttribute('opacity')) };
    }).sort((a, b) => a.scale - b.scale));
    expect(echoes[2]?.scale).toBeGreaterThan(1 + (WAVE_WRAP.center * aspect / WAVE_WRAP.editRadius - 1) * 0.75);
    expect(echoes[2]?.opacity).toBeLessThan(echoes[1]?.opacity ?? 0);
    expect(samples.scale).not.toBeNull();
    await expect(page.locator('#status')).toBeEmpty();
  });
}
