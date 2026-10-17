import { element, report, ui } from '../ui';
import type { Score } from '../composer/model';
import { WaveSurface } from '../composer/surface';
import { instrumentFor } from '../audio/instruments';
import { DRAW_LAYERS } from './config';
import { newDrawing, nextLayer, drawLayer } from './score';
import { DrawingGesture } from './gesture';
import type { StrokePoint } from './stroke';
import { SimpleControls } from './controls';
import { COMPOSE } from '../composer/config';

export class DrawingFlow {
  readonly surface: WaveSurface;
  readonly gesture: DrawingGesture;
  private active = 0;
  private title = element('draw-title', HTMLHeadingElement);
  private hint = element('draw-hint', HTMLParagraphElement);
  private step = element('draw-step', HTMLParagraphElement);
  private buttons = DRAW_LAYERS.map(() => document.createElement('button'));
  private reset = element('new-tune', HTMLButtonElement);
  private controls: SimpleControls;

  constructor(private score: Score, private begun: boolean, private changed: () => void, private start: () => Promise<void>, private restart: () => Promise<void>, private phase: () => number) {
    const next = nextLayer(score.state);
    this.active = next >= 0 ? next : DRAW_LAYERS.findIndex((layer) => layer.id === score.state.selected);
    this.surface = new WaveSurface(score, () => { void start().catch(report); }, () => {});
    element('simple-waves', HTMLDivElement).append(this.surface.element);
    this.gesture = new DrawingGesture({ start: () => this.begun && ui.root.dataset.exited !== 'true', complete: (points) => this.complete(points),
      short: () => { this.hint.textContent = 'Give your line a little more room. A small squiggle is enough.'; } });
    element('drawing-stage', HTMLElement).append(this.gesture.element);
    this.buttons.forEach((button, index) => {
      button.type = 'button'; button.addEventListener('click', () => { this.gesture.cancel(); this.active = index; score.select(DRAW_LAYERS[index].id); });
    });
    element('draw-layers', HTMLDivElement).append(...this.buttons);
    this.controls = new SimpleControls(score, () => { void start().catch(report); });
    this.reset.addEventListener('click', () => this.begin()); this.update();
    new MutationObserver(() => {
      const exited = ui.root.dataset.exited === 'true'; this.reset.disabled = exited; element('simple-score', HTMLElement).inert = exited;
      if (exited) this.gesture.cancel();
    }).observe(ui.root, { attributes: true, attributeFilter: ['data-exited'] });
  }
  update() {
    const layer = DRAW_LAYERS[this.active], next = nextLayer(this.score.state), complete = this.begun && next < 0;
    this.title.textContent = !this.begun ? 'Three lines. One little tune.' : complete ? 'You shaped the music.' : layer.instruction;
    this.hint.textContent = !this.begun ? 'Start a new tune. Then draw three lines, one sound at a time.' : complete ? `Your three layers are playing together. Select a layer and redraw it to make a change.` : layer.hint;
    this.step.textContent = !this.begun ? 'MAKE SOMETHING YOURS' : complete ? 'YOUR DRAWING, PLAYING' : `DRAW ${this.active + 1} OF ${DRAW_LAYERS.length}`;
    this.gesture.element.dataset.layer = layer.id; this.gesture.element.setAttribute('aria-disabled', String(!this.begun));
    element('draw-cue', HTMLSpanElement).textContent = !this.begun ? 'NEW TUNE TO BEGIN ↑' : 'DRAW ANYWHERE ABOVE THIS LINE';
    this.buttons.forEach((button, index) => {
      const definition = DRAW_LAYERS[index], lane = this.score.lane(definition.id), drawn = lane.motif.length > 0 || lane.notes.some((pitch) => pitch !== null);
      button.className = `draw-layer lane-${definition.id}`; button.disabled = !this.begun || (next >= 0 && index > next);
      button.setAttribute('aria-label', `Redraw ${definition.name}`); button.setAttribute('aria-pressed', String(this.active === index));
      const name = document.createElement('span'), detail = document.createElement('span');
      name.textContent = `${drawn ? '●' : '○'}  ${definition.name}`; detail.textContent = drawn ? instrumentFor(lane.instrument).label : index === next && this.begun ? 'Draw this layer' : 'Waiting for your line';
      detail.className = 'draw-layer-detail'; button.replaceChildren(name, detail);
    });
    this.surface.update(); this.controls.update(this.begun);
  }
  paint(time: number, tick: number, phrase: number) { this.surface.paint(time, tick); this.controls.paint(phrase); }
  private begin() {
    this.gesture.cancel(); Object.assign(this.score.state, newDrawing()); this.active = 0; this.begun = true;
    this.changed(); void this.restart().catch(report); this.gesture.element.focus({ preventScroll: true });
  }
  private complete(points: readonly StrokePoint[]) {
    try {
      const layer = DRAW_LAYERS[this.active], lane = this.score.lane(layer.id);
      const phase = Math.ceil(this.phase() * lane.rate * lane.notes.length / COMPOSE.steps);
      Object.assign(this.score.state, drawLayer(this.score.state, layer, points, phase));
      const next = nextLayer(this.score.state);
      if (next >= 0) { this.active = next; this.score.state.selected = DRAW_LAYERS[next].id; }
      this.changed(); void this.start().catch(report);
    } catch (error) { report(error); }
  }
}
