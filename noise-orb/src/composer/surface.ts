import { clamp } from '../config';
import { COMPOSE } from './config';
import type { Score } from './model';
import { liftOf, pitchFor } from './model';
import { definition, noteName, noteX, noteY, svg, wavePath, waveAreaPath, waveY } from './waves';
import { WaveRibbon } from './wave-ribbon';
import { WaveHandles } from './wave-handles';
import { WaveDrag } from './wave-drag';
import { isContinuous, isAudible } from './lanes';

interface PointerEdit { id: number; step: number; x: number; y: number; pitch: number; existed: boolean; moved: boolean }
interface Trace { id: string; path: SVGPathElement; ribbon: WaveRibbon; dots: SVGCircleElement[]; head: SVGLineElement }
export class WaveSurface {
  readonly element = svg('svg', { viewBox: `0 0 ${COMPOSE.width} ${COMPOSE.height}`, preserveAspectRatio: 'none', 'aria-label': 'Note waves', 'aria-describedby': 'wave-keyboard' });
  private traces: Trace[] = [];
  private hits = Array.from({ length: COMPOSE.maxDensity }, (_, step) => svg('rect', { y: 0, height: COMPOSE.height, class: 'step-hit', role: 'button', tabindex: step ? -1 : 0 }));
  private waveGrip = svg('path', { class: 'wave-grip', 'stroke-width': COMPOSE.waveHitWidth, 'aria-hidden': 'true' });
  private noteGrips = Array.from({ length: COMPOSE.maxDensity }, () => svg('circle', { r: COMPOSE.noteHitRadius, class: 'note-grip', 'aria-hidden': 'true' }));
  private waveDrag: WaveDrag;
  private edit: PointerEdit | null = null;
  private focused = 0;
  private pulses: { lane: string; time: number; step: number }[] = [];
  private paintTime = 0;
  private driftPaint = -Infinity;
  private handles = new WaveHandles(this.element);

  constructor(private score: Score, private audition: (step: number, preview?: boolean) => void, private describe: (step: number) => void) {
    this.waveDrag = new WaveDrag(score);
    this.element.append(svg('line', { x1: 0, x2: COMPOSE.width, y1: COMPOSE.baseline, y2: COMPOSE.baseline, class: 'wave-axis' }));
    this.element.append(...this.hits, this.waveGrip, ...this.noteGrips);
    this.element.addEventListener('pointerdown', (event) => this.down(event));
    this.element.addEventListener('pointermove', (event) => this.move(event));
    this.element.addEventListener('pointerup', (event) => this.release(event));
    this.element.addEventListener('pointercancel', (event) => this.cancel(event));
    this.element.addEventListener('lostpointercapture', (event) => this.cancel(event));
    this.hits.forEach((hit, step) => { hit.addEventListener('keydown', (event) => this.key(event, step)); hit.addEventListener('focus', () => this.describe(step)); });
    this.update();
  }

  update() {
    this.syncTraces();
    this.focused = Math.min(this.focused, this.score.selected.notes.length - 1);
    this.element.dataset.continuous = String(isContinuous(this.score.selected));
    for (const trace of this.traces) {
      const lane = this.score.lane(trace.id), selected = lane.id === this.score.state.selected;
      trace.head.setAttribute('class', `playhead lane-${lane.role}`); trace.head.dataset.selected = String(selected);
      trace.head.dataset.lane = lane.id; trace.path.dataset.lane = lane.id;
      trace.path.setAttribute('class', `wave-line lane-${lane.role}`);
      trace.path.setAttribute('visibility', isContinuous(lane) && !this.score.state.ambientTools ? 'hidden' : 'visible');
      const edge = wavePath(lane, this.paintTime);
      trace.ribbon.draw(edge, waveAreaPath(edge));
      trace.ribbon.state(lane.role, selected, isAudible(lane, this.score.state.ambientTools), !isContinuous(lane) || this.score.state.ambientTools,
        isContinuous(lane) || lane.notes.some(pitch => pitch !== null));
      trace.path.dataset.selected = String(selected); trace.path.dataset.enabled = String(isAudible(lane, this.score.state.ambientTools));
      trace.dots.forEach((dot, step) => {
        dot.dataset.lane = lane.id;
        dot.setAttribute('class', `note-dot lane-${lane.role}`); dot.setAttribute('visibility', isContinuous(lane) || step >= lane.notes.length ? 'hidden' : 'visible');
        const pitch = lane.notes[step] ?? null; dot.setAttribute('cx', String(noteX(step, lane.notes.length)));
        dot.setAttribute('cy', String(pitch === null ? waveY(lane, step) : noteY(lane, pitch)));
        dot.dataset.filled = String(pitch !== null); dot.dataset.selected = String(selected); dot.dataset.enabled = String(lane.enabled);
      });
    }
    this.hits.forEach((hit, step) => {
      const steps = this.score.selected.notes.length;
      hit.setAttribute('visibility', step < steps ? 'visible' : 'hidden');
      hit.setAttribute('x', String(step / steps * COMPOSE.width)); hit.setAttribute('width', String(COMPOSE.width / steps));
      const pitch = this.score.selected.notes[step] ?? null, label = this.score.selected.name;
      hit.setAttribute('aria-label', `${label} step ${step + 1}: ${pitch === null ? 'empty' : noteName(pitchFor(this.score.selected, pitch), this.score.activeTuning)}`);
      hit.setAttribute('aria-pressed', String(pitch !== null));
      hit.setAttribute('aria-disabled', String(isContinuous(this.score.selected))); hit.setAttribute('tabindex', !isContinuous(this.score.selected) && step === this.focused ? '0' : '-1');
    });
    this.waveGrip.setAttribute('d', wavePath(this.score.selected));
    this.noteGrips.forEach((grip, step) => {
      const pitch = this.score.selected.notes[step] ?? null;
      grip.setAttribute('cx', String(noteX(step, this.score.selected.notes.length))); grip.setAttribute('cy', String(pitch === null ? 0 : noteY(this.score.selected, pitch)));
      grip.setAttribute('visibility', pitch === null || isContinuous(this.score.selected) ? 'hidden' : 'visible');
    });
    this.handles.refresh();
  }

  private syncTraces() {
    if (this.traces.length === this.score.state.lanes.length && this.traces.every((trace, index) => trace.id === this.score.state.lanes[index].id)) return;
    this.traces.forEach((trace) => { trace.ribbon.element.remove(); trace.head.remove(); trace.dots.forEach((dot) => dot.remove()); });
    this.traces = this.score.state.lanes.map((lane) => {
      const ribbon = new WaveRibbon();
      return { id: lane.id, path: ribbon.edge, ribbon, dots: Array.from({ length: COMPOSE.maxDensity }, () => svg('circle', { r: 3 })),
        head: svg('line', { y1: 0, y2: COMPOSE.height, visibility: 'hidden', 'aria-hidden': 'true' }) };
    });
    for (const trace of this.traces) this.element.insertBefore(trace.ribbon.element, this.hits[0]);
    for (const trace of this.traces) for (const dot of trace.dots) this.element.insertBefore(dot, this.hits[0]);
    for (const trace of this.traces) this.element.insertBefore(trace.head, this.hits[0]);
  }

  private focus(step: number) {
    this.hits[this.focused].setAttribute('tabindex', '-1'); this.focused = step;
    this.hits[step].setAttribute('tabindex', '0'); this.hits[step].focus(); this.describe(step);
  }

  private down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return;
    if (isContinuous(this.score.selected)) return;
    event.preventDefault();
    if (event.target === this.waveGrip) {
      this.waveDrag.start(event, this.element.getBoundingClientRect().width);
      this.element.setPointerCapture(event.pointerId); this.element.dataset.grabbing = 'true';
      this.audition(this.focused, false); return;
    }
    this.beginNote(event, true);
  }

  private beginNote(event: PointerEvent, capture: boolean) {
    const rect = this.element.getBoundingClientRect(), steps = this.score.selected.notes.length, step = Math.min(steps - 1, Math.floor(clamp((event.clientX - rect.left) / rect.width) * steps));
    const lane = this.score.selected, y = (event.clientY - rect.top) / rect.height * COMPOSE.height;
    const pitch = lane.notes[step] ?? Math.round(clamp((COMPOSE.baseline + definition(lane.role).offset - COMPOSE.peak * lane.level - y) / COMPOSE.pitchHeight - liftOf(lane), COMPOSE.pitchMin, COMPOSE.pitchMax));
    this.edit = { id: event.pointerId, step, x: event.clientX, y: event.clientY, pitch, existed: lane.notes[step] !== null, moved: false };
    if (capture) this.element.setPointerCapture(event.pointerId);
    this.focus(step);
    if (!this.edit.existed) this.score.setNote(step, pitch);
    this.audition(step, !this.edit.existed); this.describe(step);
  }

  private move(event: PointerEvent) {
    if (this.waveDrag.move(event)) return;
    const edit = this.edit;
    if (!edit || event.pointerId !== edit.id) return;
    const distance = edit.y - event.clientY;
    const horizontal = event.clientX - edit.x;
    if (!edit.moved && Math.abs(horizontal) >= COMPOSE.dragThreshold && Math.abs(horizontal) > Math.abs(distance)) {
      if (!edit.existed) this.score.setNote(edit.step, null);
      this.waveDrag.start({ pointerId: edit.id, clientX: edit.x }, this.element.getBoundingClientRect().width);
      this.edit = null; this.element.dataset.grabbing = 'true'; this.waveDrag.move(event); return;
    }
    if (Math.abs(distance) < COMPOSE.dragThreshold && !edit.moved) return;
    edit.moved = true;
    const scale = COMPOSE.height / this.element.getBoundingClientRect().height;
    const pitch = Math.round(clamp(edit.pitch + distance * scale / COMPOSE.pitchHeight, COMPOSE.pitchMin, COMPOSE.pitchMax));
    if (pitch !== this.score.selected.notes[edit.step]) { this.score.setNote(edit.step, pitch); this.audition(edit.step); this.describe(edit.step); }
  }

  private up() {
    if (this.edit?.existed && !this.edit.moved) { this.score.setNote(this.edit.step, null); this.describe(this.edit.step); }
    this.edit = null;
  }

  private release(event: PointerEvent) {
    const result = this.waveDrag.finish(event);
    this.element.dataset.grabbing = 'false';
    if (result === 'tap') { this.beginNote(event, false); this.up(); }
    else if (!result && event.pointerId === this.edit?.id) this.up();
  }

  private cancel(event: PointerEvent) {
    this.waveDrag.cancel(event); this.element.dataset.grabbing = 'false';
    if (event.pointerId === this.edit?.id) this.edit = null;
  }

  private key(event: KeyboardEvent, step: number) {
    if (isContinuous(this.score.selected)) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      this.score.shiftLane(this.score.state.selected, event.key === 'ArrowLeft' ? -1 : 1);
      this.audition(step, false); return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { this.focus((step + this.score.selected.notes.length + (event.key === 'ArrowLeft' ? -1 : 1)) % this.score.selected.notes.length); return; }
    const pitch = this.score.selected.notes[step];
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') this.score.setNote(step, (pitch ?? definition(this.score.selected.role).base) + (event.key === 'ArrowUp' ? 1 : -1));
    else this.score.setNote(step, pitch === null ? definition(this.score.selected.role).base : null);
    this.audition(step, this.score.selected.notes[step] !== null); this.describe(step);
  }

  note(lane: string, time: number, position: number) { this.pulses.push({ lane, time, step: Math.round(position) }); }
  paint(time: number, tick: number) {
    this.paintTime = time;
    this.pulses = tick < 0 ? [] : this.pulses.filter((pulse) => time - pulse.time < COMPOSE.pulseLife);
    for (const trace of this.traces) {
      const lane = this.score.lane(trace.id), position = tick < 0 ? -1 : tick * lane.rate * lane.notes.length / COMPOSE.steps % lane.notes.length;
      const playing = position >= 0 && lane.enabled && lane.level > 0 && !isContinuous(lane) && lane.notes.some((note) => note !== null);
      trace.head.setAttribute('visibility', playing ? 'visible' : 'hidden');
      const x = noteX(position, lane.notes.length) % COMPOSE.width; trace.head.setAttribute('x1', String(x)); trace.head.setAttribute('x2', String(x));
      const pulses = this.pulses.filter((pulse) => pulse.lane === trace.id);
      trace.dots.forEach((dot, step) => { dot.dataset.playing = String(pulses.some((pulse) => pulse.step === step && time >= pulse.time)); });
    }
    if (time < this.driftPaint || time - this.driftPaint >= 1 / COMPOSE.driftPaintFps) {
      this.driftPaint = time;
      this.traces.forEach((trace) => {
        const lane = this.score.lane(trace.id);
        if (isContinuous(lane)) { const edge = wavePath(lane, time); trace.ribbon.draw(edge, waveAreaPath(edge)); }
      });
    }
  }
}
