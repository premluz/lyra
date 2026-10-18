import { expect, test } from '@playwright/test';

test('dense six-voice mix with pad, chord and effects remains audible and below clipping', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const graphPath = '/src/audio/graph.ts', voicesPath = '/src/audio/voices.ts', layerPath = '/src/audio/layers.ts';
    const { AudioGraph }: typeof import('../src/audio/graph') = await import(graphPath);
    const { Voices }: typeof import('../src/audio/voices') = await import(voicesPath);
    const { Layers }: typeof import('../src/audio/layers') = await import(layerPath);
    const context = new OfflineAudioContext(2, 44100 * 14, 44100);
    const graph = new AudioGraph(context), voices = new Voices(context, graph.notes);
    const layers = new Layers(context, graph.mix);
    graph.mute(false); layers.swell(1, true);
    let accepted = 0, dropped = 0;
    for (let time = 0.025; time < 10; time += 0.05) {
      if (voices.pluck(50 + [0, 2, 4, 7, 9][Math.round(time * 10) % 5], time, 1, 1)) accepted++;
      else dropped++;
    }
    const buffer = await context.startRendering(), data = buffer.getChannelData(0);
    let peak = 0, sum = 0, finite = true;
    for (const value of data) { peak = Math.max(peak, Math.abs(value)); sum += value * value; finite &&= Number.isFinite(value); }
    return { peak, rms: Math.sqrt(sum / data.length), accepted, dropped, finite };
  });
  console.log(`Offline audio: ${JSON.stringify(result)}`);
  expect(result.finite).toBe(true); expect(result.peak).toBeLessThan(0.81);
  expect(result.rms).toBeGreaterThan(0.005); expect(result.accepted).toBeGreaterThan(40);
  expect(result.dropped).toBeGreaterThan(100);
});
