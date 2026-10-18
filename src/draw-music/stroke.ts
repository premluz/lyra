import { clamp } from '../config';
import { TICK } from '../score';
import { COMPOSE } from '../composer/config';
import type { Lane } from '../composer/lanes';
import { DRAW_MUSIC as D } from './config';

export interface TimedPoint { x: number; y: number; time: number }
export function drawnPitch(point: TimedPoint, lane: Lane) {
  const layer = D.layers.find(layer => layer.id === lane.id);
  if (!layer) throw new Error(`Unknown drawing layer ${lane.id}`);
  return Math.round(layer.low + (1 - clamp(point.y)) * (layer.high - layer.low));
}
export function transcribe(lane: Lane, points: readonly TimedPoint[]): Lane {
  if (!points.length) throw new Error('Draw at least one point to make a note.');
  const notes = [...lane.notes], gates = [...lane.gates ?? notes.map(() => 0)];
  let previous = -1, onset = 0, started = 0;
  for (const point of points) {
    if (![point.x, point.y, point.time].every(Number.isFinite)) throw new Error('Drawing contains an invalid timed point.');
    const pitch = drawnPitch(point, lane), step = Math.round(clamp(point.x) * (notes.length - 1));
    if (pitch !== previous) { previous = pitch; onset = step; started = point.time; notes[step] = pitch; gates[step] = 0; }
    const spatial = Math.abs(step - onset), held = Math.max(0, (point.time - started - D.holdAfter) / TICK);
    gates[onset] = Math.min(COMPOSE.maxGate, Math.max(gates[onset], spatial, held));
  }
  return { ...lane, notes, gates, form: 'loop', lift: 0.5, rate: 1, enabled: true,
    phase: notes.findIndex(note => note !== null), motif: notes.filter(note => note !== null) };
}
