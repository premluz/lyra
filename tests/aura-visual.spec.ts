import { expect, test } from '@playwright/test';
import { seedAura } from './aura-helpers';

for (const width of [1440, 390]) {
  test(`Aura has deterministic light, holds, note pulses and controls at ${width}px`, async ({ page }) => {
    const seed = width === 390 ? 95127 : 17, errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 }); await seedAura(page, seed);
    await page.goto('/aura.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    await page.getByRole('button', { name: 'Leave Aura', exact: true }).click();
    const result = await page.evaluate(async (seed) => {
      const path = '/tests/aura-render-probe.ts'; const { auraRenderProbe }: typeof import('./aura-render-probe') = await import(path);
      return auraRenderProbe(seed);
    }, seed);
    for (const value of [result.form, result.hover, result.bloom, result.pulse]) expect(value).toBeGreaterThan(1000);
    expect(result.future).toBe(0); expect(errors).toEqual([]);
    await expect(page.locator('#aura-stage')).toHaveScreenshot(`aura-world-${width}.png`);
    await expect(page.locator('.aura-footer')).toHaveScreenshot(`aura-control-${width}.png`);
  });
}
for (const seed of [17, 95127]) {
  test(`generated world ${seed} and a long hold render audible, bounded music`, async ({ page }) => {
    await seedAura(page, seed); await page.goto('/aura.html'); await page.getByRole('button', { name: 'Leave Aura', exact: true }).click();
    const result = await page.evaluate(async (seed) => {
      const path = '/tests/aura-audio-probe.ts'; const { auraAudioProbe }: typeof import('./aura-audio-probe') = await import(path);
      return auraAudioProbe(seed);
    }, seed);
    expect(result.finite).toBe(true); expect(result.peak).toBeLessThan(0.81); expect(result.rms).toBeGreaterThan(0.003);
    expect(result.gestures).toBeGreaterThan(10); expect(result.accepted).toBeGreaterThan(40);
  });
}
test('reduced motion softens the actual particle bloom and pulses', async ({ page }) => {
  await seedAura(page); await page.goto('/aura.html'); await page.getByRole('button', { name: 'Leave Aura', exact: true }).click();
  const full = await page.evaluate(async () => {
    const path = '/tests/aura-render-probe.ts'; const { auraRenderProbe }: typeof import('./aura-render-probe') = await import(path);
    return auraRenderProbe(17);
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await page.evaluate(async () => {
    const path = '/tests/aura-render-probe.ts'; const { auraRenderProbe }: typeof import('./aura-render-probe') = await import(path);
    return auraRenderProbe(17);
  });
  expect(reduced.pulse).toBeLessThan(full.pulse); expect(reduced.bloom).toBeLessThan(full.bloom);
});
