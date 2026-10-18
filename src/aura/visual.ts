import { Color, Vector4 } from 'three';
import { MusicVisual } from '../composer/music-visual';
import { COMPOSE } from '../composer/config';
import type { Score } from '../composer/model';
import type { OrbVisualisation } from '../visual/visualisation';
import type { AudioFrame } from '../audio/meter';
import type { NoteEvent } from '../score';
import type { AuraPlayback } from './playback';
import type { AuraWorld } from './generation';
import { AURA, AURA_PALETTES, AURA_SHADER } from './config';
import shader from './aura.glsl?raw';

const constants = Object.entries(AURA_SHADER).map(([name, value]) => `#define AURA_${name} ${value.toFixed(8)}`).join('\n');
export class AuraVisual implements OrbVisualisation {
  readonly base: MusicVisual;
  readonly uniforms;
  readonly vertexShader: string;
  readonly fragmentShader: string;
  private target: AuraWorld;
  private colours: Color[] = [];
  private notes: NoteEvent[] = [];
  constructor(score: Score, private playback: AuraPlayback, world: AuraWorld) {
    this.base = new MusicVisual(score, playback); this.base.life.setAlive(0); this.target = world;
    this.uniforms = { ...this.base.uniforms, uAuraTime: { value: 0 }, uAuraAudio: { value: 0 },
      uAuraPhase: { value: world.phase }, uAuraForm: { value: world.form }, uAuraGesture: { value: new Vector4() },
      uAuraPointer: { value: new Vector4() }, uAuraNotes: { value: Array.from({ length: AURA.pulses }, () => new Vector4()) } };
    this.vertexShader = `#define AURA_DEMO\n#define AURA_PULSES ${AURA.pulses}\n${constants}\n${shader}\n${this.base.vertexShader}`;
    this.fragmentShader = this.base.fragmentShader;
    this.setWorld(world); this.updateColours(1);
  }
  get blending() { return this.base.blending; }
  setWorld(world: AuraWorld) {
    this.target = world; this.base.invalidate();
    const palette = AURA_PALETTES[world.palette];
    this.colours = [new Color(palette.low), new Color(palette.mid), new Color(palette.high)];
  }
  private updateColours(ease: number) {
    this.uniforms.uPulseColor.value.lerp(this.colours[0], ease);
    this.uniforms.uPulseColorEdge.value.lerp(this.colours[1], ease);
    this.uniforms.uPulseHot.value.lerp(this.colours[2], ease);
    this.uniforms.uPulseAfterglow.value.lerp(this.colours[2], ease);
  }
  update(time: number, delta: number, audio: AudioFrame) {
    const state = this.playback.interaction, ease = 1 - Math.exp(-delta / AURA.morphEase), u = this.uniforms;
    state.advance(delta); this.base.update(time, delta, audio); this.updateColours(ease);
    u.uAuraTime.value += delta; u.uAuraAudio.value = time;
    const distance = this.target.phase - u.uAuraPhase.value;
    u.uAuraPhase.value += Math.atan2(Math.sin(distance), Math.cos(distance)) * ease;
    u.uAuraForm.value += (this.target.form - u.uAuraForm.value) * ease;
    u.uAuraGesture.value.set(state.nx, state.speed, state.charge, state.bloom);
    u.uAuraPointer.value.set(state.point.x, state.point.y, state.point.z, state.hover);
    this.notes = this.notes.filter((note) => time < note.time + AURA.pulseLife);
    u.uAuraNotes.value.forEach((pulse, index) => {
      const note = this.notes[index];
      if (note) pulse.set(note.index / COMPOSE.pitchMax * Math.PI * 2, note.point.depth, note.time, note.velocity);
      else pulse.set(0, 0, 0, 0);
    });
  }
  note(event: NoteEvent) { this.base.note(event); this.notes.push(event); this.notes = this.notes.slice(-AURA.pulses); }
  reset() { this.notes = []; this.playback.interaction.reset(); this.base.reset(); }
  dispose() { this.base.dispose(); }
}
