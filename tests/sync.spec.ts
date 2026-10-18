import { expect, test } from '@playwright/test';

test('ripples wait for scheduled audio time; a replaced ambient note leaves only the user ripple', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/src/visual/mesh.ts';
    const { OrbMesh }: typeof import('../src/visual/mesh') = await import(path);
    const host = document.createElement('div'); host.className = 'mesh'; document.querySelector('.experience')?.append(host);
    const canvas = document.createElement('canvas'), context = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!context) throw new Error('Ripple test requires WebGL.');
    const mesh = new OrbMesh(host, context), copy = document.createElement('canvas'), pixels = copy.getContext('2d');
    if (!pixels) throw new Error('Pixel inspection is unavailable.');
    const capture = (time: number) => {
      mesh.render(time, 0, 0); copy.width = canvas.width; copy.height = canvas.height;
      pixels.drawImage(canvas, 0, 0); return pixels.getImageData(0, 0, copy.width, copy.height).data;
    };
    const difference = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
      let distance = 0; for (let i = 0; i < a.length; i++) distance += Math.abs(a[i] - b[i]); return distance;
    };
    const before = capture(3), after = capture(4.3);
    const note = { time: 4, index: 0, midi: 50, velocity: 0.7, point: { x: 1, z: -1, nx: 0.6, depth: 0.6 }, user: true };
    mesh.ripple(note); const futureDifference = difference(before, capture(3)), activeDifference = difference(after, capture(4.3));
    const userOnly = capture(4.3); mesh.reset();
    mesh.ripple({ ...note, user: false, point: { x: -1, z: 1, nx: 0.3, depth: 0.3 } });
    mesh.ripple(note); const replacementDifference = difference(userOnly, capture(4.3));
    const air = { ...note, lane: 'air', point: { x: -1, z: 1, nx: 0.3, depth: 0.3 } };
    mesh.ripple(air); const combined = capture(4.3); mesh.reset(); mesh.ripple(air);
    const separateLaneDifference = difference(combined, capture(4.3));
    mesh.dispose(); host.remove(); return { futureDifference, activeDifference, replacementDifference, separateLaneDifference };
  });
  expect(result.futureDifference).toBe(0); expect(result.activeDifference).toBeGreaterThan(1000);
  expect(result.replacementDifference).toBe(0);
  expect(result.separateLaneDifference).toBeGreaterThan(1000);
});
