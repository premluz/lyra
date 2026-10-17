import { Vector4 } from 'three';
import { clamp } from '../config';
import { INTERACTION as L, proximity } from '../interaction/config';
import type { NoteEvent, TouchPoint } from '../score';

export class OrbLife {
  readonly uniforms = { uLifePoint: { value: new Vector4(0, 0, 0, 0) }, uLifeState: { value: new Vector4(0, 0, 0, 0) },
    uAlive: { value: Number(L.aliveDefault) }, uLifeTime: { value: 0 } };
  private target = new Vector4(0, 0, 0, 0);
  private speed = 0;
  private held = false;
  private taps: NoteEvent[] = [];
  setAlive(value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Alive amount must be between zero and one.');
    this.uniforms.uAlive.value = value;
  }
  move(point: TouchPoint, speed: number) {
    if (!proximity(point)) { this.leave(); return; }
    this.target.set(point.x, point.y ?? 0, point.z, proximity(point)); this.speed = clamp(speed);
  }
  hold(held: boolean) { this.held = held; }
  leave() { this.target.w = 0; this.speed = 0; this.held = false; }
  note(event: NoteEvent) { if (!event.lane) this.taps.push(event); }
  update(time: number, delta: number) {
    const u = this.uniforms, ease = this.target.w ? L.ease : L.release;
    u.uLifeTime.value += delta;
    u.uLifePoint.value.lerp(this.target, 1 - Math.exp(-delta / ease));
    const strength = u.uLifePoint.value.w;
    this.taps = this.taps.filter((event) => time < event.time + L.tapDecay);
    const tap = this.taps.reduce((sum, event) => time < event.time ? sum : sum + event.velocity * Math.exp(-(time - event.time) / L.tapDecay), 0);
    const pull = strength * (L.hoverDepth + (this.held ? L.holdDepth : 0) + this.speed * L.speedDepth);
    u.uLifeState.value.x += (pull - u.uLifeState.value.x) * (1 - Math.exp(-delta / (this.held ? L.ease : L.release)));
    u.uLifeState.value.y = this.speed; u.uLifeState.value.z = this.held ? 1 : 0; u.uLifeState.value.w = tap * L.tapDepth;
    this.speed *= Math.exp(-delta / L.release);
  }
  reset() { this.leave(); this.target.set(0, 0, 0, 0); this.taps = []; this.uniforms.uLifePoint.value.set(0, 0, 0, 0); this.uniforms.uLifeState.value.set(0, 0, 0, 0); this.uniforms.uLifeTime.value = 0; }
}
