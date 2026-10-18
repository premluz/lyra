import { gridGenerator } from './gridGenerator';
import { sphereGenerator } from './sphereGenerator';

type GeneratedShape = Float32Array | { positions: Float32Array };
interface Definition {
  key: string;
  generate: (count: number, config: Record<string, number>) => GeneratedShape;
  config: Record<string, number>;
}

export const shapeDefinitions: Definition[] = [
  { key: 'lab', generate: sphereGenerator, config: { radius: 3, height: 12, scale: 1 } },
  { key: 'grid', generate: gridGenerator, config: { radius: 2.2, height: 12, scale: 1, size: 30 } },
];
