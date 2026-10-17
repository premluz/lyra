import { expect, test } from '@playwright/test';
import { compositionFixture } from './composition-fixtures';
import { COMPOSE } from '../src/composer/config';
import { saved } from './composer-helpers';

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`advanced ${variant} waves choose independent compositions and retain them through reload and Undo`, async ({ page }) => {
    const score = compositionFixture(variant), first = score.state.lanes[0], second = score.state.lanes[1];
    score.state.selected = first.id;
    await page.addInitScript(({ key, state }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(state));
    }, { key: COMPOSE.storageKey, state: score.state });
    await page.goto('/shape.html'); const style = page.getByRole('combobox', { name: 'Composition', exact: true });
    await style.selectOption('broken'); const firstEdit = await saved(page);
    expect(firstEdit.lanes.find((lane) => lane.id === first.id)?.form).toBe('broken');
    expect(firstEdit.lanes.filter((lane) => lane.id !== first.id)).toEqual(score.state.lanes.filter((lane) => lane.id !== first.id));
    await page.getByRole('button', { name: `Select ${second.name}`, exact: true }).click();
    await expect(style).toHaveValue('loop'); await style.selectOption('bloom');
    await expect(page.locator('#composition-help')).toContainText(`${second.name} ·`);
    await page.getByRole('button', { name: `Select ${first.name}`, exact: true }).click(); await expect(style).toHaveValue('broken');
    const favourite = await saved(page); await page.reload(); expect(await saved(page)).toEqual(favourite);
    await page.getByRole('button', { name: 'Randomise', exact: true }).click();
    await page.getByRole('button', { name: 'Undo randomise', exact: true }).click(); expect(await saved(page)).toEqual(favourite);
    await expect(style).toHaveValue('broken'); await expect(page.locator('#status')).toBeEmpty();
  });
}
