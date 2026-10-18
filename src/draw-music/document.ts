import { createV2Composition } from '../composer/v2/generator';
import { Score } from '../composer/model';
import type { Composition } from '../composer/model';
import { parseComposition, record } from '../composer/storage';
import { DRAW_MUSIC as D } from './config';
import { transcribe } from './stroke';
import type { TimedPoint } from './stroke';

export interface DrawDocumentData { version: 1; composition: Composition; authored: string[]; interpretation: number }
export function blankDocument(): DrawDocumentData {
  const composition = createV2Composition(); composition.selected = 'melody';
  composition.lanes.forEach(lane => { lane.notes.fill(null); lane.motif = []; delete lane.gates; });
  return { version: 1, composition, authored: [], interpretation: D.interpretation };
}
export function parseDocument(value: unknown): DrawDocumentData {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.authored) || typeof value.interpretation !== 'number' || !Number.isFinite(value.interpretation) || value.interpretation < 0 || value.interpretation > 1) throw new Error('Saved Draw Music document is invalid.');
  const composition = parseComposition(value.composition);
  if (composition.lanes.length !== D.layers.length || !D.layers.every(layer => composition.lanes.some(lane => lane.id === layer.id && lane.role === layer.id))) throw new Error('Saved Draw Music layers are invalid.');
  const authored = value.authored.map((id: unknown) => {
    if (typeof id !== 'string' || !composition.lanes.some(lane => lane.id === id)) throw new Error('Saved drawing has an invalid authored layer.');
    return id;
  });
  return { version: 1, composition, authored: [...new Set(authored)], interpretation: value.interpretation };
}
export class DrawDocument {
  readonly score: Score;
  readonly data: DrawDocumentData;
  private previous: DrawDocumentData | null = null;
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'>, private changed: () => void) {
    const raw = storage.getItem(D.storageKey); this.data = raw === null ? blankDocument() : parseDocument(JSON.parse(raw));
    this.score = new Score(this.data.composition, () => this.save());
  }
  get canUndo() { return this.previous !== null; }
  save() { this.storage.setItem(D.storageKey, JSON.stringify(this.data)); this.changed(); }
  commit(composition: Composition, authored = this.data.authored) {
    this.previous = structuredClone(this.data); Object.assign(this.score.state, parseComposition(composition)); this.data.authored = [...authored]; this.save();
  }
  capture(points: readonly TimedPoint[]) {
    const composition = structuredClone(this.score.state), lane = this.score.selected;
    composition.lanes = composition.lanes.map(item => item.id === lane.id ? transcribe(lane, points) : item);
    this.commit(composition, [...new Set([...this.data.authored, lane.id])]);
  }
  undo() {
    if (!this.previous) return;
    const previous = this.previous; this.previous = null;
    Object.assign(this.score.state, previous.composition); this.data.authored = previous.authored; this.data.interpretation = previous.interpretation; this.save();
  }
  clear() {
    const composition = structuredClone(this.score.state), lane = composition.lanes.find(lane => lane.id === composition.selected);
    if (!lane) throw new Error('Cannot clear a missing drawing layer.');
    lane.notes.fill(null); lane.motif = []; delete lane.gates; this.commit(composition);
  }
  reset() { const next = blankDocument(); this.previous = structuredClone(this.data); Object.assign(this.score.state, next.composition); this.data.authored = []; this.data.interpretation = next.interpretation; this.save(); }
}
