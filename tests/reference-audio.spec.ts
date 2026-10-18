import { expect, test } from '@playwright/test';

for (const sample of [{ carrier: 200, beat: 6 }, { carrier: 260, beat: 9 }]) {
  test(`the ${sample.carrier}/${sample.carrier + sample.beat} Hz pair stays isolated and dry even with a 15 s reverb`, async ({ page }) => {
    await page.goto('/shape.html');
    const result = await page.evaluate(async (sample) => {
      const binauralPath = '/src/audio/binaural.ts', graphPath = '/src/audio/graph.ts', modelPath = '/src/composer/model.ts', playbackPath = '/src/composer/playback.ts';
      const { BinauralVoice }: typeof import('../src/audio/binaural') = await import(binauralPath);
      const { AudioGraph }: typeof import('../src/audio/graph') = await import(graphPath);
      const { Score }: typeof import('../src/composer/model') = await import(modelPath);
      const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
      const score = new Score(); score.addLane('binaural'); score.setAmbientTools(true); score.setSustain('carrier', sample.carrier); score.setSustain('beat', sample.beat); score.setSustain('attack', 4);
      const lane = new ScorePlayback(score).continuous().lanes[0]; if (!lane) throw new Error('Stereo fixture is missing.'); lane.release = 4;
      const rate = 22050, context = new OfflineAudioContext(2, rate * 14, rate), graph = new AudioGraph(context);
      graph.configureSpace(15, 1); graph.mute(false);
      new BinauralVoice(context, graph.clean, lane, 0).release(7);
      const buffer = await context.startRendering(), left = buffer.getChannelData(0), right = buffer.getChannelData(1);
      const power = (data: Float32Array, hz: number) => {
        let real = 0, imaginary = 0;
        for (let i = 0; i < rate; i++) { const phase = Math.PI * 2 * hz * i / rate, value = data[rate * 5 + i]; real += value * Math.cos(phase); imaginary += value * Math.sin(phase); }
        return real * real + imaginary * imaginary;
      };
      const rms = (data: Float32Array, second: number) => Math.sqrt(data.slice(rate * second, rate * (second + 1)).reduce((sum, value) => sum + value * value, 0) / rate);
      return { left: power(left, sample.carrier), leakLeft: power(left, sample.carrier + sample.beat), right: power(right, sample.carrier + sample.beat), leakRight: power(right, sample.carrier), late: Math.max(rms(left, 13), rms(right, 13)), audible: rms(left, 5) };
    }, sample);
    expect(result.audible).toBeGreaterThan(0.001); expect(result.left).toBeGreaterThan(result.leakLeft * 1000); expect(result.right).toBeGreaterThan(result.leakRight * 1000);
    expect(result.late).toBeLessThan(0.00000001);
  });
}

for (const hz of [528, 264]) {
  test(`a held ${hz} Hz pad has a slow attack, continuous pitch and a six-second release`, async ({ page }) => {
    await page.goto('/shape.html');
    const result = await page.evaluate(async (hz) => {
      const voicePath = '/src/audio/sustain-voice.ts', modelPath = '/src/composer/model.ts', playbackPath = '/src/composer/playback.ts';
      const { SustainVoice }: typeof import('../src/audio/sustain-voice') = await import(voicePath);
      const { Score }: typeof import('../src/composer/model') = await import(modelPath);
      const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
      const score = new Score(); score.addReference(); const lane = new ScorePlayback(score).continuous().lanes[0];
      if (!lane) throw new Error('Drone fixture is missing.');
      lane.frequency = hz; lane.attack = 4; lane.release = 6; lane.breath = 30;
      const rate = 22050, context = new OfflineAudioContext(1, rate * 16, rate);
      new SustainVoice(context, context.destination, lane, 0).release(8);
      const data = (await context.startRendering()).getChannelData(0);
      const rms = (start: number, duration: number) => {
        const part = data.slice(start * rate, (start + duration) * rate); return Math.sqrt(part.reduce((sum, value) => sum + value * value, 0) / part.length);
      };
      let real = 0, imaginary = 0;
      for (let i = 0; i < rate; i++) { const phase = Math.PI * 2 * hz * i / rate, value = data[rate * 6 + i]; real += value * Math.cos(phase); imaginary += value * Math.sin(phase); }
      return { early: rms(0.1, 0.2), held: rms(6, 1), release: rms(10, 1), ended: rms(15, 1), fundamental: real * real + imaginary * imaginary };
    }, hz);
    expect(result.held).toBeGreaterThan(result.early * 8); expect(result.held).toBeGreaterThan(0.001);
    expect(result.release).toBeGreaterThan(0.0001); expect(result.ended).toBeLessThan(0.00000001); expect(result.fundamental).toBeGreaterThan(1);
  });
}

test('the full layered reference fades in, stays bounded and fades to silence over ninety seconds', async ({ page }) => {
  await page.goto('/shape.html');
  const result = await page.evaluate(async () => {
    const graphPath = '/src/audio/graph.ts', bankPath = '/src/audio/sustained.ts', modelPath = '/src/composer/model.ts', playbackPath = '/src/composer/playback.ts';
    const { AudioGraph }: typeof import('../src/audio/graph') = await import(graphPath);
    const { SustainedBank }: typeof import('../src/audio/sustained') = await import(bankPath);
    const { Score }: typeof import('../src/composer/model') = await import(modelPath);
    const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
    const score = new Score(); score.addReference();
    const rate = 12000, context = new OfflineAudioContext(2, rate * 94, rate), graph = new AudioGraph(context);
    graph.mute(false); new SustainedBank(context, graph).sync(new ScorePlayback(score).continuous(), 0);
    const end = graph.fadeOut(90), data = (await context.startRendering()).getChannelData(0);
    const rms = (second: number) => Math.sqrt(data.slice(second * rate, (second + 1) * rate).reduce((sum, value) => sum + value * value, 0) / rate);
    let peak = 0; for (const value of data) peak = Math.max(peak, Math.abs(value));
    return { end, peak, opening: rms(0), established: rms(15), ending: rms(89), silence: rms(92) };
  });
  expect(result.end).toBe(90); expect(result.established).toBeGreaterThan(result.opening * 2);
  expect(result.established).toBeGreaterThan(0.0005); expect(result.ending).toBeLessThan(result.established / 5);
  expect(result.peak).toBeLessThan(0.81); expect(result.silence).toBeLessThan(0.00000001);
});

test('twelve authored lanes can all sound on the same tick without the old six-voice cap', async ({ page }) => {
  await page.goto('/shape.html'); await page.getByRole('button', { name: 'Start sound', exact: true }).click();
  const events = await page.evaluate(async () => {
    const modelPath = '/src/composer/model.ts', playbackPath = '/src/composer/playback.ts', enginePath = '/src/audio/engine.ts';
    const { Score }: typeof import('../src/composer/model') = await import(modelPath);
    const { ScorePlayback }: typeof import('../src/composer/playback') = await import(playbackPath);
    const { SoundEngine }: typeof import('../src/audio/engine') = await import(enginePath);
    const score = new Score(); while (score.state.lanes.length < 12) score.addLane();
    score.state.lanes.forEach((lane) => { lane.notes.fill(null); lane.notes[0] = 4; });
    const heard: import('../src/score').NoteEvent[] = [], sound = new SoundEngine((event) => heard.push(event), (error) => { throw error; }, new ScorePlayback(score));
    await sound.unlock();
    await new Promise<void>((resolve) => { const timer = setInterval(() => { if (sound.time > 0.1) { clearInterval(timer); resolve(); } }, 10); });
    await sound.close(); return heard;
  });
  expect(events).toHaveLength(12); expect(new Set(events.map((event) => event.lane)).size).toBe(12);
  expect(new Set(events.map((event) => event.time)).size).toBe(1);
});

test('the long ambient reverb has an audible tail beyond eight seconds', async ({ page }) => {
  await page.goto('/shape.html');
  const result = await page.evaluate(async () => {
    const path = '/src/audio/graph.ts';
    const { AudioGraph }: typeof import('../src/audio/graph') = await import(path);
    const rate = 12000, context = new OfflineAudioContext(2, rate * 15, rate), graph = new AudioGraph(context);
    graph.configureSpace(12, 1); graph.mute(false);
    const impulse = context.createBuffer(1, 1, rate); impulse.getChannelData(0)[0] = 1;
    const source = context.createBufferSource(); source.buffer = impulse; source.connect(graph.mix); source.start(1);
    const data = (await context.startRendering()).getChannelData(0);
    const rms = (second: number) => Math.sqrt(data.slice(second * rate, (second + 1) * rate).reduce((sum, value) => sum + value * value, 0) / rate);
    return { tail: rms(9), end: rms(14) };
  });
  expect(result.tail).toBeGreaterThan(0.0000001); expect(result.end).toBeLessThan(0.00000001);
});
