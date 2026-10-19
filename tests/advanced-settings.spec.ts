import { expect, test } from '@playwright/test';
import { openDevSettings, saved } from './composer-helpers';
import { COMPOSE } from '../src/composer/config';

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
    await expect(page.locator('.composer-actions > button').nth(1)).toHaveText('Add sound track');
    await expect(page.locator('.composer-actions > button').nth(2)).toHaveText('Add binaural track');
    await expect(page.locator('.composer-actions > button').nth(3)).toHaveText('Remove track');
    await page.getByRole('button', { name: 'Add sound track', exact: true }).click(); await expect(page.locator('.lane-tab')).toHaveCount(4);
    await page.getByRole('button', { name: 'Remove track', exact: true }).click(); await expect(page.locator('.lane-tab')).toHaveCount(3);
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
    await page.getByRole('button', { name: 'Start sound', exact: true }).click();
    await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
    await expect(page.locator('#instrument')).toHaveAttribute('data-muted', 'true');
    await show.press('Enter'); await expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(await button.boundingBox()).toEqual(initial); await expect(dock).toBeVisible();
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running'); await expect(page.locator('#status')).toBeEmpty();
  });
}

for (const width of [1440, 390]) {
  test(`Add binaural selects a saved stereo sine layer and respects the layer limit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 }); await page.goto('/shape.html');
    const before = await saved(page);
    await page.getByRole('button', { name: 'Add binaural track', exact: true }).click();
    const state = await saved(page), layer = state.lanes.find(lane => lane.id === state.selected);
    if (!layer) throw new Error('Added binaural layer is missing.');
    expect(state.ambientTools).toBe(true); expect(layer.role).toBe('binaural'); expect(layer.instrument).toBe('sine');
    expect(state.lanes.slice(0, before.lanes.length)).toEqual(before.lanes);
    await expect(page.getByRole('combobox', { name: `${layer.name} role`, exact: true })).toHaveValue('binaural');
    await expect(page.getByRole('combobox', { name: `${layer.name} instrument`, exact: true })).toBeDisabled();
    await expect(page.getByLabel('Left tone · Hz', { exact: true })).toHaveValue(String(layer.carrier));
    await expect(page.getByLabel('Difference · Hz', { exact: true })).toHaveValue(String(layer.beat));
    await page.reload(); expect(await saved(page)).toEqual(state);
    for (let count = state.lanes.length; count < COMPOSE.maxLanes; count++) await page.getByRole('button', { name: 'Add sound track', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add binaural track', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: `${COMPOSE.maxLanes} sounds`, exact: true })).toBeDisabled();
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked'); await expect(page.locator('#status')).toBeEmpty();
  });
}
