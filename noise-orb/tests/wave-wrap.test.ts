import { expect, test } from 'vitest';
import { wrappedPaths } from '../src/composer/wave-wrap-geometry';
import { compositionFixture } from './composition-fixtures';

for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`wrapped ${variant} contours close at the seam and respond only to their supplied note pulses`, () => {
    for (const lane of compositionFixture(variant).state.lanes) {
      const rest = wrappedPaths(lane, 0, []), active = wrappedPaths(lane, 0, [{ phase: 0.5, strength: 1 }]);
      expect(rest.edge).not.toMatch(/NaN|Infinity/); expect(rest.area).toContain(rest.edge);
      const points = rest.edge.match(/[ML]([^MLZ]+)/g);
      expect(points?.[0]?.slice(1).trim()).toBe(points?.at(-1)?.slice(1).trim());
      expect(active.edge).not.toEqual(rest.edge); expect(wrappedPaths(lane, 0, [])).toEqual(rest);
    }
  });
}
