import { Vector3 } from 'three';
import type { Score, Lane } from '../composer/model';
import { SCULPT } from './config';
import type { SculptHandle, SculptPoint } from './config';
import type { SculptHit } from './projection';
import type { SculptSetup } from './storage';
import { sculptLane } from './model';

export class SculptController {
  private edit: { lane: Lane; index: number; original: SculptSetup; handle: SculptHandle } | null = null;
  private previous: SculptSetup | null = null;
  private moved = false;
  constructor(readonly score: Score, readonly handles: SculptHandle[], private changed: (persist: boolean) => void) {}
  get canUndo() { return this.previous !== null; }
  begin(hit: SculptHit) {
    if (!hit.hit) return false;
    if (hit.handle === null && this.handles.length >= SCULPT.handles) throw new Error('All twelve sculpt points are in use. Grab an existing bulge or start a new tune.');
    const original = this.snapshot(), index = hit.handle ?? this.handles.length;
    const handle = this.handles[index] ?? { lane: this.score.selected.id, anchor: { ...hit.position }, offset: { x: 0, y: 0, z: 0 } };
    this.handles[index] = structuredClone(handle);
    this.edit = { lane: structuredClone(this.score.selected), index, original, handle: structuredClone(handle) };
    this.moved = false; return true;
  }
  drag(delta: SculptPoint) {
    const edit = this.edit;
    if (!edit) return;
    const offset = new Vector3(edit.handle.offset.x + delta.x, edit.handle.offset.y + delta.y, edit.handle.offset.z + delta.z);
    if (offset.length() > SCULPT.maxPull) offset.multiplyScalar(SCULPT.maxPull / offset.length());
    const change = { x: offset.x - edit.handle.offset.x, y: offset.y - edit.handle.offset.y, z: offset.z - edit.handle.offset.z };
    Object.assign(this.score.lane(edit.lane.id), sculptLane(edit.lane, edit.handle.anchor, change));
    this.handles[edit.index] = { ...edit.handle, offset: { x: offset.x, y: offset.y, z: offset.z } };
    this.moved = Math.hypot(change.x, change.y, change.z) > SCULPT.precision; this.changed(false);
  }
  finish() {
    if (!this.edit) return;
    if (!this.moved) { this.cancel(); return; }
    this.previous = this.edit.original; this.edit = null; this.changed(true);
  }
  cancel() {
    if (!this.edit) return;
    this.restore(this.edit.original); this.edit = null; this.changed(false);
  }
  undo() {
    if (!this.previous) return;
    const original = this.previous.composition.lanes.find((lane) => lane.id === this.previous?.composition.selected);
    if (!original) throw new Error('The last sculpt gesture has no original sound layer.');
    const current = this.score.lane(original.id);
    current.notes = [...original.notes]; current.motif = [...original.motif]; current.tone = original.tone; current.length = original.length;
    this.handles.splice(0, this.handles.length, ...structuredClone(this.previous.handles));
    this.previous = null; this.changed(true);
  }
  clear() { this.cancel(); this.handles.splice(0); this.previous = null; }
  private snapshot(): SculptSetup { return structuredClone({ composition: this.score.state, handles: this.handles }); }
  private restore(setup: SculptSetup) {
    Object.assign(this.score.state, structuredClone(setup.composition));
    this.handles.splice(0, this.handles.length, ...structuredClone(setup.handles));
  }
}
