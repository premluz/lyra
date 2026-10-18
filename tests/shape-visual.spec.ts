import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`interactive waves show the score, note pulses, hover and both render treatments at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.goto('/draw.html'); await page.getByRole('button', { name: 'Exit', exact: false }).click();
    const result = await page.evaluate(async (width) => {
      const path = '/tests/shape-render-probe.ts'; const { shapeRenderProbe }: typeof import('./shape-render-probe') = await import(path);
      return shapeRenderProbe(width === 390 ? 'custom-polyphony' : 'trio');
    }, width);
    expect(result.geometry).toBeGreaterThan(1000); expect(result.future).toBe(0); expect(result.lit).toBeGreaterThan(500);
    for (const value of [result.onset, result.hover, result.hold, result.treatment]) expect(value).toBeGreaterThan(1000);
    expect(result.point.y).toBe(0); expect(result.point.proximity).toBeGreaterThan(0); expect(errors).toEqual([]);
    await expect(page.getByRole('combobox', { name: '3D shape', exact: true })).toHaveValue('waves');
    await expect(page.locator('#mesh canvas')).toHaveScreenshot(`interactive-waves-${width}.png`);
  });
}
