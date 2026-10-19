import { expect, test } from '@playwright/test';
import { openDevSettings } from './composer-helpers';
import { rippleFrames } from './ripple-browser';

test('the root opens Advanced V3 with wrapped waves and outward petals enabled', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/advanced-v3\.html$/);
  await expect(page.locator('#instrument')).toHaveAttribute('data-composer', 'v3');
  await expect(page.locator('#wrapped-waves')).toBeVisible();
  await expect(page.locator('#wave-surface')).toBeHidden();
  await openDevSettings(page);
  await expect(page.getByRole('switch', { name: 'Wrap waves around orb', exact: true })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Outward waves & petals', exact: true })).toBeChecked();
  await expect(page.locator('#mesh canvas')).toHaveCount(1);
  expect((await rippleFrames(page)).instances).toContain(9);
  await expect(page.locator('.wave-petals ellipse')).not.toHaveCount(0);
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  await expect(page.locator('#status')).toBeEmpty();
});

test('explicitly saved off settings stay off after the root opens Advanced V3', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('noise-orb:wrap-waves', 'false');
    localStorage.setItem('noise-orb:outward-waves', 'false');
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/advanced-v3\.html$/);
  await expect(page.locator('#wrapped-waves')).toBeHidden();
  await openDevSettings(page);
  await expect(page.getByRole('switch', { name: 'Wrap waves around orb', exact: true })).not.toBeChecked();
  await expect(page.getByRole('switch', { name: 'Outward waves & petals', exact: true })).not.toBeChecked();
});
