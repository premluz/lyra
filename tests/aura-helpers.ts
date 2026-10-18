import type { Page } from '@playwright/test';
import { AURA } from '../src/aura/config';

export async function seedAura(page: Page, seed = 17) {
  await page.addInitScript(({ key, seed }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({ version: 1, seed }));
    const Base = window.AudioContext; let contexts = 0;
    window.AudioContext = class extends Base {
      constructor(options?: AudioContextOptions) { super(options); document.documentElement.dataset.auraContexts = String(++contexts); }
    };
  }, { key: AURA.storageKey, seed });
}
export async function auraPoint(page: Page, x = 0.5, y = 0.5) {
  const box = await page.locator('#aura-play').boundingBox();
  if (!box) throw new Error('Aura interaction region is missing.');
  return { x: box.x + box.width * x, y: box.y + box.height * y };
}
