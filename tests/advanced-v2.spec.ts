import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { COMPOSE } from '../src/composer/config';
import { V2 } from '../src/composer/v2/config';
import { compositionFixture } from './composition-fixtures';
import { saved } from './composer-helpers';

async function v2State(page: Page) {
  return page.evaluate(async key => {
    const storagePath = '/src/composer/storage.ts', generationPath = '/src/composer/v2/generator.ts';
    const { loadComposition }: typeof import('../src/composer/storage') = await import(storagePath);
    const { createV2Composition }: typeof import('../src/composer/v2/generator') = await import(generationPath);
    return loadComposition(localStorage, key, createV2Composition);
  }, V2.storageKey);
}

for (const width of [1440, 390]) {
  test(`Advanced V2 at ${width}px edits, exports and undoes its own tune without changing Advanced`, async ({ page }, info) => {
    const original = compositionFixture('custom-polyphony').state;
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: COMPOSE.storageKey, state: original });
    await page.goto('/shape.html'); await page.getByRole('link', { name: 'Advanced V2 ↗', exact: true }).click();
    await expect(page).toHaveTitle('Advanced V2 — Shape the music');
    await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
    await expect(page.locator('#composer')).toHaveScreenshot(`advanced-v2-${width}.png`);
    const initial = await v2State(page);
    const box = await page.locator('#composer').boundingBox();
    expect(box?.height).toBeLessThanOrEqual((width === 390 ? 844 : 960) / 4);
    await page.getByRole('button', { name: 'Randomise', exact: true }).click();
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
    const generated = await v2State(page); expect(generated).not.toEqual(initial); expect(await saved(page)).toEqual(original);
    const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export setup', exact: true }).click();
    const path = info.outputPath('advanced-v2-setup.json'); await (await download).saveAs(path);
    const exported: unknown = JSON.parse(await readFile(path, 'utf8'));
    expect(exported).toEqual(expect.objectContaining({ composition: generated }));
    await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
    await page.getByRole('button', { name: 'Undo randomise', exact: true }).click(); expect(await v2State(page)).toEqual(initial);
    await page.getByRole('slider', { name: 'Density', exact: false }).fill('36');
    const edited = await v2State(page); expect(edited.lanes[0].notes.filter(note => note !== null)).toHaveLength(36);
    await page.reload(); expect(await v2State(page)).toEqual(edited);
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
    await page.getByRole('link', { name: 'Advanced ↗', exact: true }).click(); expect(await saved(page)).toEqual(original);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await expect(page.locator('#status')).toBeEmpty();
  });
}

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`generated V2 ${variant} renders audible, finite audio below clipping`, async ({ page }) => {
    await page.goto('/advanced-v2.html');
    const mix = await page.evaluate(async variant => {
      const path = '/tests/composition-audio-probe.ts';
      const { arrangementMixProbe }: typeof import('./composition-audio-probe') = await import(path);
      return arrangementMixProbe('loop', { variant, seed: variant === 'trio' ? 72573 : 94762, v2: true });
    }, variant);
    expect(mix.finite).toBe(true); expect(mix.energy).toBeGreaterThan(1);
    expect(mix.peak).toBeGreaterThan(0.01); expect(mix.peak).toBeLessThan(1);
  });
}
