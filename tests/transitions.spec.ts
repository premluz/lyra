import { test, expect } from '@playwright/test';
import { createProject } from '../src/engine/defaults';
import type { Project, ShapeKey } from '../src/engine/types';

// The blending probe isolates CPU state changes below shader float precision.
const PROBES = { beforeBlend: 0.25 - 0.000000001, afterBlend: 0.25 + 0.000000001, fade: 0.49, beforeFrame: 0.5 - 0.000001, atFrame: 0.5, afterFrame: 0.5 + 0.000001 };

async function measureTransitions(page: import('@playwright/test').Page, project: Project) {
  return page.evaluate(async ({ project, probes }) => {
    const path = '/src/engine/renderer.ts';
    const { ParticleRenderer }: typeof import('../src/engine/renderer') = await import(path);
    const host = document.createElement('div'); host.className = 'stage-canvas';
    const stage = document.querySelector('.stage');
    if (!stage) throw new Error('Test viewport is missing.');
    stage.append(host);
    const runtime = new ParticleRenderer(host, project, '/models');
    const copy = document.createElement('canvas'), context = copy.getContext('2d');
    if (!context) throw new Error('Pixel measurements are unavailable.');
    await runtime.prepare(project);
    const capture = (progress: number) => {
      runtime.render(project, progress, 3);
      const canvas = runtime.renderer.domElement;
      copy.width = canvas.width; copy.height = canvas.height;
      context.drawImage(canvas, 0, 0);
      return context.getImageData(0, 0, copy.width, copy.height).data;
    };
    const difference = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
      let distance = 0, energy = 0;
      for (let i = 0; i < a.length; i++) { distance += Math.abs(a[i] - b[i]); energy += b[i]; }
      return distance / Math.max(1, energy);
    };
    const blendJump = difference(capture(probes.beforeBlend), capture(probes.afterBlend));
    const middle = capture(probes.atFrame);
    const energy = (pixels: Uint8ClampedArray) => pixels.reduce((sum, channel) => sum + channel, 0);
    const fadeVisibility = energy(capture(probes.fade)) / Math.max(1, energy(middle));
    const frameJump = difference(capture(probes.beforeFrame), middle);
    const exitJump = difference(middle, capture(probes.afterFrame));
    runtime.dispose(); host.remove();
    return { blendJump, frameJump, exitJump, fadeVisibility };
  }, { project, probes: PROBES });
}

for (const destination of ['ribbon', 'sphere'] satisfies ShapeKey[]) {
  test(`Dots → ${destination} stays visible and continuous across blending and keyframe boundaries`, async ({ page }) => {
    const project = createProject();
    project.keyframes[0].state.shape = 'dots';
    project.keyframes[0].state.renderStyle = 'halftone';
    project.keyframes[1].state.shape = destination;
    await page.goto('/');
    await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
    const measurements = await measureTransitions(page, project);
    console.log(`${destination} transition discontinuities: ${JSON.stringify(measurements)}`);
    expect(measurements.frameJump).toBeLessThan(0.01);
    expect(measurements.exitJump).toBeLessThan(0.01);
    expect(measurements.blendJump).toBeLessThan(0.01);
    expect(measurements.fadeVisibility).toBeGreaterThan(0.9);
  });
}
