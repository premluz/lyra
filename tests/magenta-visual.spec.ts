import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
});

for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
  test(`new music modes stay compact at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('/advanced-v3.html');
    await expect(page.getByRole('button', { name: 'Randomise', exact: true })).toBeVisible();
    await page.clock.pauseAt(new Date('2026-01-01T12:01:00Z'));
    await expect(page.locator('#composer')).toHaveScreenshot(`v3-${viewport.width}.png`);
    const dock = await page.locator('#composer').boundingBox(); expect(dock?.height).toBeLessThanOrEqual(viewport.height / 4);
    await page.clock.resume();
    await page.goto('/draw-music.html');
    await expect(page.getByRole('slider', { name: 'Drawing Interpretation', exact: true })).toHaveValue('25');
    await expect(page.locator('#drawing-stage')).toHaveScreenshot(`draw-stage-${viewport.width}.png`);
    await expect(page.locator('#simple-score')).toHaveScreenshot(`draw-score-${viewport.width}.png`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await expect(page.locator('#status')).toBeEmpty();
  });
}
