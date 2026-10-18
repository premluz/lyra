import { clamp } from '../config';
import { COMPOSE } from './config';
import type { Score } from './model';
import { isContinuous, roleDefinition } from './lanes';
import { WAVE_WRAP } from './wave-wrap-geometry';

interface Grab { id: number; lane: string; step: number | null; pitch: number; radius: number; angle: number; turn: number; offset: number; moved: boolean }
export class WrappedGesture {
  private grab: Grab | null = null;
  constructor(private score: Score, private drawing: SVGSVGElement, private audition: (step: number) => void) {
    drawing.addEventListener('pointerdown', event => this.down(event));
    drawing.addEventListener('pointermove', event => this.move(event));
    drawing.addEventListener('pointerup', event => this.end(event, false));
    drawing.addEventListener('pointercancel', event => this.end(event, true));
    drawing.addEventListener('lostpointercapture', event => this.end(event, true));
    drawing.addEventListener('keydown', event => this.key(event));
    window.addEventListener('blur', () => this.cancel());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancel(); });
  }
  private position(event: PointerEvent) {
    const matrix = this.drawing.getScreenCTM();
    if (!matrix) throw new Error('Wrapped editor has no screen coordinates.');
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const x = point.x - WAVE_WRAP.center, y = point.y - WAVE_WRAP.center;
    return { radius: Math.hypot(x, y), angle: Math.atan2(y, x) + Math.PI / 2 };
  }
  private down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || !(event.target instanceof SVGElement)) return;
    event.preventDefault(); event.stopPropagation();
    const lane = event.target.dataset.lane;
    if (lane) this.score.select(lane);
    if (isContinuous(this.score.selected)) return;
    const step = event.target.classList.contains('wrapped-note-handle') ? Number(event.target.dataset.step) : null;
    const point = this.position(event);
    this.grab = { id: event.pointerId, lane: this.score.selected.id, step, pitch: step === null ? 0 : this.score.selected.notes[step] ?? 0,
      radius: point.radius, angle: point.angle, turn: 0, offset: 0, moved: false };
    this.drawing.setPointerCapture(event.pointerId);
    if (step !== null) { event.target.focus({ preventScroll: true }); this.audition(step); }
  }
  private move(event: PointerEvent) {
    const grab = this.grab;
    if (!grab || grab.id !== event.pointerId) return;
    event.stopPropagation(); event.preventDefault();
    const point = this.position(event), delta = point.radius - grab.radius;
    grab.turn += Math.atan2(Math.sin(point.angle - grab.angle), Math.cos(point.angle - grab.angle)); grab.angle = point.angle;
    if (Math.abs(delta) + Math.abs(grab.turn * grab.radius) < COMPOSE.dragThreshold && !grab.moved) return;
    grab.moved = true;
    if (this.score.state.selected !== grab.lane) this.score.select(grab.lane);
    if (grab.step !== null) {
      const pitch = Math.round(clamp(grab.pitch + delta / (COMPOSE.pitchHeight * WAVE_WRAP.depth), COMPOSE.pitchMin, COMPOSE.pitchMax));
      if (pitch !== this.score.selected.notes[grab.step]) { this.score.setNote(grab.step, pitch); this.audition(grab.step); }
    } else {
      const offset = Math.round(grab.turn / WAVE_WRAP.turn * this.score.selected.notes.length);
      this.score.shiftLane(grab.lane, offset - grab.offset); grab.offset = offset;
    }
  }
  private end(event: PointerEvent, cancelled: boolean) {
    const grab = this.grab;
    if (!grab || grab.id !== event.pointerId) return;
    event.stopPropagation();
    if (cancelled) { this.cancel(); return; }
    this.grab = null;
    if (this.drawing.hasPointerCapture(event.pointerId)) this.drawing.releasePointerCapture(event.pointerId);
    if (grab.step !== null || grab.moved) return;
    const point = this.position(event), count = this.score.selected.notes.length;
    const step = Math.floor(((point.angle / WAVE_WRAP.turn % 1) + 1) % 1 * count);
    if (this.score.selected.notes[step] === null) this.score.setNote(step, Math.round(clamp((point.radius - WAVE_WRAP.radius) / (COMPOSE.pitchHeight * WAVE_WRAP.depth), COMPOSE.pitchMin, COMPOSE.pitchMax)));
    this.audition(step);
  }
  cancel() {
    const grab = this.grab; this.grab = null;
    if (!grab) return;
    if (this.score.state.lanes.some(lane => lane.id === grab.lane)) {
      this.score.select(grab.lane);
      if (grab.step !== null) this.score.setNote(grab.step, grab.pitch); else this.score.shiftLane(grab.lane, -grab.offset);
    }
    if (this.drawing.hasPointerCapture(grab.id)) this.drawing.releasePointerCapture(grab.id);
  }
  private key(event: KeyboardEvent) {
    if (event.target instanceof SVGElement && event.target.classList.contains('wrap-add-zone') && ['Enter', ' '].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      if (isContinuous(this.score.selected)) return;
      const step = this.score.selected.phase;
      if (this.score.selected.notes[step] === null) this.score.setNote(step, roleDefinition(this.score.selected.role).base);
      this.audition(step); return;
    }
    if (!(event.target instanceof SVGElement) || !event.target.classList.contains('wrapped-note-handle')) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace', 'Enter', ' ', 'Escape'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === 'Escape') { this.cancel(); return; }
    const lane = event.target.dataset.lane, step = Number(event.target.dataset.step);
    if (!lane) throw new Error('Wrapped note handle lost its lane.');
    this.score.select(lane);
    if (event.key === 'Delete' || event.key === 'Backspace') this.score.setNote(step, null);
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') this.score.setNote(step, (this.score.selected.notes[step] ?? 0) + (event.key === 'ArrowUp' ? 1 : -1));
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') this.score.shiftLane(lane, event.key === 'ArrowLeft' ? -1 : 1);
    if (this.score.selected.notes[step] !== null) this.audition(step);
  }
}
