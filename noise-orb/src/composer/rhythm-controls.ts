import { element } from '../ui';
import { COMPOSE } from './config';
import { isContinuous } from './lanes';
import type { Score } from './model';
import { MUSIC } from '../config';
import { RATES } from './pace';

export class RhythmControls {
  private host = element('rhythm-controls', HTMLDivElement);
  private density = element('wave-density', HTMLInputElement);
  private offset = element('wave-offset', HTMLInputElement);
  private rate = element('wave-rate', HTMLInputElement);
  private densityValue = element('density-value', HTMLOutputElement);
  private offsetValue = element('offset-value', HTMLOutputElement);
  private rateValue = element('rate-value', HTMLOutputElement);
  constructor(private score: Score, activate: () => void) {
    this.density.min = '0'; this.density.max = String(COMPOSE.maxDensity); this.density.step = '1';
    this.offset.min = '0'; this.offset.max = String(COMPOSE.steps - 1); this.offset.step = '1';
    this.rate.min = '0'; this.rate.max = String(RATES.length - 1); this.rate.step = '1';
    this.density.addEventListener('input', () => { score.setDensity(Number(this.density.value)); activate(); });
    this.offset.addEventListener('input', () => { score.shiftLane(score.selected.id, Number(this.offset.value) - score.selected.phase); activate(); });
    this.rate.addEventListener('input', () => { score.setRate(RATES[Number(this.rate.value)].value); activate(); });
  }
  update() {
    const lane = this.score.selected, count = lane.notes.filter((note) => note !== null).length;
    this.offset.max = String(lane.notes.length - 1);
    this.host.hidden = isContinuous(lane);
    this.density.value = String(count); this.offset.value = String(lane.phase);
    const rate = RATES.findIndex((item) => item.value === lane.rate); this.rate.value = String(rate);
    this.density.setAttribute('aria-label', `${lane.name} density`); this.offset.setAttribute('aria-label', `${lane.name} offset`);
    this.rate.setAttribute('aria-label', `${lane.name} rate`);
    this.densityValue.value = `${count} / ${COMPOSE.maxDensity} notes`;
    this.offsetValue.value = `${lane.phase} ${lane.notes.length === COMPOSE.steps ? 'eighths' : 'steps'}`;
    this.rateValue.value = `${RATES[rate].label} · ${MUSIC.bpm * lane.rate} BPM`;
  }
}
