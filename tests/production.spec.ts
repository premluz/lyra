import { expect, test } from '@playwright/test';
import { serveProduction } from './production-assets';

for (const path of ['/', '/shape.html', '/advanced-v2.html', '/advanced-v3.html', '/draw-music.html', '/draw.html', '/sculpt.html', '/aura.html']) {
test(`built ${path} runs independently with no studio, Ghost, CDN or external requests`, async ({ page }) => {
  const { errors, remote } = await serveProduction(page);
  await page.goto(`http://noise-orb.test${path}`);
  await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: path === '/aura.html' ? 'Generate' : 'Start sound', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
  await expect(page.locator('#status')).toBeEmpty();
  expect(errors).toEqual([]); expect(remote).toEqual([]);
});
}
