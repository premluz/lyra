import { expect, test } from '@playwright/test';

test('orb component has a deterministic visual baseline', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.goto('/'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
  await page.clock.pauseAt(new Date('2026-01-01T12:01:00Z'));
  const path = '/src/visual/mesh.ts';
  await page.evaluate(async (path) => {
    const { OrbMesh }: typeof import('../src/visual/mesh') = await import(path);
    const host = document.getElementById('mesh');
    if (!host) throw new Error('Visual viewport is missing.');
    const old = host.querySelector('canvas'); old?.remove();
    const canvas = document.createElement('canvas'), context = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!context) throw new Error('WebGL is unavailable for the visual baseline.');
    const mesh = new OrbMesh(host, context);
    await new Promise<void>((resolve) => {
      const observer = new ResizeObserver(() => { mesh.render(3, 0, 0); observer.disconnect(); resolve(); });
      observer.observe(host);
    });
  }, path);
  await expect(page.locator('#mesh')).toHaveScreenshot('noise-orb.png');
});
