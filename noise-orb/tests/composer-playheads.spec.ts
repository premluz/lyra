import { expect, test } from '@playwright/test';
import { Score } from '../src/composer/model';
import { COMPOSE } from '../src/composer/config';
import { RATES } from '../src/composer/pace';

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`${variant} flashes meet their own lane cursor through rate changes, selections and loop wraps`, async ({ page }) => {
    await page.goto('/shape.html');
    const result = await page.evaluate(async (variant) => {
      const path = '/tests/playhead-probe.ts'; const { playheadProbe }: typeof import('./playhead-probe') = await import(path);
      return playheadProbe(variant);
    }, variant);
    for (const frame of result.frames) {
      expect(frame.length).toBeGreaterThanOrEqual(4); expect(frame.filter((head) => head.selected)).toHaveLength(1);
      for (const head of frame) {
        expect(head.visible).toBe(true); expect(head.x).toBeCloseTo(head.expectedX, 7); expect(head.selected).toBe(head.expectedSelected);
        expect(head.opacity).toBe(head.selected ? 0.55 : 0.18);
      }
    }
    expect(result.onsets.count).toBeGreaterThan(80); expect(result.onsets.max).toBeLessThan(0.000001);
    expect(result.onsets.rates).toEqual([0.5, 1, 1.5, 2]);
    expect(result.lifecycle.hidden).toEqual(result.lifecycle.expected); expect(result.lifecycle.removed).toBe(true);
    expect(result.lifecycle.reset).toBe(true); expect(result.lifecycle.flashes).toBe(0);
  });
}
test('the actual composer sends the common audio clock even when the selected lane runs at half speed', async ({ page }) => {
  const score = new Score(); score.addLane('melody');
  score.state.lanes.forEach((lane, index) => { lane.rate = RATES[index].value; lane.notes.fill(2); }); score.select('melody');
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: COMPOSE.storageKey, state: score.state });
  await page.goto('/shape.html');
  const observation = page.evaluate(async () => {
    const path = '/tests/playhead-probe.ts'; const { livePlayheadProbe }: typeof import('./playhead-probe') = await import(path);
    return livePlayheadProbe();
  });
  await expect(page.locator('body')).toHaveAttribute('data-playhead-probe', 'ready');
  await page.getByRole('button', { name: 'Start sound', exact: true }).click();
  const frame = await observation; expect(frame.tick).toBeCloseTo(frame.expected, 7);
  for (const head of frame.positions) {
    const lane = score.state.lanes.find((lane) => lane.id === head.id); if (!lane) throw new Error('Live cursor has an unknown lane.');
    expect(head.visible).toBe(true); expect(head.x).toBeCloseTo((frame.expected * lane.rate + 0.5) / COMPOSE.steps * COMPOSE.width, 7);
  }
});
test('overlapping wave lanes show distinct, colour-matched playback guides', async ({ page }) => {
  await page.goto('/shape.html');
  await page.evaluate(async () => {
    const path = '/tests/playhead-probe.ts'; const { mountPlayheads }: typeof import('./playhead-probe') = await import(path);
    const { source, surface } = mountPlayheads('trio');
    surface.paint(0.025, source.elapsed(0.025)); surface.paint(2.525, source.elapsed(2.525));
  });
  await expect(page.locator('.playhead[visibility="visible"]')).toHaveCount(4);
  await expect(page.locator('.playhead[data-selected="true"]')).toHaveCount(1);
  await expect(page.locator('#wave-surface')).toHaveScreenshot('lane-playheads.png');
});
