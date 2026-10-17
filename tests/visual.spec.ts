import { test, expect } from '@playwright/test';

test('viewport dark and light baselines', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.locator('.stage')).toHaveScreenshot('viewport-dark.png');
  await page.getByRole('button', { name: 'Use light background', exact: true }).click();
  await expect(page.locator('.stage')).toHaveScreenshot('viewport-light.png');
});
