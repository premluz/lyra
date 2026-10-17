import type { Page } from '@playwright/test';

export async function saved(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/composer/storage.ts';
    const { loadComposition }: typeof import('../src/composer/storage') = await import(path);
    return loadComposition(localStorage);
  });
}

export async function enableAmbient(page: Page) {
  await openDevSettings(page);
  await page.getByRole('switch', { name: 'Ambient tools', exact: true }).setChecked(true);
}

export async function openDevSettings(page: Page) {
  const settings = page.locator('#dev-settings');
  if (await settings.getAttribute('open') === null) await settings.locator(':scope > summary').click();
}
