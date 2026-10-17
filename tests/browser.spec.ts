import { test, expect } from '@playwright/test';
import { SHAPES, MOTIONS } from '../src/engine/types';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
});

test('renders all extracted shapes and motion shaders without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.getByLabel('Motion shader', { exact: true }).selectOption('none');
  for (const shape of SHAPES) {
    await page.getByLabel('Rest shape', { exact: true }).selectOption(shape);
    await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await page.getByLabel('Rest shape', { exact: true }).selectOption('sphere');
  for (const motion of MOTIONS) {
    await page.getByLabel('Motion shader', { exact: true }).selectOption(motion);
    await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  const pixels = await page.locator('canvas').evaluate((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Canvas is missing.');
    const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
    const context = copy.getContext('2d'); if (!context) throw new Error('Pixel inspection unavailable.');
    context.drawImage(canvas, 0, 0);
    return context.getImageData(0, 0, copy.width, copy.height).data.filter((value, index) => index % 4 === 3 && value > 0).length;
  });
  expect(pixels).toBeGreaterThan(100);
  expect(errors).toEqual([]);
});

test('edits, saves, undoes, adds keyframes and scrubs scroll preview', async ({ page }) => {
  await page.getByLabel('Project name', { exact: true }).fill('Brand exploration');
  await page.getByLabel('Rest shape', { exact: true }).selectOption('torus');
  await expect(page.getByLabel('Rest shape', { exact: true })).toHaveValue('torus');
  await page.getByRole('button', { name: 'Undo (⌘Z)', exact: true }).click();
  await expect(page.getByLabel('Rest shape', { exact: true })).toHaveValue('lab');
  await page.getByRole('button', { name: 'Add keyframe', exact: true }).click();
  await expect(page.locator('.sequence-card')).toHaveCount(4);
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Project name', { exact: true })).toHaveValue('Brand exploration');
  await expect(page.locator('.sequence-card')).toHaveCount(4);
  await page.getByRole('tab', { name: 'Scroll preview', exact: true }).click();
  await page.getByLabel('Scroll preview', { exact: true }).evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(page.getByRole('slider', { name: 'Timeline progress', exact: true })).toHaveAttribute('aria-valuenow', '1');
});
