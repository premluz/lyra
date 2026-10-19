import { expect, test } from '@playwright/test';

test('the gong family exposes the orb tone and three sound-bath sizes', async ({ page }) => {
  await page.goto('/shape.html');
  const gongs = await page.evaluate(async () => {
    const path = '/src/audio/instruments.ts';
    const { GONG_INSTRUMENTS }: typeof import('../src/audio/instruments') = await import(path);
    return GONG_INSTRUMENTS.map(({ id, label, duration, partials }) => ({ id, label, duration, ratios: partials.map(({ ratio }) => ratio) }));
  });
  expect(gongs.map(({ id }) => id)).toEqual(['orb-gong', 'small-gong', 'bath-gong', 'deep-gong']);
  expect(new Set(gongs.map(({ label }) => label)).size).toBe(gongs.length);
  expect(gongs.map(({ duration }) => duration)).toEqual([2.7, 1.8, 3.8, 5]);
  expect(new Set(gongs.map(({ ratios }) => ratios.join('/'))).size).toBe(gongs.length);
});

function expectDistinct(voices: readonly { id: string; energy: number; peak: number; signature: readonly number[] }[]) {
  for (const voice of voices) {
    expect(voice.energy, `${voice.id} audible`).toBeGreaterThan(0.01); expect(voice.peak).toBeLessThan(0.2);
    for (const other of voices.filter((other) => other.id !== voice.id)) {
      const distance = voice.signature.reduce((sum, value, i) => sum + Math.abs(value - other.signature[i]), 0);
      expect(distance, `${voice.id} versus ${other.id}`).toBeGreaterThan(0.025);
    }
  }
}

for (const sample of [{ midi: 50, cutoff: 1500, decay: 0.6 }, { midi: 57, cutoff: 1800, decay: 1.2 }, { midi: 74, cutoff: 5500, decay: 0.65 }]) {
  test(`instrument voices have distinct rendered spectra and envelopes at MIDI ${sample.midi}`, async ({ page }) => {
    await page.goto('/shape.html');
    const voices = await page.evaluate(async (sample) => {
      const voicesPath = '/src/audio/voices.ts', instrumentsPath = '/src/audio/instruments.ts';
      const { Voices }: typeof import('../src/audio/voices') = await import(voicesPath);
      const { INSTRUMENTS }: typeof import('../src/audio/instruments') = await import(instrumentsPath);
      const sampleRate = 22050, start = 0.025, seconds = 4, window = 4096;
      const frequency = 440 * 2 ** ((sample.midi - 69) / 12);
      const spectralPower = (data: Float32Array, ratio: number) => {
        let real = 0, imaginary = 0;
        for (let i = 0; i < window; i++) {
          const value = data[Math.round(start * sampleRate) + i] * Math.sin(Math.PI * i / window) ** 2;
          const phase = Math.PI * 2 * frequency * ratio * i / sampleRate;
          real += value * Math.cos(phase); imaginary += value * Math.sin(phase);
        }
        return real * real + imaginary * imaginary;
      };
      const results = [];
      for (const { id } of INSTRUMENTS) {
        const context = new OfflineAudioContext(1, sampleRate * seconds, sampleRate);
        new Voices(context, context.destination).pluck(sample.midi, start, 0.5, 0.5, { decay: sample.decay, cutoff: sample.cutoff, instrument: id });
        const data = (await context.startRendering()).getChannelData(0);
        let energy = 0, early = 0, tail = 0, peak = 0;
        data.forEach((value, i) => {
          energy += value * value; peak = Math.max(peak, Math.abs(value));
          if (i / sampleRate < start + 0.1) early += value * value;
          if (i / sampleRate > start + sample.decay / 2) tail += value * value;
        });
        const spectrum = [0.5, 1, 1.5, 2, 3, 4, 2.756, 5.404].map((ratio) => spectralPower(data, ratio));
        const total = spectrum.reduce((sum, power) => sum + power, 0);
        results.push({ id, energy, peak, signature: [...spectrum.map((power) => power / total), early / energy, tail / energy] });
      }
      return results;
    }, sample);
    expectDistinct(voices);
  });
}

test('a dense mix of all instruments stays bounded, and cancellation frees the voice budget', async ({ page }) => {
  await page.goto('/shape.html');
  const result = await page.evaluate(async () => {
    const voicesPath = '/src/audio/voices.ts', instrumentsPath = '/src/audio/instruments.ts', graphPath = '/src/audio/graph.ts';
    const { Voices }: typeof import('../src/audio/voices') = await import(voicesPath);
    const { INSTRUMENTS }: typeof import('../src/audio/instruments') = await import(instrumentsPath);
    const { AudioGraph }: typeof import('../src/audio/graph') = await import(graphPath);
    const context = new OfflineAudioContext(2, 22050 * 14, 22050), graph = new AudioGraph(context);
    const voices = new Voices(context, graph.notes); graph.mute(false);
    const cancellations = INSTRUMENTS.map(({ id }) => voices.pluck(62, 0.025, 1, 1, { decay: 1.8, cutoff: 5700, instrument: id }));
    const full = voices.pluck(62, 0.025, 1, 1) === false;
    cancellations.forEach((cancel) => { if (cancel) cancel(); });
    let accepted = 0, dropped = 0, immediate = 0;
    for (let tick = 0; tick < 200; tick++) {
      const instrument = INSTRUMENTS[tick % INSTRUMENTS.length].id;
      if (voices.pluck(50 + [0, 2, 4, 7, 9][tick % 5], 0.025 + tick * 0.05, 1, 1, { instrument, decay: 1.2, cutoff: 5700 })) { accepted++; if (tick < INSTRUMENTS.length) immediate++; }
      else dropped++;
    }
    const data = (await context.startRendering()).getChannelData(0);
    let peak = 0, energy = 0;
    data.forEach((value) => { peak = Math.max(peak, Math.abs(value)); energy += value * value; });
    return { full, immediate, accepted, dropped, peak, rms: Math.sqrt(energy / data.length) };
  });
  expect(result.full).toBe(true); expect(result.immediate).toBe(6); expect(result.accepted).toBeGreaterThan(30); expect(result.dropped).toBeGreaterThan(50);
  expect(Number.isFinite(result.peak)).toBe(true); expect(result.peak).toBeLessThan(0.81); expect(result.rms).toBeGreaterThan(0.005);
});
