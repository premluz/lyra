import { expect, test } from '@playwright/test';
import { saved, enableAmbient } from './composer-helpers';

test('composition styles persist; Randomise changes structure; Undo restores the entire piece', async ({ page }) => {
  await page.goto('/shape.html'); const style = page.getByRole('combobox', { name: 'Composition', exact: true });
  await expect(style).toHaveValue('loop'); await style.selectOption('flowing');
  await expect(page.locator('#composition-help')).toContainText('repeating plucked hook'); await expect(page.locator('#loop-label')).toHaveText('84 BPM · 12 BARS · D MAJOR');
  const before = await saved(page); await page.reload(); await expect(style).toHaveValue('flowing'); expect(await saved(page)).toEqual(before);
  await page.getByRole('button', { name: 'Randomise', exact: true }).click(); const generated = await saved(page);
  expect(generated.form).not.toBe('flowing'); expect(generated.form).not.toBe('loop');
  await page.getByRole('button', { name: 'Undo randomise', exact: true }).click(); expect(await saved(page)).toEqual(before);
  await expect(style).toHaveValue('flowing'); await expect(page.locator('#status')).toBeEmpty();
});
test('melodic styles have ringing endings and audible gaps instead of sustained organ notes', async ({ page }) => {
  await page.goto('/shape.html'); await page.getByRole('button', { name: 'Exit', exact: true }).click();
  const result = await page.evaluate(async () => {
    const path = '/tests/composition-audio-probe.ts'; const { articulationProbe }: typeof import('./composition-audio-probe') = await import(path);
    return { flow: await articulationProbe('flowing'), bloom: await articulationProbe('bloom'), broken: await articulationProbe('broken'), loop: await articulationProbe('loop') };
  });
  expect(result.flow.ending).toBeGreaterThan(result.broken.ending); expect(result.bloom.ending).toBeGreaterThan(result.flow.ending);
  expect(result.flow.gap).toBe(0); expect(result.bloom.gap).toBe(0); expect(result.broken.gap).toBe(0); expect(result.loop.gap).toBe(0);
  expect(result.flow.late).toBe(0); expect(result.bloom.late).toBe(0);
});
test('ambient-only layers accurately show static harmony while keeping the chosen note composition style', async ({ page }) => {
  await page.goto('/shape.html'); await page.getByRole('combobox', { name: 'Composition', exact: true }).selectOption('flowing');
  await enableAmbient(page);
  await page.getByRole('button', { name: 'Add 528 drone layers', exact: true }).click();
  await expect(page.locator('#composition-phase')).toHaveText('Held layers · static harmony');
  await expect(page.locator('#composition-help')).toHaveText('Composition styles shape note lanes. These held ambient layers keep their own pitches.');
  await expect(page.getByRole('combobox', { name: 'Composition', exact: true })).toHaveValue('loop');
  await expect(page.getByRole('combobox', { name: 'Composition', exact: true })).toBeDisabled();
});
for (const form of ['flowing', 'conversation', 'broken', 'bloom'] as const) {
  test(`the full ${form} arrangement has finite audio and stays below clipping`, async ({ page }) => {
    await page.goto('/shape.html'); await page.getByRole('button', { name: 'Exit', exact: true }).click();
    const result = await page.evaluate(async (form) => {
      const path = '/tests/composition-audio-probe.ts'; const { arrangementMixProbe }: typeof import('./composition-audio-probe') = await import(path);
      return arrangementMixProbe(form);
    }, form);
    expect(result.finite).toBe(true); expect(result.energy).toBeGreaterThan(0.1); expect(result.peak).toBeLessThan(0.81);
  });
}
test.describe('phone composition', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('composition controls stay accessible without overflowing the phone', async ({ page }) => {
    await page.goto('/shape.html'); await page.getByRole('combobox', { name: 'Composition', exact: true }).selectOption('bloom');
    await expect(page.locator('#composition-help')).toContainText('bell-like endings');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.getByRole('button', { name: 'Exit', exact: true }).tap(); await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  });
});
