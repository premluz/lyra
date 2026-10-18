import { expect, test, type Page } from '@playwright/test';
import { compositionFixture } from './composition-fixtures';
import { COMPOSE } from '../src/composer/config';
import { openDevSettings, saved } from './composer-helpers';

async function assertCompact(page: Page) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Compact layout requires a fixed test viewport');
  const dock = await page.locator('#composer').boundingBox();
  const footer = await page.locator('.footer').boundingBox();
  if (!dock || !footer) throw new Error('Composer dock and footer must be rendered');
  expect(dock.height).toBeLessThanOrEqual(viewport.height / 4 + 1);
  expect(footer.y + footer.height).toBeLessThanOrEqual(viewport.height + 1);
  const centers = await page.locator('.shaping-controls').evaluate(element =>
    Array.from(element.children).filter(child => child.getClientRects().length > 0)
      .map(child => { const rect = child.getBoundingClientRect(); return rect.y + rect.height / 2; }));
  expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  if (viewport.width < 640) {
    expect(await page.locator('.shaping-controls').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  }
}

for (const width of [1440, 390]) {
  test(`clean orb viewport and grouped studio controls at ${width}px`, async ({ page }) => {
    const state = compositionFixture(width === 390 ? 'custom-polyphony' : 'trio').state;
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: COMPOSE.storageKey, state });
    await page.goto('/shape.html');
    expect(await page.locator('.experience').innerText()).toBe('');
    await expect(page.locator('.experience > :not(#mesh):not([hidden])')).toHaveCount(0);
    await expect(page.locator('.masthead, .composer-heading, .intro, .field-label')).toHaveCount(0);
    await expect(page.locator('#lane-name')).toBeHidden(); await expect(page.locator('#selected-lane')).toBeHidden();
    await expect(page.locator('#visual-shape')).toBeHidden(); await expect(page.locator('#render-treatment')).toBeHidden();
    await expect(page.locator('#orb-life-control')).toBeHidden(); await expect(page.locator('#ambient-tools')).toBeHidden();
    const panel = page.locator('.sound-shaping');
    await expect(panel.getByRole('button', { name: 'Start sound', exact: true })).toBeVisible();
    await expect(panel.getByRole('combobox', { name: 'Composition', exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Randomise', exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Export setup', exact: true })).toBeVisible();
    await assertCompact(page);
    await openDevSettings(page);
    await expect(panel.getByRole('combobox', { name: '3D shape', exact: true })).toBeVisible();
    await expect(panel.getByRole('slider', { name: 'Orb Alive', exact: true })).toBeVisible();
    await expect(panel.getByRole('switch', { name: 'Ambient tools', exact: true })).toBeVisible();
    await assertCompact(page);
    expect(await saved(page)).toEqual(state);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  });
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
  test(`twelve layers stay in the compact dock at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    const score = compositionFixture('custom-polyphony');
    while (score.state.lanes.length < 12) score.addLane('melody');
    score.state.lanes.forEach(lane => { lane.name = 'A long shared instrument name'; });
    await page.setViewportSize(viewport);
    await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: COMPOSE.storageKey, state: score.state });
    await page.goto('/shape.html');
    await expect(page.locator('.lane-tab')).toHaveCount(12);
    await assertCompact(page);
    const rows = await page.locator('.lane-tab').evaluateAll(tabs => tabs.map(tab => tab.getBoundingClientRect().top));
    expect(new Set(rows).size).toBe(1);
    await openDevSettings(page);
    await expect(page.getByRole('combobox', { name: '3D shape', exact: true })).toBeVisible();
    await assertCompact(page);
  });
}
