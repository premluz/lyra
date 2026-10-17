import { Vector4 } from 'three';
import { MUSIC, clamp } from '../config';
import type { AudioFrame } from '../audio/meter';
import { voiceEnvelope } from '../audio/envelope';
import type { NoteEvent } from '../score';
import { COMPOSE } from './config';
import { isAudible, isContinuous, roleDefinition } from './lanes';
import type { Lane } from './lanes';
import { pitchFor } from './model';
import type { Score } from './model';
import { waveY } from './waves';
import { MUSIC_VISUAL as V } from './visual-config';

interface Pulse { lane: string; start: number; duration: number; attack: number; hold?: number; velocity: number; pitch: number; step: number }

export function laneAngle(id: string) {
  let hash: number = V.hashSeed;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), V.hashPrime) >>> 0;
  return hash / V.hashMax * Math.PI * 2;
}

export function profileHeight(lane: Lane, phase: number) {
  const baseline = COMPOSE.baseline + (isContinuous(lane) ? 0 : roleDefinition(lane.role).offset);
  return clamp((baseline - waveY(lane, phase * lane.notes.length)) / COMPOSE.baseline);
}
export function pulseEnvelope(pulse: Pick<Pulse, 'start' | 'duration' | 'attack' | 'hold'>, time: number) {
  const age = time - pulse.start;
  if (age < 0 || age >= pulse.duration) return 0;
  const floor = MUSIC.floor / MUSIC.pluckGain;
  const releaseStart = pulse.attack + (pulse.hold ?? 0);
  if (age >= pulse.attack && age < releaseStart) return 1;
  return age < pulse.attack ? floor ** (1 - age / pulse.attack) : floor ** ((age - releaseStart) / (pulse.duration - releaseStart));
}

export class MusicField {
  readonly profiles = new Uint8Array(V.samples * COMPOSE.maxLanes);
  readonly lanes = Array.from({ length: COMPOSE.maxLanes }, () => new Vector4());
  readonly pulses = Array.from({ length: COMPOSE.maxLanes }, () => new Vector4());
  readonly spectrum = new Vector4();
  private events: Pulse[] = [];
  private dirty = true;
  constructor(private score: Score) {}
  invalidate() { this.dirty = true; }
  rebuild() {
    if (!this.dirty) return false;
    this.profiles.fill(0);
    this.score.state.lanes.forEach((lane, index) => {
      if (!isAudible(lane, this.score.state.ambientTools) || lane.level === 0) return;
      for (let sample = 0; sample < V.samples; sample++) this.profiles[index * V.samples + sample] = Math.round(profileHeight(lane, sample / V.samples) * V.textureMax);
    });
    this.dirty = false; return true;
  }
  note(event: NoteEvent) {
    const lane = this.score.state.lanes.find((lane) => lane.id === event.lane);
    if (!lane || event.step === undefined) return;
    const envelope = event.envelope ?? voiceEnvelope({ instrument: lane.instrument, decay: COMPOSE.decayMin + lane.length * COMPOSE.decayRange, cutoff: COMPOSE.cutoffLow });
    this.events.push({ lane: lane.id, start: event.time, ...envelope,
      velocity: event.velocity / COMPOSE.baseVelocity, pitch: event.index / COMPOSE.pitchMax, step: event.step / lane.notes.length });
    this.events = this.events.slice(-V.eventLimit);
  }
  update(time: number, delta: number, audio: AudioFrame) {
    const target = new Vector4(clamp(audio.level * V.energyGain), audio.bass, audio.mid, audio.treble);
    const ease = target.x > this.spectrum.x ? V.attackEase : V.releaseEase;
    this.spectrum.lerp(target, 1 - Math.exp(-delta / ease));
    this.events = this.events.filter((event) => time < event.start + event.duration);
    this.lanes.forEach((lane) => lane.set(0, 0, 0, 0)); this.pulses.forEach((pulse) => pulse.set(0, 0, 0, 0));
    this.score.state.lanes.forEach((lane, index) => this.updateLane(lane, index, time));
  }
  private updateLane(lane: Lane, index: number, time: number) {
    const audible = isAudible(lane, this.score.state.ambientTools) && lane.level > 0;
    let energy = 0, pitch = 0, phase = 0, age = 0;
    for (const event of this.events) {
      if (event.lane !== lane.id) continue;
      const power = pulseEnvelope(event, time) * event.velocity;
      if (power > energy) { energy = power; pitch = event.pitch; phase = event.step; age = Math.max(0, time - event.start); }
    }
    if (audible && isContinuous(lane)) {
      energy = lane.level * this.spectrum.x * (1 + Math.sin(time / lane.breath * Math.PI * 2) * lane.movement);
      pitch = pitchFor(lane, lane.pitch) / COMPOSE.pitchMax; age = time / lane.breath;
    }
    energy *= clamp(this.spectrum.x * COMPOSE.balanceLanes);
    this.lanes[index].set(audible ? lane.level : 0, lane.tone, lane.length, laneAngle(lane.id));
    this.pulses[index].set(energy, pitch, phase, age);
  }
  reset() { this.events = []; this.spectrum.set(0, 0, 0, 0); this.pulses.forEach((pulse) => pulse.set(0, 0, 0, 0)); }
}
