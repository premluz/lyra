import { test, expect } from '@playwright/test';

test('invalid saved data is reported and preserved until a valid file is opened', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('particle-studio.project.v1', 'broken original project'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Autosave is paused');
  await expect(page.getByText('Autosave paused', { exact: true })).toBeVisible();
  await page.getByLabel('Project name', { exact: true }).fill('Recovery draft');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('particle-studio.project.v1'))).toBe('broken original project');
});
