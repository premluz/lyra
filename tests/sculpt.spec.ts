import { expect, test } from '@playwright/test';
import { seedSculpt, savedSculpt, pullOrb } from './sculpt-helpers';
import { COMPOSE } from '../src/composer/config';
import { SIMPLE } from '../src/simple/config';

for (const width of [1440, 390]) {
  test(`mouse shaping changes only its sound, saves, reloads and undoes at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    const setup = await seedSculpt(page, width === 390); await page.goto('/sculpt.html');
    await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    const before = await savedSculpt(page), box = await page.locator('#sculpt-area').boundingBox();
    if (!box) throw new Error('Sculpt viewport is missing.');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('#sculpt-area')).toHaveAttribute('data-near', 'true');
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked'); expect(await savedSculpt(page)).toEqual(before);
    await pullOrb(page); const shaped = await savedSculpt(page);
    expect(shaped.handles).toHaveLength(1);
    expect(shaped.composition.lanes.find((lane) => lane.id === 'melody')?.notes).not.toEqual(before.composition.lanes.find((lane) => lane.id === 'melody')?.notes);
    expect(shaped.composition.lanes.filter((lane) => lane.id !== 'melody')).toEqual(before.composition.lanes.filter((lane) => lane.id !== 'melody'));
    await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
    await page.getByRole('button', { name: 'Undo shape', exact: true }).click(); expect(await savedSculpt(page)).toEqual(before);
    await pullOrb(page); const final = await savedSculpt(page); await page.reload();
    expect(await savedSculpt(page)).toEqual(final); await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
    const other = await page.evaluate((keys) => keys.map((key) => localStorage.getItem(key)), [COMPOSE.storageKey, SIMPLE.storageKey]);
    expect(other).toEqual([JSON.stringify(setup.composition), JSON.stringify(setup.composition)]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await expect(page.locator('#status')).toBeEmpty(); expect(errors).toEqual([]);
  });
}
test('keyboard sculpting can be cancelled; the compact controls remain independent per layer', async ({ page }) => {
  await seedSculpt(page); await page.goto('/sculpt.html');
  const before = await savedSculpt(page), area = page.locator('#sculpt-area');
  await area.press('Space'); await area.press('ArrowUp'); await area.press('ArrowUp'); await area.press('Escape');
  expect(await savedSculpt(page)).toEqual(before);
  await page.locator('.draw-layer.lane-air').click();
  const speed = page.getByRole('slider', { name: 'Sparkle Speed', exact: true }); await speed.fill('3');
  await page.getByRole('slider', { name: 'Sparkle Density', exact: true }).fill('36');
  await page.getByRole('combobox', { name: 'Sparkle sound', exact: true }).selectOption('glass');
  const after = await savedSculpt(page);
  expect(after.composition.lanes.find((lane) => lane.id === 'air')).toMatchObject({ rate: 2, instrument: 'glass' });
  expect(after.composition.lanes.find((lane) => lane.id === 'air')?.notes.filter((note) => note !== null)).toHaveLength(36);
  expect(after.composition.lanes.find((lane) => lane.id === 'melody')).toEqual(before.composition.lanes.find((lane) => lane.id === 'melody'));
});
test('mute, exit, return and a new tune work with a held sculpt gesture', async ({ page }) => {
  await seedSculpt(page); await page.goto('/sculpt.html'); await pullOrb(page);
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-muted', 'true');
  await pullOrb(page, false); await page.locator('#sculpt-area').press('Escape'); await page.mouse.up();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  await expect(page.locator('#simple-score')).toHaveAttribute('inert', '');
  await page.getByRole('button', { name: 'Return to the orb', exact: true }).click();
  const before = await savedSculpt(page); await page.getByRole('button', { name: 'New tune ＋', exact: true }).click();
  const after = await savedSculpt(page); expect(after.handles).toEqual([]); expect(after.composition).not.toEqual(before.composition);
  await expect(page.locator('#instrument')).toHaveAttribute('data-muted', 'true');
  await expect(page.locator('.draw-layer')).toHaveCount(3); await expect(page.locator('#status')).toBeEmpty();
});
test('the existing views link to the independent Sculpt demo', async ({ page }) => {
  for (const path of ['/shape.html', '/draw.html']) {
    await page.goto(path); await page.getByRole('link', { name: 'Sculpt music ↗', exact: true }).click();
    await expect(page).toHaveURL(/\/sculpt\.html$/);
    await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    await expect(page.getByRole('link', { name: 'Sculpt', exact: true })).toHaveAttribute('aria-current', 'page');
  }
});
