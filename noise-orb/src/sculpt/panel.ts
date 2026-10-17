import { element } from '../ui';
import { INSTRUMENTS, instrumentFor, isInstrument } from '../audio/instruments';
import type { Score } from '../composer/model';
import { WaveSurface } from '../composer/surface';
import { SimpleControls } from '../simple/controls';
import type { SculptController } from './controller';

export class SculptPanel {
  readonly surface: WaveSurface;
  private controls: SimpleControls;
  private voice = element('sculpt-voice', HTMLSelectElement);
  private toggle = element('sculpt-toggle', HTMLButtonElement);
  private undo = element('undo-shape', HTMLButtonElement);
  private feedback = element('sculpt-feedback', HTMLOutputElement);
  private buttons = new Map<string, HTMLButtonElement>();
  constructor(private score: Score, private sculpture: SculptController, activate: () => void) {
    this.surface = new WaveSurface(score, activate, () => {});
    element('simple-waves', HTMLDivElement).append(this.surface.element);
    this.controls = new SimpleControls(score, activate);
    this.voice.append(...INSTRUMENTS.map((voice) => { const option = document.createElement('option'); option.value = voice.id; option.textContent = voice.label; return option; }));
    this.voice.addEventListener('change', () => {
      if (!isInstrument(this.voice.value)) throw new Error('Unknown sculpt instrument.');
      score.setInstrument(this.voice.value); activate();
    });
    this.toggle.addEventListener('click', () => score.toggleLane());
    this.undo.addEventListener('click', () => sculpture.undo());
    const host = element('draw-layers', HTMLDivElement);
    score.state.lanes.forEach((lane) => {
      const button = document.createElement('button'); button.type = 'button';
      button.addEventListener('click', () => score.select(lane.id)); this.buttons.set(lane.id, button); host.append(button);
    });
  }
  update() {
    this.score.state.lanes.forEach((lane) => {
      const button = this.buttons.get(lane.id);
      if (!button) throw new Error(`Sculpt panel is missing its ${lane.name} layer.`);
      button.className = `draw-layer lane-${lane.role}`;
      button.setAttribute('aria-label', `Shape ${lane.name}`); button.setAttribute('aria-pressed', String(lane.id === this.score.state.selected));
      const title = document.createElement('span'), detail = document.createElement('span');
      title.textContent = lane.name; detail.className = 'draw-layer-detail'; detail.textContent = instrumentFor(lane.instrument).label;
      button.replaceChildren(title, detail);
    });
    this.voice.value = this.score.selected.instrument;
    this.voice.setAttribute('aria-label', `${this.score.selected.name} sound`);
    this.toggle.textContent = this.score.selected.enabled ? 'Playing' : 'Paused';
    this.toggle.setAttribute('aria-label', `${this.score.selected.enabled ? 'Pause' : 'Play'} ${this.score.selected.name}`);
    this.undo.disabled = !this.sculpture.canUndo;
    const count = this.sculpture.handles.length;
    this.feedback.textContent = `${this.score.selected.name} · ${count} sculpt ${count === 1 ? 'point' : 'points'}`;
    this.surface.update(); this.controls.update(true);
  }
  paint(time: number, tick: number, phrase: number) { this.surface.paint(time, tick); this.controls.paint(phrase); }
}
