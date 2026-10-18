import type { Page } from '@playwright/test';
import { SCULPT } from '../src/sculpt/config';
import { parseSculpt } from '../src/sculpt/storage';
import { sculptFixture } from './sculpt-fixtures';
import { COMPOSE } from '../src/composer/config';
import { SIMPLE } from '../src/simple/config';

export async function seedSculpt(page: Page, dense = false) {
  const setup = sculptFixture(dense);
  await page.addInitScript(({ setup, key, other }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(setup));
    other.forEach((name) => localStorage.setItem(name, JSON.stringify(setup.composition)));
  }, { setup, key: SCULPT.storageKey, other: [COMPOSE.storageKey, SIMPLE.storageKey] });
  return setup;
}
export async function savedSculpt(page: Page) {
  const raw = await page.evaluate((key) => localStorage.getItem(key), SCULPT.storageKey);
  if (raw === null) throw new Error('Sculpture has not been saved.');
  return parseSculpt(JSON.parse(raw));
}
export async function pullOrb(page: Page, release = true) {
  const box = await page.locator('#sculpt-area').boundingBox();
  if (!box) throw new Error('Sculpt interaction area is missing.');
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 45, y - 85, { steps: 8 });
  if (release) await page.mouse.up();
}
