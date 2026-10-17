import type { Page } from '@playwright/test';
import { MAGENTA } from '../src/magenta/config';
import { DRAW_MUSIC } from '../src/draw-music/config';
import { parseComposition } from '../src/composer/storage';
import { createV2Composition } from '../src/composer/v2/generator';
import { blankDocument, parseDocument } from '../src/draw-music/document';

export async function savedV3(page: Page) {
  const raw = await page.evaluate(key => localStorage.getItem(key), MAGENTA.storageKey);
  return raw === null ? createV2Composition() : parseComposition(JSON.parse(raw));
}
export async function savedDrawing(page: Page) {
  const raw = await page.evaluate(key => localStorage.getItem(key), DRAW_MUSIC.storageKey);
  return raw === null ? blankDocument() : parseDocument(JSON.parse(raw));
}
export async function drawStroke(page: Page) {
  const box = await page.locator('#drawing-area').boundingBox();
  if (!box) throw new Error('Drawing surface is missing');
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.65); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.35, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.6, { steps: 8 });
  await page.mouse.up();
}
