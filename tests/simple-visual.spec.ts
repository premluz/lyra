import { expect, test } from '@playwright/test';
import { newDrawing, drawLayer } from '../src/simple/score';
import { DRAW_LAYERS, SIMPLE } from '../src/simple/config';
import { DRAWING } from './simple-helpers';

for (const width of [1440, 390]) {
  test(`drawing surface and completed score have stable baselines at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
    await page.goto('/draw.html'); await expect(page.locator('#mesh')).toHaveAttribute('data-ready', 'true');
    await page.clock.pauseAt(new Date('2026-01-01T12:01:00Z'));
    await page.evaluate(async () => {
      const meshPath = '/src/visual/mesh.ts', visualPath = '/src/composer/music-visual.ts', scorePath = '/src/composer/model.ts', playbackPath = '/src/composer/playback.ts', drawingPath = '/src/simple/score.ts';
      const { OrbMesh }: typeof import('../src/visual/mesh') = await import(meshPath);
      const { MusicVisual }: typeof import('../src/composer/music-visual') = await import(visualPath);
      const { Score }: typeof import('../src/composer/model') = await import(scorePath);
      const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
      const { newDrawing }: typeof import('../src/simple/score') = await import(drawingPath);
      const host = document.getElementById('mesh'); if (!host) throw new Error('Drawing visual is missing.');
      host.querySelector('canvas')?.remove();
      const context = document.createElement('canvas').getContext('webgl2', { alpha: true, antialias: true });
      if (!context) throw new Error('Drawing baseline requires WebGL.');
      const score = new Score(newDrawing(() => 0)), visual = new MusicVisual(score, new ScorePlayback(score));
      const mesh = new OrbMesh(host, context, visual);
      await new Promise<void>((resolve) => {
        const observer = new ResizeObserver(() => { mesh.render(3, 0, 0); observer.disconnect(); resolve(); }); observer.observe(host);
      });
    });
    await expect(page.locator('#drawing-stage')).toHaveScreenshot(`drawing-stage-${width}.png`);
    const state = DRAW_LAYERS.reduce((state, layer) => drawLayer(state, layer, DRAWING), newDrawing(() => 0.1));
    await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: SIMPLE.storageKey, state });
    await page.reload(); await expect(page.locator('#draw-title')).toHaveText('You shaped the music.');
    await expect(page.locator('#simple-score')).toHaveScreenshot(`drawn-score-${width}.png`);
    await expect(page.locator('#simple-controls')).toHaveScreenshot(`simple-controls-${width}.png`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
}
