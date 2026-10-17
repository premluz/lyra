import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { shapeDefinitions } from '../src/engine/extracted/shapes';
import { makeShape } from '../src/engine/shapes';
import { SHAPES } from '../src/engine/types';
import { styleUniforms } from '../src/engine/extracted/uniforms';
import { styleDefinitions } from '../src/engine/extracted/styles';

function digest(array: Float32Array) { return createHash('sha256').update(new Uint8Array(array.buffer)).digest('hex'); }
const reference: Record<string, Record<string, string>> = JSON.parse(readFileSync(new URL('./fixtures/original-shapes.json', import.meta.url), 'utf8'));

describe('extracted geometry and shader contracts', () => {
  for (const definition of shapeDefinitions) {
    const key = SHAPES.find((shape) => shape === definition.key);
    if (!key) throw new Error(`Unregistered shape ${definition.key}`);
    it.each([1000, 1733])(`${key}: matches original Ghost geometry at %i particles`, (count) => {
      const data = makeShape(key, count, 42);
      expect(data.positions).toHaveLength(count * 3);
      expect(Array.from(data.positions).every(Number.isFinite)).toBe(true);
      expect(digest(data.positions)).toBe(reference[`${key}:${count}`].positions);
      if (data.sizes) expect(digest(data.sizes)).toBe(reference[`${key}:${count}`].sizes);
      if (data.phis) expect(digest(data.phis)).toBe(reference[`${key}:${count}`].phis);
      if (data.ribbonProgress) expect(digest(data.ribbonProgress)).toBe(reference[`${key}:${count}`].ribbonProgress);
      expect(makeShape(key, count, 42)).toEqual(data);
    });
  }
  it('supplies every declared style uniform', () => {
    const uniforms = styleUniforms();
    for (const style of styleDefinitions) for (const key of style.uniforms) expect(uniforms).toHaveProperty(key);
  });
});
