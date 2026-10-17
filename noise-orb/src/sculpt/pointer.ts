import { report } from '../ui';
import { SCULPT, REST_FOCUS } from './config';
import type { SculptPoint } from './config';
import { SculptProjection } from './projection';
import type { SculptController } from './controller';
import type { SculptPlayback } from './playback';
import type { SculptVisual } from './visual';

interface Grab { id: number; x: number; y: number; point: SculptPoint; moved: boolean }
export class SculptPointer {
  private projection: SculptProjection;
  private grab: Grab | null = null;
  private position = { x: 0, y: 0 };
  constructor(private host: HTMLElement, private controller: SculptController, private visual: SculptVisual, private playback: SculptPlayback, private activate: () => void) {
    this.projection = new SculptProjection(host);
    host.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse' && (!this.grab || this.grab.id === event.pointerId)) this.move(event.clientX, event.clientY);
    });
    host.addEventListener('pointerdown', (event) => this.down(event));
    host.addEventListener('pointerup', (event) => { if (this.grab?.id === event.pointerId) this.finish(); });
    host.addEventListener('pointercancel', (event) => { if (this.grab?.id === event.pointerId) this.cancel(); });
    host.addEventListener('lostpointercapture', (event) => { if (this.grab?.id === event.pointerId) this.cancel(); });
    host.addEventListener('pointerleave', () => { if (!this.grab) this.leave(); });
    host.addEventListener('keydown', (event) => this.key(event));
    window.addEventListener('blur', () => this.cancel());
  }
  private move(x: number, y: number) {
    this.position = { x, y };
    const hit = this.projection.sample(x, y, this.controller.handles, this.controller.score.state.selected);
    this.playback.aim(hit.focus); this.visual.focus(hit.point); this.host.dataset.near = String(hit.hit);
    if (!this.grab || !this.grab.moved && Math.hypot(x - this.grab.x, y - this.grab.y) < SCULPT.dragThreshold) return;
    this.grab.moved = true;
    this.controller.drag(this.projection.delta(x, y, this.grab.x, this.grab.y, this.grab.point));
  }
  private begin(x: number, y: number, id: number) {
    this.activate();
    const hit = this.projection.sample(x, y, this.controller.handles, this.controller.score.state.selected);
    try {
      if (this.controller.begin(hit)) { this.grab = { id, x, y, point: hit.position, moved: false }; this.host.dataset.dragging = 'true'; }
    } catch (error) { report(error); }
  }
  private down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || event.pointerType !== 'mouse') return;
    event.preventDefault(); this.host.focus({ preventScroll: true });
    this.begin(event.clientX, event.clientY, event.pointerId);
    if (this.grab) this.host.setPointerCapture(event.pointerId);
  }
  private finish() { this.controller.finish(); this.grab = null; this.host.dataset.dragging = 'false'; }
  private leave() { this.playback.aim(REST_FOCUS); this.visual.leave(); this.host.dataset.near = 'false'; }
  cancel() { this.controller.cancel(); this.grab = null; this.host.dataset.dragging = 'false'; this.leave(); }
  private key(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') { this.cancel(); return; }
    if (event.key === ' ' || event.key === 'Enter') {
      const rect = this.host.getBoundingClientRect();
      if (this.grab) this.finish();
      else { this.position = { x: rect.left + rect.width * SCULPT.keyboardOrigin, y: rect.top + rect.height * SCULPT.keyboardOrigin }; this.begin(this.position.x, this.position.y, -1); }
      return;
    }
    const x = this.position.x + (event.key === 'ArrowRight' ? SCULPT.keyboardPixels : event.key === 'ArrowLeft' ? -SCULPT.keyboardPixels : 0);
    const y = this.position.y + (event.key === 'ArrowDown' ? SCULPT.keyboardPixels : event.key === 'ArrowUp' ? -SCULPT.keyboardPixels : 0);
    this.move(x, y);
  }
}
