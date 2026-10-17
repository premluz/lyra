import { expect, test } from '@playwright/test';

test('no autoplay; click unlocks; mute survives reload; exit and return work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const root = page.locator('#instrument'), mesh = page.locator('#mesh');
  await expect(mesh).toHaveAttribute('data-ready', 'true');
  await expect(root).toHaveAttribute('data-audio', 'locked');
  await mesh.click({ position: { x: 500, y: 350 } });
  await expect(root).toHaveAttribute('data-audio', 'running');
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
  await expect(root).toHaveAttribute('data-muted', 'true');
  await page.reload();
  await expect(root).toHaveAttribute('data-audio', 'locked');
  await expect(root).toHaveAttribute('data-muted', 'true');
  await page.getByRole('button', { name: 'Start sound', exact: true }).click();
  await page.getByRole('button', { name: 'Unmute sound', exact: true }).click();
  await expect(root).toHaveAttribute('data-muted', 'false');
  await page.getByRole('button', { name: 'Exit', exact: false }).click();
  await expect(root).toHaveAttribute('data-audio', 'locked');
  await expect(page.getByText('Until next time.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return to the orb', exact: false }).click();
  await expect(root).toHaveAttribute('data-audio', 'locked');
  await expect(mesh).toBeFocused(); expect(errors).toEqual([]);
});

test('keyboard controls unlock and pluck without a pointer', async ({ page }) => {
  await page.goto('/'); await page.locator('#mesh').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
  await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('ArrowUp');
  await expect(page.locator('#status')).toBeEmpty();
});

test('WebGL failure shows a static image and retains the musical interaction', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, id: string) {
        if (id.includes('webgl')) return null;
        return original.call(this, id);
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('#mesh')).toHaveAttribute('data-fallback', 'true');
  await expect(page.getByAltText('A softly glowing orb of particles', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start sound', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
});
