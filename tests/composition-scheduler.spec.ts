import { expect, test } from '@playwright/test';
import { TICK } from '../src/score';
import { instrumentFor } from '../src/audio/instruments';

test('swing is scheduled on the audio clock and emitted note envelopes match the actual voice', async ({ page }) => {
  await page.goto('/shape.html'); await page.getByRole('button', { name: 'Exit', exact: true }).click();
  const events = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts', fixturePath = '/tests/composition-fixtures.ts', playbackPath = '/src/composer/playback.ts';
    const { SoundEngine }: typeof import('../src/audio/engine') = await import(enginePath);
    const { compositionFixture }: typeof import('./composition-fixtures') = await import(fixturePath);
    const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
    const score = compositionFixture(); score.setForm('broken');
    const heard: import('../src/score').NoteEvent[] = [], source = new ScorePlayback(score);
    const sound = new SoundEngine((event) => heard.push(event), (error) => { throw error; }, source);
    await sound.unlock();
    await new Promise<void>((resolve) => { const timer = setInterval(() => { if (sound.time > 1.5) { clearInterval(timer); resolve(); } }, 25); });
    await sound.close(); return heard;
  });
  const first = events.find((event) => event.lane === 'melody' && event.step === 0), offbeat = events.find((event) => event.lane === 'melody' && event.step === 3);
  if (!first || !offbeat || !offbeat.envelope) throw new Error('Scheduled swing notes or their audio envelope are missing.');
  expect(offbeat.time - first.time).toBeCloseTo(TICK * (3 + 0.28), 6);
  expect(offbeat.envelope.hold).toBe(0); expect(offbeat.envelope.attack).toBeCloseTo(instrumentFor('felt').attack);
});
