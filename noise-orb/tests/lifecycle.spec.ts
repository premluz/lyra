import { expect, test } from '@playwright/test';

test('offscreen and hidden states suspend audio; returning resumes only an unlocked piece', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('#instrument');
  await page.getByRole('button', { name: 'Start sound', exact: true }).click();
  await expect(root).toHaveAttribute('data-audio', 'running');
  await page.addStyleTag({ content: '.test-spacer { height: 160vh; }' });
  await page.evaluate(() => {
    const spacer = document.createElement('div'); spacer.className = 'test-spacer';
    document.body.append(spacer); window.scrollTo(0, document.body.scrollHeight);
  });
  await expect(root).toHaveAttribute('data-audio', 'suspended');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(root).toHaveAttribute('data-audio', 'running');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(root).toHaveAttribute('data-audio', 'suspended');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(root).toHaveAttribute('data-audio', 'running');
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  test('tap unlocks; mobile canvas respects pixel-ratio cap; layout has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    const mesh = page.locator('#mesh');
    await expect(mesh).toHaveAttribute('data-ready', 'true');
    await mesh.tap({ position: { x: 300, y: 240 } });
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('Mobile canvas is missing.');
      return { ratio: canvas.width / canvas.getBoundingClientRect().width, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(result.ratio).toBeLessThanOrEqual(2.01); expect(result.overflow).toBe(0);
    await expect(page.locator('#status')).toBeEmpty();
  });
});
