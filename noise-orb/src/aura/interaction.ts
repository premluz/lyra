import { clamp } from '../config';
import type { TouchPoint } from '../score';
import { AURA } from './config';
import type { AuraPhase } from './config';

export class AuraInteraction {
  readonly point = { x: 0, y: 0, z: 3, nx: 0.5, depth: 0.5, proximity: 0 };
  nx = 0.5;
  ny = 0.5;
  hover = 0;
  speed = 0;
  charge = 0;
  bloom = 0;
  held = false;
  age = 0;
  presses = 0;
  releases = 0;
  releasedAfter = 0;
  cancelled = false;
  private nearby = false;
  private target = { ...this.point };
  get phase(): AuraPhase {
    return !this.held ? 'idle' : this.age < AURA.openAt ? 'gather' : this.age < AURA.bloomAt ? 'open' : 'bloom';
  }
  move(point: TouchPoint, nx: number, ny: number, speed: number) {
    this.target = { ...point, y: point.y ?? 0, proximity: 1 }; this.nx = clamp(nx); this.ny = clamp(ny);
    this.speed = clamp(speed); this.nearby = true;
  }
  press() { if (!this.held) { this.held = true; this.cancelled = false; this.age = 0; this.presses++; } }
  release(cancel = false) {
    if (!this.held) return;
    this.releasedAfter = cancel ? 0 : this.age; this.cancelled = cancel; this.releases++; this.held = false; this.age = 0;
  }
  leave() { this.release(true); this.nearby = false; }
  advance(delta: number) {
    if (this.held) this.age += delta;
    const ease = 1 - Math.exp(-delta / (this.held ? AURA.hoverEase : AURA.releaseEase));
    this.hover += ((this.nearby ? 1 : 0) - this.hover) * ease;
    const charge = this.held ? clamp((this.age - AURA.gatherAt) / AURA.chargeSeconds) : 0;
    this.charge += (charge - this.charge) * ease;
    this.bloom += ((this.held ? clamp((this.age - AURA.openAt) / (AURA.bloomAt - AURA.openAt)) : 0) - this.bloom) * ease;
    for (const key of ['x', 'y', 'z'] as const) this.point[key] += (this.target[key] - this.point[key]) * ease;
    this.point.nx = this.nx; this.point.depth = this.ny; this.point.proximity = this.hover;
    this.speed *= Math.exp(-delta / AURA.speedRelease);
  }
  reset() {
    this.leave(); this.charge = 0; this.bloom = 0; this.hover = 0; this.speed = 0;
  }
}
