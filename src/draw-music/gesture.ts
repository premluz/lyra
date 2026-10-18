import { clamp } from '../config';
import { svg } from '../composer/waves';
import { SIMPLE } from '../simple/config';
import { strokePath } from '../simple/stroke';
import type { TimedPoint } from './stroke';
import { DRAW_MUSIC as D } from './config';

interface Actions { begin: (point: TimedPoint) => void; move: (point: TimedPoint) => void; end: (points: TimedPoint[]) => void; cancel: () => void }
export class MusicGesture {
  readonly element = svg('svg', { id: 'drawing-area', viewBox: `0 0 ${SIMPLE.strokeWidth} ${SIMPLE.strokeHeight}`, preserveAspectRatio: 'none', tabindex: 0, role: 'application', 'aria-label': 'Draw and hear your music', 'aria-describedby': 'draw-keyboard' });
  private path = svg('path', { class: 'drawing-stroke' });
  private pointer: number | null = null;
  private points: TimedPoint[] = [];
  private started = 0;
  constructor(private actions: Actions) {
    this.element.append(this.path);
    this.element.addEventListener('pointerdown', event => this.down(event));
    this.element.addEventListener('pointermove', event => { if (event.pointerId === this.pointer) this.append(this.point(event)); });
    this.element.addEventListener('pointerup', event => { if (event.pointerId === this.pointer) { this.append(this.point(event)); this.finish(); } });
    for (const type of ['pointercancel', 'lostpointercapture']) this.element.addEventListener(type, event => { if (event instanceof PointerEvent && event.pointerId === this.pointer) this.cancel(); });
    this.element.addEventListener('keydown', event => this.key(event));
    this.element.addEventListener('blur', () => this.cancel()); window.addEventListener('blur', () => this.cancel());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancel(); });
  }
  cancel() { this.pointer = null; this.points = []; this.actions.cancel(); this.path.setAttribute('d', ''); }
  private point(event: PointerEvent): TimedPoint {
    const rect = this.element.getBoundingClientRect();
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height), time: (performance.now() - this.started) / 1000 };
  }
  private down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || this.pointer !== null || this.element.getAttribute('aria-disabled') === 'true') return;
    event.preventDefault(); this.cancel(); this.pointer = event.pointerId; this.started = performance.now();
    this.element.focus({ preventScroll: true }); this.element.setPointerCapture(event.pointerId);
    const point = this.point(event); this.points = [point]; this.actions.begin(point); this.paint();
  }
  private append(point: TimedPoint) {
    if (this.points.length >= D.maxPoints) this.points = this.points.filter((_, index) => index % 2 === 0);
    const last = this.points.at(-1);
    const before = this.points.at(-2);
    if (last && before && Math.hypot(last.x - point.x, last.y - point.y) < D.spacing && Math.hypot(before.x - last.x, before.y - last.y) < D.spacing) this.points[this.points.length - 1] = { ...last, time: point.time };
    else this.points.push(point);
    this.actions.move(point); this.paint();
  }
  private paint() { this.path.setAttribute('d', strokePath(this.points)); }
  private finish() { const points = this.points; this.pointer = null; this.points = []; this.actions.end(points); }
  private key(event: KeyboardEvent) {
    if (this.element.getAttribute('aria-disabled') === 'true' || !['Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); if (event.key === 'Escape') { this.cancel(); return; }
    if (event.key === 'Enter') { if (this.points.length) this.finish(); return; }
    if (!this.points.length) { this.started = performance.now(); const point = { x: 0.15, y: 0.6, time: 0 }; this.points = [point]; this.actions.begin(point); }
    const last = this.points[this.points.length - 1];
    this.append({ x: clamp(last.x + (event.key === 'ArrowLeft' ? -D.keyStep : event.key === 'ArrowRight' ? D.keyStep : 0)),
      y: clamp(last.y + (event.key === 'ArrowUp' ? -D.keyStep : event.key === 'ArrowDown' ? D.keyStep : 0)), time: (performance.now() - this.started) / 1000 });
  }
}
