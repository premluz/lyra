import { expect, test } from '@playwright/test';
import { BASS_INSTRUMENTS } from '../src/audio/instruments';
import { COMPOSE } from '../src/composer/config';
import { compositionFixture } from './composition-fixtures';
import { saved } from './composer-helpers';

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`four foundation voices audition, persist and survive Undo in ${variant}`, async ({ page }) => {
    const score = compositionFixture(variant), bass = score.state.lanes.find((lane) => lane.role === 'undertow');
    if (!bass) throw new Error('Foundation voice fixture has no Undertow lane.');
    score.state.selected = bass.id;
    await page.addInitScript(({ key, state }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(state));
    }, { key: COMPOSE.storageKey, state: score.state });
    await page.goto('/shape.html');
    for (const { id } of BASS_INSTRUMENTS) {
      const before = await saved(page);
      await page.getByRole('combobox', { name: `${bass.name} instrument`, exact: true }).selectOption(id);
      await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'running');
      const after = await saved(page), lane = after.lanes.find((item) => item.id === bass.id);
      expect(lane).toEqual({ ...before.lanes.find((item) => item.id === bass.id), instrument: id });
      expect(after.lanes.filter((item) => item.id !== bass.id)).toEqual(before.lanes.filter((item) => item.id !== bass.id));
      await page.reload(); expect(await saved(page)).toEqual(after);
      await expect(page.getByRole('combobox', { name: `${bass.name} instrument`, exact: true })).toHaveValue(id);
    }
    const favourite = await saved(page);
    await page.getByRole('button', { name: 'Randomise', exact: true }).click();
    const generated = await saved(page);
    for (const lane of generated.lanes.filter((item) => item.role === 'undertow')) {
      expect(BASS_INSTRUMENTS.map(({ id }) => id)).toContain(lane.instrument);
    }
    await page.getByRole('button', { name: 'Undo randomise', exact: true }).click();
    expect(await saved(page)).toEqual(favourite);
  });
}
