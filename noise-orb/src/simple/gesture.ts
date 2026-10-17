import { clamp } from '../config';
import { svg } from '../composer/waves';
import { SIMPLE } from './config';
import { strokeLength, strokePath } from './stroke';
import type { StrokePoint } from './stroke';

interface DrawingActions { start: () => boolean; complete: (points: readonly StrokePoint[]) => void; short: () => void }
export class DrawingGesture {
  readonly element = svg('svg', { viewBox: `0 0 ${SIMPLE.strokeWidth} ${SIMPLE.strokeHeight}`, preserveAspectRatio: 'none', role: 'application', tabindex: 0, 'aria-label': 'Draw your music', 'aria-describedby': 'draw-keyboard' });
  private path = svg('path', { class: 'drawing-stroke' });
  private pointer: number | null = null;
  private points: StrokePoint[] = [];

  constructor(private actions: DrawingActions) {
    this.element.id = 'drawing-area'; this.element.append(this.path);
    this.element.addEventListener('pointerdown', (event) => this.down(event));
    this.element.addEventListener('pointermove', (event) => { if (event.pointerId === this.pointer) this.append(this.point(event)); });
    this.element.addEventListener('pointerup', (event) => { if (event.pointerId === this.pointer) { this.append(this.point(event)); this.finish(); } });
    for (const type of ['pointercancel', 'lostpointercapture']) this.element.addEventListener(type, (event) => { if (event instanceof PointerEvent && event.pointerId === this.pointer) this.cancel(); });
    this.element.addEventListener('keydown', (event) => this.key(event));
    window.addEventListener('blur', () => this.cancel());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancel(); });
  }
  cancel() { this.pointer = null; this.points = []; this.path.setAttribute('d', ''); this.element.dataset.drawing = 'false'; }
  private point(event: PointerEvent): StrokePoint {
    const rect = this.element.getBoundingClientRect();
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
  }
  private down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || this.pointer !== null || !this.actions.start()) return;
    event.preventDefault(); this.cancel(); this.pointer = event.pointerId;
    this.element.focus({ preventScroll: true }); this.element.setPointerCapture(event.pointerId); this.append(this.point(event));
  }
  private append(point: StrokePoint) {
    const last = this.points.at(-1);
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < SIMPLE.pointSpacing) return;
    if (this.points.length >= SIMPLE.maxPoints) this.points = this.points.filter((_, index) => index % 2 === 0);
    this.points.push(point); this.path.setAttribute('d', strokePath(this.points)); this.element.dataset.drawing = 'true';
  }
  private finish() {
    const points = this.points; this.cancel();
    if (strokeLength(points) < SIMPLE.minStroke) { this.actions.short(); return; }
    this.actions.complete(points);
  }
  private key(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') { this.cancel(); return; }
    if (!this.actions.start()) return;
    if (event.key === 'Enter') { if (this.points.length) this.finish(); return; }
    if (!this.points.length) this.append({ ...SIMPLE.keyboardOrigin });
    const last = this.points[this.points.length - 1];
    this.append({ x: clamp(last.x + (event.key === 'ArrowLeft' ? -SIMPLE.keyboardStep : event.key === 'ArrowRight' ? SIMPLE.keyboardStep : 0)),
      y: clamp(last.y + (event.key === 'ArrowUp' ? -SIMPLE.keyboardStep : event.key === 'ArrowDown' ? SIMPLE.keyboardStep : 0)) });
  }
}
