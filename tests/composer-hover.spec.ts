import { expect, test } from '@playwright/test';
import { openDevSettings } from './composer-helpers';
import { TICK } from '../src/score';

test('hover hum responds to proximity and hold, tap survives release, and leaving fades to silence', async ({ page }) => {
  await page.goto('/shape.html'); await page.getByRole('button', { name: 'Exit', exact: true }).click();
  const result = await page.evaluate(async () => {
    const path = '/tests/hover-audio-probe.ts'; const { hoverAudioProbe }: typeof import('./hover-audio-probe') = await import(path);
    return hoverAudioProbe();
  });
  expect(result.idle).toBe(0); expect(result.near).toBeGreaterThan(result.edge * 2); expect(result.held).toBeGreaterThan(result.near);
  expect(result.ended).toBeLessThan(result.near / 100); expect(result.peak).toBeLessThan(0.81);
  expect(result.events.map((event) => event.time)).toEqual([1.025, 3.025, 7.025]);
});
test('hover displacement stays local, press increases heat, and Alive adds a subtle independent drift', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/shape.html'); await page.getByRole('button', { name: 'Exit', exact: true }).click();
  const result = await page.evaluate(async () => {
    const path = '/tests/hover-render-probe.ts'; const { hoverRenderProbe }: typeof import('./hover-render-probe') = await import(path);
    return hoverRenderProbe();
  });
  expect(result.local.left).toBeGreaterThan(result.local.right * 2); expect(result.local.total).toBeGreaterThan(1000);
  expect(result.pressed.brightness).toBeGreaterThan(result.local.brightness); expect(result.released.total).toBeLessThan(result.local.total / 100);
  expect(result.alive.total).toBeGreaterThan(1000); expect(errors).toEqual([]);
});
test('Alive uses the existing knob interaction, persists, and does not unlock audio', async ({ page }) => {
  await page.goto('/shape.html');
  await openDevSettings(page);
  const knob = page.getByRole('slider', { name: 'Orb Alive', exact: true }); await expect(knob).toHaveValue('25');
  await knob.fill('62'); await expect(knob).toHaveValue('62'); await page.reload(); await openDevSettings(page);
  await expect(page.getByRole('slider', { name: 'Orb Alive', exact: true })).toHaveValue('62');
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
});

test('live pointer notes share the authored grid and stop after leaving the orb', async ({ page }) => {
  await page.goto('/shape.html'); const mesh = page.locator('#mesh'), box = await mesh.boundingBox();
  if (!box) throw new Error('Orb interaction region is missing.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  await page.getByRole('button', { name: 'Start sound', exact: true }).click();
  const result = await page.evaluate(() => new Promise<{ live: number; authored: number; stopped: boolean; times: number[] }>((resolve) => {
    const host = document.getElementById('mesh'); if (!host) throw new Error('Orb is missing.');
    let live = 0, authored = 0, before = -1, left = false;
    const times: number[] = [];
    host.addEventListener('orb:note', (event) => {
      if (!(event instanceof CustomEvent)) throw new Error('Unexpected orb note event.');
      const detail: unknown = event.detail;
      if (typeof detail !== 'object' || detail === null || !('time' in detail)) throw new Error('Orb note payload is missing.');
      if (typeof detail.time !== 'number') throw new Error('Orb note time is missing.'); times.push(detail.time);
      if ('lane' in detail) authored++; else live++;
    });
    const start = performance.now(), rect = host.getBoundingClientRect();
    const timer = setInterval(() => {
      const elapsed = performance.now() - start;
      if (elapsed < 2000) host.dispatchEvent(new PointerEvent('pointermove', { isPrimary: true, pointerType: 'mouse',
        clientX: rect.left + rect.width / 2 + Math.sin(elapsed) * 8, clientY: rect.top + rect.height / 2 }));
      else if (!left) { host.dispatchEvent(new PointerEvent('pointerleave')); left = true; }
      if (elapsed > 2300 && before < 0) before = live;
      if (elapsed > 3000) { clearInterval(timer); resolve({ live, authored, stopped: live === before, times }); }
    }, 50);
  }));
  expect(result.live).toBeGreaterThan(1); expect(result.authored).toBeGreaterThan(0); expect(result.stopped).toBe(true);
  for (const time of result.times) { const tick = (time - result.times[0]) / TICK; expect(tick).toBeCloseTo(Math.round(tick), 6); }
  await expect(page.locator('#status')).toBeEmpty();
});
