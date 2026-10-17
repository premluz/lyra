import type { Page } from '@playwright/test';
import { SIMPLE } from '../src/simple/config';
import { parseComposition } from '../src/composer/storage';

export const DRAWING = [{ x: 0.1, y: 0.78 }, { x: 0.3, y: 0.4 }, { x: 0.5, y: 0.67 }, { x: 0.7, y: 0.22 }, { x: 0.9, y: 0.48 }];
export async function drawLine(page: Page, reverse = false) {
  const rect = await page.locator('#drawing-area').boundingBox();
  if (!rect) throw new Error('Drawing area is missing.');
  const points = reverse ? [...DRAWING].reverse() : DRAWING;
  await page.mouse.move(rect.x + points[0].x * rect.width, rect.y + points[0].y * rect.height); await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(rect.x + point.x * rect.width, rect.y + point.y * rect.height, { steps: 4 });
  await page.mouse.up();
}
export async function savedDrawing(page: Page) {
  const raw = await page.evaluate((key) => localStorage.getItem(key), SIMPLE.storageKey);
  if (raw === null) throw new Error('Drawing was not saved.');
  return parseComposition(JSON.parse(raw));
}
