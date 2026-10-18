import { SculptProjection } from '../sculpt/projection';
import { AURA } from './config';
import type { AuraInteraction } from './interaction';

export class AuraPointer {
  private projection: SculptProjection;
  private pressed: number | null = null;
  private previous = { x: 0, y: 0, time: 0 };
  private keyboard = { x: 0.5, y: 0.5 };
  constructor(private host: HTMLElement, private state: AuraInteraction) {
    this.projection = new SculptProjection(host);
    host.addEventListener('pointermove', (event) => this.move(event));
    host.addEventListener('pointerdown', (event) => this.down(event));
    host.addEventListener('pointerup', (event) => this.up(event));
    for (const type of ['pointercancel', 'lostpointercapture']) host.addEventListener(type, (event) => { if (event instanceof PointerEvent && event.pointerId === this.pressed) this.cancel(); });
    host.addEventListener('pointerleave', () => { if (this.pressed === null) this.state.leave(); });
    host.addEventListener('keydown', (event) => this.key(event));
    host.addEventListener('keyup', (event) => { if ([' ', 'Enter'].includes(event.key)) this.state.release(); });
    window.addEventListener('blur', () => this.cancel());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancel(); });
  }
  private aim(x: number, y: number, speed: number) {
    const rect = this.host.getBoundingClientRect(), hit = this.projection.sample(x, y, [], AURA.touchLane);
    this.state.move(hit.point, (x - rect.left) / rect.width, (y - rect.top) / rect.height, speed);
  }
  private move(event: PointerEvent) {
    if (!event.isPrimary || this.pressed !== null && this.pressed !== event.pointerId || event.pointerType !== 'mouse' && this.pressed === null) return;
    const elapsed = event.timeStamp - this.previous.time;
    const speed = this.previous.time && elapsed > 0 ? Math.hypot(event.clientX - this.previous.x, event.clientY - this.previous.y) / elapsed : 0;
    this.previous = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    this.aim(event.clientX, event.clientY, speed);
  }
  private down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || this.pressed !== null) return;
    event.preventDefault(); this.host.focus({ preventScroll: true }); this.host.setPointerCapture(event.pointerId);
    this.pressed = event.pointerId; this.aim(event.clientX, event.clientY, 0); this.state.press();
  }
  private up(event: PointerEvent) {
    if (event.pointerId !== this.pressed) return;
    this.state.release(); this.pressed = null;
    if (event.pointerType !== 'mouse') this.state.leave();
  }
  cancel() { this.pressed = null; this.previous.time = 0; this.state.leave(); }
  private key(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') { this.cancel(); return; }
    if (event.key === 'ArrowLeft') this.keyboard.x = Math.max(0, this.keyboard.x - AURA.keyboardStep);
    if (event.key === 'ArrowRight') this.keyboard.x = Math.min(1, this.keyboard.x + AURA.keyboardStep);
    if (event.key === 'ArrowUp') this.keyboard.y = Math.max(0, this.keyboard.y - AURA.keyboardStep);
    if (event.key === 'ArrowDown') this.keyboard.y = Math.min(1, this.keyboard.y + AURA.keyboardStep);
    const rect = this.host.getBoundingClientRect();
    this.aim(rect.left + rect.width * this.keyboard.x, rect.top + rect.height * this.keyboard.y, 0);
    if ([' ', 'Enter'].includes(event.key) && !event.repeat) this.state.press();
  }
}
