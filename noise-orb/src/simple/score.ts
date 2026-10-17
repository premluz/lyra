import { createComposition } from '../composer/model';
import type { Composition } from '../composer/model';
import { createLane } from '../composer/lanes';
import { parseComposition } from '../composer/storage';
import { redistribute, wrapStep } from '../composer/rhythm';
import { DRAW_LAYERS, SIMPLE } from './config';
import type { DrawLayer } from './config';
import { strokePhrase } from './stroke';
import type { StrokePoint } from './stroke';

export function newDrawing(random: () => number = Math.random): Composition {
  const lanes = DRAW_LAYERS.map((layer) => {
    const chance = random();
    if (!Number.isFinite(chance) || chance < 0 || chance >= 1) throw new Error('Instrument choice requires random values between zero and one.');
    return { ...createLane(layer.id, layer.id, layer.name), phase: 0, instrument: layer.instruments[Math.floor(chance * layer.instruments.length)],
      level: layer.level, tone: layer.tone, length: layer.length };
  });
  return { ...createComposition(), lanes, selected: DRAW_LAYERS[0].id, form: 'flowing' };
}
export function loadDrawing(storage: Pick<Storage, 'getItem'>) {
  const saved = storage.getItem(SIMPLE.storageKey);
  if (saved === null) return null;
  const state = parseComposition(JSON.parse(saved));
  if (state.lanes.length !== DRAW_LAYERS.length || DRAW_LAYERS.some((layer) => !state.lanes.some((lane) => lane.id === layer.id && lane.role === layer.id))) throw new Error('Saved drawing is missing one of its three musical layers.');
  return state;
}
export function nextLayer(state: Composition) {
  return DRAW_LAYERS.findIndex((layer) => {
    const lane = state.lanes.find((lane) => lane.id === layer.id);
    return !lane || (lane.motif.length === 0 && !lane.notes.some((pitch) => pitch !== null));
  });
}
export function drawLayer(state: Composition, layer: DrawLayer, points: readonly StrokePoint[], phase = 0): Composition {
  const next = structuredClone(state), lane = next.lanes.find((lane) => lane.id === layer.id);
  if (!lane) throw new Error(`Drawing is missing its ${layer.name} layer.`);
  lane.motif = strokePhrase(points, layer); lane.phase = wrapStep(phase, lane.notes.length);
  lane.notes = redistribute(lane, lane.motif.length); lane.enabled = true; next.selected = lane.id;
  return parseComposition(next);
}
