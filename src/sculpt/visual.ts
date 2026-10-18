import { Vector4 } from 'three';
import { MusicVisual } from '../composer/music-visual';
import type { Score } from '../composer/model';
import type { SculptPlayback } from './playback';
import type { OrbVisualisation } from '../visual/visualisation';
import type { AudioFrame } from '../audio/meter';
import type { NoteEvent, TouchPoint } from '../score';
import { SIMPLE } from '../simple/config';
import { SCULPT } from './config';
import type { SculptHandle } from './config';
import shader from './sculpt.glsl?raw';

export class SculptVisual implements OrbVisualisation {
  readonly base: MusicVisual;
  readonly vertexShader: string;
  readonly fragmentShader: string;
  readonly uniforms;
  constructor(score: Score, private playback: SculptPlayback) {
    this.base = new MusicVisual(score, playback); this.base.life.setAlive(SIMPLE.alive);
    this.vertexShader = `#define SCULPT_DEMO\n#define SCULPT_HANDLES ${SCULPT.handles}\n#define SCULPT_WIDTH ${(SCULPT.width ** 2).toFixed(8)}\n#define SCULPT_HEAT ${SCULPT.heat}\n${shader}\n${this.base.vertexShader}`;
    this.fragmentShader = this.base.fragmentShader;
    this.uniforms = { ...this.base.uniforms, uSculptAnchors: { value: Array.from({ length: SCULPT.handles }, () => new Vector4()) },
      uSculptOffsets: { value: Array.from({ length: SCULPT.handles }, () => new Vector4()) } };
  }
  get blending() { return this.base.blending; }
  setHandles(handles: readonly SculptHandle[]) {
    this.uniforms.uSculptAnchors.value.forEach((anchor, index) => {
      const handle = handles[index], offset = this.uniforms.uSculptOffsets.value[index];
      if (handle) { anchor.set(handle.anchor.x, handle.anchor.y, handle.anchor.z, 1); offset.set(handle.offset.x, handle.offset.y, handle.offset.z, 0); }
      else { anchor.set(0, 0, 0, 0); offset.set(0, 0, 0, 0); }
    });
  }
  focus(point: TouchPoint) { this.base.move(point, 0); }
  leave() { this.base.leave(); }
  invalidate() { this.base.invalidate(); }
  update(time: number, delta: number, audio: AudioFrame) { this.playback.advance(delta); this.base.update(time, delta, audio); }
  note(event: NoteEvent) { this.base.note(event); }
  reset() { this.base.reset(); }
  dispose() { this.base.dispose(); }
}
