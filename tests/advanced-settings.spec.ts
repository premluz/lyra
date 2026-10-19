import { expect, test } from '@playwright/test';
import { openDevSettings } from './composer-helpers';

for (const width of [1440, 390]) {
  test(`external actions drop to the bottom when settings close at ${width}px`, async ({ page }) => {
    const height = width === 390 ? 844 : 960;
    await page.setViewportSize({ width, height }); await page.goto('/advanced-v3.html');
    const dock = page.locator('#composer'), row = page.getByRole('group', { name: 'Sound, export and settings', exact: true });
    const button = page.getByRole('button', { name: 'Hide settings', exact: true });
    await expect(page.getByRole('button', { name: 'Select Melody', exact: true })).toBeVisible();
    const initial = await button.boundingBox(), pane = await dock.boundingBox();
    if (!initial || !pane) throw new Error('Settings geometry is unavailable.');
    expect(initial.y + initial.height).toBeLessThanOrEqual(pane.y);
    expect(await row.getByRole('button').evaluateAll(nodes => nodes.map(node => node.id || node.className))).toEqual(['sound', 'export-setup', 'focus-settings-toggle']);
    await expect(dock.locator('#sound, #export-setup, .focus-settings-toggle')).toHaveCount(0);
    await expect(page.locator('.shaping-label')).toBeHidden(); await expect(page.locator('.sound-shaping')).toHaveCSS('border-top-width', '0px');
    await expect(page.locator('.composer-actions > button').first()).toHaveText('Randomise');
    await expect(page.locator('.composer-actions > button').nth(1)).toHaveText('Add sound');
    await expect(page.locator('.composer-actions > button').nth(2)).toHaveText('Remove sound');
    await openDevSettings(page); await button.click();
    const show = page.getByRole('button', { name: 'Show settings', exact: true });
    await expect(show).toHaveAttribute('aria-expanded', 'false'); await expect(dock).toBeHidden();
    const closed = await show.boundingBox(); if (!closed) throw new Error('Show settings is unavailable.');
    expect(closed.x).toBe(initial.x); expect(closed.y).toBeGreaterThan(initial.y);
    expect(height - closed.y - closed.height).toBeLessThanOrEqual(12);
    await expect(page.getByRole('button')).toHaveCount(3); await expect(page.getByRole('slider')).toHaveCount(0);
    await expect(page.getByRole('link')).toHaveCount(0); await expect(page.locator('.wrapped-wave-help')).toBeHidden();
    const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export setup', exact: true }).click();
    expect((await download).suggestedFilename()).toMatch(/\.json$/);
    await show.press('Enter'); await expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(await button.boundingBox()).toEqual(initial); await expect(dock).toBeVisible();
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked'); await expect(page.locator('#status')).toBeEmpty();
  });
}
