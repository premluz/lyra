import { parseComposition } from '../composer/storage';
import type { Composition } from '../composer/model';
import { newDrawing } from '../simple/score';
import { Score } from '../composer/model';
import { DRAW_LAYERS } from '../simple/config';
import { VIEW } from '../config';
import { SCULPT } from './config';
import type { SculptHandle, SculptPoint } from './config';

export interface SculptSetup { composition: Composition; handles: SculptHandle[] }
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function point(value: unknown): SculptPoint {
  if (!record(value) || typeof value.x !== 'number' || typeof value.y !== 'number' || typeof value.z !== 'number' ||
    ![value.x, value.y, value.z].every(Number.isFinite)) throw new Error('Saved sculpt point is invalid.');
  return { x: value.x, y: value.y, z: value.z };
}
export function parseSculpt(value: unknown): SculptSetup {
  if (!record(value) || !Array.isArray(value.handles) || value.handles.length > SCULPT.handles) throw new Error('Saved sculpture is invalid.');
  const composition = parseComposition(value.composition);
  if (composition.ambientTools || composition.lanes.length !== DRAW_LAYERS.length || DRAW_LAYERS.some((layer) =>
    !composition.lanes.some((lane) => lane.id === layer.id && lane.role === layer.id))) throw new Error('Sculpture requires its three melodic layers.');
  const handles = value.handles.map((handle: unknown): SculptHandle => {
    if (!record(handle) || typeof handle.lane !== 'string' || !composition.lanes.some((lane) => lane.id === handle.lane)) throw new Error('Saved sculpt handle has no sound layer.');
    const anchor = point(handle.anchor), offset = point(handle.offset);
    if (Math.hypot(offset.x, offset.y, offset.z) > SCULPT.maxPull + SCULPT.precision || Math.abs(Math.hypot(anchor.x, anchor.y, anchor.z) - VIEW.interactionRadius) > SCULPT.precision) throw new Error('Saved sculpt handle is out of range.');
    return { lane: handle.lane, anchor, offset };
  });
  return { composition, handles };
}
export function newSculpt(random: () => number = Math.random): SculptSetup {
  const score = new Score(newDrawing(random)); score.randomise(random);
  return { composition: score.state, handles: [] };
}
export function loadSculpt(storage: Pick<Storage, 'getItem'>): SculptSetup {
  const saved = storage.getItem(SCULPT.storageKey);
  return saved === null ? newSculpt() : parseSculpt(JSON.parse(saved));
}
