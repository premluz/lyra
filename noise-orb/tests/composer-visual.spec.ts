import { expect, test } from '@playwright/test';
import { openDevSettings } from './composer-helpers';
import { Score } from '../src/composer/model';
import { COMPOSE } from '../src/composer/config';

for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
  test(`composition dock baseline at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('/shape.html');
    await expect(page.getByRole('slider', { name: 'Melody Level', exact: true })).toHaveValue('60');
    await expect(page.locator('#composer')).toHaveScreenshot(`compose-${viewport.width}.png`);
  });
  test(`continuous arrangement baseline at ${viewport.width}px`, async ({ page }) => {
    const score = new Score(); score.addReference();
    await page.setViewportSize(viewport);
    await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: COMPOSE.storageKey, state: score.state });
    await page.goto('/shape.html'); await openDevSettings(page); await page.locator('#arrangement summary').click();
    await expect(page.getByRole('combobox', { name: '528 foundation role', exact: true })).toHaveValue('drone');
    await expect(page.locator('#composer')).toHaveScreenshot(`continuous-${viewport.width}.png`);
    await expect(page.locator('.dev-settings-panel')).toHaveScreenshot(`dev-settings-${viewport.width}.png`);
  });
}
