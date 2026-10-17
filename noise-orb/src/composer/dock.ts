import { element } from '../ui';
import { KNOBS } from './config';
import type { Score } from './model';
import { pitchFor } from './model';
import { Knob } from './knob';
import { WaveSurface } from './surface';
import { noteName } from './waves';
import { LaneList } from './lane-list';
import { LaneControls } from './lane-controls';
import { isContinuous, isAudible } from './lanes';
import { SUSTAIN } from '../audio/sustain-config';
import { RhythmControls } from './rhythm-controls';
import { CompositionControls } from './composition-controls';

export class WaveDock {
  private toggle = element('lane-toggle', HTMLButtonElement);
  private label = element('selected-lane', HTMLSpanElement);
  private readout = element('note-readout', HTMLSpanElement);
  private undo = element('undo-randomise', HTMLButtonElement);
  private selectedStep = 0;
  private lanes: LaneList;
  private controls: LaneControls;
  private rhythm: RhythmControls;
  private composition: CompositionControls;
  private remove = element('remove-wave', HTMLButtonElement);
  private knobs: Knob[];
  readonly surface: WaveSurface;

  constructor(private score: Score, private audition: (step: number, preview?: boolean) => void, randomise?: () => void) {
    this.settingsToggle();
    this.lanes = new LaneList(score); this.controls = new LaneControls(score, () => this.audition(this.selectedStep));
    this.rhythm = new RhythmControls(score, () => this.audition(this.selectedStep, false));
    this.composition = new CompositionControls(score, () => this.audition(this.selectedStep, false));
    this.remove.addEventListener('click', () => score.removeLane(score.state.selected));
    this.toggle.addEventListener('click', () => { score.toggleLane(); this.audition(this.selectedStep); });
    element('randomise', HTMLButtonElement).addEventListener('click', () => { if (randomise) randomise(); else { score.randomise(); this.audition(this.selectedStep, false); } });
    this.undo.addEventListener('click', () => { score.undoRandomise(); this.audition(this.selectedStep, false); });
    this.surface = new WaveSurface(score, (step, preview) => { this.selectedStep = step; audition(step, preview); }, (step) => this.describe(step));
    element('wave-surface', HTMLDivElement).append(this.surface.element);
    this.knobs = KNOBS.map((knob) => new Knob(knob.key, knob.label, knob.hint, (value) => score.setKnob(knob.key, value), () => audition(this.selectedStep)));
    element('knobs', HTMLDivElement).append(...this.knobs.map((knob) => knob.element)); this.update();
  }
  private settingsToggle() {
    const header = document.querySelector('.shaping-header'), controls = document.querySelector('.shaping-controls');
    if (!(header instanceof HTMLElement) || !(controls instanceof HTMLElement)) throw new Error('Advanced settings need the shaping header and controls.');
    const button = document.createElement('button'), root = element('instrument', HTMLElement);
    button.type = 'button'; button.className = 'advanced-settings-toggle'; controls.id = 'advanced-sound-settings';
    button.setAttribute('aria-controls', controls.id);
    const update = () => {
      button.textContent = controls.hidden ? 'Advanced ▾' : 'Advanced ▴';
      button.setAttribute('aria-expanded', String(!controls.hidden));
      button.setAttribute('aria-label', `${controls.hidden ? 'Expand' : 'Collapse'} advanced settings`);
      root.dataset.advancedCollapsed = String(controls.hidden);
    };
    button.addEventListener('click', () => { controls.hidden = !controls.hidden; update(); });
    header.prepend(button); update();
  }
  update() {
    const lane = this.score.selected, label = lane.name;
    this.undo.hidden = !this.score.canUndoRandomise;
    this.undo.setAttribute('aria-label', `Undo ${this.score.undoDescription}`);
    this.lanes.update(); this.controls.update(); this.rhythm.update(); this.composition.update();
    this.remove.disabled = !this.score.canRemoveLane; this.remove.title = this.remove.disabled ? 'Keep at least one sound wave.' : `Remove ${label}; Undo can restore it.`;
    this.toggle.textContent = lane.enabled ? '◉ Playing' : '○ Paused';
    this.toggle.setAttribute('aria-label', `${lane.enabled ? 'Pause' : 'Enable'} ${label}`); this.toggle.setAttribute('aria-pressed', String(lane.enabled));
    this.toggle.disabled = isContinuous(lane) && !this.score.state.ambientTools;
    if (this.toggle.disabled) this.toggle.textContent = 'Ambient tools off';
    this.label.textContent = label.toUpperCase();
    this.knobs.forEach((knob, i) => { knob.update(lane[knob.key], label, KNOBS[i].label); knob.element.hidden = lane.role === 'binaural' && (knob.key === 'tone' || knob.key === 'lift'); });
    this.surface.update();
    element('wave-help', HTMLSpanElement).textContent = isContinuous(lane) ? 'Held tones · Shape with the controls' : 'Tap notes · Drag dots for pitch · Drag the line to shift all';
    this.describe(this.selectedStep);
  }
  paint(time: number, position: number, phrase: number) { this.surface.paint(time, position); this.composition.paint(phrase); }
  private describe(step: number) {
    step = Math.min(step, this.score.selected.notes.length - 1);
    this.selectedStep = step;
    const pitch = this.score.selected.notes[step];
    const lane = this.score.selected;
    if (isContinuous(lane)) {
      if (!isAudible(lane, this.score.state.ambientTools) && !this.score.state.ambientTools) { this.readout.textContent = `${lane.name} · Enable Ambient tools to hear this wave`; return; }
      const sound = lane.role === 'binaural' ? `${lane.carrier} Hz L / ${lane.carrier + lane.beat} Hz R · headphones` : `${noteName(pitchFor(lane, lane.pitch), this.score.activeTuning)} · ${lane.breath}s breathing`;
      this.readout.textContent = `${lane.name} · ${sound} · ${(SUSTAIN.release.min + lane.length * SUSTAIN.release.range).toFixed(1)}s release`; return;
    }
    this.readout.textContent = `${lane.name} · ${String(step + 1).padStart(2, '0')} / ${lane.notes.length} · ${pitch === null ? 'place a note' : noteName(pitchFor(lane, pitch), this.score.activeTuning)}`;
  }
}
