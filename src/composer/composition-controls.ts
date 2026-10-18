import { element } from '../ui';
import type { Score } from './model';
import { FORMS, COMPOSITION, formFor, isForm } from './composition-config';
import { noteName } from './waves';
import { isContinuous } from './lanes';
import { laneForm } from './composition';

export class CompositionControls {
  private select = element('composition-style', HTMLSelectElement);
  private help = element('composition-help', HTMLParagraphElement);
  private phase = element('composition-phase', HTMLOutputElement);
  constructor(private score: Score, activate: () => void) {
    this.select.append(...FORMS.map((form) => {
      const option = document.createElement('option'); option.value = form.id; option.textContent = form.label; return option;
    }));
    this.select.addEventListener('change', () => {
      const value = this.select.value;
      if (!isForm(value)) throw new Error(`Unknown composition style ${value}.`);
      score.setLaneForm(value); activate();
    });
  }
  private ambientOnly() {
    const lanes = this.score.state.lanes.filter((lane) => lane.enabled && lane.level > 0);
    return this.score.state.ambientTools && lanes.some(isContinuous) && !lanes.some((lane) => !isContinuous(lane) && lane.notes.some((note) => note !== null));
  }
  update() {
    const lane = this.score.selected, form = laneForm(lane, this.score.state.form);
    this.select.value = form; this.select.dataset.lane = lane.id;
    this.select.disabled = isContinuous(lane); this.select.title = `Composition for ${lane.name}`;
    this.help.textContent = this.ambientOnly() || isContinuous(lane) ? 'Composition styles shape note lanes. These held ambient layers keep their own pitches.' : `${lane.name} · ${formFor(form).description}`;
    this.paint(0);
  }
  paint(phrase: number) {
    const form = formFor(laneForm(this.score.selected, this.score.state.form)), shift = form.harmony[phrase];
    const root = (shift % COMPOSITION.octaveSteps + COMPOSITION.octaveSteps) % COMPOSITION.octaveSteps;
    const label = this.ambientOnly() || isContinuous(this.score.selected) ? 'Held layers · static harmony' : `${form.sections[phrase]} · ${noteName(root, this.score.activeTuning)} · ${phrase + 1}/${form.sections.length}`;
    if (this.phase.textContent !== label) this.phase.textContent = label;
  }
}
