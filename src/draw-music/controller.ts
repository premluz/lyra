import { element, report, ui } from '../ui';
import { WaveSurface } from '../composer/surface';
import { DRAW_MUSIC as D } from './config';
import type { DrawDocument } from './document';
import { DrawControls } from './controls';
import { MusicGesture } from './gesture';
import { DrawPolish } from './polish';
import type { LiveStroke } from './live';

export class DrawController {
  readonly surface: WaveSurface;
  private gesture: MusicGesture;
  private polish: DrawPolish;
  private controls: DrawControls;
  private buttons: HTMLButtonElement[];
  constructor(private document: DrawDocument, private live: LiveStroke, activate: () => Promise<void>, restart: () => Promise<void>) {
    const score = document.score;
    this.surface = new WaveSurface(score, () => { void activate().catch(report); }, () => {});
    element('simple-waves', HTMLDivElement).append(this.surface.element);
    this.polish = new DrawPolish(document, (message, busy) => {
      element('draw-hint', HTMLParagraphElement).textContent = message;
      element('instrument', HTMLElement).dataset.generating = String(busy);
      element('shape-phrase', HTMLButtonElement).disabled = busy; element('cancel-generation', HTMLButtonElement).hidden = !busy;
    });
    this.gesture = new MusicGesture({ begin: point => { this.polish.cancel(); live.begin(point); }, move: point => live.move(point),
      end: points => { live.end(); try { document.capture(points); void this.polish.generate(); } catch (error) { report(error); } }, cancel: () => live.cancel() });
    element('drawing-stage', HTMLElement).append(this.gesture.element);
    this.buttons = D.layers.map(layer => {
      const button = window.document.createElement('button'); button.type = 'button'; button.className = `draw-layer lane-${layer.id}`;
      button.textContent = layer.name; button.addEventListener('click', () => { this.gesture.cancel(); score.select(layer.id); }); return button;
    });
    element('draw-layers', HTMLDivElement).append(...this.buttons);
    this.controls = new DrawControls(document, () => { void activate().catch(report); });
    element('shape-phrase', HTMLButtonElement).addEventListener('click', () => { void activate().then(() => this.polish.generate()).catch(report); });
    element('cancel-generation', HTMLButtonElement).addEventListener('click', () => this.polish.cancel());
    element('undo-drawing', HTMLButtonElement).addEventListener('click', () => { this.cancel(); document.undo(); });
    element('clear-layer', HTMLButtonElement).addEventListener('click', () => { this.cancel(); document.clear(); });
    element('new-tune', HTMLButtonElement).addEventListener('click', () => { this.cancel(); document.reset(); void restart().catch(report); });
    new MutationObserver(() => this.exitState()).observe(ui.root, { attributes: true, attributeFilter: ['data-exited'] });
    window.addEventListener('pagehide', () => this.cancel()); this.update();
  }
  update() {
    this.surface.update(); this.controls.update();
    this.buttons.forEach((button, index) => { const layer = D.layers[index]; button.setAttribute('aria-pressed', String(this.document.score.state.selected === layer.id)); });
    element('undo-drawing', HTMLButtonElement).disabled = !this.document.canUndo;
    const empty = this.document.score.selected.notes.every(note => note === null);
    element('shape-phrase', HTMLButtonElement).disabled = empty || this.polish.busy; element('clear-layer', HTMLButtonElement).disabled = empty;
  }
  paint(time: number, tick: number) { this.surface.paint(time, tick); }
  private exitState() {
    const exited = ui.root.dataset.exited === 'true'; element('simple-score', HTMLElement).inert = exited;
    this.gesture.element.setAttribute('aria-disabled', String(exited)); this.gesture.element.setAttribute('tabindex', exited ? '-1' : '0');
    element('new-tune', HTMLButtonElement).disabled = exited; if (exited) this.cancel();
  }
  private cancel() { this.polish.cancel(); this.gesture.cancel(); this.live.cancel(); }
}
