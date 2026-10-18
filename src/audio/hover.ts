import { MUSIC } from '../config';
import { INTERACTION as H, hoverVoice, proximity } from '../interaction/config';
import { NotePolicy, pitchAt } from '../score';
import type { NoteEvent, TouchPoint } from '../score';
import { Layers } from './layers';
import { Voices } from './voices';

interface Request { point: TouchPoint; velocity: number; tap: boolean }
export class HoverInstrument {
  private layers: Layers | null = null;
  private voices: Voices | null = null;
  private pointer: TouchPoint | null = null;
  private pending: Request | null = null;
  private dragging: Request | null = null;
  private held = false;
  private policy = new NotePolicy();
  private tuning = () => 1;
  private tuningSignature = '';
  constructor(private emit: (event: NoteEvent) => void, private midi: (index: number) => number) {}
  connect(context: BaseAudioContext, notes: AudioNode, mix: AudioNode, tuning: () => number) {
    this.layers = new Layers(context, mix, false); this.voices = new Voices(context, notes, undefined, tuning);
    this.tuning = tuning; this.syncTuning();
    this.updateLayer();
  }
  move(point: TouchPoint) {
    if (!proximity(point)) { this.leave(); return; }
    this.pointer = point; this.updateLayer();
  }
  request(point: TouchPoint, velocity: number, tap: boolean) {
    this.move(point);
    if (this.pointer && (!this.pending?.tap || tap)) this.pending = { point, velocity, tap };
  }
  press(point: TouchPoint) { this.move(point); this.held = true; this.updateLayer(); }
  drag(point: TouchPoint, velocity: number) {
    this.press(point); this.dragging = this.pointer ? { point, velocity, tap: false } : null;
  }
  release() { this.held = false; this.dragging = null; this.updateLayer(); }
  leave() { this.pointer = null; if (!this.pending?.tap) this.pending = null; this.release(); }
  cancel() { this.pending = null; this.leave(); }
  private updateLayer() { this.layers?.presence((this.pointer ? proximity(this.pointer) : 0) * H.humMax, this.held); }
  private syncTuning() {
    const root = this.midi(0), tuning = this.tuning(), signature = `${root}/${tuning}`;
    if (signature !== this.tuningSignature) { this.layers?.retune(root, tuning); this.tuningSignature = signature; }
  }
  schedule(time: number, tick: number) {
    const request = this.pending ?? this.dragging, point = request?.point ?? this.pointer;
    if (!point || !this.voices) return;
    this.syncTuning();
    this.pending = null;
    if (!request && tick % MUSIC.idleEvery) return;
    const requested = request ? pitchAt(request.point, request.tap) : MUSIC.arpeggio[Math.floor(tick / MUSIC.idleEvery) % MUSIC.arpeggio.length];
    const source = request?.point ?? point, voice = hoverVoice(source, request?.velocity ?? MUSIC.ambientVelocity);
    const checkpoint = this.policy.checkpoint(), index = this.policy.choose(requested), midi = this.midi(index);
    if (!this.voices.pluck(midi, time, voice.velocity, source.depth, { decay: MUSIC.decay, cutoff: voice.cutoff, instrument: 'pluck' })) {
      this.policy.restore(checkpoint); return;
    }
    this.emit({ time, index, midi, velocity: voice.velocity, point: source, user: Boolean(request) });
  }
  dispose() { this.cancel(); this.layers?.dispose(); this.layers = null; this.voices = null; this.policy = new NotePolicy(); this.tuningSignature = ''; }
}
