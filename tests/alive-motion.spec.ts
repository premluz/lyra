import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`Alive sends travelling waves through the surface instead of lifting the whole grid at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.goto('/shape.html'); await page.getByRole('button', { name: 'Exit', exact: true }).click();
    const samples = await page.evaluate(async () => {
      const path = '/tests/alive-render-probe.ts'; const { aliveMotionProbe }: typeof import('./alive-render-probe') = await import(path);
      return aliveMotionProbe();
    });
    const travel = samples.map(({ full, later }) => later - full);
    expect(Math.max(...travel) - Math.min(...travel)).toBeGreaterThan(1.5);
    samples.forEach(({ zero, zeroLater }) => expect(zeroLater).toBe(zero));
    const movement = samples.reduce((sum, { zero, full }) => sum + Math.abs(full - zero), 0);
    const subtle = samples.reduce((sum, { zero, quarter }) => sum + Math.abs(quarter - zero), 0);
    expect(movement).toBeGreaterThan(subtle * 2); expect(subtle).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await page.evaluate(async () => {
      const path = '/tests/alive-render-probe.ts'; const { aliveMotionProbe }: typeof import('./alive-render-probe') = await import(path);
      return aliveMotionProbe();
    });
    expect(reduced.reduce((sum, { zero, full }) => sum + Math.abs(full - zero), 0)).toBeLessThan(movement * 0.65);
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked'); await expect(page.locator('#status')).toBeEmpty();
  });
}
