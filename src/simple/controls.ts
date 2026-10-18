import { element } from '../ui';
import { MUSIC } from '../config';
import { COMPOSE, KNOBS } from '../composer/config';
import { Knob } from '../composer/knob';
import type { Score } from '../composer/model';
import { RATES } from '../composer/pace';
import { CompositionControls } from '../composer/composition-controls';

const SOUND_KNOBS = KNOBS.filter(({ key }) => key !== 'lift');
export class SimpleControls {
  private host = element('simple-controls', HTMLFieldSetElement);
  private speed: Knob<'speed'>;
  private density: Knob<'density'>;
  private sounds: Knob[];
  private composition: CompositionControls;

  constructor(private score: Score, activate: () => void) {
    this.composition = new CompositionControls(score, activate);
    this.speed = new Knob('speed', 'Speed', 'Change this wave’s speed while keeping it on the shared beat.', (value) => {
      score.setRate(RATES[Math.round(value * (RATES.length - 1))].value);
    }, activate, RATES.length - 1);
    this.density = new Knob('density', 'Density', 'Fewer notes or a fuller phrase, keeping the shape you drew.', (value) => {
      score.setDensity(Math.round(value * COMPOSE.maxDensity));
    }, activate, COMPOSE.maxDensity);
    this.sounds = SOUND_KNOBS.map(({ key, label, hint }) => new Knob(key, label, hint, (value) => score.setKnob(key, value), activate));
    element('simple-knobs', HTMLDivElement).append(this.speed.element, this.density.element, ...this.sounds.map((knob) => knob.element));
  }
  update(enabled: boolean) {
    const lane = this.score.selected, rate = RATES.findIndex(({ value }) => value === lane.rate), count = lane.notes.filter((pitch) => pitch !== null).length;
    this.host.hidden = !enabled; this.host.disabled = count === 0 && lane.motif.length === 0;
    this.speed.update(rate / (RATES.length - 1), lane.name, 'Speed');
    this.speed.readout(RATES[rate].label, `${RATES[rate].label}, ${MUSIC.bpm * lane.rate} BPM`);
    this.density.update(count / COMPOSE.maxDensity, lane.name, 'Density'); this.density.readout(String(count), `${count} notes`);
    this.sounds.forEach((knob, index) => knob.update(lane[knob.key], lane.name, SOUND_KNOBS[index].label));
    this.composition.update();
  }
  paint(phrase: number) { this.composition.paint(phrase); }
}
