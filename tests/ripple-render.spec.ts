import { expect, test } from '@playwright/test';
import { RIPPLE } from '../src/composer/ripple-config';

for (const dense of [false, true]) for (const reduced of [false, true]) {
  test(`outward shader: ${dense ? '12 dense layers' : 'trio'}, reduced motion ${reduced}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/shape.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    const result = await page.evaluate(async dense => {
      const path = '/tests/ripple-render-probe.ts';
      const { rippleRenderProbe }: typeof import('./ripple-render-probe') = await import(path);
      return rippleRenderProbe(dense ? 390 : 720, dense ? 844 : 480, dense);
    }, dense);
    expect(result.calls).toBe(1);
    expect(result.triangles).toBe((dense ? RIPPLE.lanes : 3) * RIPPLE.copies * RIPPLE.segments * 2);
    expect(result.visible).toBeGreaterThan(0); expect(result.centre).toBe(0); expect(result.same).toBe(0);
    if (reduced) expect(result.moving).toBe(0); else expect(result.moving).toBeGreaterThan(0);
    expect(result.reshaped).toBeGreaterThan(0);
    expect(result.off).toBe(false); expect(result.offCalls).toBe(0); expect(result.emptyCalls).toBe(0);
    expect(result.memory).toEqual({ geometries: 0, textures: 0 }); expect(result.error).toBe(0);
    await expect(page.locator('#status')).toBeEmpty();
  });
}
