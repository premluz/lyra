import { shapeDefinitions } from './extracted/shapes';
import { ENGINE, MODEL_FILES } from './constants';
import { setSeed, shapeSeed } from './random';
import { loadModelShape } from './models';
import type { ShapeData, ShapeKey } from './types';

export function makeShape(key: ShapeKey, count: number, seed: number): ShapeData {
  const definition = shapeDefinitions.find((shape) => shape.key === key);
  if (!definition) throw new Error(`Shape "${key}" requires its model asset to be loaded.`);
  setSeed(shapeSeed(key, seed));
  const result = definition.generate(count, definition.config);
  return result instanceof Float32Array ? { positions: result } : result;
}

export class ShapeCache {
  private shapes = new Map<ShapeKey, ShapeData>();
  constructor(private count: number, private seed: number, private modelBase: string) {}
  async prepare(keys: ShapeKey[]) {
    await Promise.all([...new Set(keys)].map(async (key) => {
      if (this.shapes.has(key)) return;
      const file = Object.entries(MODEL_FILES).find(([name]) => name === key)?.[1];
      const shape = file ? await loadModelShape(`${this.modelBase}/${file}.glb`, this.count, this.seed)
        : makeShape(key, this.count, this.seed);
      this.shapes.set(key, shape);
    }));
  }
  get(key: ShapeKey) {
    const shape = this.shapes.get(key);
    if (!shape) throw new Error(`Shape "${key}" is not ready.`);
    return {
      positions: shape.positions,
      sizes: shape.sizes ?? new Float32Array(this.count).fill(ENGINE.sizeDefault),
      phis: shape.phis ?? new Float32Array(this.count),
      ribbonProgress: shape.ribbonProgress ?? new Float32Array(this.count).fill(-1),
    };
  }
}
