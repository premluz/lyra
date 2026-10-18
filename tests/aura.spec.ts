import { expect, test } from '@playwright/test';
import { AURA } from '../src/aura/config';
import { auraPoint, seedAura } from './aura-helpers';

for (const width of [1440, 390]) {
  test(`Aura is silent until Generate, changes worlds without another audio context, and fits ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 }); await seedAura(page, width === 390 ? 95127 : 17);
    await page.goto('/aura.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    const point = await auraPoint(page); await page.mouse.move(point.x, point.y);
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
    await expect(page.locator('html')).not.toHaveAttribute('data-aura-contexts');
    const before = await page.locator('#instrument').getAttribute('data-world');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
    const first = await page.locator('#instrument').getAttribute('data-world'); expect(first).not.toBe(before);
    const title = await page.locator('#aura-title').textContent();
    if (title === null) throw new Error('Aura has no generated piece title.');
    await page.getByRole('button', { name: 'Generate another', exact: true }).click();
    await expect(page.locator('#aura-title')).not.toHaveText(title);
    await expect(page.locator('html')).toHaveAttribute('data-aura-contexts', '1');
    const saved = await page.evaluate((key) => localStorage.getItem(key), AURA.storageKey);
    expect(saved).toBe(JSON.stringify({ version: 1, seed: Number(await page.locator('#instrument').getAttribute('data-world')) }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.reload(); await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
    expect(await page.evaluate((key) => localStorage.getItem(key), AURA.storageKey)).toBe(saved);
    await expect(page.locator('#status')).toBeEmpty(); expect(errors).toEqual([]);
  });
}
test('a stationary hold gathers, opens, blooms and cancels on the browser animation clock', async ({ page }) => {
  await page.clock.install(); await seedAura(page); await page.goto('/aura.html');
  await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
  const point = await auraPoint(page, 0.7, 0.4); await page.mouse.move(point.x, point.y); await page.mouse.down();
  await page.clock.runFor(900); await expect(page.locator('#instrument')).toHaveAttribute('data-phase', 'gather');
  await page.clock.runFor(1900); await expect(page.locator('#instrument')).toHaveAttribute('data-phase', 'open');
  await page.clock.runFor(3000); await expect(page.locator('#instrument')).toHaveAttribute('data-phase', 'bloom');
  await page.mouse.up(); await page.clock.runFor(100); await expect(page.locator('#instrument')).toHaveAttribute('data-phase', 'idle');
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  const area = page.locator('#aura-play'); await area.focus(); await page.keyboard.down('Space'); await page.clock.runFor(2700);
  await expect(page.locator('#instrument')).toHaveAttribute('data-phase', 'open');
  await area.press('Escape'); await page.keyboard.up('Space'); await page.clock.runFor(100); await expect(page.locator('#instrument')).toHaveAttribute('data-phase', 'idle');
});
test('short presses emit musical events; mute, hide, exit and return remain available', async ({ page }) => {
  await seedAura(page); await page.goto('/aura.html'); await page.getByRole('button', { name: 'Generate', exact: true }).click();
  const observation = page.evaluate(() => new Promise<number>((resolve) => {
    const host = document.getElementById('mesh'); if (!host) throw new Error('Aura note source is missing.');
    let notes = 0;
    const hear = (event: Event) => {
      if (!(event instanceof CustomEvent)) throw new Error('Aura emitted an invalid note event.');
      const detail: unknown = event.detail;
      if (typeof detail === 'object' && detail !== null && 'lane' in detail && detail.lane === 'aura-touch') notes++;
    };
    host.addEventListener('orb:note', hear);
    setTimeout(() => { host.removeEventListener('orb:note', hear); resolve(notes); }, 1200);
  }));
  const point = await auraPoint(page, 0.8, 0.4); await page.mouse.click(point.x, point.y); expect(await observation).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click(); await expect(page.locator('#instrument')).toHaveAttribute('data-muted', 'true');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'suspended');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
  await page.getByRole('button', { name: 'Leave Aura', exact: true }).click(); await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  await page.getByRole('button', { name: 'Return to Aura', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Generate another', exact: true })).toBeEnabled();
  await expect(page.locator('#status')).toBeEmpty();
});
test('Aura remains musically playable with a static WebGL fallback', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, id: 'webgl2' | 'experimental-webgl2') { return id.includes('webgl') ? null : original.call(this, id); },
    });
  });
  await seedAura(page); await page.goto('/aura.html');
  await expect(page.locator('#mesh')).toHaveAttribute('data-fallback', 'true');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
  await expect(page.locator('#mesh .fallback')).toBeVisible();
});
