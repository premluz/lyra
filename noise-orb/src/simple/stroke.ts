import { clamp } from '../config';
import { NotePolicy } from '../score';
import { SIMPLE } from './config';
import type { DrawLayer } from './config';

export interface StrokePoint { x: number; y: number }
export function strokeLength(points: readonly StrokePoint[]) {
  return points.reduce((length, point, index) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error('Drawing contains an invalid point.');
    const before = points[Math.max(0, index - 1)];
    return length + Math.hypot(point.x - before.x, point.y - before.y);
  }, 0);
}
export function sampleStroke(points: readonly StrokePoint[], count: number): StrokePoint[] {
  const length = strokeLength(points);
  if (points.length < 2 || length < SIMPLE.minStroke) throw new Error('Draw a longer line to make a musical phrase.');
  const distances = [0];
  for (let index = 1; index < points.length; index++) distances.push(distances[index - 1] + Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y));
  let segment = 1;
  return Array.from({ length: count }, (_, index) => {
    const distance = length * index / (count - 1);
    while (segment < points.length - 1 && distances[segment] < distance) segment++;
    const start = points[segment - 1], end = points[segment], span = distances[segment] - distances[segment - 1];
    const amount = span > 0 ? (distance - distances[segment - 1]) / span : 0;
    return { x: clamp(start.x + (end.x - start.x) * amount), y: clamp(start.y + (end.y - start.y) * amount) };
  });
}
export function strokePhrase(points: readonly StrokePoint[], layer: DrawLayer) {
  const length = strokeLength(points), count = layer.counts[Math.min(layer.counts.length - 1, Math.floor(length / SIMPLE.densitySpan))];
  const cell = sampleStroke(points, count / 2).map(({ y }) => Math.round(layer.low + (1 - y) * (layer.high - layer.low)));
  if (layer.id === 'undertow') cell.forEach((_, index) => { if (index % 2 === 0) cell[index] = layer.low; });
  if (layer.id === 'melody') { cell[0] = layer.low; cell[cell.length - 1] = Math.min(cell[cell.length - 1], SIMPLE.cadenceMax); }
  const policy = new NotePolicy(), motif = [...cell, ...cell].map((pitch) => policy.choose(pitch));
  const last = motif.length - 1;
  if (motif[last] === motif[0] && motif[0] === motif[1]) motif[1] += motif[1] < layer.high ? 1 : -1;
  if (motif[last - 1] === motif[last] && motif[last] === motif[0]) motif[last] += motif[last] < layer.high ? 1 : -1;
  return motif;
}
export function strokePath(points: readonly StrokePoint[]) {
  return points.map(({ x, y }, index) => `${index ? 'L' : 'M'}${(x * SIMPLE.strokeWidth).toFixed(SIMPLE.decimals)},${(y * SIMPLE.strokeHeight).toFixed(SIMPLE.decimals)}`).join(' ');
}
