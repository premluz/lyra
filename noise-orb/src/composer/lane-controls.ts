import { element, report } from '../ui';
import { COMPOSE, ROLES, isRole } from './config';
import { ALL_INSTRUMENTS, isInstrument } from '../audio/instruments';
import { SUSTAIN_RANGES, isContinuous } from './lanes';
import type { SustainKey } from './lanes';
import type { Score } from './model';
import { noteName } from './waves';

const FIELDS: readonly { key: SustainKey; label: string; step: number; kind: 'drone' | 'binaural' | 'both' }[] = [
  { key: 'attack', label: 'Attack · s', step: 0.5, kind: 'both' },
  { key: 'breath', label: 'Breathing · s', step: 1, kind: 'drone' },
  { key: 'movement', label: 'Movement', step: 0.05, kind: 'drone' },
  { key: 'carrier', label: 'Left tone · Hz', step: 1, kind: 'binaural' },
  { key: 'beat', label: 'Difference · Hz', step: 0.5, kind: 'binaural' },
];
export class LaneControls {
  private name = element('lane-name', HTMLInputElement);
  private role = element('lane-role', HTMLSelectElement);
  private instrument = element('instrument-voice', HTMLSelectElement);
  private sustain = element('continuous-controls', HTMLDivElement);
  private pitch = document.createElement('select');
  private pitchLabel = document.createElement('label');
  private fields = FIELDS.map((field) => ({ ...field, input: document.createElement('input'), host: document.createElement('label') }));

  constructor(private score: Score, private audition: () => void) {
    ROLES.forEach(({ id, label }) => this.role.add(new Option(label, id)));
    ALL_INSTRUMENTS.forEach(({ id, label }) => this.instrument.add(new Option(label, id)));
    this.role.addEventListener('change', () => { const role = this.role.value; if (!isRole(role)) throw new Error('Unknown sound role.'); score.setRole(role); audition(); });
    this.instrument.addEventListener('change', () => { const id = this.instrument.value; if (!isInstrument(id)) throw new Error('Unknown sound instrument.'); score.setInstrument(id); audition(); });
    this.name.maxLength = COMPOSE.nameLength;
    this.name.addEventListener('change', () => {
      try { score.rename(this.name.value); } catch (error) { report(error); this.name.value = score.selected.name; }
    });
    this.pitchLabel.textContent = 'Held pitch'; this.pitchLabel.append(this.pitch); this.sustain.append(this.pitchLabel);
    for (let i = COMPOSE.pitchMin; i <= COMPOSE.pitchMax; i++) this.pitch.add(new Option('', String(i)));
    this.pitch.addEventListener('change', () => { score.setSustain('pitch', Number(this.pitch.value)); audition(); });
    this.bindFields();
  }
  private bindFields() {
    for (const { key, label, step, input, host } of this.fields) {
      const [min, max] = SUSTAIN_RANGES[key];
      host.textContent = label; input.type = 'number'; input.min = String(min); input.max = String(max); input.step = String(step);
      input.setAttribute('aria-label', label); host.append(input); this.sustain.append(host);
      input.addEventListener('change', () => {
        try { this.score.setSustain(key, Number(input.value)); this.audition(); } catch (error) { report(error); input.value = String(this.score.selected[key]); }
      });
    }
  }
  update() {
    const lane = this.score.selected;
    this.name.value = lane.name; this.role.value = lane.role; this.role.setAttribute('aria-label', `${lane.name} role`);
    this.instrument.value = lane.instrument; this.instrument.disabled = lane.role === 'binaural';
    this.instrument.setAttribute('aria-label', `${lane.name} instrument`);
    this.sustain.hidden = !this.score.state.ambientTools || !isContinuous(lane); this.pitchLabel.hidden = lane.role !== 'drone';
    Array.from(this.role.options).forEach((option) => { option.hidden = !this.score.state.ambientTools && (option.value === 'drone' || option.value === 'binaural'); });
    this.pitch.value = String(lane.pitch); this.pitch.setAttribute('aria-label', `${lane.name} held pitch`);
    Array.from(this.pitch.options).forEach((option, index) => { option.textContent = noteName(index, this.score.activeTuning); });
    this.fields.forEach(({ key, kind, input, host }) => { input.value = String(lane[key]); host.hidden = kind !== 'both' && kind !== lane.role; });
  }
}
