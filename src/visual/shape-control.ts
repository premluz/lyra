import { element, report, ui } from '../ui';
import type { MusicVisual } from '../composer/music-visual';
import { SURFACE, isMusicShape } from './surface';

export function shapeControl(visual: MusicVisual) {
  const select = element('visual-shape', HTMLSelectElement), saved = localStorage.getItem(SURFACE.key);
  select.replaceChildren(...SURFACE.choices.map(({ id, label }) => new Option(label, id)));
  if (saved !== null) {
    if (!isMusicShape(saved)) throw new Error(`Unknown saved visual shape: ${saved}`);
    visual.setShape(saved);
  }
  select.value = visual.shape; ui.mesh.dataset.shape = visual.shape;
  select.addEventListener('change', () => {
    const value = select.value;
    if (!isMusicShape(value)) throw new Error(`Unknown visual shape: ${value}`);
    visual.setShape(value); ui.mesh.dataset.shape = value;
    try { localStorage.setItem(SURFACE.key, value); } catch (error) { report(error); }
  });
}
