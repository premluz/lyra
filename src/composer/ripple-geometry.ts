import { BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, DynamicDrawUsage } from 'three';
import { RIPPLE } from './ripple-config';

export function rippleGeometry() {
  const geometry = new InstancedBufferGeometry(), vertices: number[] = [], indices: number[] = [];
  for (let step = 0; step <= RIPPLE.segments; step++) {
    const phase = step / RIPPLE.segments;
    vertices.push(phase, -1, 0, phase, 1, 0);
    if (step < RIPPLE.segments) {
      const start = step * 2;
      indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
    }
  }
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  geometry.setIndex(indices);
  geometry.setAttribute('aLayer', new InstancedBufferAttribute(new Float32Array(RIPPLE.lanes * RIPPLE.copies * 3), 3).setUsage(DynamicDrawUsage));
  geometry.setAttribute('aColour', new InstancedBufferAttribute(new Float32Array(RIPPLE.lanes * RIPPLE.copies * 3), 3).setUsage(DynamicDrawUsage));
  geometry.instanceCount = 0;
  return geometry;
}
