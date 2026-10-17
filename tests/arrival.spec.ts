import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createProject } from '../src/engine/defaults';
import { STUDIO } from '../src/studio/constants';

async function canvasHash(page: Page) {
  const pixels = await page.locator('canvas').evaluate(async (canvas) => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Particle canvas is missing.');
    return canvas.toDataURL();
  });
  return createHash('sha256').update(pixels).digest('hex');
}

test('Arrival visibly changes shape at 0% without moving the playhead', async ({ page }) => {
  const project = createProject();
  project.particleCount = 14000;
  project.keyframes.splice(1, 1);
  project.keyframes[0].state.motion = 'helix';
  project.keyframes[0].state.renderStyle = 'halftone';
  project.keyframes[1].state.shape = 'ribbon-dispersed';
  project.keyframes[1].state.motion = 'grid';
  await page.addInitScript(({ key, project }) => localStorage.setItem(key, JSON.stringify(project)), { key: STUDIO.storage, project });
  await page.goto('/');
  await page.mouse.move(0, 0);
  await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use Sphere shape', exact: true }).click();
  await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
  const sphere = await canvasHash(page);
  await page.getByRole('button', { name: 'Use Torus shape', exact: true }).click();
  await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
  expect(await canvasHash(page)).not.toBe(sphere);
  await page.getByRole('button', { name: 'Use Sphere shape', exact: true }).click();
  await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
  expect(await canvasHash(page)).toBe(sphere);
  await expect(page.getByRole('slider', { name: 'Timeline progress', exact: true })).toHaveAttribute('aria-valuenow', '0');
});

for (const particleCount of [1000, 14000]) {
  test(`full free float hides Sphere/Terrain shape changes at ${particleCount} particles`, async ({ page }) => {
    const project = createProject();
    project.particleCount = particleCount;
    project.keyframes[0].state.motion = 'none';
    project.keyframes[0].state.uniforms.uFreeFloatRatio = 1;
    await page.addInitScript(({ key, project }) => localStorage.setItem(key, JSON.stringify(project)), { key: STUDIO.storage, project });
    await page.goto('/');
    await page.mouse.move(0, 0);
    await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
    await page.getByLabel('Rest shape', { exact: true }).selectOption('sphere');
    await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
    const sphere = await canvasHash(page);
    await page.getByLabel('Rest shape', { exact: true }).selectOption('terrain');
    await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
    expect(await canvasHash(page)).toBe(sphere);
    await page.getByText('Interaction & drift', { exact: true }).click();
    await page.getByRole('slider', { name: 'Free particles', exact: true }).focus();
    await page.keyboard.press('Home');
    await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
    expect(await canvasHash(page)).not.toBe(sphere);
  });
}
