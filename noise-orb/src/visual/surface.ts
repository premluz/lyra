import { Plane, Vector3 } from 'three';
import type { Ray } from 'three';
import { shapeDefinitions } from '../../../src/engine/extracted/shapes';
import { clamp } from '../config';
import type { TouchPoint } from '../score';

export const SURFACE = { key: 'noise-orb:visual-shape', size: 12,
  choices: [{ id: 'orb', label: '3D orb' }, { id: 'waves', label: 'Interactive waves' }] } as const;
export type MusicShape = typeof SURFACE.choices[number]['id'];
export function isMusicShape(value: unknown): value is MusicShape { return SURFACE.choices.some(({ id }) => id === value); }
export function wavePositions(count: number) {
  const definition = shapeDefinitions.find(({ key }) => key === 'grid');
  if (!definition) throw new Error('Interactive waves shape definition is missing.');
  const data = definition.generate(count, { ...definition.config, size: SURFACE.size });
  return data instanceof Float32Array ? data : data.positions;
}
export function wavePoint(ray: Ray): TouchPoint {
  const hit = ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3()), half = SURFACE.size / 2;
  const inside = hit !== null && Math.abs(hit.x) <= half && Math.abs(hit.z) <= half;
  const x = clamp(hit?.x ?? 0, -half, half), z = clamp(hit?.z ?? 0, -half, half);
  return { x, y: 0, z, nx: (x + half) / SURFACE.size, depth: 1 - (z + half) / SURFACE.size,
    proximity: inside ? clamp(1 - (x * x + z * z) / (half * half)) : 0 };
}
