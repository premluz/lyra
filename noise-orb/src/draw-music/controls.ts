import { element } from '../ui';
import { Knob } from '../composer/knob';
import { RATES } from '../composer/pace';
import { COMPOSE } from '../composer/config';
import { INSTRUMENTS } from '../audio/instruments';
import { isInstrument } from '../audio/instruments';
import type { DrawDocument } from './document';

export class DrawControls {
  private speed: Knob<'speed'>;
  private density: Knob<'density'>;
  private interpretation: Knob<'interpretation'>;
  private voice = element('draw-voice', HTMLSelectElement);
  constructor(private document: DrawDocument, activate: () => void) {
    const score = document.score;
    this.speed = new Knob('speed', 'Pace', 'Keep your phrase on the beat, slower or faster.', value => score.setRate(RATES[Math.round(value * (RATES.length - 1))].value), activate, RATES.length - 1);
    this.density = new Knob('density', 'Density', 'Make this wave more spacious or fuller.', value => score.setDensity(Math.round(value * COMPOSE.maxDensity)), activate, COMPOSE.maxDensity);
    this.interpretation = new Knob('interpretation', 'Interpretation', 'Close to my drawing → more musical interpretation. Applies when shaping your phrase.', value => { document.data.interpretation = value; document.save(); });
    element('draw-knobs', HTMLDivElement).append(this.speed.element, this.density.element, this.interpretation.element);
    this.voice.append(...INSTRUMENTS.map(instrument => { const option = new Option(instrument.label, instrument.id); return option; }));
    this.voice.addEventListener('change', () => { if (!isInstrument(this.voice.value)) throw new Error('Unknown drawing instrument.'); score.setInstrument(this.voice.value); activate(); });
  }
  update() {
    const lane = this.document.score.selected, rate = RATES.findIndex(rate => rate.value === lane.rate), count = lane.notes.filter(note => note !== null).length;
    this.speed.update(rate / (RATES.length - 1), lane.name, 'Pace'); this.speed.readout(RATES[rate].label, RATES[rate].label);
    this.density.update(count / COMPOSE.maxDensity, lane.name, 'Density'); this.density.readout(String(count), `${count} notes`);
    this.interpretation.update(this.document.data.interpretation, 'Drawing', 'Interpretation');
    this.voice.value = lane.instrument;
  }
}
