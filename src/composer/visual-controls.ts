import { element, report } from '../ui';
import type { MusicVisual } from './music-visual';
import { MUSIC_VISUAL, isMusicTreatment } from './visual-config';
import { INTERACTION } from '../interaction/config';
import { Knob } from './knob';
import { shapeControl } from '../visual/shape-control';

function lifeControl(visual: MusicVisual) {
  const saved = localStorage.getItem(INTERACTION.aliveKey);
  let value = saved === null ? INTERACTION.aliveDefault : Number(saved);
  visual.life.setAlive(value);
  const knob = new Knob('alive', 'Alive', 'Subtle idle motion. Hover and press add a local pull.', (next) => {
    value = next; visual.life.setAlive(value); knob.update(value, 'Orb', 'Alive');
    try { localStorage.setItem(INTERACTION.aliveKey, String(value)); } catch (error) { report(error); }
  });
  knob.update(value, 'Orb', 'Alive'); element('orb-life-control', HTMLDivElement).append(knob.element);
}

export function visualControls(visual: MusicVisual) {
  lifeControl(visual);
  shapeControl(visual);
  const select = element('render-treatment', HTMLSelectElement);
  const saved = localStorage.getItem(MUSIC_VISUAL.treatmentKey);
  if (saved !== null) {
    if (!isMusicTreatment(saved)) throw new Error(`Unknown saved render treatment: ${saved}`);
    select.value = saved; visual.setTreatment(saved);
  }
  select.addEventListener('change', () => {
    const value = select.value;
    if (!isMusicTreatment(value)) throw new Error(`Unknown render treatment: ${value}`);
    visual.setTreatment(value);
    try { localStorage.setItem(MUSIC_VISUAL.treatmentKey, value); } catch (error) { report(error); }
  });
}
