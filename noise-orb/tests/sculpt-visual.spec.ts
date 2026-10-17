import { expect, test } from '@playwright/test';
import { seedSculpt } from './sculpt-helpers';

for (const width of [1440, 390]) {
  test(`local sculpture and both render treatments compile at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 }); await seedSculpt(page, width === 390);
    await page.goto('/sculpt.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('#simple-score')).toHaveScreenshot(`sculpt-controls-${width}.png`);
    await page.getByRole('button', { name: 'Exit', exact: true }).click();
    const result = await page.evaluate(async (dense) => {
      const path = '/tests/sculpt-render-probe.ts'; const { sculptRenderProbe }: typeof import('./sculpt-render-probe') = await import(path);
      return sculptRenderProbe(dense);
    }, width === 390);
    expect(result.local.total).toBeGreaterThan(1000); expect(result.local.left).toBeGreaterThan(result.local.right * 1.5);
    expect(result.restored).toBe(0); expect(result.treatment).toBeGreaterThan(1000); expect(errors).toEqual([]);
    await expect(page.locator('#sculpt-stage')).toHaveScreenshot(`sculpt-stage-${width}.png`);
  });
}
test('proximity and geometric pitch edits change actual rendered audio', async ({ page }) => {
  await seedSculpt(page); await page.goto('/sculpt.html'); await page.getByRole('button', { name: 'Exit', exact: true }).click();
  const result = await page.evaluate(async () => {
    const path = '/tests/sculpt-render-probe.ts'; const { sculptAudioProbe }: typeof import('./sculpt-render-probe') = await import(path);
    return sculptAudioProbe();
  });
  expect(result.near.power).toBeGreaterThan(result.rest.power); expect(result.shaped.power).not.toBeCloseTo(result.rest.power, 4);
  for (const audio of Object.values(result)) { expect(audio.peak).toBeGreaterThan(0); expect(audio.peak).toBeLessThan(0.81); }
});
