import { expect, test } from '@playwright/test';
import { compositionFixture } from './composition-fixtures';
import { COMPOSE } from '../src/composer/config';
import { saved } from './composer-helpers';

for (const variant of ['trio', 'custom-polyphony'] as const) {
  for (const width of [1440, 390]) {
    test(`${variant} edits, saves and exports 36 notes at ${width}px`, async ({ page }) => {
      const score = compositionFixture(variant), id = score.selected.id, name = score.selected.name;
      await page.setViewportSize({ width, height: 960 });
      await page.addInitScript(({ key, state }) => {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(state));
      }, { key: COMPOSE.storageKey, state: score.state });
      await page.goto('/shape.html');
      const density = page.getByRole('slider', { name: `${name} density`, exact: true });
      await expect(density).toHaveAttribute('max', '36'); await density.press('End');
      await expect(page.locator('#density-value')).toHaveText('36 / 36 notes');
      await expect(page.locator('.step-hit[visibility="visible"]')).toHaveCount(36);
      const dense = await saved(page), lane = dense.lanes.find((item) => item.id === id);
      expect(lane?.notes.filter((pitch) => pitch !== null)).toHaveLength(36);
      expect(dense.lanes.filter((item) => item.id !== id)).toEqual(score.state.lanes.filter((item) => item.id !== id));
      const last = page.locator('.step-hit').nth(35); await last.press('ArrowUp');
      expect((await saved(page)).lanes.find((item) => item.id === id)?.notes[35]).toBe(Math.min(15, (lane?.notes[35] ?? 0) + 1));
      await last.press('Alt+ArrowRight');
      const shifted = await saved(page); expect(shifted.lanes.find((item) => item.id === id)?.notes[0]).toBe(Math.min(15, (lane?.notes[35] ?? 0) + 1));
      await page.reload(); expect(await saved(page)).toEqual(shifted);
      const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export setup', exact: false }).click();
      expect((await pending).suggestedFilename()).toMatch(/^noise-orb-setup-.*\.json$/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      const other = score.state.lanes.find((item) => item.id !== id);
      if (!other) throw new Error('Density fixture needs another lane.');
      await page.getByRole('button', { name: `Select ${other.name}`, exact: true }).click();
      await expect(page.locator('.step-hit[visibility="visible"]')).toHaveCount(24);
    });
  }
  test(`${variant} dense flashes meet their playheads and preserve the original loop duration`, async ({ page }) => {
    await page.goto('/shape.html');
    const result = await page.evaluate(async (variant) => {
      const fixturePath = '/tests/composition-fixtures.ts', surfacePath = '/src/composer/surface.ts', playbackPath = '/src/composer/playback.ts', clockPath = '/src/score.ts';
      const { compositionFixture }: typeof import('./composition-fixtures') = await import(fixturePath);
      const { WaveSurface }: typeof import('../src/composer/surface') = await import(surfacePath);
      const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
      const { TICK }: typeof import('../src/score') = await import(clockPath);
      const score = compositionFixture(variant); score.setDensity(36); score.setRate(1.5);
      const source = new ScorePlayback(score), surface = new WaveSurface(score, () => {}, () => {}), id = score.selected.id;
      let maxError = 0, count = 0;
      for (let tick = 0; tick < 48; tick++) {
        for (const note of source.schedule(0.025 + tick * TICK, tick).filter((note) => note.lane === id)) {
          const time = 0.025 + tick * TICK + (note.delay ?? 0); surface.note(id, time, note.step); surface.paint(time, source.elapsed(time));
          const head = surface.element.querySelector<SVGLineElement>(`.playhead[data-selected="true"]`);
          const dot = [...surface.element.querySelectorAll<SVGCircleElement>('.note-dot')].filter((item) => item.dataset.lane === id)[note.step];
          if (!head || !dot) throw new Error('Dense note or cursor is missing.');
          if (dot.dataset.playing !== 'true') throw new Error('Dense note failed to flash at its scheduled time.');
          maxError = Math.max(maxError, Math.abs(Number(head.getAttribute('x1')) - Number(dot.getAttribute('cx')))); count++;
        }
      }
      return { maxError, count };
    }, variant);
    expect(result.count).toBe(108); expect(result.maxError).toBeLessThan(0.000001);
  });
}
