import { element, report } from '../ui';
import { isTuning } from './tuning';
import { SUSTAIN } from '../audio/sustain-config';
import { isContinuous } from './lanes';
import type { Score } from './model';
import { laneForm } from './composition';

export class Arrangement {
  private reference = element('add-reference', HTMLButtonElement);
  private tuning = element('master-tuning', HTMLSelectElement);
  private space = element('space-seconds', HTMLInputElement);
  private wet = element('space-wet', HTMLInputElement);
  private fade = element('fade-seconds', HTMLInputElement);
  private fading = false;
  private ambient = element('ambient-tools', HTMLInputElement);
  private panel = element('ambient-panel', HTMLDivElement);
  constructor(private score: Score, activate: () => void, fade: () => Promise<void>) {
    this.ambient.addEventListener('change', () => score.setAmbientTools(this.ambient.checked));
    this.reference.addEventListener('click', () => { score.addReference(); element('arrangement', HTMLDetailsElement).open = true; activate(); });
    this.tuning.addEventListener('change', () => { const tuning = this.tuning.value; if (!isTuning(tuning)) throw new Error('Unknown master tuning.'); score.setTuning(tuning); });
    this.space.min = String(SUSTAIN.space.min); this.space.max = String(SUSTAIN.space.max);
    const updateSpace = () => {
      try { score.setSpace(Number(this.space.value), Number(this.wet.value) / 100); } catch (error) { report(error); this.update(); }
    };
    this.space.addEventListener('change', updateSpace); this.wet.addEventListener('change', updateSpace);
    this.fade.min = String(SUSTAIN.fadeOut.min); this.fade.max = String(SUSTAIN.fadeOut.max);
    this.fade.addEventListener('change', () => {
      try { score.setFade(Number(this.fade.value)); } catch (error) { report(error); this.update(); }
    });
    element('fade-out', HTMLButtonElement).addEventListener('click', () => {
      this.fading = true; this.updateFade();
      void fade().catch((error: unknown) => { this.resetFade(); report(error); });
    });
  }
  resetFade() { this.fading = false; this.updateFade(); }
  private updateFade() {
    const button = element('fade-out', HTMLButtonElement); button.disabled = this.fading;
    button.textContent = this.fading ? `Fading out · ${this.score.state.fadeSeconds}s` : 'Fade out & leave';
  }
  update() {
    const state = this.score.state, continuous = state.ambientTools && state.lanes.some((lane) => lane.enabled && isContinuous(lane));
    this.ambient.checked = state.ambientTools; this.panel.hidden = !state.ambientTools;
    this.reference.disabled = !this.score.canAddReference;
    this.reference.title = this.reference.disabled ? 'Five free lanes are needed for this arrangement.' : 'Add four evolving pads and a dry 6 Hz stereo pair. Existing notes are kept and paused.';
    this.tuning.value = state.tuning; this.space.value = String(state.spaceSeconds); this.wet.value = String(Math.round(state.wet * 100)); this.fade.value = String(state.fadeSeconds);
    const pulse = state.lanes.some((lane) => lane.enabled && !isContinuous(lane) && lane.notes.some((note) => note !== null));
    const bars = state.lanes.some((lane) => lane.enabled && !isContinuous(lane) && laneForm(lane, state.form) !== 'loop') ? '12 BARS' : '3 BARS';
    element('loop-label', HTMLParagraphElement).textContent = `${continuous && !pulse ? 'CONTINUOUS' : `84 BPM · ${bars}`} · ${this.score.activeTuning === '528' ? 'C / 528 HZ' : 'D MAJOR'}`;
    element('tuning-label', HTMLSpanElement).textContent = this.score.activeTuning === '528' ? 'C · 528 HZ CENTER' : 'D MAJOR PENTATONIC';
  }
}
