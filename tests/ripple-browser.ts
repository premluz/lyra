import type { Page } from '@playwright/test';

export async function rippleFrames(page: Page) {
  return page.evaluate(async () => {
    const prototype = WebGL2RenderingContext.prototype, original = prototype.drawElementsInstanced;
    const instances: number[] = [], durations: number[] = [];
    prototype.drawElementsInstanced = function (...args: Parameters<typeof original>) {
      instances.push(args[4]); original.apply(this, args);
    };
    try {
      let last = performance.now();
      for (let frame = 0; frame < 8; frame++) {
        await new Promise<void>(resolve => requestAnimationFrame(now => { durations.push(now - last); last = now; resolve(); }));
      }
      return { instances, durations };
    } finally { prototype.drawElementsInstanced = original; }
  });
}
