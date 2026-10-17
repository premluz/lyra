import { expect, test, type Page } from '@playwright/test';
import { compositionFixture } from './composition-fixtures';
import { saved } from './composer-helpers';
import { COMPOSE } from '../src/composer/config';
import { WAVE_WRAP } from '../src/composer/wave-wrap-geometry';

async function open(page: Page, variant: 'trio' | 'custom-polyphony') {
  const score = compositionFixture(variant), lead = score.state.lanes.find(lane => lane.role === 'melody');
  if (!lead) throw new Error('Wrapped editor fixture needs a melody');
  score.state.selected = lead.id;
  await page.addInitScript(({ key, wrap, state }) => {
    localStorage.setItem(key, JSON.stringify(state)); localStorage.setItem(wrap, 'true');
  }, { key: COMPOSE.storageKey, wrap: WAVE_WRAP.key, state: score.state });
  await page.goto('/shape.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
  return lead;
}
async function point(page: Page, phase: number, radius = 120) {
  return page.locator('#wrapped-waves > svg').evaluate((node, { phase, radius, center }) => {
    const matrix = node instanceof SVGSVGElement ? node.getScreenCTM() : null;
    if (!matrix) throw new Error('Wrapped editor matrix is missing');
    const angle = phase * Math.PI * 2 - Math.PI / 2;
    const point = new DOMPoint(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius).matrixTransform(matrix);
    return { x: point.x, y: point.y };
  }, { phase, radius, center: WAVE_WRAP.center });
}

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`wrapped ${variant} handles edit pitch, rotate notes, add and remove notes with the horizontal editor hidden`, async ({ page }) => {
    const lead = await open(page, variant); await expect(page.locator('#wave-surface')).toBeHidden();
    const handle = page.locator('.wrapped-note-handle[data-selected="true"]').first();
    const step = Number(await handle.getAttribute('data-step')), phase = (step + 0.5) / lead.notes.length;
    const box = await handle.boundingBox(); if (!box) throw new Error('Wrapped note is missing');
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 }, target = await point(page, phase, 190);
    await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(target.x, target.y, { steps: 8 }); await page.mouse.up();
    const edited = (await saved(page)).lanes.find(lane => lane.id === lead.id);
    expect(edited?.notes[step]).toBeGreaterThan(lead.notes[step] ?? 0);
    expect(edited?.notes.filter((_, index) => index !== step)).toEqual(lead.notes.filter((_, index) => index !== step));
    const empty = lead.notes.findIndex(note => note === null), tap = await point(page, (empty + 0.5) / lead.notes.length);
    await page.mouse.click(tap.x, tap.y); expect((await saved(page)).lanes.find(lane => lane.id === lead.id)?.notes[empty]).not.toBeNull();
    await page.locator(`.wrapped-note-handle[data-selected="true"][data-step="${empty}"]`).press('Delete');
    expect((await saved(page)).lanes.find(lane => lane.id === lead.id)?.notes[empty]).toBeNull();
    const before = (await saved(page)).lanes.find(lane => lane.id === lead.id)?.notes;
    const a = await point(page, 0.125), b = await point(page, 0.125 + 2 / lead.notes.length);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 }); await page.mouse.up();
    expect((await saved(page)).lanes.find(lane => lane.id === lead.id)?.notes).toEqual(before?.map((_, index) => before[(index - 2 + before.length) % before.length]));
    await expect(page.locator('#status')).toBeEmpty();
  });
}

test.describe('wrapped touch editing', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('touch drag edits the selected note and cancellation restores its pitch', async ({ page }) => {
    const lead = await open(page, 'custom-polyphony'), handle = page.locator('.wrapped-note-handle[data-selected="true"]').first();
    const step = Number(await handle.getAttribute('data-step')), box = await handle.boundingBox();
    if (!box) throw new Error('Touch handle is missing');
    const target = await point(page, (step + 0.5) / lead.notes.length, 190), touch = await page.context().newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [target] });
    expect((await saved(page)).lanes.find(lane => lane.id === lead.id)?.notes[step]).toBeGreaterThan(lead.notes[step] ?? 0);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await touch.detach();
    expect((await saved(page)).lanes.find(lane => lane.id === lead.id)?.notes).toEqual(lead.notes);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
});

test('Exit cancels an unfinished ring drag and Return restores the editor', async ({ page }) => {
  const lead = await open(page, 'trio'), handle = page.locator('.wrapped-note-handle[data-selected="true"]').first();
  const step = Number(await handle.getAttribute('data-step')), box = await handle.boundingBox();
  if (!box) throw new Error('Exit fixture handle is missing');
  const target = await point(page, (step + 0.5) / lead.notes.length, 190);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 5 });
  expect((await saved(page)).lanes.find(lane => lane.id === lead.id)?.notes[step]).not.toBe(lead.notes[step]);
  await page.getByRole('button', { name: 'Exit', exact: true }).press('Enter');
  await expect(page.locator('#instrument')).toHaveAttribute('data-exited', 'true');
  expect((await saved(page)).lanes.find(lane => lane.id === lead.id)?.notes).toEqual(lead.notes);
  await page.mouse.up(); await page.locator('#return').click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-exited', 'false');
  await expect(handle).toBeVisible();
});
