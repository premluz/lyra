import { expect, test } from '@playwright/test';
import { TICK } from '../src/score';

test('wave knobs change rendered audio loudness, brightness and decay', async ({ page }) => {
  await page.goto('/shape.html');
  const result = await page.evaluate(async () => {
    const voicePath = '/src/audio/voices.ts', modelPath = '/src/composer/model.ts', playbackPath = '/src/composer/playback.ts';
    const { Voices }: typeof import('../src/audio/voices') = await import(voicePath);
    const { Score }: typeof import('../src/composer/model') = await import(modelPath);
    const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
    const render = async (level: number, tone: number, length: number) => {
      const score = new Score(); score.setNote(0, 7); score.setKnob('level', level); score.setKnob('tone', tone); score.setKnob('length', length);
      const note = new ScorePlayback(score).note('melody', 0), context = new OfflineAudioContext(1, 44100 * 3, 44100);
      const voices = new Voices(context, context.destination);
      voices.pluck(69, 0.025, note.velocity, note.point.depth, note.shape);
      const data = (await context.startRendering()).getChannelData(0);
      let energy = 0, tail = 0, edge = 0;
      data.forEach((value, i) => { energy += value * value; if (i > 44100) tail += value * value; if (i) edge += (value - data[i - 1]) ** 2; });
      return { energy, tail, brightness: edge / energy };
    };
    return { soft: await render(0.2, 0.5, 0.6), loud: await render(1, 0.5, 0.6), warm: await render(0.6, 0, 0.6), bright: await render(0.6, 1, 0.6), short: await render(0.6, 0.5, 0), long: await render(0.6, 0.5, 1) };
  });
  expect(result.loud.energy).toBeGreaterThan(result.soft.energy * 4);
  expect(result.bright.brightness).toBeGreaterThan(result.warm.brightness);
  expect(result.long.tail).toBeGreaterThan(result.short.tail + 0.001);
});

test('the shared scheduler plays authored lanes together on the audio grid', async ({ page }) => {
  await page.goto('/shape.html'); await page.getByRole('button', { name: 'Start sound', exact: true }).click();
  // Isolate the test engine from the page's audio context and software-rendered animation.
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.locator('#instrument')).toHaveAttribute('data-audio', 'locked');
  const notes = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts', modelPath = '/src/composer/model.ts', playbackPath = '/src/composer/playback.ts';
    const { SoundEngine }: typeof import('../src/audio/engine') = await import(enginePath);
    const { Score }: typeof import('../src/composer/model') = await import(modelPath);
    const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
    const score = new Score(), events: import('../src/score').NoteEvent[] = [];
    for (const id of ['melody', 'undertow', 'air'] as const) { score.select(id); score.setNote(0, 4); score.setNote(2, 7); }
    score.setKnob('length', 0);
    const playback = new ScorePlayback(score);
    const sound = new SoundEngine((event) => events.push(event), (error) => { throw error; }, playback);
    const until = (time: number) => new Promise<void>((resolve) => {
      const timer = setInterval(() => { if (sound.time > time) { clearInterval(timer); resolve(); } }, 25);
    });
    await sound.unlock(); await until(0.85);
    sound.preview(playback.note('air', 7)); await until(1.2);
    await sound.close(); return events;
  });
  expect(notes).toHaveLength(7);
  expect(notes.slice(0, 3).map((note) => note.lane)).toEqual(['melody', 'undertow', 'air']);
  expect(notes[0].time).toBe(notes[1].time); expect(notes[1].time).toBe(notes[2].time);
  expect(notes[3].time - notes[0].time).toBeCloseTo(TICK * 2, 6);
  expect(notes.map((note) => note.step)).toEqual([0, 0, 0, 2, 2, 2, 7]);
  expect(notes[6].time - notes[0].time).toBeCloseTo(TICK * 3, 6);
});
