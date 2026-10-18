import { expect, test } from '@playwright/test';
import { openDevSettings } from './composer-helpers';

for (const width of [1440, 390]) {
  test(`advanced settings collapse independently of playback and wrapped editing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 }); await page.goto('/advanced-v3.html');
    const controls = page.locator('#advanced-sound-settings'), dock = page.locator('#composer');
    const initial = await dock.boundingBox();
    await page.getByRole('button', { name: 'Collapse advanced settings', exact: true }).click();
    await expect(controls).toBeHidden();
    await expect(page.getByRole('button', { name: 'Expand advanced settings', exact: true })).toHaveAttribute('aria-expanded', 'false');
    expect((await dock.boundingBox())?.height).toBeLessThan(initial?.height ?? 0);
    await expect(page.getByRole('button', { name: 'Randomise', exact: true })).toBeVisible();
    await openDevSettings(page); await page.getByRole('switch', { name: 'Wrap waves around orb', exact: true }).check();
    await expect(page.locator('#wrapped-waves')).toBeVisible(); await expect(controls).toBeHidden();
    await page.locator('#dev-settings > summary').click();
    await page.getByRole('button', { name: 'Hide settings', exact: true }).click();
    await expect(dock).toBeHidden();
    await expect(page.getByRole('button', { name: 'Show settings', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#wrapped-waves')).toBeVisible();
    const scene = await page.locator('#mesh').boundingBox();
    expect(scene?.width).toBeCloseTo(width, 0); expect(scene?.height).toBeCloseTo(width === 390 ? 844 : 960, 0);
    await page.getByRole('button', { name: 'Show settings', exact: true }).click();
    await expect(dock).toBeVisible(); await expect(page.locator('#wrapped-waves')).toBeVisible();
    await page.getByRole('button', { name: 'Expand advanced settings', exact: true }).press('Enter');
    await expect(controls).toBeVisible();
    await expect(page.getByRole('button', { name: 'Collapse advanced settings', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
    await expect(page.locator('#status')).toBeEmpty();
  });
}
