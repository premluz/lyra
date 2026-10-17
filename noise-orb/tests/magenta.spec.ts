import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { MAGENTA } from '../src/magenta/config';
import { TICK } from '../src/score';
import { savedV3, savedDrawing, drawStroke } from './magenta-helpers';
import { serveProduction } from './production-assets';
import { compositionFixture } from './composition-fixtures';

for (const runtime of ['dev', 'built']) {
test(`Advanced V3 runs the real same-origin MusicVAE worker and exports editable generated notes (${runtime})`, async ({ page }, info) => {
  test.setTimeout(100000);
  const requests: string[] = [], errors: string[] = [];
  page.context().on('request', request => requests.push(request.url())); page.on('pageerror', error => errors.push(error.message));
  if (runtime === 'built') await serveProduction(page);
  const origin = runtime === 'built' ? 'http://noise-orb.test' : 'http://127.0.0.1:5174';
  await page.goto(`${origin}/advanced-v3.html`); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  await page.getByRole('button', { name: 'Randomise', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-generating', 'true');
  await expect(page.locator('#instrument')).toHaveAttribute('data-generating', 'false', { timeout: 90000 });
  await expect(page.locator('#model-status')).toHaveText('A new Magenta variation. Every note is yours to edit.');
  const state = await savedV3(page); expect(state.lanes.some(lane => lane.gates?.some(gate => gate > 0))).toBe(true);
  expect(requests.filter(url => url.includes('/models/musicvae/group')).length).toBeGreaterThanOrEqual(5);
  expect(requests.filter(url => !url.startsWith(`${origin}/`))).toEqual([]);
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export setup', exact: true }).click();
  const path = info.outputPath('magenta-setup.json'); await (await pending).saveAs(path);
  const exported: unknown = JSON.parse(await readFile(path, 'utf8'));
  expect(exported).toEqual(expect.objectContaining({ composition: state, authoring: { engine: 'MusicVAE', model: MAGENTA.model } }));
  await page.getByRole('button', { name: 'Undo randomise', exact: true }).click(); expect(await savedV3(page)).not.toEqual(state);
  await expect(page.locator('#status')).toBeEmpty(); expect(errors).toEqual([]);
});
}

test('dense fast layers can regenerate repeatedly with the real model', async ({ page }) => {
  test.setTimeout(180000);
  const score = compositionFixture('custom-polyphony');
  score.state.lanes.forEach(lane => { score.state.selected = lane.id; score.setDensity(36); lane.rate = 2; });
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: MAGENTA.storageKey, state: score.state });
  await page.goto('/advanced-v3.html');
  for (const iteration of [0, 1]) {
    const before = await savedV3(page);
    await page.getByRole('button', { name: 'Randomise', exact: true }).click();
    await expect(page.locator('#instrument')).toHaveAttribute('data-generating', 'true');
    await expect(page.locator('#instrument')).toHaveAttribute('data-generating', 'false', { timeout: 90000 });
    await expect(page.locator('#model-status')).toHaveText('A new Magenta variation. Every note is yours to edit.');
    expect(await savedV3(page), `generation ${iteration}`).not.toEqual(before);
  }
});

test('drawing emits a note before release and a stationary press records one sustained note', async ({ page }) => {
  await page.goto('/draw-music.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => {
    let start = 0, notes = 0;
    document.getElementById('drawing-area')?.addEventListener('pointerdown', () => { start = performance.now(); }, { capture: true });
    document.getElementById('mesh')?.addEventListener('orb:note', () => {
      if (notes++ === 0) document.documentElement.dataset.firstSoundMs = String(performance.now() - start);
      document.documentElement.dataset.liveNotes = String(notes);
    });
  });
  const box = await page.locator('#drawing-area').boundingBox(); if (!box) throw new Error('Missing drawing area');
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.55); await page.mouse.down();
  await expect(page.locator('html')).toHaveAttribute('data-live-notes', '1');
  expect(Number(await page.locator('html').getAttribute('data-first-sound-ms'))).toBeLessThan(TICK * 1000);
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 850)));
  await page.mouse.up(); await page.getByRole('button', { name: 'Cancel generation', exact: true }).click();
  const drawing = await savedDrawing(page), lane = drawing.composition.lanes.find(lane => lane.id === 'melody');
  expect(lane?.notes.filter(note => note !== null)).toHaveLength(1);
  expect(Math.max(...lane?.gates ?? [])).toBeGreaterThan(1);
  await page.reload(); expect(await savedDrawing(page)).toEqual(drawing);
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
});

test('a drawn hook receives real Magenta shaping and accompaniment while keeping its anchors', async ({ page }) => {
  test.setTimeout(100000);
  await page.goto('/draw-music.html'); await drawStroke(page);
  const raw = await savedDrawing(page), original = raw.composition.lanes.find(lane => lane.id === 'melody');
  await expect(page.locator('#instrument')).toHaveAttribute('data-generating', 'false', { timeout: 90000 });
  await expect(page.locator('#draw-hint')).toHaveText('Your drawing, with a little musical shaping. Keep drawing to add another phrase.');
  const result = await savedDrawing(page), melody = result.composition.lanes.find(lane => lane.id === 'melody');
  if (!original || !melody) throw new Error('Drawn melody is missing');
  const anchors = original.notes.flatMap((note, step) => note === null ? [] : [step]);
  expect(melody.notes[anchors[0]]).toBe(original.notes[anchors[0]]);
  expect(melody.notes[anchors[anchors.length - 1]]).toBe(original.notes[anchors[anchors.length - 1]]);
  expect(result.composition.lanes.every(lane => lane.notes.some(note => note !== null))).toBe(true);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); expect(await savedDrawing(page)).toEqual(raw);
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
});

test('model failure and cancellation preserve the score instead of substituting another generator', async ({ page }) => {
  await page.context().route('**/models/musicvae/config.json', route => route.fulfill({ status: 503, body: 'Test model unavailable' }));
  await page.goto('/advanced-v3.html');
  await page.getByRole('button', { name: 'Randomise', exact: true }).click();
  await expect(page.locator('#model-status')).toContainText('MusicVAE generation failed', { timeout: 15000 });
  expect(await page.evaluate(key => localStorage.getItem(key), MAGENTA.storageKey)).toBeNull();
  await page.context().unroute('**/models/musicvae/config.json');
  await page.getByRole('button', { name: 'Randomise', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel generation', exact: true }).click();
  await expect(page.locator('#model-status')).toHaveText('Generation cancelled. Your tune is unchanged.');
});
